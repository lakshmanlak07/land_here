"""
The rate limiter must never fail open.

Before this, any Redis error — a connection blip, a timeout, a runtime fault —
caused `enforce_limit` to return, allowing the request. The endpoints behind the
limiter are login, registration, refresh, account deletion and purchase
verification, so that turned an infrastructure blip into an open window for
credential stuffing.

The rule now: a Redis failure degrades enforcement from *distributed* to
*per-instance*, never to *absent*. These tests pin both halves — that Redis is
used when healthy, and that its failure produces local enforcement rather than
free passage.

A fake Redis is used rather than a real one. The behaviour under test is entirely
ours: which backend is chosen, what happens to a request when the chosen one
raises, and what gets logged. A real Redis would prove the sorted-set arithmetic,
which is not what regressed.
"""

from __future__ import annotations

import threading
import time

import pytest
from fastapi import HTTPException

import app.core.rate_limit as rl


class _FakeRedisOK:
    """Enough of the redis client for the sliding-window path.

    Tracks calls so a test can prove Redis was actually consulted rather than
    silently bypassed.
    """

    def __init__(self):
        self.sets: dict[str, dict[str, int]] = {}
        self.calls = 0

    def pipeline(self):
        return _FakePipeline(self)

    def zrem(self, key, member):
        self.sets.get(key, {}).pop(member, None)


class _FakePipeline:
    def __init__(self, client: _FakeRedisOK):
        self.c = client
        self.ops: list = []

    def zremrangebyscore(self, key, lo, hi):
        self.ops.append(("trim", key, hi))
        return self

    def zadd(self, key, mapping):
        self.ops.append(("add", key, mapping))
        return self

    def zcard(self, key):
        self.ops.append(("card", key))
        return self

    def pexpire(self, key, ms):
        self.ops.append(("expire", key))
        return self

    def execute(self):
        self.c.calls += 1
        results = []
        for op in self.ops:
            if op[0] == "trim":
                _, key, hi = op
                bucket = self.c.sets.setdefault(key, {})
                for m, score in list(bucket.items()):
                    if score <= hi:
                        del bucket[m]
                results.append(0)
            elif op[0] == "add":
                _, key, mapping = op
                self.c.sets.setdefault(key, {}).update(mapping)
                results.append(1)
            elif op[0] == "card":
                results.append(len(self.c.sets.get(op[1], {})))
            else:
                results.append(True)
        return results


class _FakeRedisBroken:
    """A Redis that raises the way an unreachable one does."""

    def __init__(self, exc: Exception | None = None):
        self.exc = exc or ConnectionError("connection refused")
        self.attempts = 0

    def pipeline(self):
        self.attempts += 1
        raise self.exc

    def zrem(self, *a, **k):  # pragma: no cover - never reached
        raise self.exc


@pytest.fixture(autouse=True)
def _clean_limiter():
    rl.reset_for_tests()
    yield
    rl.reset_for_tests()


def _hit(key="rl:test:1.2.3.4", *, limit=3, window=60):
    rl.enforce_limit(key, limit=limit, window_seconds=window)


# ── 1. Normal Redis enforcement ────────────────────────────────────────────────

def test_redis_enforces_the_limit_when_healthy(monkeypatch):
    fake = _FakeRedisOK()
    monkeypatch.setattr(rl, "_redis_client", fake)

    for _ in range(3):
        _hit()
    with pytest.raises(HTTPException) as ei:
        _hit()
    assert ei.value.status_code == 429
    assert fake.calls == 4, "Redis was not consulted for every request"
    # And the local backend was never touched, so this really was the Redis path.
    assert not rl._hits, "the in-memory backend was used while Redis was healthy"


# ── 2. Redis failure falls back rather than allowing ───────────────────────────

def test_a_redis_failure_falls_back_to_local_enforcement(monkeypatch):
    """The core regression: this used to allow the request."""
    broken = _FakeRedisBroken()
    monkeypatch.setattr(rl, "_redis_client", broken)

    _hit()
    assert broken.attempts == 1, "Redis was not attempted"
    assert rl._hits, "the request was allowed through without being counted"
    assert sum(len(v) for v in rl._hits.values()) == 1


@pytest.mark.parametrize(
    "exc",
    [
        ConnectionError("connection refused"),
        TimeoutError("timed out"),
        RuntimeError("unexpected client state"),
        ValueError("garbage reply"),
    ],
    ids=["connection", "timeout", "runtime", "protocol"],
)
def test_every_class_of_redis_error_falls_back(monkeypatch, exc):
    monkeypatch.setattr(rl, "_redis_client", _FakeRedisBroken(exc))
    _hit()
    assert rl._hits, f"{type(exc).__name__} allowed the request through"


