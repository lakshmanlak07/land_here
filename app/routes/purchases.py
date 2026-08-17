"""
LandHere Pro purchase verification and entitlement lookup.

Two endpoints, both authenticated:

  POST /purchases/verify        the app forwards a StoreKit JWS transaction;
                                the server verifies it with Apple's signature
                                chain and records the entitlement.
  GET  /purchases/entitlements  the app asks what this account actually owns.

The app calls `verify` on a fresh purchase AND on every "Restore Purchases",
because both produce the same artefact: a transaction signed by Apple. Restore
is therefore not a separate trust path — there is exactly one way to become
entitled, and it goes through Apple's signature.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.appstore import (
    PurchaseVerificationError,
    VerificationUnavailable,
    verify_signed_notification,
    verify_signed_transaction,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, user_has_pro
from app.core.googleplay import (
    GooglePlayUnavailable,
    GooglePlayVerificationError,
    fetch_purchase,
)
from app.core.rate_limit import rate_limiter
from app.models.purchase import (
    PLATFORM_ANDROID,
    PLATFORM_IOS,
    Purchase,
    PurchaseNotification,
)
from app.models.user import User

router = APIRouter(prefix="/purchases", tags=["purchases"])

# A real user verifies once per purchase and occasionally on restore. Anything
# beyond this is someone feeding the endpoint candidate blobs.
_verify_limit = rate_limiter("purchases_verify", limit=20, window_seconds=60)


class VerifyIn(BaseModel):
    # StoreKit's JWS is large; the bound stops an oversized body from reaching
    # the crypto path at all.
    signed_transaction: str = Field(..., min_length=1, max_length=20_000)


class EntitlementOut(BaseModel):
    pro: bool
    product_id: str | None = None
    environment: str | None = None
    purchased_at: datetime | None = None
    # Which store the entitlement came from. Useful in support ("you bought on
    # iOS, so restore from an iPhone") and harmless to expose.
    platform: str | None = None


def _entitlement_for(db: Session, user: User) -> EntitlementOut:
    """The single answer to "is this account Pro?", whatever store paid for it.

    One entitlement model across both platforms: any unrevoked purchase row
    entitles, so a user who bought on one store and signs in on the other keeps
    Pro. Deliberately platform-agnostic — the entitlement belongs to the
    LandHere account, not to a device or a store.
    """
    row = (
        db.query(Purchase)
        .filter(Purchase.user_id == user.id, Purchase.revoked_at.is_(None))
        .order_by(Purchase.purchased_at.asc())
        .first()
    )
    if row is None:
        return EntitlementOut(pro=False)
    return EntitlementOut(
        pro=True,
        product_id=row.product_id,
        environment=row.environment,
        purchased_at=row.purchased_at,
        platform=row.platform,
    )


def _link_purchase(
    db: Session,
    *,
    current_user: User,
    platform: str,
    platform_transaction_id: str,
    transaction_id: str | None,
    product_id: str,
    environment: str,
    purchased_at: datetime,
    revoked_at: datetime | None,
) -> None:
    """Attach a verified store purchase to this account, or refresh it.

    Shared by both platforms *after* each has done its own, separate
    verification. Nothing in here decides whether a purchase is genuine — by the
    time we are called, the caller has already proved it with Apple's signature
    or with Google's API. This only enforces the account-binding rule, which is
    identical on both stores.
    """
    existing = (
        db.query(Purchase)
        .filter(
            Purchase.platform == platform,
            Purchase.platform_transaction_id == platform_transaction_id,
        )
        .first()
    )

    if existing is not None and existing.user_id != current_user.id:
        # One store purchase, one LandHere account. Restoring on a second
        # account must not clone the entitlement.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This purchase is already linked to another LandHere account.",
        )

    if existing is None:
        db.add(
            Purchase(
                id=uuid.uuid4(),
                user_id=current_user.id,
                platform=platform,
                platform_transaction_id=platform_transaction_id,
                transaction_id=transaction_id,
                product_id=product_id,
                environment=environment,
                purchased_at=purchased_at,
                revoked_at=revoked_at,
            )
        )
        try:
            db.commit()
        except IntegrityError:
            # Check-then-act race: two devices restoring the same purchase at the
            # same instant both saw no row, and both inserted. The UNIQUE
            # constraint keeps the data correct, but without this the loser gets
            # a 500 on the money path — and a client that retries a 500 can turn
            # one race into a loop. Roll back, re-read the winner's row, and
            # continue as if we had found it first.
            db.rollback()
            existing = (
                db.query(Purchase)
                .filter(
                    Purchase.platform == platform,
                    Purchase.platform_transaction_id == platform_transaction_id,
                )
                .first()
            )
            if existing is None:
                # The constraint fired for some other reason. Do not swallow it.
                raise
            if existing.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This purchase is already linked to another LandHere account.",
                )
            existing.transaction_id = transaction_id
            existing.revoked_at = revoked_at
            db.commit()
        return

    # Re-verification (restore, reinstall, new device): refresh the mutable
    # fields, including clearing or setting revocation.
    existing.transaction_id = transaction_id
    existing.revoked_at = revoked_at
    db.commit()


@router.get("/entitlements", response_model=EntitlementOut)
def get_entitlements(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """What this account owns. Never cached: it is per-account and it changes
    the moment a purchase or refund lands."""
    response.headers["Cache-Control"] = "no-store"
    return _entitlement_for(db, current_user)


@router.post(
    "/verify",
    response_model=EntitlementOut,
    dependencies=[Depends(_verify_limit)],
)
def verify_purchase(
    body: VerifyIn,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify a StoreKit transaction and grant Pro to the calling account."""
    response.headers["Cache-Control"] = "no-store"

    try:
        verified = verify_signed_transaction(body.signed_transaction)
    except VerificationUnavailable:
        # Our misconfiguration, not the caller's problem — and emphatically not
        # a reason to grant anything.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Purchase verification is not available.",
        )
    except PurchaseVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    _link_purchase(
        db,
        current_user=current_user,
        platform=PLATFORM_IOS,
        platform_transaction_id=verified.original_transaction_id,
        transaction_id=verified.transaction_id,
        product_id=verified.product_id,
        environment=verified.environment,
        purchased_at=verified.purchased_at,
        revoked_at=verified.revoked_at,
    )
    return _entitlement_for(db, current_user)


