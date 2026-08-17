# LandHere — Launch Runbook

_Rewritten 2026-08-01 for v0.1.0-rc.3; revised 2026-08-16 for **`feat/pro-iap`**,
which restores the $1.99 LandHere Pro purchase with server-side entitlement._

The ordered task list is **`LAUNCH/APP_STORE_SUBMISSION_CHECKLIST.md`**.
Backend provisioning, migration, backup/restore and rollback live in
**`LAUNCH/DEPLOYMENT_RUNBOOK.md`**. Google Play setup lives in
**`LAUNCH/PLAY_STORE_SUBMISSION_CHECKLIST.md`** — including the two Google
secrets the backend needs (`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`,
and the Pub/Sub push OIDC settings).
This runbook explains the release, the commands, and what to do when something
goes wrong.

---

## 1. What this release is

**LandHere v1.0.0 is a free app with one optional in-app purchase.**
Purchase paths for **both** the App Store and Google Play are implemented.

| | |
|---|---|
| App bundle id | `com.landhere.app` |
| IAP product id | `com.landhere.app.pro` (**not** the bundle id) |
| Type | One-time **non-consumable** |
| Android package | `com.landhere.app` |
| Play product id | `com.landhere.app.pro` (**not** the package name) |
| Price | US $1.99, set in App Store Connect **and** Play Console |
| Subscriptions | none, and none may be created |

**Free without paying:** journey phases 1–2, the top 25 ranked universities, the
complete scholarship directory, the complete work-hour rules, the scoring
methodology, country guides, arrival necessities, money tools.

**LandHere Pro adds:** the remaining journey phases, ranked universities beyond
the top 25, and university detail pages.

Release state: branch `feat/pro-iap`.
**Not merged to main. Not pushed. Not deployed. Never run on a physical device.**

### How the paid tier was restored

The free-only build (rc.2/rc.3) stripped purchases entirely. Bringing them back
required more than reverting that, because the *original* paid tier was unsafe:
it gated content with an AsyncStorage boolean any user could set.

| Layer | State |
|---|---|
| Paywall screen | `mobile/app/paywall.tsx` — a real route again |
| Feature flag | `PURCHASES_ENABLED = true` in `mobile/lib/features.ts` |
| Purchase store | `purchaseStore.ts` reads entitlement from the server; **persists nothing** |
| StoreKit library | `expo-iap`, in `package.json` **and** in the `app.json` plugins array |
| Server verification | `app/core/appstore.py` — Apple's JWS chain, fails closed |
| Entitlement store | `purchases` table, UNIQUE on `(platform, platform_transaction_id)` |
| Google verification | `app/core/googleplay.py` — asks Google, fails closed |
| Content gating | `require_pro` + pre-serialisation trimming in the API |

Two details worth keeping in mind:

- **The `app.json` plugin entry matters as much as the dependency.** Without it
  the native StoreKit capability is never generated and purchases fail silently
  on device — and an `expo export` succeeds either way, so only the policy suite
  catches it.
- **`expo-iap` cannot run in Expo Go.** Any purchase testing needs a development
  build or TestFlight.

`npm run check` asserts both halves, that entitlement is never read from device
storage, and that no Apple credential appears in the mobile source.

---

## 2. Local verification — the commands that must be green

Run from a clean checkout. Every one of these was executed for rc.3; results are
in `LAUNCH/RC3_VERIFICATION.md`.

```bash
# ── Backend ───────────────────────────────────────────────────────────────────
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
pytest tests -q                                    # expect: 67 passed
pytest tests/test_security.py -q                   # expect: 37 passed

# ── Mobile ────────────────────────────────────────────────────────────────────
cd mobile
npm install                                        # no --force, no --legacy-peer-deps
npx tsc --noEmit                                   # expect: clean
npm run lint                                       # expect: 0 errors
npm run check                                      # expect: 23/23 passed
npm run check:env                                  # expect: FAILS until real URLs exist

# ── Export + scan ─────────────────────────────────────────────────────────────
npx expo export --platform ios     --output-dir dist-ios     --clear
npx expo export --platform android --output-dir dist-android --clear
./scripts/scan-bundle.sh dist-ios     "https://YOUR-API-ORIGIN"
./scripts/scan-bundle.sh dist-android "https://YOUR-API-ORIGIN"
```

### About `npm install` and the react/react-dom conflict

This used to fail, which is why ESLint had never run. `react-dom@19.2.8` arrives
transitively through `expo-router` (via `@expo/metro-runtime` and `@radix-ui/*`)
and peers on `react@^19.2.8`, while the project correctly pins `react@19.1.0` for
Expo SDK 54 / RN 0.81.

Fixed with an **override**, not a force flag:

```json
"overrides": { "react-dom": "19.1.0" }
```

`react-dom` is web-only and this app ships iOS/Android, so pinning it to match
the pinned `react` is exactly right. **Do not "fix" this with
`--legacy-peer-deps` or `--force`** — that hides the mismatch instead of
resolving it.

### About the bundle scan