# ── 3. Fallback limit exceeded returns 429 ─────────────────────────────────────

def test_the_fallback_still_returns_429_when_exceeded(monkeypatch):
    monkeypatch.setattr(rl, "_redis_client", _FakeRedisBroken())

    for _ in range(3):
        _hit(limit=3)
    with pytest.raises(HTTPException) as ei:
        _hit(limit=3)
    assert ei.value.status_code == 429
    assert "Retry-After" in ei.value.headers


def test_the_fallback_is_per_identity_not_global(monkeypatch):
    """Degrading must not collapse every caller into one bucket."""
    monkeypatch.setattr(rl, "_redis_client", _FakeRedisBroken())

    for _ in range(3):
        _hit("rl:test:1.1.1.1", limit=3)
    with pytest.raises(HTTPException):
        _hit("rl:test:1.1.1.1", limit=3)
    # A different identity is unaffected.
    _hit("rl:test:2.2.2.2", limit=3)


# ── 4. Bounded memory and cleanup ──────────────────────────────────────────────

def test_expired_keys_are_swept(monkeypatch):
    monkeypatch.setattr(rl, "_redis_client", None)
    for i in range(50):
        _hit(f"rl:test:sweep-{i}", limit=5, window=60)
    assert len(rl._hits) == 50

    # Everything ages out, and the next call is past the sweep interval.
    with rl._lock:
        for ts in rl._hits.values():
            ts[:] = [t - 10_000 for t in ts]
    rl._last_sweep = 0.0
    _hit("rl:test:trigger", limit=5, window=60)
    assert len(rl._hits) == 1, f"expired keys were not swept ({len(rl._hits)} left)"


def test_a_short_window_sweep_keeps_long_window_buckets(monkeypatch):
    """A sweep triggered by a 60 s limiter must not erase a 900 s lockout bucket
    (e.g. the per-email login limit) that is still inside its own window."""
    monkeypatch.setattr(rl, "_redis_client", None)
    for _ in range(2):
        _hit("rl:test:email-lockout", limit=2, window=900)
    with rl._lock:  # age the lockout hits by 120 s: stale for 60 s, live for 900 s
        rl._hits["rl:test:email-lockout"][:] = [t - 120 for t in rl._hits["rl:test:email-lockout"]]
    rl._last_sweep = 0.0
    _hit("rl:test:other-ip", limit=5, window=60)  # triggers the sweep
    with pytest.raises(HTTPException) as exc:
        _hit("rl:test:email-lockout", limit=2, window=900)
    assert exc.value.status_code == 429


def test_the_key_map_is_hard_bounded_even_when_every_key_is_active(monkeypatch):
    """The sweep alone cannot shrink an all-active map.

    Under a flood from many distinct IPs every key is inside its window, so
    sweeping frees nothing. Without a ceiling the map grows until the process
    dies — a slow memory-exhaustion DoS against a limiter that exists to prevent
    abuse.
    """
    monkeypatch.setattr(rl, "_redis_client", None)
    monkeypatch.setattr(rl, "_MAX_TRACKED_KEYS", 200)
    monkeypatch.setattr(rl, "_EVICT_BATCH", 50)

    for i in range(600):
        _hit(f"rl:test:flood-{i}", limit=100, window=3600)

    assert len(rl._hits) <= 200, f"key map grew to {len(rl._hits)}, ceiling was 200"
    assert len(rl._hits) > 0, "eviction emptied the map entirely"


# ── 5. Concurrent fallback requests ────────────────────────────────────────────

