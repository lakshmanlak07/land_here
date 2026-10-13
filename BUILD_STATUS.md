# LandHere — Build Status

Updated 2026-10-13. Worktree `C:\Users\laksh\land_here_launch`, branch `launch/free-v1` (from `staging/rc5` @ 9492b70). `main`, `staging/rc5`, the stash and the original checkout are untouched. Nothing is pushed yet.

## Commits on launch/free-v1
| Commit | What |
|---|---|
| 7a18635 | Free launch: `PAYWALL_ENABLED` / `PURCHASES_ENABLED` (default off), `/purchases/*` → 404, paywall parked in `future/`, `expo-iap` removed, "500+" copy → "250+" |
| 2ff449a | Per-account journey progress; refresh/hydrate keep the session on network failure |
| 6d29853 | Input validation, python-jose → PyJWT, urllib3/anyio floors, axios 1.20, `npm audit fix`, `.dockerignore`, non-root container, seed encoding crash |
| a58dd65 | Alembic: all models registered; migration indexes declared (`alembic check` clean) |
| a4af8a6 | `expo-dev-client`; EAS dev profile passes env gate |
| 2a78a11 | EAS project linked (@lakshmaaan77/landhere) |
| f64076e | Password recovery (backend + mobile) |
| bd055f8 | Node 22.14.0 pinned on all EAS profiles (pre-install hook crashed on default image) |

## Check results (actually run)
| Check | Result |
|---|---|
| `pytest tests` (SQLite + Postgres integration) | PASS — 241 passed |
| Postgres integration (7) | PASS |
| `alembic upgrade head` / `downgrade base` / `upgrade head` / `check` on scratch DB | PASS |
| Dev DB migrated to head (backup first: `C:\Users\laksh\land_here_backups\land_here_2026-10-11_pre_rc5_migrate.dump`) | PASS |
| `npm ci` | PASS |
| `tsc --noEmit`, `eslint .` | PASS (0 errors, 0 warnings) |
| `npm run check` (URL policy + session isolation) | PASS |
| `expo-doctor` | PASS 18/18 |
| `expo export --platform android` | PASS |
| Live API smoke (register, login, refresh rotation/replay, logout, journeys IN→US/UK/CA without purchase, 267 rankings, detail, delete account) | PASS 25/25 (before the password-reset commit) |
| EAS Android development build | PASS — build finished: https://expo.dev/artifacts/eas/AjK-Ek-RSIiJFTvhA91LqbmQBw_fxL9Lv1K4OLDwKiM.apk |
| **Install + run on a physical device** | **NOT RUN** — needs you |
| iOS build | BLOCKED — Apple Developer account |
| Docker image build | BLOCKED — Docker not installed locally |
| Email delivery for password reset | BLOCKED — no SMTP provider configured |
| `npm audit` | 42 remaining (0 critical), all Expo/metro toolchain; needs SDK major upgrade |

## Physical-device build: NOT yet verified on a device.

## Remaining blockers
1. **IN→US content (launch blocker).** Verified 2026-10-12: 13 of 15 source links are dead (9 studyinthestates.dhs.gov pages restructured, 2 ustraveldocs India pages 404, CFPB and FCC 404). state.gov pages sit behind a Cloudflare challenge. DHS's **final rule of July 17, 2026** replaced "duration of status" with a fixed admission period (program length ≤ 4 years + 30 days arrival + 30 days departure; extensions via Form I-539). The steps need a human rewrite and re-verification. Do not mark them verified.
2. Email provider for password reset (SMTP env vars).
3. Hosting: Render account, Postgres with backups, HTTPS URL, data load (seed + rankings ingest).
4. Apple Developer Program / App Store Connect; privacy policy, terms and support URLs hosted; legal review.
5. Device QA (`LAUNCH/STAGING_DEVICE_QA.md`).

## Next three actions
1. Install the dev APK on an Android phone and run against the LAN API (instructions in the chat reply).
2. Decide on IN→US: hide the corridor for launch, or rewrite and verify it (recommended: hide; launch with UK and Canada).
3. Create the Render staging services and choose an email provider.

## ECC usage
ECC hooks (GateGuard fact-forcing, strategic compact) ran throughout. No ECC agents were needed; all findings above were verified directly by running the commands.