Use `mobile/scripts/scan-bundle.sh`, not a plain grep. A naive
`grep -F 192.168` over a Hermes bundle always looks dirty for two harmless
reasons: `lib/urlPolicy.ts` contains the private-address and placeholder patterns
**as its own rule table**, and React Native embeds `http://localhost:8081` /
`http://localhost:3000` in every build. The script looks for URL-shaped private
*origins* and allowlists those two RN literals. It also takes the expected
production API origin and asserts it is actually present — catching a build where
`EXPO_PUBLIC_API_URL` was silently unset.

---

## 3. Backend deployment

`Dockerfile`, `start.sh`, `render.yaml`, and `railway.toml` are present and were
audited for rc.3. Behaviour worth knowing:

- **Migrations run at container boot.** `start.sh` runs `alembic upgrade head`
  under `set -e`, so a failed migration **aborts startup** rather than serving a
  half-migrated schema. Verified against an empty PostgreSQL 16.2: 9 migrations,
  exit 0.
- **Worker count is tied to the rate limiter.** Without `REDIS_URL`, `start.sh`
  forces `--workers 1`, because the in-memory limiter is per-process and N
  workers would silently multiply every published limit by N. With `REDIS_URL`
  set, the limiter uses a Redis sorted-set sliding window shared across workers.
- **No `--forwarded-allow-ips='*'`.** The app decides whether to trust
  `X-Forwarded-For` itself, gated on `TRUST_PROXY_HEADERS` + `TRUSTED_PROXY_HOPS`.
- **Production fails closed.** With `ENV=production`, boot raises on a placeholder
  `SECRET_KEY`, on wildcard/empty `CORS_ALLOW_ORIGINS`, on a localhost/placeholder
  `DATABASE_URL`, and on `TRUST_PROXY_HEADERS=true` with `TRUSTED_PROXY_HOPS < 1`.
  `/docs`, `/redoc`, and `/openapi.json` are disabled in production.

Deploy sequence:

```bash
# 1. Provision managed Postgres and Redis on the host.
# 2. Set every variable from the checklist section C.
# 3. Deploy. Watch the logs for "Running upgrade ... -> d4e6f8a0b2c4".
# 4. Seed once:
python -m app.core.seed
# 5. Confirm from OUTSIDE your network:
curl -i https://YOUR-API-ORIGIN/health/ready     # expect 200 {"status":"ok"}
curl -i https://YOUR-API-ORIGIN/docs             # expect 404 in production
```

### One-time sign-out on first deploy

Refresh tokens issued before the `refresh_tokens` table existed carry no `jti`
and are rejected. **Every currently logged-in user is signed out once.** Expected;
harmless for a pre-launch user base of you.

---

## 4. Backup and rollback

Nothing below has been rehearsed on real infrastructure yet — it cannot be, until
something is deployed. Rehearse it **before** you have users, not after.

### Database backup

```bash
# Take a backup BEFORE every deploy that includes a migration.
pg_dump "$DATABASE_URL" --format=custom --file=landhere-$(date +%Y%m%d-%H%M).dump

# Restore into a scratch database and verify it actually restores.
createdb landhere_restore_test
pg_restore --dbname=landhere_restore_test --clean --if-exists landhere-YYYYMMDD-HHMM.dump
```

A backup you have never restored is not a backup. Do the restore test once.

On Render, also enable the managed daily backups on the Postgres instance — but
keep taking your own pre-deploy dump, because managed snapshots are point-in-time
and you want a known-good artifact tied to a specific release.

### Application rollback

Fastest and safest path: **redeploy the previous image.** Both Render and Railway
keep prior deploys and offer a one-click rollback. Do this first; do not start
editing schema under pressure.

### Migration rollback

The full down/up cycle is verified working as of rc.3 — `alembic downgrade base`
→ `upgrade head` → seed all exit 0. It was **broken before rc.3**:
`ix_info_steps_origin_code` is created by the initial migration but was dropped by
two separate downgrades, so rollback died partway with `UndefinedObject` and left
the database partially torn down. With `alembic upgrade head` running at boot,
that state is genuinely dangerous. Fixed in
`alembic/versions/c3d5e7f9a1b2_add_info_steps_indexes.py`.

```bash
alembic current                 # what the DB thinks it is
alembic history --verbose       # the chain
alembic downgrade -1            # step back exactly one revision
alembic downgrade <revision>    # back to a known-good revision
```

Rules when rolling a migration back in production:

1. **Take a `pg_dump` first.** Always. Downgrades that drop columns destroy data
   the dump is the only copy of.
2. **Roll the application back first, then the schema.** Old code against a new
   schema usually survives; new code against an old schema does not.
3. **Never `alembic stamp` to escape a failed migration** unless you have
   confirmed by inspection that the schema genuinely matches the revision you are
   stamping. Stamping is how you get a database that lies about its own state —
   and because the container runs `upgrade head` at boot, a wrongly-stamped
   database will then start up "successfully" with a schema the code cannot use.
