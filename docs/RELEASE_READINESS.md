# LandHere — Release readiness (evidence record)

**As of 2026-10-15.** Branch `launch/free-v1` (29 commits on top of `staging/rc5`), worktree
`C:\Users\laksh\land_here_launch`. **Nothing pushed, deployed, or submitted.**
Status key: PASS (run and passed) · FAIL · UNVERIFIED (not run or not runnable here) · BLOCKED (external).

> The uncommitted work noted here earlier came from the 2026-10-15 review round below (not "mobile-2e"); it is now
> committed with its tests (see "Review round 3").

## Release gate
| Gate | Status | Evidence (command → result) |
|---|---|---|
| Backend tests incl. PostgreSQL integration | **PASS** | `pytest -q` → 283 passed (2026-10-15, after review round 3) |
| Auth/authz, password reset, rate limits, deletion, free access, input validation, progress isolation | **PASS** | covered above (test_auth, test_security, test_adversarial, test_password_reset, test_free_launch, test_input_validation, test_progress_and_profile, test_middleware, test_mailer) |
| Migrations on a fresh disposable DB | **PASS** | `scripts/check_migrations.py`: upgrade, seed ×2, dataset load ×2, downgrade base, upgrade, `alembic check` (no drift) |
| Seed + dataset idempotent | **PASS** | second runs: 0 inserted / 0 updated |
| Production config validated | **PASS** | `tests/test_config_template.py`; production boot guards in `tests/test_security.py` |
| Live API smoke (local server, dev DB) | **PASS** | `scripts/smoke_api.py` → 22/22, plus progress round-trip, university save, `/health/ready`, security headers |
| Load (single worker, local) | **PASS (local)** | `docs/CAPACITY.md`: 150 users 81 req/s 0 errors p95 88 ms; 300 users 82 req/s 0 request errors |
| Mobile TypeScript / ESLint | **PASS** | `npx tsc --noEmit`, `npx eslint .` → 0 errors, 0 warnings |
| Mobile policy, session-isolation and sync checks | **PASS** | `npm run check` → all pass |
| Mobile unit/component tests | **PASS** | `npm test` → 8 passed |
| Release JS bundle (Android) + bundle scan | **PASS** | `expo export --platform android --clear` + `scan-bundle.sh` → CLEAN; dev export correctly flagged DIRTY |
| Native Android dev build | **PASS** (2026-10-12) | EAS build `d239857d…` finished; APK exists; later changes are JS-only |
| Device tests (install, flows, offline, account switch) | **UNVERIFIED** | needs a physical phone |
| iOS build | **BLOCKED** | no Apple Developer membership |
| Docker image build | **UNVERIFIED** | Docker not installed locally |
| CI workflow | **UNVERIFIED** | `.github/workflows/ci.yml` parses; runs only after a push |
| Password-reset email delivery | **BLOCKED** | Resend not configured (failure modes tested with mocks) |
| Render deployment | **BLOCKED** | needs owner approval of about $13/month and an account |

## Independent reviews (ECC agents) and dispositions
- **Backend** (`ecc:security-reviewer`): no Critical or High findings.
  - **Fixed (`65b90f4`):**
    - Forgot-password timing enumeration.
    - Reset-link griefing.
    - Unbounded `/health/ready`.
    - Progress batch lost on a concurrent insert.
    - SQL bind values in logs.
    - Resend timeout.
    - Request-ID regex.
    - Writable app code in the container.
  - **Accepted and documented:**
    - `/universities/{id}` requires sign-in.
    - Access tokens live up to 60 min after a reset.
    - Custom-scheme reset link; a paste-code fallback exists.
    - ~~Unhandled 500s lack the request-ID header.~~ Fixed in review round 3.
  - **Verify on staging:** proxy hop count for per-IP rate limits.
- **Mobile** (`ecc:react-reviewer`): 1 High (suspected) and several Mediums.
  - **Fixed (`a1e95e7`, server side in `65b90f4`):**
    - Stale step id blocking sync.
    - Drain after the initial pull.
    - Single-flight per account.
    - Chunking to 200.
    - Pre-load taps.
    - Business 401s signing users out.
    - 400/403 treated as definitive.
    - Offline-session revalidation.
    - Reset-screen issues.
    - Cache buster.
    - Edit-profile spinner.
    - `scan-bundle.sh` expectations.
  - **Accepted:** the legacy device-wide progress key is dropped, not adopted.
