# LandHere — Build Progress (resume file)

Branch `launch/free-v1` · worktree `C:\Users\laksh\land_here_launch` · local only (nothing pushed or deployed).
Read this first in a new session, then `docs/RELEASE_READINESS.md` and `BUILD_STATUS.md`.

## Backlog (2026-10-14 directive: finish everything locally achievable)
| ID | Item | Status |
|---|---|---|
| B1 | Persist onboarding university selection (it was UI-only; never saved) | in progress |
| B2 | Server-side journey progress with per-user isolation + offline-first mobile sync | todo |
| B3 | Edit-profile screen (journey L) | todo |
| B4 | Offline cache for journey/rankings data (journey H) | todo |
| B5 | Backend hardening: request IDs, structured access log, security headers, DB pool config | todo |
| B6 | Reproducible university dataset (fixture + idempotent loader; no API keys needed) | todo |
| B7 | CI workflow, `.env.example`, production Render blueprint | todo |
| B8 | Load-test script + local measurements + capacity model | todo |
| B9 | Mobile unit/component tests (Jest) | todo |
| B10 | Docs: README, architecture, runbooks, release readiness | todo |
| B11 | Independent ECC reviews (security / backend / mobile) + fixes | todo |

## Decisions
- No push, no deploy, no cloud resources (directive §1).
- Docker is not installed locally: image builds stay UNVERIFIED.

## Test results
See `docs/RELEASE_READINESS.md` (updated after each milestone).
