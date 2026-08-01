# v0.1.0-rc.3 — verification record

_Every result below was produced by actually running the command on
2026-08-01, in a Linux container, against a clean clone of `v0.1.0-rc.2` plus the
rc.3 changes. Nothing here is inferred._

Environment: Node 22.22.3, npm 10.9.8, Python 3.10.12, PostgreSQL 16.2
(via `pgserver`), git 2.34.1.

## Results

| Check | Command | Result |
|---|---|---|
| Backend suite | `pytest tests -q` | **67 passed**, 0 failed |
| Security subset | `pytest tests/test_security.py -q` | **37 passed** |
| Account-deletion subset | `pytest -k "delete or account"` | **6 passed** |
| Migrations, empty DB | `alembic upgrade head` | **exit 0** — 9 revisions to `d4e6f8a0b2c4` |
| Seed, fresh DB | `python -m app.core.seed` | **exit 0** — 22 countries; 15 IN→US, 12 IN→CA, 14 IN→UK steps |
| Migration rollback | `alembic downgrade base` | **exit 0** (was **exit 1** before the rc.3 fix) |
| Rollback → re-upgrade → re-seed | full cycle | **exit 0** |
| Single-step rollback | `alembic downgrade -1` → `upgrade head` | **exit 0** |
| TypeScript | `npx tsc --noEmit` | **clean** |
| ESLint | `npm run lint` | **0 errors**, 63 warnings, **exit 0** |
| Policy suite | `npm run check` | **23/23 passed** |
| Build-env gate, empty env | `npm run check:env` | **exit 1** (correct — fails closed) |
| Build-env gate, eas.json placeholders | `check:env` with `SET_IN_EAS_DASHBOARD` | **exit 1** (correct) |
| Build-env gate, valid HTTPS values | `check:env` | **exit 0** |
| iOS export | `expo export --platform ios` | **succeeds** |
| Android export | `expo export --platform android` | **succeeds** |
| Bundle scan, iOS | `scripts/scan-bundle.sh dist-ios` | **CLEAN** |
| Bundle scan, Android | `scripts/scan-bundle.sh dist-android` | **CLEAN** |

## Mutation tests — proving the checks are not vacuous

A passing check is worthless if it cannot fail. Each of these was deliberately
broken, observed to fail, then restored.

| Mutation | Expected | Observed |
|---|---|---|
| Re-add `react-native-iap` to `package.json` | `npm run check` fails | **FAIL** on "react-native-iap is not a dependency at all" |
| Remove `ondelete="CASCADE"` from `RefreshToken.user_id` | new deletion test fails | **FAIL** |
| Export with `EXPO_PUBLIC_API_URL=http://192.168.0.113:8000` | bundle scan DIRTY | **DIRTY** — reported `http://192.168.0.113:8000`, exit 1 |

## Bundle scan — why the naive grep was misleading

An initial substring scan flagged `192.168.`, `127.0.0.1`, `localhost`,
`example.com`, and `your-` in both bundles. All five were traced to source and
are false positives:

- `127.0.0.1`, `localhost`, `example.com`, `your-`, `192.168.` — these live in
  `lib/urlPolicy.ts` as its **own rule table** (`LOCAL_HOSTNAMES`,
  `PLACEHOLDER_MARKERS`, and the `isPrivateHost` regexes). The validator whose job
  is keeping those values out necessarily contains them as data.
- `http://localhost:8081`, `http://localhost:3000` — React Native's own Metro
  dev-server defaults, compiled into every RN binary including release builds.
- The `example.com` hit was literally the substring boundary between our error
  string `"See mobile/.env.example"` and the adjacent Hermes string
  `"com.android.voicemail..."`.

`scripts/scan-bundle.sh` was written to test the real risk instead: URL-shaped
private **origins**, with the two React Native literals allowlisted by exact
match, plus a positive assertion that the expected production API origin is
present. The mutation test above confirms it catches a genuinely misconfigured
build.

## What this run does NOT prove

Stated plainly, because the previous release notes were read as broader
assurance than they were:

- **No physical device.** No iOS or Android binary was compiled; `expo export`
  produces a JS bundle, not an `.ipa`. Nothing has run on real hardware.
- **No TestFlight, no App Review, no App Store.**
- **No production deployment.** The backend was never deployed. The
  `render.yaml` / `railway.toml` / `Dockerfile` audit is a code review, not a
  successful deploy.
- **No hosted legal pages.** The privacy/terms/support URLs do not exist yet.
- **Migrations were verified against a local PostgreSQL 16.2**, not against the
  managed instance you will actually use. Extension availability and permissions
  can differ.
- **Backup and rollback procedures are documented but unrehearsed** — there is no
  infrastructure to rehearse them on.
- **The `react-native-iap` removal is verified at the JS/config layer.** That the
  native project no longer links StoreKit will only be provable once a real EAS
  build produces a binary.