- **Found during verification:**
  - `scan-bundle.sh` private-origin check passed vacuously without `strings`. **Fixed (`56d0ac8`).**
  - A local export without `--clear` reused stale inlined env values; the scan caught it.

## Review round 3 (2026-10-15): `ecc:security-reviewer` (mobile), `ecc:python-reviewer`, `ecc:silent-failure-hunter`, then `ecc:code-reviewer` on the fixes
No Critical findings; every finding below was checked against the code before fixing.
- **Fixed, with regression checks** (`lib/session.check.ts`, `lib/urlPolicy.check.ts`, `tests/test_middleware.py`):
  - Account deletion with an expired access token failed as "wrong password": every `/account` 401 skipped refresh. Now only the `Incorrect password.` answer is exempt; a session 401 refreshes, and a deleted account fails the refresh and signs out.
  - A refresh finishing after a sign-out/account switch could write the old account's tokens into the new session; its result is now ignored.
  - Onboarding answers were silently lost if the save after sign-up failed. The user now stays on the plan screen with an error; the retry saves through the signed-in path and clears the device buffer. (The first version of this fix sent the user back to the account form, which would re-register with a 409; the code review caught it.)
  - One server-refused progress batch (400/413/422) blocked sync forever; it now leaves the queue (local ticks stay). 403/404 keep the queue.
  - Abandoned onboarding answers are cleared on sign-out; in-flight queries are cancelled before the cache is cleared on an account change.
  - Links from server data open only as `https:` (`lib/openExternal.ts`), no `tel:`/`sms:`/`intent:`/`http:`.
  - Backend: unhandled exceptions now return a generic 500 *with* the request id and security headers, logged with the request id; unmatched paths are logged as `<unmatched>`, never verbatim; the progress write retries a concurrent-insert conflict up to 3 times.
- **Accepted or external:** the custom-scheme reset link (HTTPS App Links need a hosted domain: external); 60-minute access tokens after reset (design); last-write-wins by arrival order across devices (beta); a blocking `db.close()` on the event loop (needs measurement under a slow DB); refresh-token loss on a dropped refresh response can force a re-login (rare; would need a server grace window).
- **Weak spots in the new tests:** several mobile checks assert on source text (the project has no React Native runtime in `npm run check`); the progress-queue and middleware tests exercise real behaviour.
- **Verification after the round:** `pytest -q` 283 passed; mobile `tsc` and `eslint` 0 errors and 0 warnings; `npm run check` all pass; `npm test` 8/8; `EXPO_PUBLIC_API_URL=https://landhere-api.onrender.com npx expo export --platform android --clear` + `scan-bundle.sh` → CLEAN.

## Residual risks
- **Never run on a physical device.**
- **Render capacity is projected, not measured.**
- **IN→US content:** 9/15 verified. V5 needs a human check of travel.state.gov. R2 needs legal review of the DHS rule. 4 general tips have no government source. UK/CA links are live; their text was last human-verified in June/July 2026.
- **Mobile toolchain advisories:** 42 (0 critical). Clearing them needs an Expo SDK major upgrade.
- **Legal drafts are not lawyer-reviewed.**

## External requirements (owner actions)
1. **Google Play:** a developer account ($25 one-time). New personal accounts need 12 testers for 14 days of closed testing.
2. **Render:** approve about $13/month, create the Blueprint, and enter the secrets in the dashboard (`docs/RUNBOOK.md` §1).
3. **Resend:** verify a sending domain and create an API key, entered in Render only (`docs/RUNBOOK.md` §6).
4. **Host the legal and support pages** at stable URLs.
5. **Physical-device QA:** follow `LAUNCH/STAGING_DEVICE_QA.md`.
6. **Apple Developer Program** ($99/year), if iOS.
7. **Lawyer review**; a human check of travel.state.gov for IN→US step V5.