4. After any rollback, run `alembic current` and confirm it matches what you
   intended before letting traffic back in.

### Secret rotation

If `SECRET_KEY` is rotated, every access and refresh token becomes invalid and
all users are signed out. That is the correct response to a suspected key
compromise; just know it is user-visible.

---

## 5. EAS build and submit

Prerequisites: Apple Developer enrolment approved, the four public URLs live, and
`ascAppId` / `appleTeamId` filled in `mobile/eas.json`.

```bash
cd mobile

# 0. One-time
npm install -g eas-cli
eas login
eas whoami

# 1. Set the four public URLs as EAS build environment variables.
#    (EAS dashboard → Project → Environment variables, scope: production.)
#    The placeholders in eas.json are tripwires — a build with them unreplaced
#    FAILS on the build machine via the eas-build-pre-install hook.

# 2. Prove the environment locally first
npm run check:env                 # must print: ✔ Environment valid

# 3. Prove the bundle before spending a build
npx expo export --platform ios --output-dir dist-ios --clear
./scripts/scan-bundle.sh dist-ios "https://YOUR-API-ORIGIN"   # must be CLEAN

# 4. Build
eas build --profile production --platform ios

# 5. Submit the built binary to App Store Connect (TestFlight)
eas submit --profile production --platform ios --latest

# 6. TestFlight: install on a real iPhone and work through
#    APP_STORE_SUBMISSION_CHECKLIST.md section E, every line.

# 7. Only after section E fully passes, submit for App Review from
#    App Store Connect.
```

Version numbers: `app.json` holds the marketing version (`1.0.0`); build numbers
come from EAS (`appVersionSource: "remote"` with `autoIncrement: true`), so you
never hand-edit them. Bump `version` in `app.json` for a user-visible release.

---

## 6. Do NOT ship

- **A subscription of any kind.** LandHere Pro is non-consumable and one-time.
  Do not create a subscription product in App Store Connect, and do not let any
  copy describe it as recurring. `npm run check` fails on recurring-billing
  language in shipped screens.
- **A build where the purchase is unverified.** If `APPLE_ROOT_CA_DIR` and
  `APPLE_APP_APPLE_ID` are not set on the server, `/purchases/verify` returns 503
  and nobody can buy anything. That is the fail-closed behaviour working, but it
  must be configured before launch, not discovered after.
- **Any Apple private key, `.p8`, or shared secret in the app bundle.** None is
  needed; verification uses Apple's public roots. The bundle scan enforces this.
- **An Android build with no Google credentials on the server.** The purchase
  path is implemented, but with `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` unset every
  Play purchase fails verification (503) and is auto-refunded by Google after
  three days. Shipping that would take money and give it back, badly.
  `serviceAccountKeyPath` in `eas.json` is still a placeholder.
- **Any corridor beyond IN→US, IN→CA, IN→UK.** The picker is already restricted.
- **A "verified" badge on anything a human has not checked.** AU / IE / NL / NZ /
  FR / SG work rules remain unverified and are excluded.
- **Anything from `LAUNCH/archive/` as listing copy.** Those files advertise the
  wrong free/paid split. Use `LAUNCH/APP_STORE_METADATA.md`.
- **Any legal document as published copy** until a qualified lawyer has reviewed
  it. `LAUNCH/PRIVACY_POLICY.md` and `LAUNCH/TERMS_OF_SERVICE.md` are drafts and
  say so at the top.

---

## 7. Known limitations shipping in this build

- **Email enumeration is reduced, not eliminated.** Duplicate registration returns
  a generic message, but a 400 is still a signal. Email verification is the real
  fix and is deferred.
- **Rate limiting is single-worker** unless Redis is provisioned.
- **Refunds are handled automatically once the notification URL is configured**
  (`POST /purchases/notifications`, set in App Store Connect — see
  `LAUNCH/DEPLOYMENT_RUNBOOK.md` §6). Until it is set, a refund only reaches us
  when the user next restores, so a refunded user keeps Pro access in the
  meantime.
- **One purchase entitles one account, with no self-service move.** A user who
  deletes their account and makes a new one currently needs manual help to
  re-attach their purchase.
- **The whole purchase flow is untested against real StoreKit.** No build has run
  on a device; `expo-iap` cannot run in Expo Go.
- **No analytics.** You are blind on onboarding drop-off. Note the store listing
  promises no third-party analytics — adding any is a listing and
  nutrition-label change in the same release.
- **63 ESLint warnings** (mostly unused imports). Not blocking; worth a cleanup pass.
- **`GET /images/city` returns 503 unless `UNSPLASH_ACCESS_KEY` is set
  server-side.** The local backend `.env` has never had it, so city images do not
  currently load anywhere.

---

## 8. Post-launch, explicitly deferred

- Android build and Play Console account
- Email verification
- Redis-backed rate limiting across multiple workers
- Privacy-safe funnel counts
- Waitlist capture for unsupported corridors
- Re-verification cadence: re-check work rules and visa steps every 90 days and
  update the "last reviewed" date in `mobile/constants/workRules.ts`
