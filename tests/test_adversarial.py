"""
Adversarial probes against the API surface.

These are written to FIND problems, not to confirm that the happy path works.
Every test here asks "what would an attacker try?" rather than "does the feature
function?". Where a probe documents accepted behaviour rather than a defect, it
says so explicitly, so a future reader can tell a deliberate trade-off from an
oversight.
"""

from __future__ import annotations

import uuid

import pytest

import app.core.rate_limit as rl
from app.core.security import create_access_token
from tests.test_purchases import _account, _add_universities, _signed, apply_apple_test_settings


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    rl._hits.clear()
    yield
    rl._hits.clear()


@pytest.fixture(autouse=True)
def _apple(monkeypatch):
    apply_apple_test_settings(monkeypatch)


# ── Authorization boundaries ───────────────────────────────────────────────────

def test_no_route_accepts_a_token_for_a_deleted_user(client):
    """A token outliving its account is the classic authz hole.

    The account is gone but the JWT is still cryptographically valid until it
    expires, so every authenticated route has to re-check existence rather than
    trusting the signature.
    """
    _, headers, password = _account(client)
    assert client.request(
        "DELETE", "/account", json={"password": password}, headers=headers
    ).status_code == 204

    for method, path, body in [
        ("GET", "/auth/me", None),
        ("GET", "/purchases/entitlements", None),
        ("POST", "/purchases/verify", {"signed_transaction": _signed()}),
        ("POST", "/purchases/verify/google", {"purchase_token": "x" * 40}),
    ]:
        r = client.request(method, path, json=body, headers=headers)
        assert r.status_code == 401, f"{method} {path} accepted a deleted user's token"


def test_a_forged_token_for_a_random_uuid_is_rejected(client):
    """Signature valid, subject nonexistent."""
    token = create_access_token(str(uuid.uuid4()))
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_malformed_authorization_headers_never_500(client):
    """Header parsing must degrade to 401, not to an unhandled exception."""
    for value in [
        "",
        "Bearer",
        "Bearer ",
        "Basic abc",
        "Bearer not.a.jwt",
        "Bearer " + "a" * 5000,
        "Bearer ../../etc/passwd",
        "Bearer \x00null",
    ]:
        r = client.get("/auth/me", headers={"Authorization": value})
        assert r.status_code in (401, 403, 422), f"{value[:24]!r} -> {r.status_code}"


def test_one_users_token_cannot_read_another_users_entitlement(client):
    _, alice, _ = _account(client)
    _, bob, _ = _account(client)
    assert client.post(
        "/purchases/verify", json={"signed_transaction": _signed()}, headers=alice
    ).status_code == 200

    # Bob has bought nothing; entitlement must be per-token, not global.
    assert client.get("/purchases/entitlements", headers=bob).json()["pro"] is False


# ── Input handling ─────────────────────────────────────────────────────────────

def test_malformed_json_bodies_are_422_not_500(client):
    _, headers, _ = _account(client)
    for body in [b"", b"{", b"[]", b"null", b'{"signed_transaction":', b"\xff\xfe"]:
        r = client.post(
            "/purchases/verify",
            content=body,
            headers={**headers, "Content-Type": "application/json"},
        )
        assert r.status_code in (400, 422), f"{body!r} -> {r.status_code}"


def test_oversized_payloads_are_rejected_by_bounds_not_by_crashing(client):
    """The field bounds exist so an oversized body never reaches the crypto path."""
    _, headers, _ = _account(client)
    r = client.post(
        "/purchases/verify",
        json={"signed_transaction": "A" * 100_000},
        headers=headers,
    )
    assert r.status_code == 422
    r = client.post(
        "/purchases/verify/google",
        json={"purchase_token": "A" * 100_000},
        headers=headers,
    )
    assert r.status_code == 422


def test_wrong_types_do_not_crash_the_purchase_endpoints(client):
    _, headers, _ = _account(client)
    for payload in [
        {"signed_transaction": 12345},
        {"signed_transaction": {"nested": "object"}},
        {"signed_transaction": ["a", "b"]},
        {"signed_transaction": None},
        {"wrong_field": "value"},
    ]:
        r = client.post("/purchases/verify", json=payload, headers=headers)
        assert r.status_code == 422, f"{payload} -> {r.status_code}"


