# LandHere — rc.4 final independent audit

> **Code-side final release candidate, pending external integration
> verification.** Not launched, not deployed, not submitted, never run on a
> physical device.

Independent review of the full diff from `origin/main`, conducted from a clean
worktree cut from the annotated tag `v0.1.0-rc.4`, with isolated dependency
installs. The tag was not modified, retagged, or force-pushed.

| | |
|---|---|
| Branch | `hardening/rc4-final-audit` |
| Base | `v0.1.0-rc.4` → `95e3a8309a87ec91cdbef7eb39b0493a4070156e` |
| Python | 3.12.4 (fresh venv from `requirements*.txt`) |
| Node / npm | v26.3.0 / 11.16.0 (`npm ci` from the lockfile) |
| PostgreSQL | 18.4 |

---

## Defect ledger

Three real defects. Two are concurrency faults on paths where the *caller*
creates the concurrency; the third disabled a security control on infrastructure
error. None would have been rare in production.

### D-1 — Refresh-token reuse detection could be defeated by racing it — **P1**

**Proof.** Rotation marks a refresh token revoked on use and treats a second
presentation as theft, revoking the family. But the check and the revocation were
separate statements:

```
record = SELECT ... WHERE id = :jti     # both racers see revoked_at IS NULL
if record.revoked_at is not None: ...   # neither trips
record.revoked_at = now(); COMMIT       # both write, last one wins
return new token pair                   # BOTH receive a valid pair
```

A stolen refresh token presented at the same instant as the legitimate device
produced **two live sessions with no detection**. An attacker did not need to
beat the control, only to tie with it.

**Fix.** `commit 9991b87` — the revocation *is* the claim:
`UPDATE refresh_tokens SET revoked_at = now() WHERE id = :jti AND revoked_at IS NULL`.
The database picks exactly one winner; a row count of 0 is treated as replay.
Failing closed is deliberate — a race is indistinguishable from theft, and a
legitimate client already serialises its refreshes behind a single-flight guard.

**Regression evidence.**
- Deterministic SQLite test feeding the endpoint the stale pre-revocation
  snapshot exactly once — what the loser of a real race observes. Fails before
  the fix, passes after.
- **Real PostgreSQL test**: eight threads on eight connections claiming one
  token; row counts must sum to exactly 1. SQLite cannot test this at all (one
  shared connection, no true concurrency), and a control this load-bearing
  should not rest on a simulation.
- Mutation-tested twice: reverting to read-then-write fails it, and removing the
  `claimed == 0` replay branch fails it.

### D-3 — Rate limiter failed open on any Redis error — **P1**

**Proof.** `enforce_limit` ended in a bare `except Exception: return`, so a Redis
connection blip, timeout, or protocol fault **allowed the request**. A second
fail-open sat in the `rate_limiter` dependency: if client-IP resolution raised,
the limit was skipped entirely.

The endpoints behind this limiter are login, registration, refresh, account
deletion and purchase verification. Losing the limit turned an infrastructure
blip into an open window for credential stuffing — and it was silent.

**Fix.** commit `fix(security): rate limiter fails over to a local limiter instead of failing open` — a Redis failure now falls back to the per-process
in-memory sliding window **for the same key and rule**, so enforcement degrades
from distributed to per-instance rather than to absent. Specifically:

- a genuine 429 from Redis still propagates — that is the limiter working;
- any other Redis exception enters a 5-second cooldown and enforces locally. The
  cooldown is an availability measure: Redis is configured with a 2-second socket
  timeout, so retrying per request during an outage would add that to every call.
  The first request after the cooldown retries Redis, which is how recovery
  happens with no extra machinery;
- the in-memory map gained a hard ceiling of 50,000 keys with batch eviction of
  the least-recent entries. The pre-existing periodic sweep only removes
  *expired* keys, so under a flood from many distinct IPs it frees nothing and
  the map grew without bound — a slow memory-exhaustion DoS against the limiter
  itself;
