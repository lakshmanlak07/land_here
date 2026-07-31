"""
Auth endpoint tests.

These tests use the in-memory SQLite database configured in conftest.py
and do NOT touch the real PostgreSQL database.

Write-tests (register, login) are safe by design: all data lives in
the in-memory database and vanishes when the test session ends.

UUIDs are embedded in throwaway emails so multiple test runs cannot
collide even if somehow pointed at a real database.
"""

import uuid


def _throwaway_email() -> str:
    return f"test_{uuid.uuid4().hex[:8]}@landhere-tests.example.com"


# ── Register ──────────────────────────────────────────────────────────────────

def test_register_returns_201_and_token(client):
    email = _throwaway_email()
    response = client.post(
        "/auth/register",
        json={"email": email, "password": "TestPass123!", "full_name": "Test User"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 20


def test_register_duplicate_email_returns_400(client):
    email = _throwaway_email()
    payload = {"email": email, "password": "TestPass123!"}
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/auth/register", json=payload)
    assert second.status_code == 400
    assert "already registered" in second.json()["detail"].lower()


def test_register_with_corridor(client):
    """Registering with origin + destination codes stores them on the user."""
    email = _throwaway_email()
    response = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "TestPass123!",
            "origin_country_code": "IN",
            "destination_country_code": "US",
        },
    )
    assert response.status_code == 201
    token = response.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["origin_country_code"] == "IN"
    assert me.json()["destination_country_code"] == "US"


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_returns_token(client):
    email = _throwaway_email()
    client.post("/auth/register", json={"email": email, "password": "LoginTest99!"})

    response = client.post("/auth/login", json={"email": email, "password": "LoginTest99!"})
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password_returns_401(client):
    email = _throwaway_email()
    client.post("/auth/register", json={"email": email, "password": "CorrectPass!"})

    response = client.post("/auth/login", json={"email": email, "password": "WrongPass!"})
    assert response.status_code == 401


def test_login_nonexistent_email_returns_401(client):
    response = client.post(
        "/auth/login",
        json={"email": "nobody@landhere-tests.example.com", "password": "doesnotmatter"},
    )
    assert response.status_code == 401


# ── /auth/me ──────────────────────────────────────────────────────────────────

def test_me_returns_user(client):
    email = _throwaway_email()
    reg = client.post(
        "/auth/register",
        json={"email": email, "password": "MeTest123!", "full_name": "Jane Student"},
    )
    token = reg.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == email
    assert body["full_name"] == "Jane Student"
    assert "id" in body
    assert "created_at" in body


def test_me_without_token_returns_401(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token_returns_401(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401
