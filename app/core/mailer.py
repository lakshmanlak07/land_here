"""
Outbound transactional email.

Provider order:
  1. Resend HTTP API when RESEND_API_KEY is set (preferred; stdlib urllib, no SDK).
  2. SMTP when SMTP_HOST is set (any provider; Resend also offers SMTP).
  3. Neither: email is disabled. send_email returns False and logs a warning.

EMAIL_FROM must be an address on a domain verified with the provider, e.g.
"LandHere <no-reply@yourdomain>". The API key is a backend secret: it never
appears in logs, responses, or the mobile app.
"""

from __future__ import annotations

import json
import logging
import smtplib
import ssl
from email.message import EmailMessage
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import settings

logger = logging.getLogger("landhere.mail")

RESEND_ENDPOINT = "https://api.resend.com/emails"


def email_provider() -> str | None:
    if not settings.EMAIL_FROM:
        return None
    if settings.RESEND_API_KEY:
        return "resend"
    if settings.SMTP_HOST:
        return "smtp"
    return None


def email_configured() -> bool:
    return email_provider() is not None


def _send_resend(to: str, subject: str, text: str) -> bool:
    body = json.dumps(
        {"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "text": text}
    ).encode("utf-8")
    req = Request(
        RESEND_ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "landhere-api",
        },
    )
    try:
        with urlopen(req, timeout=5) as resp:
            return 200 <= resp.status < 300
    except HTTPError as exc:
        # Status only: the body can echo request details.
        logger.error("Resend rejected the email (HTTP %s).", exc.code)
    except (URLError, TimeoutError, OSError) as exc:
        logger.error("Resend unreachable (%s).", type(exc).__name__)
    return False


def _send_smtp(to: str, subject: str, text: str) -> bool:
    msg = EmailMessage()
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    try:
        port = settings.SMTP_PORT
        context = ssl.create_default_context()
        if port == 465:
            server: smtplib.SMTP = smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=15, context=context)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, port, timeout=15)
            server.starttls(context=context)
        with server:
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001 - type only; messages can carry credentials
        logger.error("SMTP send failed (%s).", type(exc).__name__)
        return False


def send_email(to: str, subject: str, text: str) -> bool:
    """Send a plain-text email. Returns True on success. Never raises."""
    provider = email_provider()
    if provider == "resend":
        return _send_resend(to, subject, text)
    if provider == "smtp":
        return _send_smtp(to, subject, text)
    logger.warning("Email not configured (EMAIL_FROM plus RESEND_API_KEY or SMTP_HOST); message not sent.")
    return False
