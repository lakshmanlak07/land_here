"""
Lightweight in-memory rate limiting for sensitive endpoints (auth).

This is intentionally minimal and dependency-free:
  * Per-(client IP, bucket) fixed-window counter.
  * Thread-safe (sync FastAPI routes run in a threadpool).
  * FAIL-OPEN: any unexpected error allows the request through, so a bug
    in this limiter can never lock legitimate users out.

Limits here are generous — high enough that no human-driven flow hits
them, low enough to blunt automated credential-stuffing / brute force.

NOTE: this is single-process, in-memory only. It resets on restart and
does NOT coordinate across multiple workers/instances. For production,
move to a shared store (e.g. Redis via slowapi). See PRE_LAUNCH_SECURITY.md.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.core.config import settings

# (timestamps) per key. Trimmed to the active window on each check.
_hits: dict[str, list[float]] = defaultdict(list)
_lock = threading.Lock()

# Without eviction, every distinct (bucket, client-IP) key would live forever —
# the map grows without bound as new IPs appear (a slow memory-exhaustion DoS).
# We sweep fully-expired keys periodically: at most once per interval, plus an
# opportunistic sweep once the map gets large so a burst of distinct IPs within
# a single window can't balloon memory before the next timed sweep.
_SWEEP_INTERVAL_SECONDS = 60.0
_SWEEP_WHEN_KEYS_EXCEED = 10_000
_last_sweep = 0.0


def _maybe_sweep(now: float, window_seconds: int) -> None:
    """Drop keys with no timestamps inside the active window. Caller holds _lock.

    Conservative by design: a key is removed only when its most recent hit has
    aged out, so an active client is never evicted mid-window. Worst case under
    differing bucket windows is an early counter reset (more lenient) — which
    matches this limiter's fail-open intent and never blocks a legitimate user.
    """
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


def _client_ip(request: Request) -> str:
    """Best-effort real client IP for per-IP rate limiting.

    `request.client.host` is the direct socket peer. Behind a reverse proxy that
    is the PROXY's IP — so every user would share one bucket. To fix that we read
    the client IP from X-Forwarded-For, but ONLY when explicitly told we sit
    behind a trusted proxy (settings.TRUST_PROXY_HEADERS): the header is
    client-supplied and trivially spoofable, so trusting it from arbitrary
    clients would let an attacker forge a fresh IP per request and bypass limits.

    With N trusted proxy hops, the genuine client is the Nth entry from the right
    of X-Forwarded-For (everything further left is client-controlled and not
    trustworthy). Default config (TRUST_PROXY_HEADERS=False) preserves the
    original local-dev behaviour exactly.
    """
    if settings.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            parts = [p.strip() for p in forwarded.split(",") if p.strip()]
            if parts:
                hops = max(1, settings.TRUSTED_PROXY_HOPS)
                # Clamp to available entries; take the Nth-from-right (the IP our
                # own trusted proxy observed), not the spoofable left-most one.
                return parts[-min(hops, len(parts))]
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def rate_limiter(bucket: str, *, limit: int, window_seconds: int):
    """Return a FastAPI dependency enforcing `limit` requests per window."""

    def dependency(request: Request) -> None:
        try:
            key = f"{bucket}:{_client_ip(request)}"
            now = time.monotonic()
            cutoff = now - window_seconds
            with _lock:
                _maybe_sweep(now, window_seconds)
                timestamps = _hits[key]
                # Drop entries outside the current window.
                timestamps[:] = [t for t in timestamps if t > cutoff]
                if len(timestamps) >= limit:
                    retry = int(window_seconds - (now - timestamps[0])) + 1
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many requests. Please try again shortly.",
                        headers={"Retry-After": str(max(retry, 1))},
                    )
                timestamps.append(now)
        except HTTPException:
            raise
        except Exception:
            # Fail open: never block a legitimate request on a limiter bug.
            return

    return dependency
