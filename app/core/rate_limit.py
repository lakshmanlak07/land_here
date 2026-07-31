"""
Rate limiting for sensitive endpoints (auth).

Backend is selected automatically at startup:

  Redis (recommended for production)
    Enabled when REDIS_URL is set in the environment.
    Uses a Redis sorted-set sliding window (ZADD / ZREMRANGEBYSCORE / ZCARD)
    scoped to a TTL so keys self-expire.  Shared across all workers and
    instances — effective for multi-process production deployments.

  In-memory (development / single-process only)
    Active when REDIS_URL is not set.  Per-process fixed-window counter using
    a thread-safe dict.  Resets on restart; does not coordinate across workers.
    Fine for local development; not suitable for production multi-worker setups.

FAIL-OPEN: any unexpected error (including Redis connection blips) allows the
request through.  A limiter bug or infrastructure issue will never lock out
legitimate users.
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.core.config import settings

logger = logging.getLogger("landhere.rate_limit")

# ──────────────────────────────────────────────────────────────────────────────
# Redis client (optional — only instantiated when REDIS_URL is set)
# ──────────────────────────────────────────────────────────────────────────────

_redis_client = None

if settings.REDIS_URL:
    try:
        import redis as _redis_lib  # type: ignore[import]
        _redis_client = _redis_lib.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        _redis_client.ping()
        logger.info(
            "Rate limiter: Redis backend active (%s)",
            settings.REDIS_URL.split("@")[-1],
        )
    except Exception as exc:  # pragma: no cover
        logger.warning(
            "Rate limiter: could not connect to Redis (%s). "
            "Falling back to in-memory backend. "
            "Set REDIS_URL to a reachable Redis instance for production use.",
            exc,
        )
        _redis_client = None
else:
    logger.warning(
        "Rate limiter: REDIS_URL not set — using in-memory backend (single-process). "
        "For multi-worker production, set REDIS_URL to a shared Redis instance. "
        "See PRE_LAUNCH_SECURITY.md §5."
    )


# ──────────────────────────────────────────────────────────────────────────────
# In-memory backend
# ──────────────────────────────────────────────────────────────────────────────

# (timestamps) per key. Trimmed to the active window on each check.
_hits: dict[str, list[float]] = defaultdict(list)
_lock = threading.Lock()

# Without eviction, every distinct (bucket, client-IP) key would live forever —
# the map grows without bound as new IPs appear (a slow memory-exhaustion DoS).
# We sweep fully-expired keys periodically.
_SWEEP_INTERVAL_SECONDS = 60.0
_SWEEP_WHEN_KEYS_EXCEED = 10_000
_last_sweep = 0.0


def _maybe_sweep(now: float, window_seconds: int) -> None:
    """Drop keys with no timestamps inside the active window. Caller holds _lock."""
    global _last_sweep
    if (
        now - _last_sweep < _SWEEP_INTERVAL_SECONDS
        and len(_hits) < _SWEEP_WHEN_KEYS_EXCEED
    ):
        return
    cutoff = now - window_seconds
    stale = [k for k, ts in _hits.items() if not ts or ts[-1] <= cutoff]
    for k in stale:
        del _hits[k]
    _last_sweep = now


def _memory_check(key: str, *, limit: int, window_seconds: int) -> None:
    now = time.monotonic()
    cutoff = now - window_seconds
    with _lock:
        _maybe_sweep(now, window_seconds)
        timestamps = _hits[key]
        timestamps[:] = [t for t in timestamps if t > cutoff]
        if len(timestamps) >= limit:
            retry = int(window_seconds - (now - timestamps[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again shortly.",
                headers={"Retry-After": str(max(retry, 1))},
            )
        timestamps.append(now)


# ──────────────────────────────────────────────────────────────────────────────
# Redis backend — sliding-window via sorted sets
# ──────────────────────────────────────────────────────────────────────────────

def _redis_check(key: str, *, limit: int, window_seconds: int) -> None:
    """Sliding-window rate check using a Redis sorted set.

    Pipeline: ZREMRANGEBYSCORE (evict old entries) → ZADD (record this hit)
    → ZCARD (count active hits) → PEXPIRE (auto-clean TTL).  Members use a
    unique suffix so concurrent requests from the same IP don't collide on the
    member key.  If count exceeds the limit we remove the just-added entry and
    raise 429, keeping the set consistent.
    """
    now_ms = int(time.time() * 1000)
    window_ms = window_seconds * 1000
    cutoff_ms = now_ms - window_ms
    member = f"{now_ms}:{uuid.uuid4().hex}"

    pipe = _redis_client.pipeline()
    pipe.zremrangebyscore(key, "-inf", cutoff_ms - 1)
    pipe.zadd(key, {member: now_ms})
    pipe.zcard(key)
    pipe.pexpire(key, window_ms + 1000)  # slight buffer so key outlives the window
    results = pipe.execute()
    count: int = results[2]

    if count > limit:
        # Remove the entry we just added — this request is rejected.
        _redis_client.zrem(key, member)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again shortly.",
            headers={"Retry-After": str(window_seconds)},
        )


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def _client_ip(request: Request) -> str:
    """Best-effort real client IP for per-IP rate limiting.

    `request.client.host` is the direct socket peer.  Behind a reverse proxy
    that is the proxy's IP — so every user would share one bucket.  We read
    X-Forwarded-For only when TRUST_PROXY_HEADERS is explicitly enabled, since
    the header is client-supplied and trivially spoofable otherwise.
    """
    if settings.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            parts = [p.strip() for p in forwarded.split(",") if p.strip()]
            if parts:
                hops = max(1, settings.TRUSTED_PROXY_HOPS)
                return parts[-min(hops, len(parts))]
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def rate_limiter(bucket: str, *, limit: int, window_seconds: int):
    """Return a FastAPI dependency enforcing `limit` requests per window.

    Automatically uses the Redis backend when REDIS_URL is configured and
    reachable; otherwise falls back to the in-memory backend.
    """

    def dependency(request: Request) -> None:
        try:
            key = f"rl:{bucket}:{_client_ip(request)}"
            if _redis_client is not None:
                _redis_check(key, limit=limit, window_seconds=window_seconds)
            else:
                _memory_check(key, limit=limit, window_seconds=window_seconds)
        except HTTPException:
            raise
        except Exception:
            # Fail open — never block a legitimate request on a limiter error.
            return

    return dependency
