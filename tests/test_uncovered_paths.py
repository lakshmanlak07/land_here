"""
Paths the 2026-10-16 coverage review found untested: expired tokens, refresh
after account deletion, logout isolation between devices, readiness failure,
database outage, the progress conflict retry, and the guides route.
"""

import uuid

import pytest
from sqlalchemy.exc import IntegrityError, OperationalError

from app.core.security import ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE, _create_token
from tests.test_purchases import _email


def _register(client):
    email = _email()
    r = client.post("/auth/register", json={"email": email, "password": "password123"})
    assert r.status_code == 201, r.text
    return email, r.json()


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 200, r.text
    return r.json()


def _auth(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


# ── tokens ─────────────────────────────────────────────────────────────────────

def test_expired_access_token_is_401(client):
    _, tokens = _register(client)
    me = client.get("/auth/me", headers=_auth(tokens)).json()
    expired, _ = _create_token(me["id"], expires_minutes=-1, token_type=ACCESS_TOKEN_TYPE)
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401


def test_expired_refresh_token_is_401(client):
    _, tokens = _register(client)
    me = client.get("/auth/me", headers=_auth(tokens)).json()
    expired, _ = _create_token(me["id"], expires_minutes=-1, token_type=REFRESH_TOKEN_TYPE,
                               jti=str(uuid.uuid4()))
    assert client.post("/auth/refresh", json={"refresh_token": expired}).status_code == 401


def test_refresh_after_account_deletion_is_401(client):
    _, tokens = _register(client)
    r = client.request("DELETE", "/account", json={"password": "password123"}, headers=_auth(tokens))
    assert r.status_code == 204
    assert client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401


def test_logout_on_one_device_keeps_the_other_signed_in(client):
    email, phone = _register(client)
    tablet = _login(client, email)
    assert client.post("/auth/logout", json={"refresh_token": phone["refresh_token"]}).status_code == 204
    assert client.post("/auth/refresh", json={"refresh_token": phone["refresh_token"]}).status_code == 401
    assert client.post("/auth/refresh", json={"refresh_token": tablet["refresh_token"]}).status_code == 200


def test_oversized_refresh_token_is_422(client):
    assert client.post("/auth/refresh", json={"refresh_token": "x" * 5000}).status_code == 422


# ── readiness and database outage ──────────────────────────────────────────────

def test_readiness_reports_503_when_the_database_is_down(client, monkeypatch):
    import app.main as main

    monkeypatch.setattr(main, "_check_database", lambda: False)
    monkeypatch.setitem(main._ready_cache, "at", 0.0)
    r = client.get("/health/ready")
    assert r.status_code == 503 and r.json() == {"status": "unavailable"}
    monkeypatch.setitem(main._ready_cache, "at", 0.0)


def test_database_outage_is_a_clean_503(client, monkeypatch):
    """A dropped or refused DB connection is transient: 503 + Retry-After with
    the request id, never a stack trace."""
    import app.routes.progress as progress

    _, tokens = _register(client)

    def down(*a, **k):
        raise OperationalError("SELECT 1", {}, Exception("server closed the connection: secret-host"))

    monkeypatch.setattr(progress, "_progress_for", down)
    r = client.get("/progress", headers=_auth(tokens))
    assert r.status_code == 503
    assert r.headers["retry-after"] == "2"
    assert len(r.headers["x-request-id"]) >= 8
    assert "secret-host" not in r.text


# ── progress conflict retry ────────────────────────────────────────────────────

def _a_step_id(client, tokens):
    j = client.get("/info/journey", params={"origin": "IN", "destination": "US"}, headers=_auth(tokens))
    return j.json()["phases"][0]["steps"][0]["id"]


def test_progress_write_retries_a_concurrent_insert_conflict(client, monkeypatch):
    import app.routes.progress as progress

    _, tokens = _register(client)
    step = _a_step_id(client, tokens)
    real, calls = progress._apply, []

    def flaky(db, user, final):
        calls.append(1)
        if len(calls) == 1:
            raise IntegrityError("INSERT", {}, Exception("duplicate key"))
        return real(db, user, final)

    monkeypatch.setattr(progress, "_apply", flaky)
    r = client.post("/progress", json={"changes": [{"step_id": step, "completed": True}]},
                    headers=_auth(tokens))
    assert r.status_code == 200 and step in r.json()["completed_step_ids"]
    assert len(calls) == 2


def test_progress_gives_up_after_three_conflicts(client, monkeypatch):
    import app.routes.progress as progress
    from fastapi.testclient import TestClient
    from app.main import app

    _, tokens = _register(client)
    step = _a_step_id(client, tokens)

    def always(db, user, final):
        raise IntegrityError("INSERT", {}, Exception("duplicate key"))

    monkeypatch.setattr(progress, "_apply", always)
    r = TestClient(app, raise_server_exceptions=False).post(
        "/progress", json={"changes": [{"step_id": step, "completed": True}]}, headers=_auth(tokens))
    assert r.status_code == 500 and "duplicate key" not in r.text


def test_progress_rejects_an_empty_batch_and_accepts_exactly_200(client):
    _, tokens = _register(client)
    h = _auth(tokens)
    assert client.post("/progress", json={"changes": []}, headers=h).status_code == 422
    changes = [{"step_id": str(uuid.uuid4()), "completed": True} for _ in range(200)]
    r = client.post("/progress", json={"changes": changes}, headers=h)
    assert r.status_code == 200 and len(r.json()["ignored_step_ids"]) == 200


# ── guides ─────────────────────────────────────────────────────────────────────

def test_guides_unknown_country_is_404(client):
    assert client.get("/guides/ZZ").status_code == 404


@pytest.fixture()
def us_guides():
    from app.models.country_guide import CountryGuide
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    rows = [CountryGuide(country_code="US", section=s, title=f"Guide {s}", content="x")
            for s in ("banking", "housing")]
    db.add_all(rows)
    db.commit()
    yield
    for r in rows:
        db.delete(r)
    db.commit()
    db.close()


@pytest.mark.parametrize("code", ["US", "us"])
def test_guides_are_case_insensitive_and_section_filtered(client, us_guides, code):
    r = client.get(f"/guides/{code}")
    assert r.status_code == 200
    rows = r.json()
    assert rows and all(g["country_code"] == "US" for g in rows)
    section = rows[0]["section"]
    filtered = client.get(f"/guides/{code}", params={"section": section.upper()}).json()
    assert filtered and all(g["section"] == section for g in filtered)


# ── boot (app/core/boot.py) ────────────────────────────────────────────────────

def test_boot_purge_deletes_only_expired_tokens(client):
    from datetime import datetime, timedelta, timezone

    from app.core.boot import purge_expired_tokens
    from app.models.refresh_token import RefreshToken
    from tests.conftest import TestingSessionLocal, engine

    _, tokens = _register(client)
    db = TestingSessionLocal()
    user_id = db.query(RefreshToken.user_id).first()[0]
    old = RefreshToken(id=uuid.uuid4(), user_id=user_id, family_id=uuid.uuid4(),
                       expires_at=datetime.now(timezone.utc) - timedelta(days=1))
    db.add(old)
    db.commit()
    live_before = db.query(RefreshToken).filter(RefreshToken.id != old.id).count()
    db.close()

    with engine.connect() as conn:
        refresh_deleted, _ = purge_expired_tokens(conn)
    db = TestingSessionLocal()
    assert refresh_deleted >= 1
    assert db.get(RefreshToken, old.id) is None
    assert db.query(RefreshToken).count() == live_before
    db.close()
    assert client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 200


def test_boot_survives_a_failed_token_purge(monkeypatch):
    import app.core.boot as boot

    ran = []
    monkeypatch.setattr(boot.subprocess, "run", lambda cmd, check: ran.append(cmd[2:]))
    monkeypatch.setattr(boot, "purge_expired_tokens",
                        lambda conn: (_ for _ in ()).throw(OperationalError("DELETE", {}, Exception("gone"))))
    monkeypatch.setenv("LOAD_REFERENCE_DATA", "true")
    assert boot.main() == 0
    assert ran == [["alembic", "upgrade", "head"], ["app.core.seed"], ["app.core.universities_dataset", "load"]]


def test_boot_fails_when_a_step_fails(monkeypatch):
    import subprocess

    import app.core.boot as boot

    def fail(cmd, check):
        raise subprocess.CalledProcessError(1, cmd)

    monkeypatch.setattr(boot.subprocess, "run", fail)
    with pytest.raises(subprocess.CalledProcessError):
        boot.main()
