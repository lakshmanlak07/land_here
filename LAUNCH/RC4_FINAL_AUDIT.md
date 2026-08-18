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

Two real defects. Both are concurrency faults on paths where the *caller* creates
the concurrency, so neither would have been rare in production.

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
3. **Rate limiting is fail-open.** A Redis outage removes limiting rather than
   locking users out.
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
