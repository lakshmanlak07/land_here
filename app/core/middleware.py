"""
HTTP middleware: request IDs, a privacy-safe access log, and security headers.

Pure ASGI (no BaseHTTPMiddleware) so it adds negligible overhead.

Access log fields: request id, method, route path (no query string - it can
carry search terms or tokens), status, duration. Deliberately NOT logged: IP
address, user id, email, headers, bodies.
"""

from __future__ import annotations

import json
import logging
import re
import time
import uuid

from app.core.config import settings

access_logger = logging.getLogger("landhere.access")

_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{8,64}$")

_SECURITY_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"permissions-policy", b"geolocation=(), camera=(), microphone=()"),
    (b"cross-origin-opener-policy", b"same-origin"),
]
_HSTS = (b"strict-transport-security", b"max-age=31536000; includeSubDomains")


class RequestContextMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = dict(scope.get("headers") or []).get(b"x-request-id", b"").decode("latin-1")
        request_id = incoming if _SAFE_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id
        started = time.perf_counter()
        status_holder = {"status": 500}

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_holder["status"] = message["status"]
                headers = list(message.get("headers") or [])
                present = {k.lower() for k, _ in headers}
                headers.append((b"x-request-id", request_id.encode("latin-1")))
                for name, value in _SECURITY_HEADERS:
                    if name not in present:
                        headers.append((name, value))
                if settings.is_production and _HSTS[0] not in present:
                    headers.append(_HSTS)
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            route = scope.get("route")
            path = getattr(route, "path", None) or scope.get("path", "")
            access_logger.info(
                json.dumps(
                    {
                        "request_id": request_id,
                        "method": scope.get("method"),
                        "path": path,
                        "status": status_holder["status"],
                        "duration_ms": round((time.perf_counter() - started) * 1000, 1),
                    }
                )
            )
