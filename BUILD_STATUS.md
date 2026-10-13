# LandHere — Build Status

**Updated 2026-10-13** · Branch `launch/free-v1` · Worktree `C:\Users\laksh\land_here_launch` · base `staging/rc5` @ 9492b70.
Verified 2026-10-13: `main` (6c01dd9), `staging/rc5` (9492b70), `stash@{0}` and the original checkout at `C:\Users\laksh\land_here` are untouched. **Nothing pushed.**

## Physical-device test: NOT PASSED (not yet run — needs you)

## Commits on launch/free-v1 (oldest → newest)
7a18635 free launch · 2ff449a progress isolation + network-tolerant auth · 6d29853 validation/PyJWT/deps/.dockerignore/non-root · a58dd65 alembic drift · a4af8a6 expo-dev-client + EAS dev gate · 2a78a11 EAS project link · f64076e password recovery · bd055f8 Node 22 on EAS · a1e45c0 status doc · 6a30454 Resend + smoke script · f5da258 + 063c5b5 IN→US re-verification · 743100e IN→CA PAL fix + corridor sync · 1e54ec5 legal drafts for free launch.

## Test results (re-run 2026-10-13)
| Check | Command | Result |
|---|---|---|
| Backend suite incl. Postgres integration | `pytest tests` | **PASS** — 256 passed |
| Free access, no-purchase account | `tests/test_free_launch.py` + live smoke | **PASS** |
| Password reset (tokens, expiry, reuse, enumeration, revocation, rate limit) | `tests/test_password_reset.py` | **PASS** |
| Resend success + 401/422/429/500/network/timeout failures | `tests/test_mailer.py` | **PASS** (mocked) |
| Input validation | `tests/test_input_validation.py` | **PASS** |
| IN→US content guards | `tests/test_content_in_us.py` | **PASS** |
| Migrations up/down/up + `alembic check` (scratch DB) | — | **PASS** (2026-10-12, after last migration) |
| Live API smoke vs local Postgres | `python scripts/smoke_api.py` | **PASS** 22/22 |
| TypeScript / ESLint / `npm run check` (incl. session isolation) | — | **PASS** |
| expo-doctor 18/18, Android JS export | — | **PASS** (2026-10-12) |
| EAS Android development build | build `d239857d-bcc9-4681-8b45-4a94318375eb` | **PASS** (finished) · APK: https://expo.dev/artifacts/eas/AjK-Ek-RSIiJFTvhA91LqbmQBw_fxL9Lv1K4OLDwKiM.apk |
| Earlier EAS build `78fd8e50…` | — | FAIL (Node too old; fixed by bd055f8) |
| Device install, flows, account switch, offline | — | **NOT RUN** |
| Real password-reset email delivery | — | **BLOCKED** — Resend not configured |
| iOS build | — | **BLOCKED** — no Apple Developer membership |
| Docker image build | — | **BLOCKED** — Docker not installed locally |
| Production deploy | — | **NOT RUN** — awaiting cost approval |

Note: the APK predates commits 6a30454 and later. These are backend and content changes, plus `mobile/.env` set for USB. JS loads from Metro in a dev build, so **no rebuild is needed**.

## Device connection (dev)
- PC Wi-Fi IPv4: `172.30.220.74`. The Wi-Fi network profile is **Public**, so Windows blocks inbound connections.
- Chosen path: **USB + `adb reverse`**. No firewall change, nothing exposed on the network. `mobile/.env`: `EXPO_PUBLIC_API_URL=http://localhost:8000`; the backend binds `127.0.0.1:8000`.
- `adb` found at `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`. No device attached yet.
- Warning: the repo's old `open_firewall_ports.bat` opens ports on **all** profiles, Public included. Don't use it on public Wi-Fi.

## Visa content
- **IN→US:** 9/15 verified; V5 blocked (travel.state.gov CAPTCHA); R2 needs legal review (DHS fixed-admission-period rule, FR 2026-14439, effective 2026-09-15, subject to congressional review); 4 general tips have no government source. Full record: `VERIFY_visa_india_us.md`.
- **IN→UK:** all 14 source links live (2026-10-13). Text not re-read line by line this pass.
- **IN→CA:** 12/12 live after fixing the PAL/TAL step. Its old text wrongly called Quebec's letter a "TAL"; it is now rewritten from the current IRCC page.
- Rankings: 267 schools with a full score. App copy changed from "500+" to "250+".

