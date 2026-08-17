"""
Google Play purchase verification for LandHere Pro.

Deliberately a separate module from `app/core/appstore.py`, with separate types
and no shared entry point, because the two platforms are not variations on one
idea:

  Apple  — the client hands us a JWS that Apple signed. We verify it offline
           against Apple's public root certificates. No credential involved.
  Google — the client hands us an opaque `purchaseToken`. It carries no
           signature and asserts nothing. The only way to learn what it means is
           to ask Google, authenticated as our own service account.

Keeping them apart is a security property, not tidiness. If one function
accepted "some proof of purchase" and guessed at the platform, an Apple JWS
could be offered as Android evidence, or a Google token as Apple evidence, and
the guess would be the vulnerability. Nothing here will look at an Apple
payload, and nothing in appstore.py will look at a Play token.

Fail-closed: with no service-account credentials configured, verification is
*unavailable* rather than lenient. The endpoint reports that, and the client
consequently never acknowledges the purchase — so Google auto-refunds it within
three days and the user gets their money back. That is the right failure.

The secret: the service-account JSON contains a private key. It is read from the
environment at request time and never logged, never returned, and never written
anywhere. It must never reach the mobile bundle.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import requests
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account

from app.core.config import settings

logger = logging.getLogger(__name__)

_SCOPE = "https://www.googleapis.com/auth/androidpublisher"
_API_ROOT = "https://androidpublisher.googleapis.com/androidpublisher/v3"
_TIMEOUT_SECONDS = 10

# purchaseStateContext.purchaseState, per the ProductPurchaseV2 reference.
_STATE_PURCHASED = "PURCHASED"
_STATE_CANCELLED = "CANCELLED"
_STATE_PENDING = "PENDING"


class GooglePlayVerificationError(Exception):
    """The token is not acceptable proof of purchase.

    The message is safe to return to a client: it never contains credentials and
    never echoes the submitted token.
    """


class GooglePlayUnavailable(Exception):
    """Verification is not configured, or Google could not be reached.

    Distinct from a rejected purchase: this is our problem, not the caller's,
    and it must never be treated as "assume it's fine".
    """


@dataclass(frozen=True)
class VerifiedPlayPurchase:
    """The trusted subset of what Google told us."""

    purchase_token: str
    product_id: str
    order_id: str | None
    purchased_at: datetime
    # True when Google reports the purchase is no longer valid — refunded,
    # revoked, or never completed.
    cancelled: bool
    # PENDING means the user started a deferred payment (e.g. cash at a
    # convenience store). Real, but not yet paid, so it must not entitle.
    pending: bool
    acknowledged: bool
    is_test_purchase: bool
    region_code: str | None


def _load_credentials() -> service_account.Credentials | None:
    """Build service-account credentials, or None when unconfigured.

    Never logs the key material. A malformed key is logged as malformed, without
    its contents.
    """
    raw = settings.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON.strip()
    if not raw:
        path = settings.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE.strip()
        if not path:
            return None
        candidate = Path(path)
        if not candidate.is_file():
            logger.warning(
                "GOOGLE_PLAY_SERVICE_ACCOUNT_FILE is set but is not a file"
            )
            return None
        raw = candidate.read_text(encoding="utf-8")

    try:
        info = json.loads(raw)
    except ValueError:
        # No exception chaining and no content in the message: a parse error on
        # a private key must not put fragments of it in a log line.
        logger.warning("Google Play service-account JSON is not valid JSON")
        return None

    try:
        return service_account.Credentials.from_service_account_info(
            info, scopes=[_SCOPE]
        )
    except Exception:
        logger.warning("Google Play service-account JSON is not a usable key")
        return None


def verification_available() -> bool:
    return _load_credentials() is not None


def _access_token() -> str:
    credentials = _load_credentials()
    if credentials is None:
        raise GooglePlayUnavailable(
            "Google Play verification is not configured on this server."
        )
    try:
        credentials.refresh(GoogleAuthRequest())
    except Exception as exc:
        # Wrong key, revoked service account, clock skew, no egress. Ours to fix.
        raise GooglePlayUnavailable(
            "Could not authenticate to the Google Play Developer API."
        ) from exc
    if not credentials.token:
        raise GooglePlayUnavailable("Google Play returned no access token.")
    return credentials.token


def _parse_timestamp(value: str | None) -> datetime | None:
    """RFC 3339 as returned by the v2 API, e.g. '2026-08-17T12:34:56.789Z'."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(
            timezone.utc
        )
    except ValueError:
        return None


def fetch_purchase(purchase_token: str) -> VerifiedPlayPurchase:
    """Ask Google what this token means.

    Uses purchases.productsv2.getproductpurchasev2, the current endpoint for
    one-time products (purchases.products.get is the superseded v1 form).

    Raises GooglePlayUnavailable when we cannot ask, and
    GooglePlayVerificationError when Google's answer is not an acceptable
    purchase of our product.
    """
    token = _access_token()
    url = (
        f"{_API_ROOT}/applications/{settings.GOOGLE_PLAY_PACKAGE_NAME}"
        f"/purchases/productsv2/tokens/{requests.utils.quote(purchase_token, safe='')}"
    )
    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise GooglePlayUnavailable("Could not reach the Google Play API.") from exc

    if response.status_code in (400, 404, 410):
        # Google does not recognise the token: forged, mangled, for another app,
        # or long expired. A rejection, not an outage.
        raise GooglePlayVerificationError("Purchase could not be verified.")
    if response.status_code == 401 or response.status_code == 403:
        # Our credential is wrong or lacks the financial-data permission. Do NOT
        # let this look like a bad purchase — it is our misconfiguration.
        raise GooglePlayUnavailable(
            "The Google Play credential was rejected or lacks permission."
        )
    if response.status_code >= 500:
        raise GooglePlayUnavailable("The Google Play API is unavailable.")
    if response.status_code != 200:
        raise GooglePlayUnavailable(
            f"Unexpected Google Play API status {response.status_code}."
        )

    try:
        body = response.json()
    except ValueError as exc:
        raise GooglePlayUnavailable("Google Play returned an unreadable body.") from exc

    line_items = body.get("productLineItem") or []
    product_ids = [
        item.get("productId") for item in line_items if item.get("productId")
    ]
    if settings.GOOGLE_PLAY_PRO_PRODUCT_ID not in product_ids:
        raise GooglePlayVerificationError("Purchase is for a different product.")

    state = (body.get("purchaseStateContext") or {}).get("purchaseState")
    if state not in (_STATE_PURCHASED, _STATE_CANCELLED, _STATE_PENDING):
        # An unknown state must not be optimistically treated as purchased.
        raise GooglePlayVerificationError("Purchase is in an unrecognised state.")

    is_test = ((body.get("testPurchaseContext") or {}).get("fopType") or "") == "TEST"
    if is_test and not settings.GOOGLE_ACCEPT_TEST_PURCHASES:
        raise GooglePlayVerificationError("Purchase could not be verified.")

    purchased_at = _parse_timestamp(body.get("purchaseCompletionTime")) or datetime.now(
        timezone.utc
    )

    return VerifiedPlayPurchase(
        purchase_token=purchase_token,
        product_id=settings.GOOGLE_PLAY_PRO_PRODUCT_ID,
        order_id=body.get("orderId"),
        purchased_at=purchased_at,
        cancelled=state == _STATE_CANCELLED,
        pending=state == _STATE_PENDING,
        acknowledged=(
            body.get("acknowledgementState") == "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED"
        ),
        is_test_purchase=is_test,
        region_code=body.get("regionCode"),
    )
