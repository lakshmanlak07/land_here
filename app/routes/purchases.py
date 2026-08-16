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

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.appstore import (
    PurchaseVerificationError,
    VerificationUnavailable,
    verify_signed_notification,
    verify_signed_transaction,
)
from app.core.database import get_db
from app.core.deps import get_current_user, user_has_pro
from app.core.rate_limit import rate_limiter
from app.models.purchase import Purchase, PurchaseNotification
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


def _entitlement_for(db: Session, user: User) -> EntitlementOut:
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
    )


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

    existing = (
        db.query(Purchase)
        .filter(Purchase.original_transaction_id == verified.original_transaction_id)
        .first()
    )

    if existing is not None and existing.user_id != current_user.id:
        # One Apple purchase, one LandHere account. Restoring on a second
        # account must not clone the entitlement. The user's route back is to
        # sign in as the original account or contact support.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This purchase is already linked to another LandHere account.",
        )

    if existing is None:
        existing = Purchase(
            id=uuid.uuid4(),
            user_id=current_user.id,
            original_transaction_id=verified.original_transaction_id,
            transaction_id=verified.transaction_id,
            product_id=verified.product_id,
            environment=verified.environment,
            purchased_at=verified.purchased_at,
            revoked_at=verified.revoked_at,
        )
        db.add(existing)
    else:
        # Re-verification (restore, reinstall, new device): refresh the mutable
        # fields. Apple reporting a revocationDate is how a refund reaches us
        # without Server Notifications.
        existing.transaction_id = verified.transaction_id
        existing.revoked_at = verified.revoked_at

    db.commit()
    db.refresh(existing)

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
            original_transaction_id=(
                transaction.original_transaction_id if transaction else None
            ),
        )
    )

    action = "none"
    if transaction is not None:
        purchase = (
            db.query(Purchase)
            .filter(
                Purchase.original_transaction_id == transaction.original_transaction_id
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


__all__ = ["router", "user_has_pro"]
