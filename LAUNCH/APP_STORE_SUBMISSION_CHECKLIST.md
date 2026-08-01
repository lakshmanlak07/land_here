# LandHere — App Store Submission Checklist

_Single source of truth for what remains before submission._
_Generated 2026-08-01 against tag `v0.1.0-rc.3` (branch `release/rc3-prep`)._

**LandHere ships as a FREE app.** No purchase, no subscription, no price anywhere.
Every user gets the full content set.

Legend for who/what each item needs:

| Mark | Meaning |
|---|---|
| 🧑 | Needs **your** external account or a decision only you can make |
| ⚖️ | Needs a **lawyer** |
| ☁️ | Needs a **hosted service** (Render/Railway, static host, Redis) |
| 📱 | Needs a **real iPhone** / TestFlight — cannot be verified any other way |
| ✅ | Done and verified locally in this pass |

---

## A. Completed and locally verified

Everything here was actually executed in this pass; results are in
`LAUNCH/RC3_VERIFICATION.md`.

- ✅ Backend test suite — **67 passed, 0 failed**
- ✅ Security-focused subset (`tests/test_security.py`) — **37 passed**
- ✅ `alembic upgrade head` against a genuinely **empty PostgreSQL 16.2** — 9 migrations, exit 0
- ✅ `alembic downgrade base` → `upgrade head` → seed — **full cycle exit 0** (this was broken before; see below)
- ✅ Seed run on a fresh DB — 22 countries, 15 IN→US, 12 IN→CA, 14 IN→UK steps
- ✅ Mobile TypeScript (`tsc --noEmit`) — **clean**
- ✅ **ESLint now runs** — 0 errors, 63 warnings, exit 0 (was never runnable before)
- ✅ Policy check suite (`npm run check`) — **23/23 passed**, mutation-tested
- ✅ iOS production export — succeeds
- ✅ Android production export — succeeds
- ✅ Bundle scan, both platforms — **CLEAN** via `mobile/scripts/scan-bundle.sh`, mutation-tested
- ✅ Build-env gate fails closed on missing/placeholder/LAN/HTTP values, passes on valid ones
- ✅ `EXPO_PUBLIC_UNSPLASH_KEY` removed from `mobile/.env`; absent from all source, both bundles, and git history
- ✅ `react-native-iap` removed from `package.json` **and** from the `app.json` plugins array
- ✅ Account deletion: auth-gated, password-confirmed, rate-limited, cascade-verified, no orphaned refresh tokens
- ✅ Privacy / Terms / Support links render in Settings from production config

### Defects found and fixed in this pass

1. **`react-native-iap` was still a dependency and still a registered Expo config
   plugin.** No JS imported it, so rc.2's bundle scan passed — but the config
   plugin injects StoreKit (iOS) and `com.android.vending.BILLING` (Android) into
   the native projects. A free app with no IAP products would have shipped
   declaring purchase capability. Removed from both places; a regression check
   now fails if either returns.
2. **`alembic downgrade base` was broken.** `ix_info_steps_origin_code` is created
   by the initial migration but was dropped by *two* downgrades, so rollback died
   partway with `UndefinedObject` and left the database partially torn down —
   with `alembic upgrade head` running at container boot, that is a very bad state
   to discover during an incident. Fixed and the full down/up cycle now verified.
3. **No test covered orphaned refresh tokens after account deletion.** The
   `refresh_tokens` table postdates the deletion endpoint and is cleaned only by
   an `ON DELETE CASCADE`. Added a mutation-tested regression test, since the
   privacy policy promises complete deletion.
4. **`app/main.py` warned "in-memory rate limiting" on every production boot**,
   even with Redis correctly provisioned. Now conditional on `REDIS_URL`.

---

## B. Code / configuration required

Nothing here blocks on an external party — but most needs values from section C.

- [ ] 🧑 Decide the **bundle identifier**. `app.json` currently declares
      `com.landhere.app` for both platforms. It is permanent once the app record
      exists. If you want a different one, change it **before** creating the App
      Store Connect record.
- [ ] 🧑 Fill `mobile/eas.json` → `submit.production.ios.ascAppId`
      (currently `REPLACE_WITH_APP_STORE_CONNECT_APP_ID`).