- the dependency's IP-resolution failure now falls back to one shared bucket
  instead of skipping the check;
- even a failure of the local backend rejects rather than allows.

**Degraded-mode logging is privacy-safe by construction**: the bucket name and
the exception *type* only. Not the key — it contains the client IP, or an account
identifier for the per-account login bucket. Not the exception message — a Redis
client embeds the connection URL, which carries credentials. Rate limited to one
line per minute so an outage cannot bury the log.

**Regression evidence.** 17 tests in `tests/test_rate_limit_failover.py`: Redis
enforcement when healthy; fallback on connection, timeout, runtime and protocol
errors; 429 from the fallback; per-identity isolation while degraded; sweep of
expired keys; the hard ceiling under an all-active flood; 32-thread contention
admitting exactly the limit; no per-request Redis retry inside the cooldown;
recovery to Redis after it; no identity or credential in the degraded log; no
repeat logging; no leakage in the 429; and enforcement when Redis is
deliberately absent.

Mutation-tested: restoring the original `return` fails **13** of the 17;
removing the key ceiling fails the bound test; logging the key and exception
message fails the privacy test.

**Honest limit, found by mutation:** removing `with _lock` does **not** fail the
concurrency test. The race window is between the length check and the append,
with no seam to inject a yield into, and CPython's GIL makes an unlocked
read-modify-write usually correct at this granularity. The test proves exact
admission under contention, not mutual exclusion. The lock is retained because a
mutex around a read-modify-write is correct by construction — not because a test
forces it. Recorded in the test file itself so a green suite is not mistaken for
evidence the lock is unnecessary.

### D-2 — Duplicate Apple notifications raced into a 500 — **P2**

**Proof.** The notification handler checked for an existing `notification_uuid`
then inserted. Two copies arriving together both pass the check, both insert, and
the UNIQUE constraint makes the loser raise `IntegrityError` → 500.

This matters because of who calls it: **Apple retries until it receives a 2xx**,
so duplicate delivery is traffic Apple creates by design — and Apple retries 500s
too. The error was self-amplifying.

**Fix.** `commit c75315d` — the insert is flushed explicitly at the point it is
made, inside a guard, and a constraint violation returns the same answer a
sequential duplicate already gets: `200 {duplicate: true, action: "none"}`.

**A note on the first attempt**, because it is a trap worth recording: wrapping
`db.commit()` did **not** work. SQLAlchemy autoflushes pending inserts at the
next query, so the error was raised from an unrelated statement outside the
guard. The plausible-looking version of this fix silently does nothing.

**Regression evidence.** Deterministic test blinding the duplicate check exactly
once. Fails before, passes after, fails again when the flush guard is removed.

---

## Audited and found sound — no change made

Recorded so a future reader knows these were examined rather than skipped. Per
the brief, nothing cosmetic was changed.

| Area | Finding |
|---|---|
| `_revoke_family` | Commits before the caller raises — the revocation persists. Checked specifically because a missing commit here would silently disable reuse detection. |
| `/auth/logout` | Unauthenticated by design, but requires possession of a **signed** refresh token, which is the credential. Always 204, so it is not an oracle. |
| Deleted-user tokens | Every authenticated route re-checks existence; `/auth/refresh` re-checks too, so a deleted account cannot mint access tokens. |
| Login enumeration | Byte-identical responses for wrong-password and unknown-email, with a constant-time bcrypt path against a fixed dummy hash. |
| Cache headers | Every entitlement-varying response is `private, no-store`. The `public` headers are on genuinely identity-independent endpoints: countries, guides, `/info/phases`, `/info/corridors`. |
| Purchase-path race | Already fixed pre-rc.4; re-verified under real PostgreSQL concurrency. |
| Play notification dedupe | Deliberately absent — the handler re-reads state from Google, so it is idempotent by construction rather than by a stored marker. |
| Platform proof separation | Apple JWS rejected by the Google endpoint and vice versa; both directions tested. |
| Google acknowledgement | Occurs only after verification and account linking; every rejection path returns first, so "never acknowledge an invalid token" holds by construction. |
| Licenses (runtime) | All permissive — MIT 574, ISC 42, BSD 29, Apache-2.0 13, MPL-2.0 2. One dual `(BSD-3-Clause OR GPL-2.0)`, where BSD may be chosen. **No copyleft obligation.** |
| Client 429 handling | No dedicated branch, but `getErrorMessage` surfaces the server's message. No demonstrated defect, so unchanged. |

