"""
LandHere Pro on Google Play: verification, entitlement, and platform isolation.

A note on what these tests can and cannot prove, because it differs from the
Apple suite in kind.

For Apple, the client's evidence is cryptographic, so `tests/test_purchases.py`
stands up a real certificate chain and makes Apple's own verifier walk it — a
forged signature is rejected by real crypto, not by a stub.

For Google there is no equivalent. A Play `purchaseToken` is opaque and proves
nothing; Google's API *is* the oracle. So the honest place to cut is the HTTP
boundary: these tests simulate Google's answers and verify everything on our
side of that boundary — product matching, state handling, account binding,
fail-closed behaviour, and the refusal to accept one platform's evidence for the
other.

What that means for confidence: these tests cannot show that we talk to Google
correctly. Only a real purchase against a real Play account can. That gap is
recorded in the runbook rather than papered over.
"""

from __future__ import annotations

import uuid

import pytest

import app.core.googleplay as gp
import app.core.rate_limit as rl
from app.core.config import settings
from tests.test_purchases import _account, _signed, apply_apple_test_settings

PACKAGE_NAME = "com.landhere.app"
PLAY_PRODUCT_ID = "com.landhere.app.pro"
# Stands in for the transport guard on the RTDN endpoint. Not a real secret.
RTDN_SECRET = "test-only-rtdn-shared-secret"
RTDN_HEADERS = {"X-LandHere-RTDN-Secret": RTDN_SECRET}


# ── A stand-in for the Google Play Developer API ───────────────────────────────

class _FakePlay:
    """Canned ProductPurchaseV2 responses, keyed by purchase token.

    Shapes follow the documented v2 resource: productLineItem[].productId,
    purchaseStateContext.purchaseState, acknowledgementState, orderId,
    regionCode, purchaseCompletionTime, testPurchaseContext.fopType.
    """

    def __init__(self):
        self.tokens: dict[str, dict] = {}
        self.calls: list[str] = []
        self.status_for: dict[str, int] = {}

    def add(
        self,
        token: str,
        *,
        state: str = "PURCHASED",
        product_id: str = PLAY_PRODUCT_ID,
        order_id: str | None = None,
        test_purchase: bool = False,
        acknowledged: bool = False,
    ) -> str:
        body: dict = {
            "productLineItem": [{"productId": product_id}],
            "purchaseStateContext": {"purchaseState": state},
            "orderId": order_id or f"GPA.{uuid.uuid4().hex[:16]}",
            "regionCode": "IN",
            "purchaseCompletionTime": "2026-08-17T10:00:00.000Z",
            "acknowledgementState": (
                "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED"
                if acknowledged
                else "ACKNOWLEDGEMENT_STATE_PENDING"
            ),
        }
        if test_purchase:
            body["testPurchaseContext"] = {"fopType": "TEST"}
        self.tokens[token] = body
        return token

    def set_status(self, token: str, status_code: int) -> None:
        self.status_for[token] = status_code

    # Mimics requests.get's return value closely enough for the caller.
    def get(self, url, headers=None, timeout=None):  # noqa: ANN001
        token = url.rsplit("/tokens/", 1)[-1]
        self.calls.append(token)

        class _Resp:
            def __init__(self, code, payload):
                self.status_code = code
                self._payload = payload

            def json(self):
                if self._payload is None:
                    raise ValueError("no body")
                return self._payload

        if token in self.status_for:
            return _Resp(self.status_for[token], None)
        if token not in self.tokens:
            # Google's answer for a token it does not recognise.
            return _Resp(404, None)
        return _Resp(200, self.tokens[token])


@pytest.fixture
def play(monkeypatch):
    fake = _FakePlay()
    monkeypatch.setattr(settings, "GOOGLE_PLAY_PACKAGE_NAME", PACKAGE_NAME)
    monkeypatch.setattr(settings, "GOOGLE_PLAY_PRO_PRODUCT_ID", PLAY_PRODUCT_ID)
    monkeypatch.setattr(settings, "GOOGLE_ACCEPT_TEST_PURCHASES", False)
    monkeypatch.setattr(settings, "GOOGLE_RTDN_SHARED_SECRET", RTDN_SECRET)
    # Stand in for the service-account exchange. No key material in tests, and
    # nothing here weakens the checks under test — the credential only decides
    # whether we can ask Google, not what the answer means.
    monkeypatch.setattr(gp, "_access_token", lambda: "fake-access-token")
    monkeypatch.setattr(gp.requests, "get", fake.get)
    return fake


