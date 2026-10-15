"""Request IDs, security headers and the privacy-safe access log."""

import json
import logging


def test_every_response_has_request_id_and_security_headers(client):
    for path in ("/", "/health/live", "/does-not-exist"):
        r = client.get(path)
        assert len(r.headers["x-request-id"]) >= 8
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["x-frame-options"] == "DENY"
        assert r.headers["referrer-policy"] == "no-referrer"


def test_valid_incoming_request_id_is_echoed_and_invalid_is_replaced(client):
    assert client.get("/", headers={"X-Request-ID": "abc12345-xyz"}).headers["x-request-id"] == "abc12345-xyz"
    replaced = client.get("/", headers={"X-Request-ID": "bad id\nwith newline"}).headers["x-request-id"]
    assert replaced != "bad id\nwith newline" and "\n" not in replaced


def test_hsts_only_in_production(client, monkeypatch):
    from app.core.config import settings

    assert "strict-transport-security" not in client.get("/").headers
    monkeypatch.setattr(settings, "ENV", "production")
    assert client.get("/").headers["strict-transport-security"].startswith("max-age=")


def test_access_log_has_no_query_string_or_personal_data(client, caplog):
    from tests.test_purchases import _account

    email, h, _ = _account(client)
    with caplog.at_level(logging.INFO, logger="landhere.access"):
        client.get("/universities?search=secret-term", headers=h)
        client.post("/auth/login", json={"email": email, "password": "password123"})
    lines = [json.loads(r.getMessage()) for r in caplog.records if r.name == "landhere.access"]
    assert any(l["path"] == "/universities" for l in lines)
    blob = " ".join(r.getMessage() for r in caplog.records if r.name == "landhere.access")
    assert "secret-term" not in blob
    assert email not in blob
    assert "password" not in blob
    assert all(set(l) == {"request_id", "method", "path", "status", "duration_ms"} for l in lines)


def test_concurrency_limit_queues_then_sheds_with_503():
    """In-flight cap: with limit=1, a second request waits; past queue_timeout it
    gets 503 + Retry-After. Health checks bypass the cap. The slot is released."""
    import asyncio

    from app.core.middleware import ConcurrencyLimitMiddleware

    release = asyncio.Event()

    async def slow_app(scope, receive, send):
        if scope["path"] == "/slow":
            await release.wait()
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})

    async def call(app, path):
        sent = []

        async def send(message):
            sent.append(message)

        await app({"type": "http", "path": path, "method": "GET", "headers": []}, None, send)
        start = next(m for m in sent if m["type"] == "http.response.start")
        return start["status"], dict(start["headers"])

    async def scenario():
        app = ConcurrencyLimitMiddleware(slow_app, limit=1, queue_timeout=0.2)
        first = asyncio.create_task(call(app, "/slow"))
        await asyncio.sleep(0.05)
        status, headers = await call(app, "/other")          # queued, then shed
        health, _ = await call(app, "/health/live")           # bypasses the cap
        release.set()
        assert (await first)[0] == 200
        after, _ = await call(app, "/other")                  # slot released
        return status, headers, health, after

    status, headers, health, after = asyncio.run(scenario())
    assert status == 503 and headers[b"retry-after"] == b"2"
    assert health == 200 and after == 200