## Resend status
- Code: done (HTTP API, stdlib; SMTP fallback). Env vars: `RESEND_API_KEY` (secret), `EMAIL_FROM`, `PASSWORD_RESET_URL` (default `landhere://reset-password`).
- Production boot logs a warning if email is unconfigured.
- **Not production-ready until a real email has been delivered end to end.**
- Free plan (resend.com/pricing, 2026-10-13): 3,000 emails/month, 100/day, 3 domains.

## Hosting options (prices from render.com/pricing, read 2026-10-13)
| Item | Plan | Monthly | Class |
|---|---|---|---|
| Render workspace | Hobby | $0 | Free |
| API web service | Starter, 512 MB | **$7** | Paid, necessary (Free tier sleeps after 15 min, ~1 min cold start) |
| PostgreSQL | Basic-256mb, 1 GB SSD incl.; extra storage $0.30/GB | **$6** | Paid, necessary (Free DB **expires after 30 days, no backups**). PITR window 3 days on Hobby (page shows "limitations apply") |
| Key Value (Redis) | Starter 256 MB | $10 | Paid, optional (app runs single-worker without it) |
| Bandwidth beyond the included amount | — | unknown | Cannot confirm without an account |
| Custom domain | registrar | not priced | Optional (onrender.com gives HTTPS) |
| Legal/support pages | GitHub Pages | $0 | Free |
| Resend | Free plan | $0 | Free at launch volumes |
| **Minimum production total** | | **≈ $13/month** + storage/bandwidth overages | Needs your approval |
| Apple Developer Program | | US$99/year (developer.apple.com) | One-time per year; your decision |
| Google Play developer registration | | US$25 one-time (verify at checkout) | One-time |

Railway was not priced (not verified).

## Release blockers
**Apple:**
- Not enrolled. Enrolment is $99/year. Apple says approval takes 24–48 hours, but developers in 2026 report waits of days to weeks.
- TestFlight review and App Review come after that.
- **An App Store release by Oct 17 is not realistic.**

**Google:**
- New *personal* Play accounts (created after 2023-11-13) need a closed test with **12+ testers opted in for 14 consecutive days** before Production unlocks. Organization accounts are exempt.
- With a new personal account, the earliest production date is about 15 days after the closed test starts, so **not Oct 17**.
- Internal testing (up to 100 testers) is available immediately after setup.

**Legal:**
- Privacy policy and terms are updated drafts, **not lawyer-reviewed**.
- Open items: minimum age and children's position, hosting region and cross-border transfer, Resend DPA.
- Not yet hosted at a public URL.

## Files changed this session (since a1e45c0)
`app/core/mailer.py`, `app/core/config.py`, `app/main.py`, `render.yaml`, `scripts/smoke_api.py`, `tests/test_mailer.py`, `app/core/content_in_us.py` (new), `app/core/seed.py`, `tests/conftest.py`, `tests/test_content_in_us.py` (new), `VERIFY_visa_india_us.md`, `LAUNCH/PRIVACY_POLICY.md`, `LAUNCH/TERMS_OF_SERVICE.md`, `BUILD_STATUS.md`. Local only (gitignored): `mobile/.env`.

## Your external actions
1. **Device test:** plug in an Android phone over USB and run the commands in the chat.
2. **Resend:** create an account, add and verify a sending domain (DNS records), and create an API key. Put the key only in the hosting dashboard, never in chat.
3. **Approve or decline** about $13/month on Render.
4. **Google Play:** do you already have a developer account? Personal or organization, and when was it created?
5. **Apple:** enrol only if you want iOS; it won't make Oct 17.
6. **State.gov check** for V5, plus a lawyer for the legal drafts and the R2 rule.

## Next three engineering actions
1. Run device QA with you (`LAUNCH/STAGING_DEVICE_QA.md`) once the phone is attached.
2. On approval: provision Render, deploy, run migrations, seed and the rankings ingest, then the smoke test against the HTTPS URL.
3. Salvage and host the legal/support pages (GitHub Pages from the `web/` on the side branch), then build the Play internal-testing AAB.

## ECC usage
GateGuard and strategic-compact hooks ran throughout. No ECC agents were used: the work was sequential and touched shared files. Every finding here was verified directly by command output or by reading the official page.