@pytest.fixture(autouse=True)
def _apple_for_cross_platform(monkeypatch):
    # Some tests submit an Apple payload to the Android endpoint; Apple's side
    # needs to be configured for that comparison to be meaningful.
    apply_apple_test_settings(monkeypatch)


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    rl._hits.clear()
    yield
    rl._hits.clear()


def _tok(prefix: str = "play") -> str:
    # Play tokens are long opaque strings; length matters because the column had
    # to be widened from 64 to hold them.
    return f"{prefix}-{uuid.uuid4().hex}{uuid.uuid4().hex}"


def _verify_google(client, headers, token: str):
    return client.post(
        "/purchases/verify/google", json={"purchase_token": token}, headers=headers
    )


# ── Happy path ─────────────────────────────────────────────────────────────────

def test_valid_play_purchase_grants_pro(client, play):
    _, headers, _ = _account(client)
    token = play.add(_tok())

    r = _verify_google(client, headers, token)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["pro"] is True
    assert body["platform"] == "android"
    assert body["environment"] == "Production"
    assert body["product_id"] == PLAY_PRODUCT_ID

    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is True


def test_verify_google_requires_authentication(client, play):
    token = play.add(_tok())
    r = client.post("/purchases/verify/google", json={"purchase_token": token})
    assert r.status_code == 401


def test_long_play_token_is_stored_intact(client, play):
    """The column was widened 64 -> 512 for exactly this."""
    _, headers, _ = _account(client)
    token = play.add(_tok())
    assert len(token) > 64
    assert _verify_google(client, headers, token).status_code == 200

    from app.models.purchase import Purchase
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        row = (
            db.query(Purchase)
            .filter(
                Purchase.platform == "android",
                Purchase.platform_transaction_id == token,
            )
            .first()
        )
    finally:
        db.close()
    assert row is not None, "token was not stored verbatim"


# ── Forged / unknown ───────────────────────────────────────────────────────────

def test_forged_token_is_rejected(client, play):
    """A token Google has never heard of. The whole Android threat model."""
    _, headers, _ = _account(client)
    r = _verify_google(client, headers, _tok("forged"))
    assert r.status_code == 400
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_wrong_product_is_rejected(client, play):
    _, headers, _ = _account(client)
    token = play.add(_tok(), product_id="com.landhere.app.something_else")
    r = _verify_google(client, headers, token)
    assert r.status_code == 400
    assert "different product" in r.json()["detail"].lower()
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_unrecognised_purchase_state_is_rejected(client, play):
    """An unknown state must never be optimistically read as PURCHASED."""
    _, headers, _ = _account(client)
    token = play.add(_tok(), state="PURCHASE_STATE_UNSPECIFIED")
    assert _verify_google(client, headers, token).status_code == 400


def test_test_purchase_rejected_unless_explicitly_accepted(client, play, monkeypatch):
    _, headers, _ = _account(client)
    token = play.add(_tok(), test_purchase=True)
    assert _verify_google(client, headers, token).status_code == 400

    monkeypatch.setattr(settings, "GOOGLE_ACCEPT_TEST_PURCHASES", True)
    r = _verify_google(client, headers, token)
    assert r.status_code == 200
    assert r.json()["environment"] == "Test"


# ── Revoked / refunded / pending ───────────────────────────────────────────────

def test_cancelled_purchase_does_not_grant_pro(client, play):
    """CANCELLED is Play's refunded-or-revoked state."""
    _, headers, _ = _account(client)
    token = play.add(_tok(), state="CANCELLED")
    r = _verify_google(client, headers, token)
    assert r.status_code == 200
    assert r.json()["pro"] is False
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_pending_purchase_does_not_grant_pro(client, play):
    """Deferred payment: real, unpaid, must not entitle."""
    _, headers, _ = _account(client)
    token = play.add(_tok(), state="PENDING")
    r = _verify_google(client, headers, token)
    assert r.status_code == 402
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_refund_after_purchase_revokes_on_reverification(client, play):
    _, headers, _ = _account(client)
    token = play.add(_tok())
    assert _verify_google(client, headers, token).json()["pro"] is True

    # Google now reports it cancelled — the user got a refund.
    play.tokens[token]["purchaseStateContext"]["purchaseState"] = "CANCELLED"
    r = _verify_google(client, headers, token)
    assert r.status_code == 200
    assert r.json()["pro"] is False


