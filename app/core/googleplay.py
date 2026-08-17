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


class PubSubAuthError(Exception):
    """The push request did not carry a valid Google-signed identity token."""


class PubSubAuthUnavailable(Exception):
    """Push authentication is not configured, so no request can be trusted."""


# Google signs Pub/Sub push identity tokens as the accounts.google.com issuer.
# Both spellings appear in the wild and both are documented as valid.
_GOOGLE_ISSUERS = frozenset({"https://accounts.google.com", "accounts.google.com"})


def _verify_google_id_token(token: str, audience: str) -> dict:
    """Signature + expiry + audience, delegated to google-auth.

    A thin seam on purpose. This is the one part that talks to Google (it
    fetches and caches Google's public certs), so it is the one part tests
    replace — the claim checks in `verify_pubsub_push_token` are ours and are
    tested directly. Rolling our own RS256/JWKS handling here would be
    re-implementing a solved, security-critical problem.
    """
    from google.auth.transport import requests as ga_requests
    from google.oauth2 import id_token as google_id_token

    return google_id_token.verify_oauth2_token(
        token, ga_requests.Request(), audience=audience
    )


def pubsub_auth_available() -> bool:
    return bool(
        settings.GOOGLE_PUBSUB_AUDIENCE.strip()
        and settings.GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL.strip()
    )


def verify_pubsub_push_token(authorization_header: str | None) -> str:
    """Authenticate a Pub/Sub push request. Returns the caller's email.

    Google Pub/Sub attaches an OIDC identity token as `Authorization: Bearer
    <jwt>`. Verifying it establishes that the request really came from our
    subscription, which the message body alone can never establish — an RTDN
    body is unsigned, so anyone who learns the URL could otherwise POST one.

    Five things must hold, and all five matter:

      signature   the token is signed by Google (delegated to google-auth)
      exp         it has not expired (delegated to google-auth)
      aud         it was minted for *our* endpoint, not some other service that
                  also trusts Google-signed tokens — without this check, any
                  Google-issued token for any audience would be accepted
      iss         accounts.google.com
      email       the specific service account our subscription signs as, with
                  email_verified true

    Raises PubSubAuthUnavailable when unconfigured (fail closed) and
    PubSubAuthError when the token is missing or unacceptable.
    """
    if not pubsub_auth_available():
        raise PubSubAuthUnavailable(
            "Pub/Sub push authentication is not configured on this server."
        )

    if not authorization_header:
        raise PubSubAuthError("Missing bearer token.")
    scheme, _, raw = authorization_header.partition(" ")
    if scheme.lower() != "bearer" or not raw.strip():
        raise PubSubAuthError("Malformed Authorization header.")

    try:
        claims = _verify_google_id_token(
            raw.strip(), settings.GOOGLE_PUBSUB_AUDIENCE.strip()
        )
    except Exception as exc:
        # Bad signature, expired, wrong audience, malformed — google-auth raises
        # ValueError for all of them. One opaque message: distinguishing them
        # for the caller would only help someone probing the endpoint.
        raise PubSubAuthError("Token could not be verified.") from exc

    if claims.get("iss") not in _GOOGLE_ISSUERS:
        raise PubSubAuthError("Token issuer is not Google.")

    email = (claims.get("email") or "").strip().lower()
    expected = settings.GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL.strip().lower()
    if not email or email != expected:
        # A Google-signed token for OUR audience but a different service account
        # is still not our subscription.
        raise PubSubAuthError("Token is not from the expected service account.")
    if claims.get("email_verified") is not True:
        raise PubSubAuthError("Token email is not verified.")

    return email


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


def acknowledge_purchase(purchase_token: str) -> None:
    """Tell Google we have delivered the product.

    POST .../purchases/products/{productId}/tokens/{token}:acknowledge

    This is not optional bookkeeping. Google's one-time-product lifecycle gives
    three days: an unacknowledged purchase is **automatically refunded and
    revoked**. So a purchase we verified, linked to an account, and served
    content for would quietly be reversed if this never ran.

    Ordering matters and is the caller's responsibility: acknowledge only AFTER
    the purchase has been verified and linked to the right account. Acknowledging
    first would tell Google to keep the money for a purchase we might then refuse
    to honour — and the three-day auto-refund is precisely the safety net that
    protects a user when our verification is unavailable.

    Deliberately idempotent from the caller's point of view: Google treats
    re-acknowledging an already-acknowledged purchase as an error, so callers are
    expected to check `acknowledged` first, and a stray 400 here is swallowed
    rather than failing a purchase that is otherwise fine.

    Raises GooglePlayUnavailable when we cannot reach or authenticate to Google —
    never a silent success, because the caller needs to know the three-day clock
    is still running.
    """
    token = _access_token()
    url = (
        f"{_API_ROOT}/applications/{settings.GOOGLE_PLAY_PACKAGE_NAME}"
        f"/purchases/products/{settings.GOOGLE_PLAY_PRO_PRODUCT_ID}"
        f"/tokens/{requests.utils.quote(purchase_token, safe='')}:acknowledge"
    )
    try:
        response = requests.post(
            url,
            headers={"Authorization": f"Bearer {token}"},
            json={},
            timeout=_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise GooglePlayUnavailable("Could not reach the Google Play API.") from exc

    if response.status_code in (200, 204):
        return
    if response.status_code == 400:
        # Google's documented response for an already-acknowledged purchase.
        # The desired end state already holds, so this is not a failure.
        logger.info("Play purchase was already acknowledged")
        return
    if response.status_code in (401, 403):
        raise GooglePlayUnavailable(
            "The Google Play credential was rejected or lacks permission."
        )
    raise GooglePlayUnavailable(
        f"Unexpected Google Play acknowledge status {response.status_code}."
    )