def test_the_fallback_is_concurrency_safe_and_counts_exactly(monkeypatch):
    """Eight threads, one identity, a limit of 20.

    Exactly 20 must be admitted and 12 rejected. An unlocked counter would admit
    more than the limit; a broken one would admit fewer.
    """
    monkeypatch.setattr(rl, "_redis_client", _FakeRedisBroken())

    # Widen the critical section with a yield inside _maybe_sweep (which runs
    # while _lock is held) so the threads genuinely contend rather than running
    # one after another.
    #
    # HONEST LIMIT, verified by mutation: removing `with _lock` does NOT fail
    # this test. The race window is between the length check and the append,
    # inside _memory_check, with no seam to inject a yield into — and CPython's
    # GIL makes an unlocked read-modify-write usually correct at this
    # granularity. So this test proves exact admission under contention; it does
    # NOT prove mutual exclusion. The lock stays because a mutex around a
    # read-modify-write is correct by construction and free here, not because a
    # test forces it. Recorded rather than papered over: a green suite is not
    # evidence the lock is unnecessary.
    real_sweep = rl._maybe_sweep

    def slow_sweep(now, window_seconds):
        real_sweep(now, window_seconds)
        time.sleep(0.005)

    monkeypatch.setattr(rl, "_maybe_sweep", slow_sweep)

    admitted = []
    rejected = []
    lock = threading.Lock()

    def attempt():
        try:
            _hit("rl:test:concurrent", limit=20, window=60)
        except HTTPException:
            with lock:
                rejected.append(1)
        else:
            with lock:
                admitted.append(1)

    threads = [threading.Thread(target=attempt) for _ in range(32)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(admitted) == 20, f"admitted {len(admitted)}, expected exactly 20"
    assert len(rejected) == 12, f"rejected {len(rejected)}, expected exactly 12"


# ── 6. Recovery back to Redis ──────────────────────────────────────────────────

def test_a_dead_redis_is_not_retried_on_every_request(monkeypatch):
    """The cooldown exists for availability.

    Redis is configured with a 2-second socket timeout, so retrying it per
    request during an outage would add that to every call. Requests inside the
    cooldown must skip Redis entirely.
    """
    broken = _FakeRedisBroken()
    monkeypatch.setattr(rl, "_redis_client", broken)

    for _ in range(5):
        _hit(limit=100)
    assert broken.attempts == 1, (
        f"Redis was retried {broken.attempts} times inside the cooldown"
    )


def test_enforcement_returns_to_redis_after_the_cooldown(monkeypatch):
    broken = _FakeRedisBroken()
    monkeypatch.setattr(rl, "_redis_client", broken)
    _hit(limit=100)
    assert rl._in_degraded_window() is True

    # Redis comes back, and the cooldown expires.
    healthy = _FakeRedisOK()
    monkeypatch.setattr(rl, "_redis_client", healthy)
    monkeypatch.setattr(rl, "_degraded_until", 0.0)

    before = len(rl._hits)
    _hit(limit=100)
    assert healthy.calls == 1, "did not go back to Redis after the cooldown"
    assert len(rl._hits) == before, "still using the local backend after recovery"


# ── 7. No error leakage ────────────────────────────────────────────────────────

def test_the_degraded_log_carries_no_identity_or_credentials(monkeypatch, caplog):
    """An outage logs once a minute, with a bucket name and an exception type.

    Not the key — it contains the client IP, or an account identifier for the
    per-account login bucket. Not the exception message — a Redis client embeds
    the connection URL, which carries credentials.
    """
    secret_url = "redis://:sup3rs3cret@redis.internal:6379/0"
    monkeypatch.setattr(
        rl, "_redis_client", _FakeRedisBroken(ConnectionError(f"cannot connect to {secret_url}"))
    )

    with caplog.at_level("WARNING", logger="landhere.rate_limit"):
        rl.enforce_limit("rl:auth_login:203.0.113.7", limit=5, window_seconds=60)

    text = "\n".join(r.getMessage() for r in caplog.records)
    assert "DEGRADED" in text, "no degraded-mode event was logged"
    assert "auth_login" in text, "the bucket name is missing, so the log is not actionable"
    for leak in ("203.0.113.7", "sup3rs3cret", "redis.internal", secret_url):
        assert leak not in text, f"degraded log leaked {leak!r}"


def test_the_degraded_log_does_not_repeat_per_request(monkeypatch, caplog):
    monkeypatch.setattr(rl, "_redis_client", _FakeRedisBroken())
    with caplog.at_level("WARNING", logger="landhere.rate_limit"):
        for i in range(10):
            rl._degraded_until = 0.0  # force a Redis attempt each time
            rl.enforce_limit(f"rl:test:{i}", limit=100, window_seconds=60)
    degraded = [r for r in caplog.records if "DEGRADED" in r.getMessage()]
    assert len(degraded) == 1, f"logged {len(degraded)} degraded lines, expected 1"


def test_a_429_from_the_limiter_leaks_nothing(monkeypatch):
    monkeypatch.setattr(rl, "_redis_client", _FakeRedisBroken())
    for _ in range(3):
        _hit(limit=3)
    with pytest.raises(HTTPException) as ei:
        _hit(limit=3)
    body = f"{ei.value.detail} {ei.value.headers}"
    for leak in ("redis", "Traceback", "1.2.3.4", "rl:test"):
        assert leak.lower() not in body.lower(), f"429 response leaked {leak!r}"


# ── Startup safety when Redis is deliberately absent ───────────────────────────

def test_no_redis_configured_still_enforces_locally(monkeypatch):
    """Deliberately running without Redis must be limited, not unlimited."""
    monkeypatch.setattr(rl, "_redis_client", None)
    for _ in range(3):
        _hit(limit=3)
    with pytest.raises(HTTPException) as ei:
        _hit(limit=3)
    assert ei.value.status_code == 429
    assert rl._in_degraded_window() is False, (
        "an absent Redis should not be reported as a degraded outage"
    )
