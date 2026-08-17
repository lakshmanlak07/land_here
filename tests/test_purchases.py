"""
LandHere Pro: purchase verification, entitlement, and the server-side gates.

These tests exercise the real verification path — Apple's `SignedDataVerifier`
walking an x5c certificate chain — rather than stubbing it out. A stubbed
verifier would prove only that our plumbing calls a function; the risk worth
testing is that a forged or tampered transaction is rejected, and that can only
be shown by feeding the real verifier real (if synthetic) crypto.

So we stand up a throwaway PKI: root → intermediate → leaf, mirroring Apple's
chain shape, including the two Apple marker OIDs the verifier insists on. Our
root is registered as the trust anchor for the duration of the tests. Nothing
here touches the network; OCSP checking is switched off, which is the only
concession made to the test environment.
"""

from __future__ import annotations

import datetime
import json
import tempfile
import uuid
from base64 import b64encode
from pathlib import Path

import jwt
import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID, ObjectIdentifier

import app.core.rate_limit as rl
from app.core.config import settings

# Apple marker OIDs the chain verifier requires on the leaf and the intermediate.
LEAF_MARKER_OID = ObjectIdentifier("1.2.840.113635.100.6.11.1")
INTERMEDIATE_MARKER_OID = ObjectIdentifier("1.2.840.113635.100.6.2.1")

BUNDLE_ID = "com.landhere.app"
PRODUCT_ID = "com.landhere.app.pro"


# ── Throwaway PKI ──────────────────────────────────────────────────────────────

def _name(common_name: str) -> x509.Name:
    return x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])


def _make_ca(subject: str, issuer_cert=None, issuer_key=None, marker_oid=None):
    key = ec.generate_private_key(ec.SECP256R1())
    now = datetime.datetime.now(datetime.timezone.utc)
    builder = (
        x509.CertificateBuilder()
        .subject_name(_name(subject))
        .issuer_name(issuer_cert.subject if issuer_cert else _name(subject))
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=365))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True, content_commitment=False, key_encipherment=False,
                data_encipherment=False, key_agreement=False, key_cert_sign=True,
                crl_sign=True, encipher_only=False, decipher_only=False,
            ),
            critical=True,
        )
    )
    # OpenSSL's chain builder refuses a chain whose links carry no key
    # identifiers ("Missing Authority Key Identifier"), so every cert gets a
    # subject key id and every non-root cert an authority key id.
    builder = builder.add_extension(
        x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False
    )
    builder = builder.add_extension(
        x509.AuthorityKeyIdentifier.from_issuer_public_key(
            (issuer_cert.public_key() if issuer_cert else key.public_key())
        ),
        critical=False,
    )
    if marker_oid is not None:
        builder = builder.add_extension(
            x509.UnrecognizedExtension(marker_oid, b""), critical=False
        )
    cert = builder.sign(issuer_key or key, hashes.SHA256())
    return cert, key


def _make_leaf(issuer_cert, issuer_key):
    key = ec.generate_private_key(ec.SECP256R1())
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(_name("LandHere Test Leaf"))
        .issuer_name(issuer_cert.subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=365))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.UnrecognizedExtension(LEAF_MARKER_OID, b""), critical=False)
        .add_extension(
            x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False
        )
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(issuer_cert.public_key()),
            critical=False,
        )
        .sign(issuer_key, hashes.SHA256())
    )
    return cert, key


class _PKI:
    def __init__(self):
        self.root_cert, self.root_key = _make_ca("LandHere Test Root")
        self.intermediate_cert, self.intermediate_key = _make_ca(
            "LandHere Test Intermediate",
            issuer_cert=self.root_cert,
            issuer_key=self.root_key,
            marker_oid=INTERMEDIATE_MARKER_OID,
        )
        self.leaf_cert, self.leaf_key = _make_leaf(
            self.intermediate_cert, self.intermediate_key
        )
        self.root_dir = Path(tempfile.mkdtemp(prefix="landhere-test-roots-"))
        (self.root_dir / "root.cer").write_bytes(
            self.root_cert.public_bytes(serialization.Encoding.DER)
        )

    @property
    def x5c(self) -> list[str]:
        return [
            b64encode(c.public_bytes(serialization.Encoding.DER)).decode()
            for c in (self.leaf_cert, self.intermediate_cert, self.root_cert)
        ]

    def sign(self, payload: dict) -> str:
        pem = self.leaf_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        return jwt.encode(payload, pem, algorithm="ES256", headers={"x5c": self.x5c})


