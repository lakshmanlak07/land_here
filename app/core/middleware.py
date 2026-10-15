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
error_logger = logging.getLogger("landhere.errors")

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
        request_id = incoming if _SAFE_REQUEST_ID.fullmatch(incoming) else uuid.uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id
        started = time.perf_counter()
        status_holder = {"status": 500, "started": False}

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_holder["status"] = message["status"]
                status_holder["started"] = True
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
        except Exception:
            # Answer here so even a 500 carries the request id and security headers; never leak details.
            error_logger.exception("Unhandled error request_id=%s", request_id)
            if status_holder["started"]:
                raise
            body = b'{"detail":"Internal server error"}'
            await send_wrapper({
                "type": "http.response.start",
                "status": 500,
                "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
            })
            await send_wrapper({"type": "http.response.body", "body": body})
        finally:
            route = scope.get("route")
            # Unmatched paths are attacker-chosen text: log a constant, never the raw path.
            path = getattr(route, "path", None) or "<unmatched>"
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


class ConcurrencyLimitMiddleware:
    """Cap the number of requests being processed at once.

    Why: a sync FastAPI request hops between worker threads (dependencies,
    handler, response serialization) and can hold a pooled DB connection while
    waiting for the next hop. With more requests in flight than connections,
    queued requests pin every connection while running threads wait for one -
    a deadlock broken only by the pool timeout. Measured with
    scripts/load_test.py: collapse at 150 concurrent users.

    Bounding in-flight requests to the pool size makes that impossible: each
    in-flight request holds at most one connection. Excess requests wait here,
    holding nothing, and receive 503 + Retry-After if they wait longer than
    `queue_timeout`. Health checks bypass the limit so an overloaded instance
    is reported busy, not dead.
    """

    def __init__(self, app, limit: int, queue_timeout: float = 10.0):
        import asyncio

        self.app = app
        self.queue_timeout = queue_timeout
        self._sem = asyncio.Semaphore(limit)

    async def __call__(self, scope, receive, send):
        import asyncio

        if scope["type"] != "http" or scope.get("path", "").startswith("/health"):
            await self.app(scope, receive, send)
            return
        try:
            await asyncio.wait_for(self._sem.acquire(), timeout=self.queue_timeout)
        except asyncio.TimeoutError:
            body = b'{"detail":"The service is busy. Please try again in a moment."}'
            await send({
                "type": "http.response.start",
                "status": 503,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"retry-after", b"2"),
                    (b"content-length", str(len(body)).encode()),
                ],
            })
            await send({"type": "http.response.body", "body": body})
            return
        try:
            await self.app(scope, receive, send)
        finally:
            self._sem.release()