class VerifyGoogleIn(BaseModel):
    # Play purchase tokens are long; the bound is generous but finite.
    purchase_token: str = Field(..., min_length=1, max_length=4096)


@router.post(
    "/verify/google",
    response_model=EntitlementOut,
    dependencies=[Depends(_verify_limit)],
)
def verify_google_purchase(
    body: VerifyGoogleIn,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify a Google Play purchase and grant Pro to the calling account.

    A SEPARATE endpoint from the Apple one, taking a differently-named field, on
    purpose. An Apple JWS is not Android evidence and a Play token is not Apple
    evidence; there is no shared entry point that could be talked into confusing
    them. The Play token is opaque and proves nothing by itself, so the only
    thing consulted here is Google's own answer about it.
    """
    response.headers["Cache-Control"] = "no-store"

    try:
        purchase = fetch_purchase(body.purchase_token)
    except GooglePlayUnavailable:
        # Our misconfiguration or Google being unreachable. Never a reason to
        # grant anything. The client must not acknowledge the purchase after
        # this, so Play auto-refunds it within three days.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Purchase verification is not available.",
        )
    except GooglePlayVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if purchase.pending:
        # A deferred payment (cash at a store, pending card). Real, unpaid, and
        # must not entitle — recorded as nothing so a later re-check can grant it.
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="This purchase is still pending payment.",
        )

    _link_purchase(
        db,
        current_user=current_user,
        platform=PLATFORM_ANDROID,
        # Play's stable per-purchase identifier.
        platform_transaction_id=purchase.purchase_token,
        transaction_id=purchase.order_id,
        product_id=purchase.product_id,
        environment="Test" if purchase.is_test_purchase else "Production",
        purchased_at=purchase.purchased_at,
        # A CANCELLED Play purchase is a refunded or revoked one.
        revoked_at=datetime.now(timezone.utc) if purchase.cancelled else None,
    )
    return _entitlement_for(db, current_user)


class NotificationIn(BaseModel):
    # Apple posts {"signedPayload": "<JWS>"}. Bounded so an oversized body never
    # reaches the crypto path.
    signedPayload: str = Field(..., min_length=1, max_length=100_000)


class NotificationAck(BaseModel):
    received: bool
    duplicate: bool = False
    action: str = "none"


# Apple retries aggressively; this bound is generous enough for legitimate
# retries and still caps someone spraying candidate payloads at the endpoint.
_notify_limit = rate_limiter("purchases_notify", limit=120, window_seconds=60)

# Apple tells us a purchase is gone in one of these two ways. REVOKE covers
# Family Sharing withdrawal; REFUND covers a refund Apple granted.
_REVOKING_TYPES = {"REFUND", "REVOKE"}
# ...and takes it back with this one, when a refund is reversed on appeal.
_RESTORING_TYPES = {"REFUND_REVERSED"}


@router.post(
    "/notifications",
    response_model=NotificationAck,
    dependencies=[Depends(_notify_limit)],
)
def app_store_notification(
    body: NotificationIn,
    response: Response,
    db: Session = Depends(get_db),
):
    """Receive an App Store Server Notification (V2).

    **Unauthenticated on purpose** — Apple calls this and holds no credential of
    ours. Apple's signature over the payload *is* the authentication, which is
    why verification here fails closed exactly as hard as it does for a purchase:
    a forged notification would be an unauthenticated way to revoke a paying
    user's access.

    Returns 200 for anything we successfully verified, including types we do not
    act on, so Apple stops retrying. A 4xx is reserved for payloads we could not
    verify, and a 5xx for our own failure — both of which we *want* Apple to
    retry.

    Configure the URL in App Store Connect under App Information → App Store
    Server Notifications (production and sandbox URLs are set separately).
    """
    response.headers["Cache-Control"] = "no-store"

    try:
        notification = verify_signed_notification(body.signedPayload)
    except VerificationUnavailable:
        # Our misconfiguration. 503 so Apple retries once we are configured,
        # rather than us silently dropping a refund.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Notification verification is not available.",
        )
    except PurchaseVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    transaction = notification.transaction

    # Idempotency. Apple retries until it gets a 2xx, so the same notification
    # arriving twice is ordinary traffic, not an attack.
    already = (
        db.query(PurchaseNotification)
        .filter(PurchaseNotification.notification_uuid == notification.notification_uuid)
        .first()
    )
    if already is not None:
        return NotificationAck(received=True, duplicate=True, action="none")

    db.add(
        PurchaseNotification(
            id=uuid.uuid4(),
            notification_uuid=notification.notification_uuid,
            notification_type=notification.notification_type,
            subtype=notification.subtype,
            platform=PLATFORM_IOS,
            platform_transaction_id=(
                transaction.original_transaction_id if transaction else None
            ),
        )
    )

    action = "none"
    if transaction is not None:
        purchase = (
            db.query(Purchase)
            .filter(
                Purchase.platform == PLATFORM_IOS,
                Purchase.platform_transaction_id
                == transaction.original_transaction_id,
            )
            .first()
        )
        if purchase is not None:
            if notification.notification_type in _REVOKING_TYPES:
                # Apple's own revocationDate if it gave us one; otherwise now.
                purchase.revoked_at = transaction.revoked_at or datetime.now(
                    timezone.utc
                )
                action = "revoked"
            elif notification.notification_type in _RESTORING_TYPES:
                purchase.revoked_at = None
                action = "restored"

    db.commit()
    return NotificationAck(received=True, duplicate=False, action=action)


class GoogleNotificationIn(BaseModel):
    """A Google Play Real-time Developer Notification, Pub/Sub push shape.

    Only `purchaseToken` is read from it, and even that is treated as a hint —
    see the endpoint docstring.
    """

    purchase_token: str = Field(..., min_length=1, max_length=4096)


@router.post(
    "/notifications/google",
    response_model=NotificationAck,
    dependencies=[Depends(_notify_limit)],
)
def google_play_notification(
    body: GoogleNotificationIn,
    response: Response,
    db: Session = Depends(get_db),
    x_landhere_rtdn_secret: str | None = Header(default=None),
):
    """Re-check a Google Play purchase after Play says something changed.

    **The message body is not evidence and is not trusted.** This is the crucial
    difference from the Apple endpoint. Apple signs its notifications, so the
    payload itself proves what it claims. Google's RTDN messages are ordinary
    Pub/Sub messages carrying no signature over their contents — anyone who
    learns the URL can POST one.

    So the message is treated purely as a prompt: the only thing we act on is
    what Google's API says when we ask it directly about that token. A forged
    message therefore achieves nothing beyond making us perform a lookup, and it
    can never revoke a paying user's access, because the lookup would come back
    PURCHASED.

    That also means this endpoint is useless without credentials rather than
    dangerous: no service account, no lookup, 503, and Play retries.

    ⚠️ Transport authentication is still required and is NOT implemented here:
    the Pub/Sub push subscription must be configured with an OIDC token and the
    platform must verify it (or the URL must carry an unguessable secret path).
    Without that, this endpoint is an unauthenticated way to make us spend API
    quota. See LAUNCH/LAUNCH_RUNBOOK.md for the Play Console setup.
    """
    response.headers["Cache-Control"] = "no-store"

    # Transport guard. Unlike Apple's, this endpoint cannot authenticate itself
    # from its payload, and it performs an authenticated outbound Google API
    # call — so an open version of it is a way for a stranger to spend our API
    # quota. Unconfigured means closed, consistent with the rest of the
    # purchase surface.
    expected = settings.GOOGLE_RTDN_SHARED_SECRET
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Notification endpoint is not configured.",
        )
    if not x_landhere_rtdn_secret or not secrets.compare_digest(
        x_landhere_rtdn_secret, expected
    ):
        # Constant-time comparison: a timing oracle on this would let someone
        # recover the secret a byte at a time.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized."
        )

    try:
        purchase = fetch_purchase(body.purchase_token)
    except GooglePlayUnavailable:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Notification verification is not available.",
        )
    except GooglePlayVerificationError:
        # Google does not recognise the token, or it is for another product.
        # 200 so Play stops retrying something we will never act on.
        return NotificationAck(received=True, duplicate=False, action="none")

    row = (
        db.query(Purchase)
        .filter(
            Purchase.platform == PLATFORM_ANDROID,
            Purchase.platform_transaction_id == purchase.purchase_token,
        )
        .first()
    )
    if row is None:
        return NotificationAck(received=True, duplicate=False, action="none")

    action = "none"
    if purchase.cancelled and row.revoked_at is None:
        row.revoked_at = datetime.now(timezone.utc)
        action = "revoked"
    elif not purchase.cancelled and not purchase.pending and row.revoked_at is not None:
        # Play reports it valid again — a reversed refund.
        row.revoked_at = None
        action = "restored"

    db.commit()
    return NotificationAck(received=True, duplicate=False, action=action)


__all__ = ["router", "user_has_pro"]
