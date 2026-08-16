"""
App Store transaction verification for LandHere Pro.

The client sends the JWS blob StoreKit gave it. This module decides whether that
blob is a genuine, current, non-revoked purchase of our product — signed by
Apple, for our bundle id, for our product id. Nothing else in the codebase is
allowed to conclude that a user owns Pro.

Why a library rather than hand-rolled crypto: verifying one of these means
walking the x5c certificate chain in the JWS header up to an Apple root,
checking each signature and validity window, and only then trusting the ES256
payload signature. Hand-written chain validation is a classic source of
silent-accept bugs, and this is a money path — so we use Apple's own
`app-store-server-library`.

What is NOT a secret here: Apple's root CA certificates are public trust
anchors, the bundle id is in every build, and the numeric app id is in every
App Store URL. No Apple private key, `.p8`, or shared secret is used by this
module or by the mobile app. Server-to-Apple credentials would only be needed
for the App Store Server API (refund lookups, notifications), which this phase
does not implement.

Fail-closed: if the root certificates are not configured, verification is
unavailable and the endpoint reports that, rather than accepting the payload it
cannot check.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from appstoreserverlibrary.models.Environment import Environment
from appstoreserverlibrary.models.Type import Type
from appstoreserverlibrary.signed_data_verifier import (
    SignedDataVerifier,
    VerificationException,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

_CERT_SUFFIXES = {".cer", ".der", ".pem", ".crt"}


class PurchaseVerificationError(Exception):
    """The transaction is not an acceptable proof of purchase.

    The message is safe to return to the client: it never contains key material
    and never echoes the submitted blob.
    """


class VerificationUnavailable(Exception):
    """Verification is not configured on this deployment (missing root certs or,
    for Production, a missing numeric app id). Distinct from a rejected
    transaction — this is our misconfiguration, not the user's fault."""


@dataclass(frozen=True)
class VerifiedTransaction:
    original_transaction_id: str
    transaction_id: str
    product_id: str
    environment: str
    purchased_at: datetime
    revoked_at: datetime | None


@dataclass(frozen=True)
class VerifiedNotification:
    """An App Store Server Notification we have proved came from Apple.

    `transaction` is None for notification types that carry no transaction —
    notably TEST, which Apple sends when you use "Request a Test Notification"
    in App Store Connect.
    """

    notification_type: str
    subtype: str | None
    notification_uuid: str
    transaction: VerifiedTransaction | None


def _load_root_certificates() -> list[bytes]:
    directory = settings.APPLE_ROOT_CA_DIR.strip()
    if not directory:
        return []
    path = Path(directory)
    if not path.is_dir():
        logger.warning("APPLE_ROOT_CA_DIR is set but is not a directory: %s", directory)
        return []
    return [
        f.read_bytes()
        for f in sorted(path.iterdir())
        if f.is_file() and f.suffix.lower() in _CERT_SUFFIXES
    ]


def _build_verifiers() -> list[SignedDataVerifier]:
    """One verifier per environment we accept.

    Production needs the numeric app id; without it Apple's library cannot check
    that the transaction belongs to our app, so we do not construct a Production
    verifier at all rather than construct a weaker one.
    """
    roots = _load_root_certificates()
    if not roots:
        return []

    verifiers: list[SignedDataVerifier] = []
    if settings.APPLE_APP_APPLE_ID is not None:
        verifiers.append(
            SignedDataVerifier(
                root_certificates=roots,
                enable_online_checks=settings.APPLE_ENABLE_ONLINE_CHECKS,
                environment=Environment.PRODUCTION,
                bundle_id=settings.APPLE_BUNDLE_ID,
                app_apple_id=settings.APPLE_APP_APPLE_ID,
            )
        )
    if settings.APPLE_ACCEPT_SANDBOX:
        verifiers.append(
            SignedDataVerifier(
                root_certificates=roots,
                enable_online_checks=settings.APPLE_ENABLE_ONLINE_CHECKS,
                environment=Environment.SANDBOX,
                bundle_id=settings.APPLE_BUNDLE_ID,
            )
        )
    return verifiers


def verification_available() -> bool:
    return bool(_build_verifiers())