---

## Release-gate matrix

| Gate | Before | After |
|---|---|---|
| Backend suite | 170 passed, 6 skipped | **172 passed, 6 skipped** |
| PostgreSQL integration | 6 passed | **7 passed** |
| Migrations, every historical revision → head | 13/13 | 13/13 |
| Downgrade → re-upgrade → seed | exit 0 | exit 0 |
| Seed idempotency ×3 | 22 / 41, not multiplied | unchanged |
| TypeScript | clean | clean |
| ESLint | 0 errors, 0 warnings | **0 errors, 0 warnings** |
| Policy checks | 42/42 | 42/42 |
| expo-doctor | 18/18 | 18/18 |
| iOS / Android export | exit 0 | exit 0 |
| iOS / Android bundle scan | CLEAN | **CLEAN** |
| Runtime dependency CVEs | 0 | 0 |
| Runtime licence obligations | none | none |

---

## Accepted residual risks

Each is a decision with evidence, not an oversight.

1. **25 build-toolchain advisories.** All trace to metro → `image-size`,
   `postcss`, `tar`, `js-yaml`, `shell-quote`, `brace-expansion`, `nanoid`. None
   executes in the shipped app. No upgrade removes them: the `image-size`
   advisories cover `<= 2.0.2` and **2.0.2 is the latest published version**, and
   `metro@latest` still declares `image-size: ^1.0.2`. Residual risk is a stalled
   build from a crafted ICNS/JXL/HEIF asset, requiring write access to the repo
   or a dependency.
2. **`ecdsa` PYSEC-2026-1325**, no upstream fix. Unreachable: the app is
   HS256-only, so the EC code paths are never entered. Revisit if `ALGORITHM`
   becomes `ES*`.
3. **Rate limiting degrades, it does not disable.** A Redis outage moves
   enforcement from distributed to per-instance — with N instances the effective
   ceiling becomes N x limit. Weaker than normal, never unrestricted. See D-3.
4. **A raced refresh logs the user out.** After D-1, two simultaneous refreshes
   of one token revoke the family. Correct for a security control, and the client
   serialises its own refreshes — but a pathological retry pattern would force a
   re-login.
5. **Apple ordering treats a missing `signedDate` as never-stale**, and equal
   timestamps as not-stale. Dropping a real refund is worse than applying one
   slightly out of order; duplicates are already caught by `notificationUUID`.
6. **Android tests simulate Google's HTTP responses.** A Play token is opaque and
   Google's API *is* the oracle, so there is no client-side crypto to exercise as
   there is for Apple. They prove our side of the boundary and nothing beyond it.

---

## External-only verification — none of this is code

| Gate | Owner |
|---|---|
| Apple enrolment, ASC record, IAP product, Paid Applications agreement, tax/banking, sandbox tester, notification URL, root CA + `APPLE_APP_APPLE_ID` | Apple account |
| Play account, payments profile, IAP product, **both** service-account permissions, Pub/Sub topic + OIDC push subscription | Google account |
| Backend deployed, Postgres + Redis provisioned, HTTPS readiness, `/docs` 404, backup taken **and a restore rehearsed** | deployment |
| Privacy policy and terms reviewed and signed off; minimum age and parental consent decided | qualified lawyer |
| Every purchase, restore, cancel, deferred, already-owned, refund, offline, dark-mode and screen-reader case | physical devices |

**No StoreKit call and no Google Play API call has ever executed.** Neither
platform's purchase flow has run against the real store.