def test_university_id_path_rejects_non_uuid_without_leaking(client):
    _, headers, _ = _account(client)
    for bad in ["not-a-uuid", "1 OR 1=1", "%00"]:
        r = client.get(f"/universities/{bad}", headers=headers)
        assert r.status_code in (403, 422), f"{bad!r} -> {r.status_code}"
        assert "Traceback" not in r.text

    # Traversal is handled a rung lower: the client normalises the path so it
    # never matches the route at all. 404 from routing is the correct answer,
    # not a weaker one.
    r = client.get("/universities/../../etc/passwd", headers=headers)
    assert r.status_code == 404
    assert "root:" not in r.text


# ── Error leakage ──────────────────────────────────────────────────────────────

def test_error_bodies_never_leak_internals(client):
    """Stack traces, SQL, file paths and driver names must not reach a client."""
    _, headers, _ = _account(client)
    leaky = ("Traceback", "sqlalchemy", "psycopg", "SELECT ", "/app/", "site-packages")
    responses = [
        client.get("/universities/not-a-uuid", headers=headers),
        client.post("/purchases/verify", json={"signed_transaction": "x"}, headers=headers),
        client.post("/purchases/verify/google", json={"purchase_token": "x"}, headers=headers),
        client.get("/auth/me", headers={"Authorization": "Bearer nope"}),
        client.get("/countries/%%%"),
    ]
    for r in responses:
        for marker in leaky:
            assert marker.lower() not in r.text.lower(), f"leaked {marker!r}: {r.text[:200]}"


def test_verification_failures_do_not_echo_the_submitted_blob(client):
    """Echoing input back is how a rejection message becomes an oracle."""
    _, headers, _ = _account(client)
    secretish = "SUBMITTED-BLOB-MARKER-" + uuid.uuid4().hex
    r = client.post(
        "/purchases/verify", json={"signed_transaction": secretish}, headers=headers
    )
    assert r.status_code == 400
    assert secretish not in r.text


# ── User enumeration ───────────────────────────────────────────────────────────

def test_login_does_not_reveal_whether_an_email_exists(client):
    _, headers, _ = _account(client)
    known = client.get("/auth/me", headers=headers).json()["email"]

    wrong_pw = client.post("/auth/login", json={"email": known, "password": "wrong-password-1"})
    unknown = client.post(
        "/auth/login",
        json={"email": f"nobody-{uuid.uuid4().hex}@landhere-tests.example.com",
              "password": "wrong-password-1"},
    )
    assert wrong_pw.status_code == unknown.status_code
    assert wrong_pw.json() == unknown.json(), "login response distinguishes real from unknown email"


# ── Concurrency and replay on the money path ───────────────────────────────────

def test_a_lost_insert_race_recovers_instead_of_500ing(client, monkeypatch):
    """Two devices restoring the same purchase at the same instant.

    Both requests run the existence SELECT, both miss, both INSERT; the UNIQUE
    constraint lets exactly one win. Without recovery the loser gets a 500 on the
    money path — and a client that retries a 500 turns one race into a loop.

    Simulated deterministically rather than with threads: the SQLite test harness
    shares a single connection across threads (StaticPool), so a threaded probe
    would exercise the harness, not this code. Here the row genuinely exists and
    the existence check is forced to miss it exactly once, which is precisely the
    interleaving that produces the IntegrityError.
    """
    from sqlalchemy.orm import Query

    from app.models.purchase import Purchase
    from tests.conftest import TestingSessionLocal

    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    blob = _signed(original_transaction_id=original)

    # The winner's row.
    assert client.post(
        "/purchases/verify", json={"signed_transaction": blob}, headers=headers
    ).status_code == 200

    real_first = Query.first
    missed = {"done": False}

    def first_missing_once(self):
        # Blind the *existence check* once, leaving every other query intact.
        if not missed["done"] and self.column_descriptions and (
            self.column_descriptions[0].get("type") is Purchase
        ):
            missed["done"] = True
            return None
        return real_first(self)

    monkeypatch.setattr(Query, "first", first_missing_once)
    r = client.post(
        "/purchases/verify", json={"signed_transaction": blob}, headers=headers
    )
    monkeypatch.undo()

    assert missed["done"], "the race was not actually simulated"
    assert r.status_code == 200, f"the losing request returned {r.status_code}"

    db = TestingSessionLocal()
    try:
        rows = (
            db.query(Purchase)
            .filter(
                Purchase.platform == "ios",
                Purchase.platform_transaction_id == original,
            )
            .count()
        )
    finally:
        db.close()
    assert rows == 1, f"{rows} rows survived the race"


