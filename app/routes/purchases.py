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
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.appstore import (
    PurchaseVerificationError,
    VerificationUnavailable,
    verify_signed_transaction,
)
from app.core.database import get_db
from app.core.deps import get_current_user, user_has_pro
from app.core.rate_limit import rate_limiter
from app.models.purchase import Purchase
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


__all__ = ["router", "user_has_pro"]
