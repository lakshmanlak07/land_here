"""
Security-focused tests: rate limiting at the request boundary, input caps,
auth hardening, health probes, and the server-side image lookup.
"""

import uuid

import pytest

import app.core.rate_limit as rl
from app.core.security import create_access_token


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Each test gets a clean limiter state so tests can't starve each other."""
    rl._hits.clear()
    yield
    rl._hits.clear()


def _email():
    return f"sec_{uuid.uuid4().hex[:8]}@landhere-tests.example.com"


def _register(client, email=None, password="password123"):
    r = client.post(
        "/auth/register",
        json={"email": email or _email(), "password": password},
    )
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


# ── Rate limiting ──────────────────────────────────────────────────────────────

def test_login_per_account_lockout_and_recovery(client):
    email = _email()
    _register(client, email=email, password="correct-horse1")
    # 10 allowed attempts per account per window, then 429 even with the
    # RIGHT password — and 429 must not reveal whether the account exists.
    for _ in range(10):
        r = client.post("/auth/login", json={"email": email, "password": "wrong"})
        assert r.status_code == 401
    r = client.post("/auth/login", json={"email": email, "password": "correct-horse1"})
    assert r.status_code == 429
    assert "Retry-After" in r.headers

    r2 = client.post(
        "/auth/login",
        json={"email": _email(), "password": "wrong"},
    )
    # Different account: own bucket, still allowed (401, not 429).
    assert r2.status_code == 401


def test_login_429_identical_for_nonexistent_account(client):
    email = _email()  # never registered
    for _ in range(10):
        r = client.post("/auth/login", json={"email": email, "password": "x" * 8})
        assert r.status_code == 401
    r = client.post("/auth/login", json={"email": email, "password": "x" * 8})
    assert r.status_code == 429  # same behavior as an existing account


def test_register_rate_limit_hits_429(client):
    for i in range(15):
        client.post("/auth/register", json={"email": _email(), "password": "password123"})
    r = client.post("/auth/register", json={"email": _email(), "password": "password123"})
    assert r.status_code == 429


# ── Input validation / adversarial ─────────────────────────────────────────────

def test_universities_rejects_oversized_inputs(client):
    assert client.get("/universities", params={"search": "x" * 101}).status_code == 422
    assert client.get("/universities", params={"state": "x" * 51}).status_code == 422
    assert client.get("/universities", params={"limit": 501}).status_code == 422
    assert client.get("/universities", params={"offset": 100_001}).status_code == 422
    assert client.get("/universities", params={"max_tuition": -1}).status_code == 422


def test_universities_wildcard_search_is_safe(client):
    # % and _ are LIKE wildcards; must not error or leak (parameter-bound).
    r = client.get("/universities", params={"search": "%' OR 1=1 --"})
    assert r.status_code == 200
    assert r.json() == []


def test_register_rejects_oversized_password(client):
    r = client.post(
        "/auth/register", json={"email": _email(), "password": "x" * 129}
    )
    assert r.status_code == 422


# ── Auth hardening ─────────────────────────────────────────────────────────────

def test_garbage_jwt_sub_is_401_not_500(client):
    token = create_access_token("not-a-uuid")
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_token_for_deleted_user_is_401(client):
    token = create_access_token(str(uuid.uuid4()))
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_unauthenticated_me_is_401(client):
    assert client.get("/auth/me").status_code == 401


# ── Health probes ──────────────────────────────────────────────────────────────

def test_liveness_and_readiness(client):
    assert client.get("/health/live").status_code == 200
    # Test DB (SQLite in-memory) is up, so readiness passes.
    assert client.get("/health/ready").status_code == 200


# ── Server-side image lookup ───────────────────────────────────────────────────

def test_images_requires_auth(client):
    assert client.get("/images/city", params={"query": "Boston"}).status_code == 401


def test_images_query_caps(client):
    token = _register(client)
    h = {"Authorization": f"Bearer {token}"}
    assert client.get("/images/city", params={"query": "x" * 81}, headers=h).status_code == 422
    assert client.get("/images/city", params={"query": ""}, headers=h).status_code == 422


def test_images_503_when_unconfigured(client):
    # No UNSPLASH_ACCESS_KEY in the test env → explicit 503, never an
    # accidental call to Unsplash.
    token = _register(client)
    r = client.get(
        "/images/city",
        params={"query": "Boston"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 503


def test_images_serves_from_cache(client, monkeypatch):
    from app.routes import images as img

    monkeypatch.setattr(img.settings, "UNSPLASH_ACCESS_KEY", "test-key")
    calls = []

    def fake_fetch(q):
        calls.append(q)
        return {"url": "https://images.unsplash.com/x", "credit": "A · Unsplash"}

    monkeypatch.setattr(img, "_fetch_unsplash", fake_fetch)
    img._cache.clear()

    token = _register(client)
    h = {"Authorization": f"Bearer {token}"}
    r1 = client.get("/images/city", params={"query": "Boston"}, headers=h)
    r2 = client.get("/images/city", params={"query": "boston"}, headers=h)
    assert r1.status_code == r2.status_code == 200
    assert r1.json()["url"] == "https://images.unsplash.com/x"
    assert calls == ["boston"]  # normalized, fetched exactly once
    img._cache.clear()


# ── Production config guard ────────────────────────────────────────────────────

def test_production_rejects_weak_secret_key():
    from app.core.config import Settings

    with pytest.raises(Exception):
        Settings(
            ENV="production",
            SECRET_KEY="change-me-to-a-strong-random-secret",
            DATABASE_URL="sqlite:///:memory:",
            _env_file=None,
        )
    # Strong key boots fine.
    s = Settings(
        ENV="production",
        SECRET_KEY="a" * 64,
        DATABASE_URL="sqlite:///:memory:",
        _env_file=None,
    )
    assert s.ENV == "production"
