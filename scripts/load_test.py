"""Local load test for the LandHere API.

    python scripts/load_test.py [base_url] [--users N] [--seconds S]

ONLY run this against a local or disposable server you control. Each virtual
user registers its own throwaway account and sends a distinct X-Forwarded-For
address, so per-IP rate limits apply per simulated user exactly as they would
for real phones. The server must run with TRUST_PROXY_HEADERS=true and
TRUSTED_PROXY_HOPS=1 for that to work (it is a local test, not production).

Workload mix per virtual user (think time 0.5-1.5 s between requests),
modelled on how the app is used:
  35%  GET /info/journey          (journey tab, home)
  20%  GET /universities?limit=50 (rankings)
  10%  GET /universities/{id}     (detail)
  15%  GET /progress
  10%  POST /progress             (tick a step)
   5%  GET /auth/me
   5%  GET /countries/destinations
Logins are done once per user at start-up (bcrypt is the costly operation and
is measured separately at the end).
"""

from __future__ import annotations

import argparse
import asyncio
import random
import statistics
import time
import uuid

import httpx

MIX = [
    ("journey", 35), ("rankings", 20), ("detail", 10), ("progress_get", 15),
    ("progress_post", 10), ("me", 5), ("countries", 5),
]


def pct(values, p):
    if not values:
        return 0.0
    s = sorted(values)
    return s[min(len(s) - 1, int(round(p / 100 * (len(s) - 1))))]


async def virtual_user(i, base, seconds, results, shared, ramp):
    # Users arrive spread over `ramp` seconds, like real sign-ups, not all at once.
    await asyncio.sleep(random.uniform(0, ramp))
    ip = f"10.{(i >> 16) & 255}.{(i >> 8) & 255}.{i & 255}"
    async with httpx.AsyncClient(base_url=base, timeout=30, headers={"X-Forwarded-For": ip}) as c:
        email = f"load-{uuid.uuid4().hex[:10]}@example.com"
        t0 = time.perf_counter()
        try:
            r = await c.post("/auth/register", json={
                "email": email, "password": "load-test-pass-1",
                "origin_country_code": "IN", "destination_country_code": "US"})
        except httpx.HTTPError as exc:
            results.append(("register", type(exc).__name__, (time.perf_counter() - t0) * 1000))
            return
        results.append(("register", r.status_code, (time.perf_counter() - t0) * 1000))
        if r.status_code != 201:
            return
        c.headers["Authorization"] = "Bearer " + r.json()["access_token"]
        steps = shared["steps"]
        unis = shared["unis"]
        names = [n for n, _ in MIX]
        weights = [w for _, w in MIX]
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            kind = random.choices(names, weights)[0]
            t0 = time.perf_counter()
            try:
                r = await _request(c, kind, steps, unis)
            except httpx.HTTPError as exc:
                results.append((kind, type(exc).__name__, (time.perf_counter() - t0) * 1000))
                continue
            results.append((kind, r.status_code, (time.perf_counter() - t0) * 1000))
            await asyncio.sleep(random.uniform(0.5, 1.5))


async def _request(c, kind, steps, unis):
    if kind == "journey":
        r = await c.get("/info/journey", params={"origin": "IN", "destination": "US"})
    elif kind == "rankings":
        r = await c.get("/universities", params={"limit": 50})
    elif kind == "detail":
        r = await c.get(f"/universities/{random.choice(unis)}")
    elif kind == "progress_get":
        r = await c.get("/progress")
    elif kind == "progress_post":
        r = await c.post("/progress", json={"changes": [
            {"step_id": random.choice(steps), "completed": random.random() < 0.7}]})
    elif kind == "me":
        r = await c.get("/auth/me")
    else:
        r = await c.get("/countries/destinations")
    return r


async def measure_login(base, n=10):
    lat = []
    async with httpx.AsyncClient(base_url=base, timeout=30, headers={"X-Forwarded-For": "10.250.0.1"}) as c:
        email = f"load-login-{uuid.uuid4().hex[:8]}@example.com"
        await c.post("/auth/register", json={"email": email, "password": "load-test-pass-1"})
        for _ in range(n):
            t0 = time.perf_counter()
            try:
                await c.post("/auth/login", json={"email": email, "password": "load-test-pass-1"})
            except httpx.HTTPError:
                continue
            lat.append((time.perf_counter() - t0) * 1000)
    return lat or [0.0]


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("base", nargs="?", default="http://127.0.0.1:8001")
    ap.add_argument("--users", type=int, default=50)
    ap.add_argument("--seconds", type=int, default=30)
    ap.add_argument("--ramp", type=int, default=20, help="spread user arrival over N seconds")
    a = ap.parse_args()

    async with httpx.AsyncClient(base_url=a.base, timeout=30, headers={"X-Forwarded-For": "10.251.0.1"}) as c:
        reg = await c.post("/auth/register", json={"email": f"load-setup-{uuid.uuid4().hex[:8]}@example.com", "password": "load-test-pass-1"})
        c.headers["Authorization"] = "Bearer " + reg.json()["access_token"]
        j = (await c.get("/info/journey", params={"origin": "IN", "destination": "US"})).json()
        steps = [s["id"] for p in j["phases"] for s in p["steps"]]
        unis = [u["id"] for u in (await c.get("/universities", params={"limit": 200})).json()]
    shared = {"steps": steps, "unis": unis}

    results: list[tuple[str, int, float]] = []
    started = time.monotonic()
    await asyncio.gather(*(virtual_user(i + 1, a.base, a.seconds, results, shared, a.ramp) for i in range(a.users)))
    elapsed = time.monotonic() - started

    def good(r):
        return isinstance(r[1], int) and 200 <= r[1] < 300

    regs = [r for r in results if r[0] == "register"]
    results = [r for r in results if r[0] != "register"]
    ok = [r for r in results if good(r)]
    errors = [r for r in results if not good(r)]
    lat = [r[2] for r in ok]
    reg_ok = [r[2] for r in regs if good(r)]
    print(f"registrations: {len(reg_ok)}/{len(regs)} ok, p50={pct(reg_ok, 50):.0f} ms, p95={pct(reg_ok, 95):.0f} ms")
    print(f"virtual users={a.users} duration={elapsed:.1f}s requests={len(results)} "
          f"throughput={len(results) / elapsed:.1f} req/s errors={len(errors)}")
    print(f"latency ms  p50={pct(lat, 50):.1f}  p95={pct(lat, 95):.1f}  p99={pct(lat, 99):.1f}  max={max(lat or [0]):.1f}")
    for kind, _ in MIX:
        k = [r[2] for r in ok if r[0] == kind]
        if k:
            print(f"  {kind:14s} n={len(k):5d}  p50={pct(k, 50):6.1f}  p95={pct(k, 95):6.1f}")
    if errors:
        codes: dict = {}
        for kind, code, _ in errors:
            codes[(kind, code)] = codes.get((kind, code), 0) + 1
        print("  errors:", codes)
    login = await measure_login(a.base)
    print(f"login (bcrypt) ms: median={statistics.median(login):.1f} max={max(login):.1f}")


if __name__ == "__main__":
    asyncio.run(main())
