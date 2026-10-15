"""
Password recovery: POST /auth/password/forgot and /auth/password/reset.

Email delivery is replaced by a capture so the raw token can be read the way a
user would read it from their inbox.
"""

import re
from datetime import datetime, timedelta, timezone

import pytest

import app.routes.auth as auth_routes
from app.models.password_reset import PasswordResetToken
from tests.conftest import TestingSessionLocal
from tests.test_purchases import _account, _email


@pytest.fixture
def outbox(monkeypatch):
    sent: list[tuple[str, str, str]] = []

    def capture(to, subject, text):
        sent.append((to, subject, text))
        return True

    monkeypatch.setattr(auth_routes, "send_email", capture)
    return sent


def _token_from(text: str) -> str:
    m = re.search(r"token=([A-Za-z0-9_\-]+)", text)
    assert m, text
    return m.group(1)


def _forgot(client, email):
    return client.post("/auth/password/forgot", json={"email": email})


def _reset(client, token, new_password="brand-new-pass-1"):
    return client.post(
        "/auth/password/reset", json={"token": token, "new_password": new_password}
    )


def test_full_reset_flow(client, outbox):
    email, _, old_pw = _account(client)
    r = _forgot(client, email)
    assert r.status_code == 202
    assert len(outbox) == 1 and outbox[0][0] == email
    token = _token_from(outbox[0][2])
    assert token in outbox[0][2]  # also shown as a paste-able code

    assert _reset(client, token).status_code == 204
    assert client.post("/auth/login", json={"email": email, "password": "brand-new-pass-1"}).status_code == 200
    assert client.post("/auth/login", json={"email": email, "password": old_pw}).status_code == 401


def test_unknown_email_gets_identical_response_and_no_email(client, outbox):
    email, _, _ = _account(client)
    known = _forgot(client, email)
    unknown = _forgot(client, _email())
    assert unknown.status_code == known.status_code == 202
    assert unknown.json() == known.json()
    assert len(outbox) == 1  # only the real account got mail


def test_token_is_single_use(client, outbox):
    email, _, _ = _account(client)
    _forgot(client, email)
    token = _token_from(outbox[0][2])
    assert _reset(client, token).status_code == 204
    assert _reset(client, token, "another-pass-22").status_code == 400


def test_expired_token_rejected(client, outbox):
    email, _, _ = _account(client)
    _forgot(client, email)
    token = _token_from(outbox[0][2])
    db = TestingSessionLocal()
    try:
        db.query(PasswordResetToken).update(
            {"expires_at": datetime.now(timezone.utc) - timedelta(minutes=1)}
        )
        db.commit()
    finally:
        db.close()
    assert _reset(client, token).status_code == 400


def test_new_request_does_not_kill_older_link_but_a_reset_kills_all(client, outbox):
    # Issuing a token must not void earlier ones: otherwise anyone who knows a
    # victim's address could keep killing the link the victim is about to use.
    email, _, _ = _account(client)
    _forgot(client, email)
    _forgot(client, email)
    first, second = _token_from(outbox[0][2]), _token_from(outbox[1][2])
    assert _reset(client, first).status_code == 204
    # ...but a successful reset voids every other outstanding link.
    assert _reset(client, second, "another-pass-22").status_code == 400


def test_garbage_token_rejected(client):
    assert _reset(client, "x" * 43).status_code == 400


def test_weak_new_password_rejected(client, outbox):
    email, _, _ = _account(client)
    _forgot(client, email)
    assert _reset(client, _token_from(outbox[0][2]), "short").status_code == 422


def test_reset_revokes_every_existing_session(client, outbox):
    email, _, pw = _account(client)
    sessions = [
        client.post("/auth/login", json={"email": email, "password": pw}).json()["refresh_token"]
        for _ in range(2)
    ]
    _forgot(client, email)
    assert _reset(client, _token_from(outbox[0][2])).status_code == 204
    for rt in sessions:
        assert client.post("/auth/refresh", json={"refresh_token": rt}).status_code == 401


def test_only_a_hash_is_stored(client, outbox):
    email, _, _ = _account(client)
    _forgot(client, email)
    token = _token_from(outbox[0][2])
    db = TestingSessionLocal()
    try:
        hashes = [row.token_hash for row in db.query(PasswordResetToken).all()]
    finally:
        db.close()
    assert token not in hashes
    assert all(len(h) == 64 for h in hashes)


def test_forgot_is_rate_limited_per_address(client, outbox):
    email, _, _ = _account(client)
    codes = [_forgot(client, email).status_code for _ in range(4)]
    assert codes[:3] == [202, 202, 202]
    assert codes[3] == 429


def test_account_deletion_removes_reset_tokens(client, outbox):
    email, headers, pw = _account(client)
    _forgot(client, email)
    assert client.request("DELETE", "/account", headers=headers, json={"password": pw}).status_code == 204
    token = _token_from(outbox[0][2])
    assert _reset(client, token).status_code == 400