def _ms_to_datetime(value: int | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromtimestamp(value / 1000, tz=timezone.utc)


def verify_signed_transaction(signed_transaction: str) -> VerifiedTransaction:
    """Verify one StoreKit JWS transaction and return its trusted fields.

    Raises VerificationUnavailable if this deployment cannot verify at all, and
    PurchaseVerificationError if the transaction is not a valid, current
    purchase of our Pro product.
    """
    verifiers = _build_verifiers()
    if not verifiers:
        raise VerificationUnavailable(
            "App Store verification is not configured on this server."
        )

    payload = None
    for verifier in verifiers:
        try:
            payload = verifier.verify_and_decode_signed_transaction(signed_transaction)
            break
        except VerificationException:
            continue  # wrong environment for this blob; try the next verifier
    if payload is None:
        # Covers a forged signature, a tampered payload, an untrusted chain, a
        # different bundle id, and a sandbox receipt when sandbox is not
        # accepted. Deliberately one opaque message: telling a caller which of
        # those it was only helps someone probing the endpoint.
        raise PurchaseVerificationError("Transaction could not be verified.")

    if payload.productId != settings.APPLE_PRO_PRODUCT_ID:
        raise PurchaseVerificationError("Transaction is for a different product.")
    if payload.type != Type.NON_CONSUMABLE:
        raise PurchaseVerificationError("Transaction is not a non-consumable purchase.")
    if not payload.originalTransactionId or not payload.transactionId:
        raise PurchaseVerificationError("Transaction is missing its identifiers.")

    purchased_at = _ms_to_datetime(payload.purchaseDate)
    if purchased_at is None:
        raise PurchaseVerificationError("Transaction is missing a purchase date.")

    environment = (
        payload.environment.value
        if isinstance(payload.environment, Environment)
        else str(payload.rawEnvironment or "")
    )

    return VerifiedTransaction(
        original_transaction_id=payload.originalTransactionId,
        transaction_id=payload.transactionId,
        product_id=payload.productId,
        environment=environment,
        purchased_at=purchased_at,
        revoked_at=_ms_to_datetime(payload.revocationDate),
    )


def verify_signed_notification(signed_payload: str) -> VerifiedNotification:
    """Verify an App Store Server Notification (V2) and return its trusted fields.

    Same trust model as `verify_signed_transaction`, deliberately: the endpoint
    that receives these is unauthenticated, because Apple calls it and cannot
    hold a credential of ours. **Apple's signature is the entire authentication.**
    So this must fail closed exactly as hard — an unverifiable payload is
    rejected outright rather than being treated as a hint worth acting on.

    That matters more here than for a purchase. A forged notification would be an
    unauthenticated request that revokes a paying user's access, so accepting one
    optimistically would hand anyone a denial-of-service against our customers.
    """
    verifiers = _build_verifiers()
    if not verifiers:
        raise VerificationUnavailable(
            "App Store verification is not configured on this server."
        )

    payload = None
    for verifier in verifiers:
        try:
            payload = verifier.verify_and_decode_notification(signed_payload)
            break
        except VerificationException:
            continue  # wrong environment for this blob; try the next verifier
    if payload is None:
        raise PurchaseVerificationError("Notification could not be verified.")

    notification_type = (
        payload.notificationType.value
        if payload.notificationType is not None
        else str(payload.rawNotificationType or "")
    )
    subtype = (
        payload.subtype.value
        if payload.subtype is not None
        else (str(payload.rawSubtype) if payload.rawSubtype else None)
    )
    if not payload.notificationUUID:
        # Without it we cannot deduplicate, and Apple retries notifications.
        raise PurchaseVerificationError("Notification is missing its UUID.")

    # The inner transaction is itself a separately-signed JWS. Verify it in its
    # own right rather than trusting it because the envelope was valid.
    transaction = None
    signed_transaction = getattr(payload.data, "signedTransactionInfo", None)
    if signed_transaction:
        try:
            transaction = verify_signed_transaction(signed_transaction)
        except PurchaseVerificationError:
            # A genuine Apple notification about some other product of ours (or
            # a product we no longer sell) is not an error worth 400-ing over —
            # Apple would just retry it forever. Record the envelope, act on
            # nothing.
            transaction = None

    return VerifiedNotification(
        notification_type=notification_type,
        subtype=subtype,
        notification_uuid=payload.notificationUUID,
        transaction=transaction,
    )
