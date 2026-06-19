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

# (timestamps) per key. Trimmed to the active window on each check.
_hits: dict[str, list[float]] = defaultdict(list)
_lock = threading.Lock()


def _client_ip(request: Request) -> str:
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
