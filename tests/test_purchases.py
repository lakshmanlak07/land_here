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


def _add_universities(count: int, prefix: str) -> str:
    """Insert scored universities and return the id of the first one.

    scorecard_id is UNIQUE NOT NULL, so each row needs its own; the prefix keeps
    tests from colliding in the session-scoped database.
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
                landhere_score=float(1000 - i),
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
            .filter(Purchase.original_transaction_id == original)
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
            .filter(Purchase.original_transaction_id == original)
            .count()
        )
    finally:
        db.close()
    assert remaining == 0


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