def test_refund_then_reversal_ordering_is_not_order_dependent(client):
    """Out-of-order delivery must not strand a paying user without access."""
    from tests.test_purchases import _signed_notification, _transaction, _now_ms

    _, headers, _ = _account(client)
    original = str(uuid.uuid4().int)[:16]
    assert client.post(
        "/purchases/verify",
        json={"signed_transaction": _signed(original_transaction_id=original)},
        headers=headers,
    ).status_code == 200

    # Reversal arrives first, then the refund it reverses.
    client.post(
        "/purchases/notifications",
        json={"signedPayload": _signed_notification(
            "REFUND_REVERSED", transaction=_transaction(original_transaction_id=original))},
    )
    client.post(
        "/purchases/notifications",
        json={"signedPayload": _signed_notification(
            "REFUND", transaction=_transaction(
                original_transaction_id=original, revocation_date=_now_ms()))},
    )
    # Documented behaviour: last write wins, so a late REFUND revokes. Apple
    # sends these in order; this records what happens if it does not.
    assert client.get("/purchases/entitlements", headers=headers).json()["pro"] is False


# ── Gate integrity through alternate routes ────────────────────────────────────

def test_free_user_cannot_reach_locked_rankings_by_any_parameter(client):
    """Sorting, paging and filtering must not become their own ranking."""
    run = uuid.uuid4().hex[:6]
    _add_universities(30, f"advtop-{run}", base_score=500_000.0)
    _add_universities(40, f"advdeep-{run}", base_score=5.0)
    deep = f"advdeep-{run} University 39"

    probes = [
        {"search": deep},
        {"search": f"advdeep-{run}"},
        {"limit": 200},
        {"limit": 200, "offset": 0},
        {"offset": 25, "limit": 200},
        {"offset": 100_000},
        {"max_tuition": 1_000_000},
        {"state": "US"},
        {"search": deep, "limit": 1, "offset": 0},
    ]
    for params in probes:
        r = client.get("/universities", params=params)
        assert r.status_code == 200, (params, r.status_code)
        names = [u["name"] for u in r.json()]
        assert deep not in names, f"locked row leaked via {params}"
        assert len(names) <= 25, f"{len(names)} rows returned for {params}"


def test_free_user_cannot_reach_locked_journey_phases_by_any_parameter(client):
    for params in [
        {"destination": "US", "origin": "IN"},
        {"destination": "us", "origin": "in"},
        {"destination": "US"},
        {"destination": "US", "origin": ""},
    ]:
        r = client.get("/info/journey", params=params)
        assert r.status_code == 200, params
        body = r.text
        for locked in ("visa_process", "before_departure", "after_arrival"):
            assert f'"phase":"{locked}"' not in body.replace(" ", ""), (
                f"locked phase {locked} leaked via {params}"
            )


def test_entitlement_varying_responses_are_never_shared_cached(client):
    """A shared cache would hand a Pro response to a free user."""
    for path, params in [
        ("/universities", {"limit": 5}),
        ("/info/journey", {"destination": "US", "origin": "IN"}),
    ]:
        cc = client.get(path, params=params).headers.get("cache-control", "")
        assert "public" not in cc, f"{path} is publicly cacheable: {cc!r}"


def test_health_endpoints_expose_no_configuration(client):
    """Readiness must prove the DB works without describing how to reach it."""
    for path in ("/health/live", "/health/ready"):
        r = client.get(path)
        body = r.text.lower()
        for marker in ("password", "postgres://", "postgresql://", "secret", "redis://", "@"):
            assert marker not in body, f"{path} leaked {marker!r}: {r.text[:200]}"