_PKI_MAIN = _PKI()
# A second, unrelated PKI. Its chain is internally valid but its root is not a
# trust anchor here — the "attacker signs their own transaction" case.
_PKI_ROGUE = _PKI()


def _now_ms() -> int:
    return int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)


def _transaction(
    *,
    product_id: str = PRODUCT_ID,
    bundle_id: str = BUNDLE_ID,
    tx_type: str = "Non-Consumable",
    original_transaction_id: str | None = None,
    revocation_date: int | None = None,
) -> dict:
    return {
        "transactionId": str(uuid.uuid4().int)[:16],
        "originalTransactionId": original_transaction_id or str(uuid.uuid4().int)[:16],
        "bundleId": bundle_id,
        "productId": product_id,
        "purchaseDate": _now_ms(),
        "originalPurchaseDate": _now_ms(),
        "quantity": 1,
        "type": tx_type,
        "inAppOwnershipType": "PURCHASED",
        "signedDate": _now_ms(),
        "environment": "Sandbox",
        "revocationDate": revocation_date,
    }


def _signed(pki: _PKI = _PKI_MAIN, **kwargs) -> str:
    return pki.sign(_transaction(**kwargs))


def _signed_notification(
    notification_type: str,
    *,
    pki: _PKI = _PKI_MAIN,
    notification_uuid: str | None = None,
    subtype: str | None = None,
    transaction: dict | None = None,
    include_transaction: bool = True,
    signed_date: int | None = None,
) -> str:
    """Build an App Store Server Notification (V2) envelope.

    The envelope and the transaction inside it are signed separately, exactly as
    Apple does it — which is what lets the tests below forge one without the
    other.
    """
    data: dict = {"bundleId": BUNDLE_ID, "environment": "Sandbox"}
    if include_transaction:
        data["signedTransactionInfo"] = pki.sign(transaction or _transaction())
    return pki.sign(
        {
            "notificationType": notification_type,
            "subtype": subtype,
            "notificationUUID": notification_uuid or str(uuid.uuid4()),
            "data": data,
            "version": "2.0",
            "signedDate": _now_ms() if signed_date is None else signed_date,
        }
    )


def _notify(client, signed_payload: str):
    return client.post("/purchases/notifications", json={"signedPayload": signed_payload})


# ── Fixtures ───────────────────────────────────────────────────────────────────

def apply_apple_test_settings(monkeypatch) -> None:
    """Point verification at the throwaway PKI, sandbox-only, no network.

    A plain function rather than only a fixture so other test modules can opt in
    — an autouse fixture defined here does not apply to them.
    """
    monkeypatch.setattr(settings, "APPLE_ROOT_CA_DIR", str(_PKI_MAIN.root_dir))
    monkeypatch.setattr(settings, "APPLE_ACCEPT_SANDBOX", True)
    monkeypatch.setattr(settings, "APPLE_APP_APPLE_ID", None)
    monkeypatch.setattr(settings, "APPLE_ENABLE_ONLINE_CHECKS", False)
    monkeypatch.setattr(settings, "APPLE_BUNDLE_ID", BUNDLE_ID)
    monkeypatch.setattr(settings, "APPLE_PRO_PRODUCT_ID", PRODUCT_ID)


@pytest.fixture(autouse=True)
def _apple_config(monkeypatch):
    apply_apple_test_settings(monkeypatch)
    yield


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    rl._hits.clear()
    yield
    rl._hits.clear()


def _email() -> str:
    return f"pro_{uuid.uuid4().hex[:8]}@landhere-tests.example.com"


def _account(client, password="password123") -> tuple[str, dict, str]:
    """Register a user; return (email, auth headers, password)."""
    email = _email()
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    return email, {"Authorization": f"Bearer {token}"}, password


def _buy(client, headers, **kwargs):
    return client.post(
        "/purchases/verify", json={"signed_transaction": _signed(**kwargs)}, headers=headers
    )