- [ ] 🧑 Fill `mobile/eas.json` → `submit.production.ios.appleTeamId`
      (currently `REPLACE_WITH_APPLE_TEAM_ID`).
- [ ] Set the four `EXPO_PUBLIC_*` values as **EAS build environment variables**.
      The placeholders in `eas.json` are deliberate tripwires: a build with them
      unreplaced fails on the EAS build machine, it does not ship.
- [ ] Confirm the app **icon** is 1024×1024, no alpha channel, no rounded
      corners (`mobile/assets/icon.png`). Apple rejects alpha channels.
- [ ] Optional, not a blocker: `components/SplashScreen.tsx` exists but is not
      wired into launch, and `app.json` declares no splash configuration, so the
      build uses the Expo default.

---

## C. Infrastructure / deployment required

- [ ] ☁️ 🧑 **Deploy the backend.** `render.yaml`, `railway.toml`, `Dockerfile`,
      and `start.sh` are all present and audited. Nothing is deployed today.
- [ ] ☁️ Provision **managed PostgreSQL**. `render.yaml` declares `landhere-db`.
- [ ] ☁️ Provision **Redis** and set `REDIS_URL`. Without it `start.sh`
      deliberately forces `--workers 1`, so the published rate limits stay true.
      That is a correct single-worker launch, not a bug — but you cannot scale
      out until Redis exists.
