"""Email delivery (app/core/mailer.py): provider selection, Resend success, and
every provider failure mode returns False without raising or logging secrets."""

import io
import json
import logging
from urllib.error import HTTPError, URLError

import pytest

import app.core.mailer as mailer
from app.core.config import settings

SECRET = "re_test_secret_value_never_logged"


@pytest.fixture
def resend(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", SECRET)
    monkeypatch.setattr(settings, "EMAIL_FROM", "LandHere <no-reply@example.com>")
    monkeypatch.setattr(settings, "SMTP_HOST", "")


class _Resp:
    def __init__(self, status):
        self.status = status
    def __enter__(self):
        return self
    def __exit__(self, *a):
        return False


def test_disabled_without_configuration(monkeypatch, caplog):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    monkeypatch.setattr(settings, "EMAIL_FROM", "")
    assert mailer.email_configured() is False
    with caplog.at_level(logging.WARNING):
        assert mailer.send_email("a@example.com", "s", "t") is False
    assert "not configured" in caplog.text


def test_resend_success_sends_expected_request(resend, monkeypatch):
    seen = {}

    def fake_urlopen(req, timeout):
        seen["url"] = req.full_url
        seen["auth"] = req.get_header("Authorization")
        seen["body"] = json.loads(req.data)
        return _Resp(200)

    monkeypatch.setattr(mailer, "urlopen", fake_urlopen)
    assert mailer.send_email("user@example.com", "Subject", "Body") is True
    assert seen["url"] == "https://api.resend.com/emails"
    assert seen["auth"] == f"Bearer {SECRET}"
    assert seen["body"] == {
        "from": "LandHere <no-reply@example.com>",
        "to": ["user@example.com"],
        "subject": "Subject",
        "text": "Body",
    }


@pytest.mark.parametrize(
    "exc",
    [
        HTTPError("https://api.resend.com/emails", 401, "Unauthorized", {}, io.BytesIO(b"{}")),
        HTTPError("https://api.resend.com/emails", 422, "Invalid from", {}, io.BytesIO(b"{}")),
        HTTPError("https://api.resend.com/emails", 429, "Rate limited", {}, io.BytesIO(b"{}")),
        HTTPError("https://api.resend.com/emails", 500, "Server error", {}, io.BytesIO(b"{}")),
        URLError("name resolution failed"),
        TimeoutError(),
    ],
)
def test_resend_failures_return_false_and_do_not_log_the_key(resend, monkeypatch, caplog, exc):
    def boom(req, timeout):
        raise exc

    monkeypatch.setattr(mailer, "urlopen", boom)
    with caplog.at_level(logging.ERROR):
        assert mailer.send_email("user@example.com", "s", "t") is False
    assert SECRET not in caplog.text
    assert "user@example.com" not in caplog.text


def test_resend_preferred_over_smtp(resend, monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    assert mailer.email_provider() == "resend"


def test_forgot_still_202_when_delivery_fails(client, monkeypatch, resend):
    """A provider outage must not change the response (no enumeration, no 500)."""
    from tests.test_purchases import _account

    monkeypatch.setattr(mailer, "urlopen", lambda req, timeout: (_ for _ in ()).throw(URLError("down")))
    email, _, _ = _account(client)
    r = client.post("/auth/password/forgot", json={"email": email})
    assert r.status_code == 202