def test_revoked_play_purchase_closes_the_pro_gates(client, play):
    from tests.test_purchases import FREE_PHASES, _add_universities

    _, headers, _ = _account(client)
    token = play.add(_tok())
    assert _verify_google(client, headers, token).json()["pro"] is True
    uni_id = _add_universities(1, f"play-gate-{uuid.uuid4().hex[:6]}")
    assert client.get(f"/universities/{uni_id}", headers=headers).status_code == 200

    play.tokens[token]["purchaseStateContext"]["purchaseState"] = "CANCELLED"
    _verify_google(client, headers, token)

    assert client.get(f"/universities/{uni_id}", headers=headers).status_code == 403
    journey = client.get(
        "/info/journey", params={"destination": "US", "origin": "IN"}, headers=headers
    ).json()
    assert journey["pro_required"] is True
    assert {p["phase"] for p in journey["phases"]} <= FREE_PHASES


# ── Replay and cross-account ───────────────────────────────────────────────────

def test_replaying_the_same_token_is_idempotent(client, play):
    _, headers, _ = _account(client)
    token = play.add(_tok())
    assert _verify_google(client, headers, token).status_code == 200
    assert _verify_google(client, headers, token).status_code == 200

    from app.models.purchase import Purchase
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        count = (
            db.query(Purchase)
            .filter(
                Purchase.platform == "android",
                Purchase.platform_transaction_id == token,
            )
            .count()
        )
    finally:
        db.close()
    assert count == 1


def test_token_cannot_be_claimed_by_a_second_account(client, play):
    """One Play purchase, one LandHere account — the composite UNIQUE at work."""
    token = play.add(_tok())
    _, buyer, _ = _account(client)
    assert _verify_google(client, buyer, token).status_code == 200

    _, freeloader, _ = _account(client)
    r = _verify_google(client, freeloader, token)
    assert r.status_code == 409
    assert client.get("/purchases/entitlements", headers=freeloader).json()["pro"] is False


def test_deleting_the_account_removes_the_play_purchase(client, play):
    _, headers, password = _account(client)
    token = play.add(_tok())
    assert _verify_google(client, headers, token).status_code == 200

    r = client.request("DELETE", "/account", json={"password": password}, headers=headers)
    assert r.status_code == 204, r.text

    from app.models.purchase import Purchase
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        remaining = (
            db.query(Purchase)
            .filter(Purchase.platform_transaction_id == token)
            .count()
        )
    finally:
        db.close()
    assert remaining == 0


# ── Platform isolation ─────────────────────────────────────────────────────────
#
# The architectural point: one store's evidence is never the other's.

def test_apple_jws_is_not_accepted_as_android_evidence(client, play):
    _, headers, _ = _account(client)
    apple_blob = _signed()  # a genuinely Apple-signed transaction

    r = client.post(
        "/purchases/verify/google", json={"purchase_token": apple_blob}, headers=headers
    )
    assert r.status_code == 400, "an Apple JWS was accepted by the Android endpoint"
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_play_token_is_not_accepted_as_apple_evidence(client, play):
    _, headers, _ = _account(client)
    token = play.add(_tok())  # a token Google would happily confirm

    r = client.post(
        "/purchases/verify", json={"signed_transaction": token}, headers=headers
    )
    assert r.status_code == 400, "a Play token was accepted by the Apple endpoint"
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_android_verification_never_consults_apple_configuration(client, play, monkeypatch):
    """Removing Apple's trust anchors must not affect the Android path."""
    _, headers, _ = _account(client)
    monkeypatch.setattr(settings, "APPLE_ROOT_CA_DIR", "")
    token = play.add(_tok())
    assert _verify_google(client, headers, token).status_code == 200


# ── Fail closed ────────────────────────────────────────────────────────────────

