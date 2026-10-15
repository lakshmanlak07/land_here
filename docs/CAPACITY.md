# LandHere — Capacity model and load-test results

Measured 2026-10-14 with `scripts/load_test.py` against a **local** single-worker
uvicorn + local PostgreSQL 18 on a disposable database (dropped afterwards).
Dev machine: 12 logical CPUs, Windows 11. **These numbers are not Render numbers**;
the Render projection below is an estimate and is UNVERIFIED until measured there.

## Workload model (per active user)
Think time 0.5–1.5 s between requests. This is deliberately far more aggressive than a
real student reading visa steps (realistically one request every 10–30 s while active).
Mix: 35% journey, 20% rankings list, 10% university detail, 15% GET progress,
10% POST progress, 5% /auth/me, 5% countries. Each user registers once (bcrypt cost 12).

## Results: single worker, before vs after fixes
| Concurrent users | Before fixes | After fixes |
|---|---|---|
| 50 | 30 req/s, 0 errors, p95 174 ms | 32 req/s, 0 errors, p50 13 ms, p95 79 ms |
| 150 | **collapse**: 2.7 req/s, 278 errors (500s, timeouts) | **81 req/s, 0 errors**, p50 24 ms, p95 88 ms |
| 300 | **collapse** | **82 req/s, 0 request errors**, p50 172 ms, p95 1.0 s, p99 4.1 s |

Login (bcrypt) ~205 ms each, unchanged by load.

## Root causes fixed (all found by measurement, see commit history)
1. **Connection-pool deadlock.** A sync FastAPI request hops between worker threads and
   could hold a DB connection while waiting for the next hop. With more requests in
   flight than connections, every connection was pinned by queued requests while
   running threads waited for one (1,928 `QueuePool limit reached` errors in one run;
   `pg_stat_activity` showed connections "idle in transaction"). Fix:
   `ConcurrencyLimitMiddleware` caps in-flight requests at `DB_POOL_SIZE + DB_MAX_OVERFLOW`;
   excess requests wait holding nothing, or get 503 + `Retry-After` after 10 s.
2. **bcrypt while holding a connection.** Register now hashes before touching the DB;
   login returns its connection before verifying the password.
3. `get_db` is an async generator so session close never waits for a thread.
4. Pool exhaustion now answers 503 + `Retry-After`, not an opaque 500.

Hypotheses tested and **rejected**: "bcrypt holds the GIL". It doesn't; 4 hashes in parallel
threads took 0.22 s vs 0.84 s sequential.

## Remaining limits (honest)
- **Throughput ceiling ~82 req/s per process on this machine.** Python request handling
  is the bottleneck, not the database.
- **Sign-up bursts:** 300 sign-ups within 20 s queue behind bcrypt; 39/300 timed out at
  30 s. Normal sign-up rates are far below this. A marketing-driven burst needs more workers.

## Projection to Render (UNVERIFIED — measure after deploy with the same script)
- Starter = 0.5 CPU: expect very roughly half the local ceiling, **~30–40 req/s**.
- At a realistic one request per 15 s per active user, that is roughly 450–600 concurrent
  active users.

## What "100,000 users" means here
These are different numbers; don't conflate them.

| Quantity | Assumption | Value |
|---|---|---|
| Registered users | target | 100,000 |
| Daily active | 5–10% of registered (seasonal: admit season higher) | 5,000–10,000 |
| Peak concurrent active | ~10% of DAU in the busiest hour | 500–1,000 |
| Peak request rate | 1 req / 15 s per active user | ~35–70 req/s |

- **Starter, 1 worker:** handles the low end, with no headroom.
- **For the high end or headroom:** use Standard (2 GB, 1 CPU, $25) with 2 workers, plus a
  Key Value (Redis) instance so rate limits stay exact across workers. That is about
  $41/month before the database.
- **Database:** Basic-256mb ($6, 100 connections) holds 2 workers × 20 connections. Storage
  grows mostly with `user_step_progress` (≤ 41 rows/user, about 100 B each), so 100k users
  is about 400 MB. Move to Basic-1gb ($19) as storage or memory requires.
- **Upgrade only on evidence:** Render metrics showing CPU > 70% sustained, p95 > 500 ms,
  or 503s from the concurrency limiter.

## How to re-run
1. Create a disposable database, then migrate, seed and load the dataset (see `scripts/check_migrations.py` for the pattern).
2. Start one worker with `TRUST_PROXY_HEADERS=true TRUSTED_PROXY_HOPS=1` against that database.
3. Run `python scripts/load_test.py http://127.0.0.1:8001 --users 150 --seconds 40 --ramp 20`.

Never point it at production without agreeing a test window. It creates accounts.
