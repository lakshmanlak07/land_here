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

NEVER FAIL-OPEN.  A Redis connection or runtime error does not allow the
request through; it degrades enforcement from *distributed* to *per-instance* by
falling back to the in-memory limiter for the same identity and rule.  Enforcement
therefore weakens under a Redis outage — with N instances the effective ceiling
becomes N x limit — but it never becomes unrestricted.

That distinction is the whole point: the endpoints behind this limiter are login,
registration, refresh, account deletion and purchase verification.  Removing the
limit during an outage would turn an infrastructure blip into an open window for
credential stuffing.
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

# A hard ceiling, because the periodic sweep only removes keys whose window has
# fully expired.  Under a flood from many distinct IPs every key is *active*, so
# sweeping frees nothing and the map still grows without bound.  At the ceiling
# we evict the entries closest to expiring.
#
# Eviction resets that identity's window, which is a real (if small) weakening
# under extreme key cardinality — accepted deliberately: bounded memory is the
# stronger guarantee, and an evicted key is still rate limited from zero rather
# than unrestricted.
_MAX_TRACKED_KEYS = 50_000
_EVICT_BATCH = 1_000

# Set when a Redis operation fails, to stop us paying the socket timeout on
# every subsequent request while Redis is down.  Requests inside the cooldown go
# straight to the in-memory limiter; the first request after it expires retries
# Redis, which is how recovery happens without any extra machinery.
_DEGRADED_COOLDOWN_SECONDS = 5.0
_degraded_until = 0.0
_degraded_logged_at = 0.0
_DEGRADED_LOG_INTERVAL_SECONDS = 60.0


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

    # Sweeping only removes fully-expired keys.  If the map is still at the
    # ceiling, every remaining key is active and we must evict anyway.
    if len(_hits) >= _MAX_TRACKED_KEYS:
        oldest = sorted(_hits, key=lambda k: _hits[k][-1] if _hits[k] else 0.0)
        for k in oldest[:_EVICT_BATCH]:
            del _hits[k]
        logger.warning(
            "Rate limiter: in-memory key ceiling reached; evicted %d least-recent "
            "buckets (tracked=%d, ceiling=%d)",
            min(_EVICT_BATCH, len(oldest)),
            len(_hits),
            _MAX_TRACKED_KEYS,
        )


def _memory_check(key: str, *, limit: int, window_seconds: int) -> None:
    now = time.monotonic()
    cutoff = now - window_seconds
    with _lock:
        # A brand-new key at the ceiling must trigger the sweep immediately,
        # regardless of the interval, or the bound is only advisory.
        if key not in _hits and len(_hits) >= _MAX_TRACKED_KEYS:
            global _last_sweep
            _last_sweep = 0.0
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


def reset_for_tests() -> None:
    """Clear all limiter state. Test-support only; never called by the app."""
    global _degraded_until, _degraded_logged_at, _last_sweep
    with _lock:
        _hits.clear()
    _degraded_until = 0.0
    _degraded_logged_at = 0.0
    _last_sweep = 0.0


def _in_degraded_window() -> bool:
    """True while we are deliberately skipping Redis after a failure."""
    return time.monotonic() < _degraded_until


def _enter_degraded_mode(exc: BaseException, key: str) -> None:
    """Record a Redis failure and log it in a privacy-safe way.

    The log deliberately carries only the bucket name and the exception TYPE:

      * the key contains the client IP (or an account identifier for the
        per-account login bucket), so logging it would put user data in the logs
        on every request of an outage;
      * the exception message from a Redis client can embed the connection URL,
        which carries credentials;
      * it is rate limited to one line per minute, because an outage would
        otherwise emit one line per request and bury everything else.
    """
    global _degraded_until, _degraded_logged_at
    now = time.monotonic()
    _degraded_until = now + _DEGRADED_COOLDOWN_SECONDS
    if now - _degraded_logged_at >= _DEGRADED_LOG_INTERVAL_SECONDS:
        _degraded_logged_at = now
        # `key` is "rl:<bucket>:<identity>" — take the bucket only.
        bucket = key.split(":")[1] if ":" in key else "unknown"
        logger.warning(
            "Rate limiter DEGRADED: Redis unavailable (%s); enforcing per-instance "
            "limits for bucket=%s. Enforcement is weaker than distributed but is "
            "NOT disabled. Retrying Redis in %.0fs.",
            type(exc).__name__,
            bucket,
            _DEGRADED_COOLDOWN_SECONDS,
        )


def enforce_limit(key: str, *, limit: int, window_seconds: int) -> None:
    """Sliding-window check for an arbitrary key.

    Used directly for buckets that aren't keyed on client IP (e.g. the
    per-account login bucket in app/routes/auth.py), and as the shared
    implementation behind the rate_limiter() dependency — so both paths get the
    same Redis-or-memory backend selection.

    Raises 429 when over limit.  Never fails open: a Redis error degrades to the
    per-instance in-memory limiter for the same key and rule.
    """
    if _redis_client is not None and not _in_degraded_window():
        try:
            _redis_check(key, limit=limit, window_seconds=window_seconds)
            return
        except HTTPException:
            # An actual 429 from Redis. Propagate it; this is the limiter working.
            raise
        except Exception as exc:
            # Redis is unreachable or misbehaving. Enter the cooldown so we stop
            # paying its socket timeout on every request, then enforce locally.
            _enter_degraded_mode(exc, key)

    # Either Redis was never configured, or it just failed, or we are inside the
    # cooldown. Enforce locally — weaker than distributed, never absent.
    try:
        _memory_check(key, limit=limit, window_seconds=window_seconds)
    except HTTPException:
        raise
    except Exception:
        # The local limiter is pure in-process arithmetic under a lock, so there
        # is no realistic failure here. If one somehow occurs we must still not
        # hand out an unlimited request: reject conservatively rather than allow.
        logger.error("Rate limiter: in-memory backend failed; rejecting request")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again shortly.",
            headers={"Retry-After": str(window_seconds)},
        ) from None


def rate_limiter(bucket: str, *, limit: int, window_seconds: int):
    """Return a FastAPI dependency enforcing `limit` requests per window per IP.

    Automatically uses the Redis backend when REDIS_URL is configured and
    reachable; otherwise falls back to the in-memory backend.
    """

    def dependency(request: Request) -> None:
        try:
            key = f"rl:{bucket}:{_client_ip(request)}"
        except Exception:
            # Previously this skipped the limit entirely — a second fail-open
            # path. Fall back to one shared bucket instead: coarser than per-IP,
            # but the endpoint stays limited.
            key = f"rl:{bucket}:unresolved-client"
        enforce_limit(key, limit=limit, window_seconds=window_seconds)

    return dependency
