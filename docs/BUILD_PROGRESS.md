# LandHere — Build Progress (resume file)

Branch `launch/free-v1` · worktree `C:\Users\laksh\land_here_launch` · local only (nothing pushed or deployed).
Read this first in a new session, then `docs/RELEASE_READINESS.md` (evidence) and `BUILD_STATUS.md`.
Original checkout `C:\Users\laksh\land_here` (`main` @ 6c01dd9), `staging/rc5` @ 9492b70 and `stash@{0}`
are untouched.

**Heads-up:** a peer session ("mobile-2e") has uncommitted edits in `mobile/app/(auth)/onboarding.tsx` and
`mobile/lib/{api,progressCore,session.check,store}.ts`. They were left untouched; the combined tree passes all mobile
checks. Coordinate before editing those files.

## Backlog (2026-10-14 directive: finish everything locally achievable)
| ID | Item | Status | Commit |
|---|---|---|---|
| B1 | Persist onboarding university selection (was UI-only) | done | 32ae112, 8d47c7a |
| B2 | Server-side progress, per-user isolation, offline-first sync | done | 32ae112, 8d47c7a, a1e95e7 |
| B3 | Edit-profile screen | done | 773f6b3 |
| B4 | Offline cache (journey, countries, rankings) | done | 4bfb85e |
| B5 | Request IDs, privacy-safe access log, security headers, DB pool | done | 5f95a10 |
| B6 | Versioned university dataset + idempotent loader | done | 1e3867f |
| B7 | Production `render.yaml`, CI workflow, `.env.example`, LF for scripts | done | d6d1048, 6c8452b |
| B8 | Load test, capacity model, connection-pool deadlock fix | done | 737aeb7 |
| B9 | Mobile Jest component tests | done | c3de88d |
| B10 | Docs: README, RUNBOOK, CAPACITY, RELEASE_READINESS | done | 4b1c807 + this commit |
| B11 | Independent ECC reviews + fixes | done | 65b90f4, a1e95e7, 56d0ac8 |

## Latest verification (2026-10-15)
- **Backend:** `pytest` 281 passed. `check_migrations.py` all PASS.
- **Live smoke:** 22/22 plus the new endpoints.
- **Mobile:** tsc and eslint clean; `npm run check` all pass; `npm test` 8/8.
- **Release:** Android export with `--clear`; `scan-bundle.sh` CLEAN.

## Decisions
- No push, no deploy, no cloud resources, no credentials.
- Free launch: `PAYWALL_ENABLED` and `PURCHASES_ENABLED` default false; purchase code is dormant.
- Unknown progress step ids are ignored (reported back), never fatal for a batch.
- Reset tokens are not voided on issue; a successful reset voids all others.
- In-flight requests are capped at the DB pool size (`ConcurrencyLimitMiddleware`).
- The legacy device-wide progress key is dropped, not adopted.

## Remaining (external or needs hardware)
Device QA · Render deploy (cost approval) · Resend domain and key · Google Play account and closed test ·
Apple enrollment (iOS) · hosted legal pages · lawyer review · human check of travel.state.gov (IN→US V5) ·
legal review of the DHS rule (IN→US R2) · Docker build and CI run (need Docker / a push).

## Next actions for a new session
1. On deploy approval: follow `docs/RUNBOOK.md` §1, then run `smoke_api.py` and `load_test.py` against staging.
2. Device QA with the existing dev APK.
3. Optional: Expo SDK upgrade on a separate branch to clear the toolchain advisories.