def _add_universities(count: int, prefix: str, base_score: float = 1000.0) -> str:
    """Insert scored universities and return the id of the first one.

    scorecard_id is UNIQUE NOT NULL, so each row needs its own; the prefix keeps
    tests from colliding in the session-scoped database.

    `base_score` matters more than it looks: the database is session-scoped, so
    every test's rows compete in one global ranking. A fixture that wants to sit
    *below* the free top-25 cut has to say so explicitly rather than reusing the
    default band.
    """
    from app.models.university import University
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        first_id = None
        for i in range(count):
            u = University(
                id=uuid.uuid4(),
                scorecard_id=f"{prefix}-{i}",
                name=f"{prefix} University {i}",
                country_code="US",
                has_full_score=True,
                landhere_score=base_score - i,
            )
            db.add(u)
            if first_id is None:
                first_id = str(u.id)
        db.commit()
        return first_id
    finally:
        db.close()


# ── Verification ───────────────────────────────────────────────────────────────

def test_valid_transaction_grants_pro(client):
    _, headers, _ = _account(client)
    r = _buy(client, headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["pro"] is True
    assert body["product_id"] == PRODUCT_ID
    assert body["environment"] == "Sandbox"

    e = client.get("/purchases/entitlements", headers=headers)
    assert e.status_code == 200
    assert e.json()["pro"] is True
    assert e.headers["cache-control"] == "no-store"


def test_new_account_has_no_entitlement(client):
    _, headers, _ = _account(client)
    r = client.get("/purchases/entitlements", headers=headers)
    assert r.status_code == 200
    assert r.json()["pro"] is False


def test_entitlements_requires_authentication(client):
    assert client.get("/purchases/entitlements").status_code == 401


def test_verify_requires_authentication(client):
    r = client.post("/purchases/verify", json={"signed_transaction": _signed()})
    assert r.status_code == 401


def test_tampered_payload_is_rejected(client):
    """Re-encode the payload without re-signing: the signature no longer matches."""
    _, headers, _ = _account(client)
    good = _signed()
    header_b64, payload_b64, signature = good.split(".")
    payload = json.loads(jwt.utils.base64url_decode(payload_b64))
    payload["productId"] = PRODUCT_ID  # unchanged value, but re-encoding breaks the sig
    payload["transactionId"] = "999999"
    forged_payload = jwt.utils.base64url_encode(
        json.dumps(payload).encode()
    ).decode()
    forged = f"{header_b64}.{forged_payload}.{signature}"

    r = client.post("/purchases/verify", json={"signed_transaction": forged}, headers=headers)
    assert r.status_code == 400
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_untrusted_root_is_rejected(client):
    """A perfectly-formed chain signed by someone who is not Apple."""
    _, headers, _ = _account(client)
    rogue = client.post(
        "/purchases/verify",
        json={"signed_transaction": _signed(pki=_PKI_ROGUE)},
        headers=headers,
    )
    assert rogue.status_code == 400
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_wrong_product_is_rejected(client):
    _, headers, _ = _account(client)
    r = _buy(client, headers, product_id="com.landhere.app.something_else")
    assert r.status_code == 400
    assert "different product" in r.json()["detail"].lower()


def test_wrong_bundle_id_is_rejected(client):
    _, headers, _ = _account(client)
    r = _buy(client, headers, bundle_id="com.someone.else")
    assert r.status_code == 400


def test_consumable_type_is_rejected(client):
    """Pro is non-consumable; anything else is not the product we sell."""
    _, headers, _ = _account(client)
    r = _buy(client, headers, tx_type="Consumable")
    assert r.status_code == 400


def test_revoked_transaction_does_not_grant_pro(client):
    """A refunded purchase verifies fine but must not entitle."""
    _, headers, _ = _account(client)
    r = _buy(client, headers, revocation_date=_now_ms())
    assert r.status_code == 200
    assert r.json()["pro"] is False
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_verification_unavailable_without_root_certificates(client, monkeypatch):
    """No trust anchors configured must mean 503, never an optimistic grant."""
    _, headers, _ = _account(client)
    monkeypatch.setattr(settings, "APPLE_ROOT_CA_DIR", "")
    r = _buy(client, headers)
    assert r.status_code == 503
    monkeypatch.setattr(settings, "APPLE_ROOT_CA_DIR", str(_PKI_MAIN.root_dir))
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_sandbox_rejected_when_not_accepted(client, monkeypatch):
    _, headers, _ = _account(client)
    monkeypatch.setattr(settings, "APPLE_ACCEPT_SANDBOX", False)
    r = _buy(client, headers)
    # No verifier can be constructed at all (no app id for Production), so this
    # is a configuration failure rather than a rejected transaction.
    assert r.status_code == 503


# ── Entitlement integrity ──────────────────────────────────────────────────────

def test_restore_is_idempotent(client):
    """Restoring the same purchase repeatedly stays one purchase, still Pro."""
    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    first = _buy(client, headers, original_transaction_id=original)
    second = _buy(client, headers, original_transaction_id=original)
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["pro"] is True

    from app.models.purchase import Purchase
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        rows = (
            db.query(Purchase)
            .filter(
                Purchase.platform == 'ios',
                Purchase.platform_transaction_id == original,
            )
            .count()
        )
    finally:
        db.close()
    assert rows == 1


def test_purchase_cannot_be_claimed_by_a_second_account(client):
    """The unique constraint is the entitlement model — prove it holds."""
    original = str(uuid.uuid4().int)[:16]
    _, buyer, _ = _account(client)
    assert _buy(client, buyer, original_transaction_id=original).status_code == 200

    _, freeloader, _ = _account(client)
    r = _buy(client, freeloader, original_transaction_id=original)
    assert r.status_code == 409
    assert client.get("/purchases/entitlements", headers=freeloader).json()["pro"] is False


def test_deleting_the_account_removes_the_purchase(client):
    """The privacy policy promises complete deletion; purchases are user data."""
    _, headers, password = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert _buy(client, headers, original_transaction_id=original).status_code == 200

    r = client.request(
        "DELETE", "/account", json={"password": password}, headers=headers
    )
    assert r.status_code == 204, r.text

    from app.models.purchase import Purchase
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        remaining = (
            db.query(Purchase)
            .filter(
                Purchase.platform == 'ios',
                Purchase.platform_transaction_id == original,
            )
            .count()
        )
    finally:
        db.close()
    assert remaining == 0


# ── App Store Server Notifications ─────────────────────────────────────────────
#
# This endpoint is unauthenticated because Apple calls it, so Apple's signature
# is the only thing standing between a stranger and a paying user's entitlement.
# These tests are about that boundary.

def _buy_with(client, headers, original: str):
    return _buy(client, headers, original_transaction_id=original)


def test_refund_notification_revokes_entitlement(client):
    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert _buy_with(client, headers, original).status_code == 200
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is True

    r = _notify(
        client,
        _signed_notification(
            "REFUND",
            transaction=_transaction(
                original_transaction_id=original, revocation_date=_now_ms()
            ),
        ),
    )
    assert r.status_code == 200, r.text
    assert r.json()["action"] == "revoked"
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_revoke_notification_revokes_entitlement(client):
    """REVOKE is the Family Sharing withdrawal case; same outcome as a refund."""
    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert _buy_with(client, headers, original).status_code == 200

    r = _notify(
        client,
        _signed_notification(
            "REVOKE", transaction=_transaction(original_transaction_id=original)
        ),
    )
    assert r.status_code == 200
    assert r.json()["action"] == "revoked"
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


def test_forged_notification_cannot_revoke_entitlement(client):
    """The denial-of-service case: a stranger revoking a paying user's access."""
    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert _buy_with(client, headers, original).status_code == 200

    forged = _signed_notification(
        "REFUND",
        pki=_PKI_ROGUE,
        transaction=_transaction(original_transaction_id=original),
    )
    r = _notify(client, forged)
    assert r.status_code == 400
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is True


def test_tampered_notification_envelope_is_rejected(client):
    """Re-encoding the envelope without re-signing must not be accepted."""
    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert _buy_with(client, headers, original).status_code == 200

    good = _signed_notification(
        "TEST", transaction=_transaction(original_transaction_id=original)
    )
    header_b64, payload_b64, signature = good.split(".")
    payload = json.loads(jwt.utils.base64url_decode(payload_b64))
    payload["notificationType"] = "REFUND"  # escalate TEST into a revocation
    forged_payload = jwt.utils.base64url_encode(json.dumps(payload).encode()).decode()

    r = _notify(client, f"{header_b64}.{forged_payload}.{signature}")
    assert r.status_code == 400
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is True


def test_duplicate_notification_is_idempotent(client):
    """Apple retries until it gets a 2xx, so duplicates are ordinary traffic."""
    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert _buy_with(client, headers, original).status_code == 200

    payload = _signed_notification(
        "REFUND",
        notification_uuid="fixed-uuid-for-duplicate-test",
        transaction=_transaction(original_transaction_id=original),
    )
    first = _notify(client, payload)
    second = _notify(client, payload)

    assert first.status_code == 200 and first.json()["duplicate"] is False
    assert second.status_code == 200 and second.json()["duplicate"] is True
    assert second.json()["action"] == "none"
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False

    from app.models.purchase import PurchaseNotification
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        rows = (
            db.query(PurchaseNotification)
            .filter(
                PurchaseNotification.notification_uuid
                == "fixed-uuid-for-duplicate-test"
            )
            .count()
        )
    finally:
        db.close()
    assert rows == 1


def test_refund_reversed_restores_entitlement(client):
    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert _buy_with(client, headers, original).status_code == 200

    _notify(
        client,
        _signed_notification(
            "REFUND", transaction=_transaction(original_transaction_id=original)
        ),
    )
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False

    r = _notify(
        client,
        _signed_notification(
            "REFUND_REVERSED",
            transaction=_transaction(original_transaction_id=original),
        ),
    )
    assert r.status_code == 200
    assert r.json()["action"] == "restored"
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is True


def test_test_notification_is_accepted_without_acting(client):
    """App Store Connect's "Request a Test Notification" carries no transaction."""
    r = _notify(client, _signed_notification("TEST", include_transaction=False))
    assert r.status_code == 200
    assert r.json() == {"received": True, "duplicate": False, "action": "none"}


def test_notification_for_unknown_transaction_is_accepted(client):
    """200, so Apple stops retrying — but nothing to act on."""
    r = _notify(
        client,
        _signed_notification(
            "REFUND",
            transaction=_transaction(original_transaction_id="9999999999999999"),
        ),
    )
    assert r.status_code == 200
    assert r.json()["action"] == "none"


def test_revoked_purchase_loses_the_pro_gates(client):
    """Entitlement is one decision, so a refund must close every gate at once."""
    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert _buy_with(client, headers, original).status_code == 200
    uni_id = _add_universities(1, f"revoke-gate-{uuid.uuid4().hex[:6]}")
    assert client.get(f"/universities/{uni_id}", headers=headers).status_code == 200

    _notify(
        client,
        _signed_notification(
            "REFUND", transaction=_transaction(original_transaction_id=original)
        ),
    )

    assert client.get(f"/universities/{uni_id}", headers=headers).status_code == 403
    journey = client.get(
        "/info/journey", params={"destination": "US", "origin": "IN"}, headers=headers
    ).json()
    assert journey["pro_required"] is True
    assert {p["phase"] for p in journey["phases"]} <= FREE_PHASES


def test_notification_verification_unavailable_returns_503(client, monkeypatch):
    """Never drop a refund silently — 503 so Apple retries once configured."""
    monkeypatch.setattr(settings, "APPLE_ROOT_CA_DIR", "")
    r = _notify(client, _signed_notification("REFUND"))
    assert r.status_code == 503


# ── Event ordering ─────────────────────────────────────────────────────────────
#
# Arrival order is not event order. Apple documents signedDate as "the UNIX time,
# in milliseconds, that the App Store signed the JSON Web Signature data" — the
# App Store's own timestamp for when the event happened. A retry or queue delay
# can deliver a REFUND after the REFUND_REVERSED that undid it.

def _buy_for_ordering(client):
    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert _buy(client, headers, original_transaction_id=original).status_code == 200
    return headers, original


def _pro(client, headers) -> bool:
    return client.get("/purchases/entitlements", headers=headers).json()["pro"]


def test_refund_then_reversal_in_order_restores_access(client):
    headers, original = _buy_for_ordering(client)
    t0 = _now_ms()

    r1 = _notify(client, _signed_notification(
        "REFUND", signed_date=t0,
        transaction=_transaction(original_transaction_id=original)))
    assert r1.json()["action"] == "revoked"
    assert _pro(client, headers) is False

    r2 = _notify(client, _signed_notification(
        "REFUND_REVERSED", signed_date=t0 + 60_000,
        transaction=_transaction(original_transaction_id=original)))
    assert r2.json()["action"] == "restored"
    assert _pro(client, headers) is True


def test_a_delayed_refund_cannot_undo_a_newer_reversal(client):
    """The case the old last-write-wins model got wrong.

    The reversal happened later but arrived first. Applying the refund on
    arrival would lock a paying customer out of something they own.
    """
    headers, original = _buy_for_ordering(client)
    t0 = _now_ms()

    # Reversal (later event) arrives first.
    r1 = _notify(client, _signed_notification(
        "REFUND_REVERSED", signed_date=t0 + 60_000,
        transaction=_transaction(original_transaction_id=original)))
    assert r1.json()["action"] == "restored"

    # The refund it reversed (earlier event) arrives late.
    r2 = _notify(client, _signed_notification(
        "REFUND", signed_date=t0,
        transaction=_transaction(
            original_transaction_id=original, revocation_date=t0)))
    assert r2.status_code == 200
    assert r2.json()["action"] == "ignored_stale", "a stale refund was applied"
    assert _pro(client, headers) is True, "a delayed refund revoked a valid purchase"


def test_duplicate_delivery_of_the_same_event_changes_nothing(client):
    """Apple documents notificationUUID as the way to spot a duplicate."""
    headers, original = _buy_for_ordering(client)
    payload = _signed_notification(
        "REFUND", notification_uuid="ordering-dup-test",
        transaction=_transaction(original_transaction_id=original))

    first = _notify(client, payload)
    second = _notify(client, payload)
    assert first.json() == {"received": True, "duplicate": False, "action": "revoked"}
    assert second.json()["duplicate"] is True
    assert second.json()["action"] == "none"
    assert _pro(client, headers) is False


def test_two_distinct_refunds_at_the_same_instant_both_apply(client):
    """Equal timestamps must not be treated as stale.

    Apple can sign two events in the same millisecond, and duplicates are
    already handled by notificationUUID — so treating equal as stale would drop
    a real second event.
    """
    headers, original = _buy_for_ordering(client)
    t0 = _now_ms()
    _notify(client, _signed_notification(
        "REFUND", signed_date=t0,
        transaction=_transaction(original_transaction_id=original)))
    r = _notify(client, _signed_notification(
        "REFUND_REVERSED", signed_date=t0,
        transaction=_transaction(original_transaction_id=original)))
    assert r.json()["action"] == "restored", "an equal-timestamp event was dropped"
    assert _pro(client, headers) is True


def test_ordering_is_tracked_per_purchase_not_globally(client):
    """A late event for one purchase must not block a newer one for another."""
    headers_a, original_a = _buy_for_ordering(client)
    headers_b, original_b = _buy_for_ordering(client)
    t0 = _now_ms()

    _notify(client, _signed_notification(
        "REFUND", signed_date=t0 + 60_000,
        transaction=_transaction(original_transaction_id=original_a)))
    r = _notify(client, _signed_notification(
        "REFUND", signed_date=t0,
        transaction=_transaction(original_transaction_id=original_b)))

    assert r.json()["action"] == "revoked", "purchase B was blocked by purchase A's event"
    assert _pro(client, headers_a) is False
    assert _pro(client, headers_b) is False


def test_an_event_for_a_deleted_account_is_accepted_without_error(client):
    """The purchase row went with the account; the notification still arrives."""
    _, headers, password = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert _buy(client, headers, original_transaction_id=original).status_code == 200
    assert client.request(
        "DELETE", "/account", json={"password": password}, headers=headers
    ).status_code == 204

    r = _notify(client, _signed_notification(
        "REFUND", transaction=_transaction(original_transaction_id=original)))
    assert r.status_code == 200
    assert r.json()["action"] == "none"


# ── Server-enforced Pro gates ──────────────────────────────────────────────────

FREE_PHASES = {"before_applying", "after_acceptance"}


def test_journey_is_truncated_for_anonymous_callers(client):
    r = client.get("/info/journey", params={"destination": "US", "origin": "IN"})
    assert r.status_code == 200
    body = r.json()
    assert body["pro_required"] is True
    assert {p["phase"] for p in body["phases"]} <= FREE_PHASES
    assert body["locked_phases"]
    # The gate must withhold content, not merely label it.
    assert "visa_process" not in json.dumps(body["phases"])


def test_journey_is_truncated_for_a_signed_in_free_user(client):
    _, headers, _ = _account(client)
    r = client.get(
        "/info/journey", params={"destination": "US", "origin": "IN"}, headers=headers
    )
    assert r.json()["pro_required"] is True
    assert {p["phase"] for p in r.json()["phases"]} <= FREE_PHASES


def test_journey_is_complete_for_a_pro_user(client):
    _, headers, _ = _account(client)
    assert _buy(client, headers).status_code == 200
    r = client.get(
        "/info/journey", params={"destination": "US", "origin": "IN"}, headers=headers
    )
    body = r.json()
    assert body["pro_required"] is False
    assert body["locked_phases"] == []
    assert {p["phase"] for p in body["phases"]} - FREE_PHASES, "expected gated phases back"


def test_journey_response_is_never_shared_cached(client):
    """It varies by entitlement, so a shared cache would leak Pro content."""
    r = client.get("/info/journey", params={"destination": "US", "origin": "IN"})
    assert "public" not in r.headers.get("cache-control", "")


def test_university_detail_requires_pro(client):
    uni_id = _add_universities(1, "detail-gate")

    assert client.get(f"/universities/{uni_id}").status_code == 401

    _, free_headers, _ = _account(client)
    forbidden = client.get(f"/universities/{uni_id}", headers=free_headers)
    assert forbidden.status_code == 403
    assert "Pro" in forbidden.json()["detail"]

    _, pro_headers, _ = _account(client)
    assert _buy(client, pro_headers).status_code == 200
    assert client.get(f"/universities/{uni_id}", headers=pro_headers).status_code == 200


def test_rankings_list_is_clamped_for_free_users(client):
    _add_universities(40, "clamp")

    free = client.get("/universities", params={"limit": 200, "offset": 0})
    assert free.status_code == 200
    assert len(free.json()) <= 25
    assert free.headers.get("X-Pro-Required") == "1"

    # Paging past the free window yields nothing rather than more rows.
    past = client.get("/universities", params={"limit": 50, "offset": 25})
    assert past.status_code == 200
    assert past.json() == []

    _, pro_headers, _ = _account(client)
    assert _buy(client, pro_headers).status_code == 200
    paid = client.get(
        "/universities", params={"limit": 200, "offset": 0}, headers=pro_headers
    )
    assert len(paid.json()) > 25
    assert "X-Pro-Required" not in paid.headers


def test_free_search_cannot_reach_a_university_outside_the_global_top_25(client):
    """The free tier is the top 25 universities — not the top 25 of any query.

    Capping the paginated window caps the *filtered* result set, so a free
    caller could name a low-ranked school with ?search= and receive its row,
    or walk the whole table one ?state= at a time. The cap has to be applied to
    the global ranking before the caller's filters, and this proves it is.
    """
    run = uuid.uuid4().hex[:6]
    # Fill the free window with a high-scoring set, then add the ones under test
    # in a low band. Doing both here keeps the test independent of run order —
    # the database is session-scoped, and on its own the low set would *be* the
    # global top 25.
    _add_universities(30, f"topband-{run}", base_score=100_000.0)
    prefix = f"deepcut-{run}"
    _add_universities(60, prefix, base_score=10.0)

    deep_name = f"{prefix} University 59"

    free = client.get("/universities", params={"search": deep_name, "limit": 200})
    assert free.status_code == 200
    assert free.json() == [], "a free caller reached a university past the free window"

    # A broad filter must not become its own ranking either: searching the
    # shared prefix matches all 60 rows, and a free caller must still see none
    # of them, because none is in the global top 25.
    broad = client.get("/universities", params={"search": prefix, "limit": 200})
    assert broad.json() == [], "a broad filter produced its own top-25 window"

    _, pro_headers, _ = _account(client)
    assert _buy(client, pro_headers).status_code == 200
    paid = client.get(
        "/universities", params={"search": deep_name, "limit": 200}, headers=pro_headers
    )
    assert [u["name"] for u in paid.json()] == [deep_name]
