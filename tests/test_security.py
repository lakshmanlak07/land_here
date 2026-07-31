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
    # Strong key boots fine — given the rest of the production config is valid
    # (explicit CORS origins and a non-local database are also required now).
    s = Settings(
        ENV="production",
        SECRET_KEY="a" * 64,
        DATABASE_URL="postgresql://u:p@db.example.com:5432/landhere",
        CORS_ALLOW_ORIGINS="https://app.landhere.example",
        _env_file=None,
    )
    assert s.ENV == "production"


# ── Refresh-token replay / revocation ─────────────────────────────────────────
#
# These cover the property that stateless rotation alone does NOT give us: an
# old refresh token must stop working the moment it is rotated away, rather than
# staying valid for its full 30-day lifetime.


def _tokens(client):
    """Register a throwaway user and return its initial token pair."""
    r = client.post(
        "/auth/register", json={"email": _email(), "password": "TestPass123!"}
    )
    assert r.status_code == 201
    return r.json()


def test_refresh_rotates_and_returns_new_token(client):
    first = _tokens(client)
    r = client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert r.status_code == 200
    second = r.json()
    assert second["refresh_token"] != first["refresh_token"]


def test_replayed_refresh_token_is_rejected(client):
    first = _tokens(client)
    r = client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert r.status_code == 200

    # Re-using the now-rotated token must fail, not mint another pair.
    replay = client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert replay.status_code == 401


def test_replay_revokes_the_whole_family(client):
    """A replayed token means the lineage is compromised: the token the
    legitimate client currently holds must die too, forcing a re-login."""
    first = _tokens(client)
    r = client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    current = r.json()["refresh_token"]

    # Attacker replays the stolen (already-rotated) token.
    client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})

    # The legitimate device's still-unused token is now revoked as collateral.
    after = client.post("/auth/refresh", json={"refresh_token": current})
    assert after.status_code == 401


def test_logout_revokes_refresh_token(client):
    first = _tokens(client)
    out = client.post("/auth/logout", json={"refresh_token": first["refresh_token"]})
    assert out.status_code == 204

    r = client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert r.status_code == 401


def test_logout_with_garbage_token_still_204(client):
    """Logout must not become an oracle for token validity."""
    out = client.post("/auth/logout", json={"refresh_token": "not-a-jwt"})
    assert out.status_code == 204


def test_access_token_rejected_at_refresh_endpoint(client):
    """Token type confusion: an access token must not work as a refresh token."""
    first = _tokens(client)
    r = client.post("/auth/refresh", json={"refresh_token": first["access_token"]})
    assert r.status_code == 401


def test_refresh_token_rejected_as_bearer(client):
    """...and the reverse: a refresh token must not authenticate a request."""
    first = _tokens(client)
    r = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {first['refresh_token']}"}
    )
    assert r.status_code == 401


def test_refresh_token_of_one_user_does_not_reach_another(client):
    """Auth isolation: tokens are per-account."""
    a = _tokens(client)
    b = _tokens(client)
    me_a = client.get("/auth/me", headers={"Authorization": f"Bearer {a['access_token']}"})
    me_b = client.get("/auth/me", headers={"Authorization": f"Bearer {b['access_token']}"})
    assert me_a.status_code == me_b.status_code == 200
    assert me_a.json()["email"] != me_b.json()["email"]


def test_unknown_but_well_formed_refresh_token_is_rejected(client):
    """A token signed with our key but with a jti we never issued (e.g. minted
    before the refresh_tokens table existed) must not be honoured."""
    import uuid as _uuid

    from app.core.security import create_refresh_token

    token, _ = create_refresh_token(_uuid.uuid4(), jti=str(_uuid.uuid4()))
    r = client.post("/auth/refresh", json={"refresh_token": token})
    assert r.status_code == 401


# ── Generic registration failure ──────────────────────────────────────────────


def test_duplicate_registration_message_is_generic(client):
    email = _email()
    payload = {"email": email, "password": "TestPass123!"}
    assert client.post("/auth/register", json=payload).status_code == 201

    second = client.post("/auth/register", json=payload)
    assert second.status_code == 400
    detail = second.json()["detail"].lower()
    # Must not confirm the address is taken, and must not echo the address back.
    for leak in ("already", "registered", "exists", "taken", email.lower()):
        assert leak not in detail


# ── Production configuration rejection ────────────────────────────────────────
#
# Settings is validated at construction, so these build a Settings directly
# rather than restarting the app.


def _prod_settings(**overrides):
    from app.core.config import Settings

    base = {
        "ENV": "production",
        "DATABASE_URL": "postgresql://u:p@db.example.com:5432/landhere",
        "SECRET_KEY": "x" * 64,
        "CORS_ALLOW_ORIGINS": "https://app.landhere.example",
    }
    base.update(overrides)
    return Settings(**base)


def test_production_config_accepts_a_valid_setup():
    s = _prod_settings()
    assert s.is_production


def test_production_rejects_wildcard_cors():
    with pytest.raises(ValueError, match="CORS_ALLOW_ORIGINS"):
        _prod_settings(CORS_ALLOW_ORIGINS="*")


def test_production_rejects_empty_cors():
    with pytest.raises(ValueError, match="CORS_ALLOW_ORIGINS"):
        _prod_settings(CORS_ALLOW_ORIGINS="")


def test_production_rejects_placeholder_secret():
    with pytest.raises(ValueError, match="SECRET_KEY"):
        _prod_settings(SECRET_KEY="test-only-secret-not-for-production")


def test_production_rejects_short_secret():
    with pytest.raises(ValueError, match="SECRET_KEY"):
        _prod_settings(SECRET_KEY="short")


def test_production_rejects_localhost_database():
    with pytest.raises(ValueError, match="DATABASE_URL"):
        _prod_settings(DATABASE_URL="postgresql://u:p@localhost:5432/landhere")


def test_development_allows_loose_config():
    """The same values must stay fine in development — the guards are
    production-only by design, so local dev never trips them."""
    from app.core.config import Settings

    s = Settings(
        ENV="development",
        DATABASE_URL="postgresql://u:p@localhost:5432/landhere",
        SECRET_KEY="test-only-secret-not-for-production",
        CORS_ALLOW_ORIGINS="*",
    )
    assert not s.is_production


# ── Secret / trace leakage ────────────────────────────────────────────────────


def test_error_responses_do_not_leak_password_or_traceback(client):
    email = _email()
    password = "SuperSecret123!"
    client.post("/auth/register", json={"email": email, "password": password})

    bad = client.post("/auth/login", json={"email": email, "password": "wrong-one"})
    assert bad.status_code == 401
    body = bad.text
    assert password not in body
    assert "wrong-one" not in body
    assert "Traceback" not in body
    assert "hashed_password" not in body
