"""
Outbound email over SMTP (stdlib only — no provider SDK).

Any transactional provider that offers SMTP works: Resend, Postmark, Amazon
SES, Mailgun, SendGrid. Configure with SMTP_HOST / SMTP_PORT / SMTP_USERNAME /
SMTP_PASSWORD / EMAIL_FROM. With SMTP_HOST unset, email is disabled: callers
get False back and nothing is sent (and nothing secret is logged).
"""

from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("landhere.mail")


def email_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.EMAIL_FROM)


def send_email(to: str, subject: str, text: str) -> bool:
    """Send a plain-text email. Returns True on success. Never raises."""
    if not email_configured():
        logger.warning("Email not configured (SMTP_HOST/EMAIL_FROM unset); message not sent.")
        return False
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
    except Exception as exc:  # noqa: BLE001 — log the type only; messages can carry credentials
        logger.error("Email send failed (%s).", type(exc).__name__)
        return False