- [ ] ☁️ Set backend environment variables:

      | Variable | Value |
      |---|---|
      | `ENV` | `production` |
      | `SECRET_KEY` | 64-char random — `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
      | `DATABASE_URL` | from the managed Postgres instance |
      | `CORS_ALLOW_ORIGINS` | explicit origin(s); boot **fails** on `*` or empty |
      | `TRUST_PROXY_HEADERS` | `true` |
      | `TRUSTED_PROXY_HOPS` | `1` |
      | `REDIS_URL` | from the Redis/Key-Value instance |
      | `UNSPLASH_ACCESS_KEY` | the **rotated** key, server-side only |
      | `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` |
      | `REFRESH_TOKEN_EXPIRE_MINUTES` | `43200` |

- [ ] 🧑 **Rotate the Unsplash key** at <https://unsplash.com/oauth/applications>.
      It was never committed to git, but it was present in `mobile/.env` and any
      build produced during that window bundled it. Put the new key on the server
      only, as `UNSPLASH_ACCESS_KEY`. Note the local backend `.env` has never had
      this variable at all, so `GET /images/city` currently returns 503 and city
      images do not load — this must be set for production or images stay broken.
- [ ] ☁️ Run the seed once against production: `python -m app.core.seed`.
      (Migrations run automatically at container boot via `start.sh`.)
- [ ] ☁️ Verify `GET /health/ready` returns **200 over HTTPS**.
- [ ] ☁️ 🧑 **Host three public pages** and capture their HTTPS URLs:
      privacy policy, terms of service, support/contact. GitHub Pages or any
      static host is fine for day one. Content is in `LAUNCH/PRIVACY_POLICY.md`
      and `LAUNCH/TERMS_OF_SERVICE.md` — **pending ⚖️ review, see section D**.

---

## D. Legal / App Store Connect required

- [ ] ⚖️ **Lawyer reviews the legal pack.** They must set: minimum age,
      parental-consent position, governing law, and liability wording. This
      matters more than usual because the app's audience plausibly includes
      under-18 students. Send `LAUNCH/PRIVACY_POLICY.md`,
      `LAUNCH/TERMS_OF_SERVICE.md`, and `LAUNCH/ATTORNEY_BRIEF.md`.
- [ ] 🧑 **Apple Developer Program enrolment** — $99/yr, identity check takes
      1–3 days. Nothing ships without it.
- [ ] 🧑 Create the **App Store Connect app record** (bundle ID must match
      `app.json` exactly).
- [ ] 🧑 Set the app price to **Free**.
- [ ] 🧑 Do **not** create any in-app purchase product. Answer "No" to the IAP
      question. The build contains no purchase code.
- [ ] 🧑 Paste listing metadata from **`LAUNCH/APP_STORE_METADATA.md`**.
      ⚠️ The older `LAUNCH/APP_STORE_LISTING.md` still contains rc.1 copy
      advertising a "$1.99 one-time unlock". **Do not paste it** — describing a
      purchase the app does not contain is a likely rejection.
- [ ] 🧑 Complete the **privacy nutrition label** using the data inventory in
      `APP_STORE_METADATA.md`.
- [ ] 🧑 Set the **age rating** using the notes in `APP_STORE_METADATA.md`.
      ⚖️ Confirm the minimum-age answer with your lawyer first.
- [ ] 🧑 Provide **App Review notes** and a **reviewer test account**
      (template in `APP_STORE_METADATA.md`). The app is behind a login wall;
      without working credentials it will be rejected on the first pass.
- [ ] 🧑 Upload **screenshots** — ≥3 each at 6.9" and 6.5".
      📱 These must come from a real device or simulator running the production build.

---

## E. Physical device / TestFlight required

📱 **Nothing in this section has ever been done. No LandHere build has run on real
hardware.** Simulator and export success does not substitute.

- [ ] 📱 `eas build --profile production --platform ios` completes
- [ ] 📱 Install via TestFlight on a real iPhone
- [ ] 📱 Cold launch — app opens, no crash-on-open from config validation
- [ ] 📱 Register a new account, sign out, sign back in
- [ ] 📱 Complete the 9-screen onboarding; plan reveal renders
- [ ] 📱 Journey loads over the **production** API; steps mark read and persist
- [ ] 📱 Rankings list scrolls and pages; university detail opens; methodology opens
- [ ] 📱 Scholarships, work-hours, money, necessities all render
- [ ] 📱 City images load (proves `UNSPLASH_ACCESS_KEY` is set server-side)
- [ ] 📱 Settings → Privacy Policy, Terms, Support each open a real hosted page
- [ ] 📱 Settings → Delete account: wrong password rejected, correct password
      deletes, and the account is really gone (re-login fails)
- [ ] 📱 Token refresh works — leave the app idle past the 60-minute access-token
      TTL, return, confirm no forced logout
- [ ] 📱 Dark mode follows device appearance across every screen
- [ ] 📱 **No purchase, price, "unlock", or "restore" text anywhere**
- [ ] 📱 Airplane mode — error states are graceful, not blank or crashing

---

## F. Public-release GO / NO-GO criteria

Ship only when **every** line is true.

**Correctness and safety**
- [ ] Backend tests green on the commit being shipped
- [ ] `npm run check`, `tsc --noEmit`, and `npm run lint` all green
- [ ] `scripts/scan-bundle.sh <dir> <production-api-origin>` returns **CLEAN**,
      including the positive assertion that the real API origin is embedded
- [ ] `npm run check:env` prints `✔ Environment valid` with the real values

**Infrastructure**
- [ ] `GET /health/ready` returns 200 over HTTPS from outside your network
- [ ] `ENV=production`, `CORS_ALLOW_ORIGINS` explicit, `SECRET_KEY` rotated off any dev value
- [ ] A database backup exists and a restore has actually been tested (see runbook §Backup)
- [ ] Rollback path rehearsed: previous image redeployable, `alembic downgrade` understood

**Product**
- [ ] Every TestFlight item in section E passes on a real device
- [ ] Only IN→US, IN→CA, IN→UK are reachable; no unverified corridor is exposed
- [ ] No content claims "verified" that a human has not checked against the official source

**Legal / store**
- [ ] ⚖️ Lawyer has signed off on privacy policy, terms, and the minors position
- [ ] Privacy policy, terms, and support URLs are live and load on a phone browser
- [ ] Privacy nutrition label matches the actual data inventory
- [ ] App price is **Free**; no IAP product exists
- [ ] Reviewer test account works from a clean device

**NO-GO if any of these is true**
- Backend is not deployed, or the app points at anything other than the production HTTPS origin
- Any legal URL 404s
- Lawyer has not reviewed, and the app is reachable by under-18s
- The build has not been run on a physical device
- `SECRET_KEY` is a dev value, or `CORS_ALLOW_ORIGINS` is `*`
- Any purchase surface is visible