def test_missing_google_credentials_returns_503(client, monkeypatch):
    """No service account, no verification — and emphatically no grant.

    The consequence is deliberate: the client never acknowledges the purchase,
    so Play auto-refunds it within three days and the user gets their money back.
    """
    _, headers, _ = _account(client)
    monkeypatch.setattr(settings, "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "")
    monkeypatch.setattr(settings, "GOOGLE_PLAY_SERVICE_ACCOUNT_FILE", "")
    r = _verify_google(client, headers, _tok())
    assert r.status_code == 503
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_malformed_service_account_json_is_unavailable_not_lenient(client, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "{not json")
    assert gp.verification_available() is False

    _, headers, _ = _account(client)
    assert _verify_google(client, headers, _tok()).status_code == 503


def test_rejected_credential_is_503_not_400(client, play):
    """A 401/403 from Google is OUR problem and must not look like a bad purchase.

    Reading it as a rejection would silently deny every purchase the moment the
    service account lost its permission.
    """
    _, headers, _ = _account(client)
    token = _tok()
    play.set_status(token, 403)
    assert _verify_google(client, headers, token).status_code == 503


def test_google_outage_is_503(client, play):
    _, headers, _ = _account(client)
    token = _tok()
    play.set_status(token, 500)
    assert _verify_google(client, headers, token).status_code == 503


# ── Play notifications ─────────────────────────────────────────────────────────

def test_play_notification_body_is_not_trusted(client, play):
    """A forged RTDN must not revoke a paying user.

    Google's notifications carry no signature over their contents, so the body is
    only a prompt to re-ask Google. Here Google still says PURCHASED, so the
    forged message achieves nothing.
    """
    _, headers, _ = _account(client)
    token = play.add(_tok())
    assert _verify_google(client, headers, token).json()["pro"] is True

    r = client.post(
        "/purchases/notifications/google",
        json={"purchase_token": token},
        headers=RTDN_HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["action"] == "none"
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is True


def test_play_notification_revokes_when_google_says_cancelled(client, play):
    _, headers, _ = _account(client)
    token = play.add(_tok())
    assert _verify_google(client, headers, token).json()["pro"] is True

    play.tokens[token]["purchaseStateContext"]["purchaseState"] = "CANCELLED"
    r = client.post(
        "/purchases/notifications/google",
        json={"purchase_token": token},
        headers=RTDN_HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["action"] == "revoked"
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_play_notification_restores_a_reversed_refund(client, play):
    _, headers, _ = _account(client)
    token = play.add(_tok(), state="CANCELLED")
    _verify_google(client, headers, token)
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False

    play.tokens[token]["purchaseStateContext"]["purchaseState"] = "PURCHASED"
    r = client.post(
        "/purchases/notifications/google",
        json={"purchase_token": token},
        headers=RTDN_HEADERS,
    )
    assert r.json()["action"] == "restored"
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is True


def test_play_notification_for_unknown_token_is_accepted_without_action(client, play):
    r = client.post(
        "/purchases/notifications/google",
        json={"purchase_token": _tok("unknown")},
        headers=RTDN_HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["action"] == "none"


def test_play_notification_without_credentials_is_503(client, play, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "")
    monkeypatch.setattr(settings, "GOOGLE_PLAY_SERVICE_ACCOUNT_FILE", "")
    monkeypatch.setattr(gp, "_access_token", gp._access_token.__wrapped__ if hasattr(gp._access_token, "__wrapped__") else _raise_unavailable)
    r = client.post(
        "/purchases/notifications/google",
        json={"purchase_token": _tok()},
        headers=RTDN_HEADERS,
    )
    assert r.status_code == 503


def _raise_unavailable():
    raise gp.GooglePlayUnavailable("not configured")


# ── Transport guard on the notification endpoint ────────────────────────────────
#
# Apple signs its notifications, so that endpoint authenticates itself. Google's
# do not, and this one makes an authenticated outbound Google API call — so an
# open version of it lets a stranger spend our API quota.

def test_play_notification_rejects_a_missing_secret(client, play):
    _, headers, _ = _account(client)
    token = play.add(_tok())
    assert _verify_google(client, headers, token).json()["pro"] is True

    r = client.post("/purchases/notifications/google", json={"purchase_token": token})
    assert r.status_code == 401
    assert play.calls.count(token) == 1, "an unauthorized call reached the Google API"


def test_play_notification_rejects_a_wrong_secret(client, play):
    token = play.add(_tok())
    r = client.post(
        "/purchases/notifications/google",
        json={"purchase_token": token},
        headers={"X-LandHere-RTDN-Secret": "wrong"},
    )
    assert r.status_code == 401
    assert token not in play.calls, "a wrong secret still reached the Google API"


def test_play_notification_closed_when_secret_unconfigured(client, play, monkeypatch):
    """Unconfigured means closed, like the rest of the purchase surface."""
    monkeypatch.setattr(settings, "GOOGLE_RTDN_SHARED_SECRET", "")
    token = play.add(_tok())
    r = client.post(
        "/purchases/notifications/google",
        json={"purchase_token": token},
        headers=RTDN_HEADERS,
    )
    assert r.status_code == 503
    assert token not in play.calls
