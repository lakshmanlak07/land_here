# Release Candidate v0.1.0-rc.2 — free-only launch candidate

Branch `integrate/hardening-round2`, tag `v0.1.0-rc.2`.
Not merged to main, not pushed, not deployed.

**This is a free app.** There is no purchase, no Pro tier, no subscription, and
no price shown anywhere. Every user gets the full content set.

## What changed from rc.1

- Paywall screen moved out of `app/` to `future/paywall.tsx`, so no route and no
  `landhere://paywall` deep link exists. Bringing it back requires server-side
  entitlements first — see `mobile/future/README.md`.
- `PURCHASES_ENABLED = false` in `mobile/lib/features.ts`.
- `purchaseStore.ts` no longer reads AsyncStorage, no longer imports
  `react-native-iap`, and cannot unlock anything. The `landhere_purchased` key
  is not read by any code path.
- All gating removed from journey, rankings, scholarships, work-hours, money,
  country detail, and the home grid. "Restore Purchases" and the PRO badge are
  gone from Settings.
- New `lib/config.ts` + `lib/urlPolicy.ts`: build-time validation of all four
  public URLs.
- New `lib/checkBuildEnv.ts`, wired as the `eas-build-pre-install` npm script, so
  a misconfigured **EAS build fails on the build machine** rather than producing
  an app that crashes on launch.
- Settings now links Privacy Policy, Terms of Service, and Support.
- Account deletion unchanged and now covered by backend tests.

## Verification actually run

| Check | Result |
|---|---|
| Backend `pytest tests -q` | **66 passed**, 0 failed |
| Mobile `tsc --noEmit` | **clean** |
| Mobile checks (`npm run check`) | **24/24 passed** |
| iOS production export | **succeeds** |
| Android production export | **succeeds** |
| Bundle scan (both platforms) | no `Client-ID`, `api.unsplash.com`, `1.99`, `Restore Purchases`, `com.landhere.app.pro`, `/paywall`, `landhere_purchased`, or `react-native-iap` |
| Build-env gate | correctly **rejects** the current `.env` |
| Unsplash key in git history | **never committed** (only the `your-unsplash-access-key` placeholder) |

The mobile checks were mutation-tested: flipping `PURCHASES_ENABLED` to `true`
makes them fail, so they are not vacuous.

**Still not run: ESLint.** `npm install` fails on a pre-existing peer conflict
(`react-dom@19.2.8` requires `react@^19.2.8`, project pins `react@19.1.0`).
Unrelated to this work, but it means lint is unverified.

**Still not done: no build has run on a real device or through TestFlight.**

## Values you must provide

The production build **cannot be produced** until these four exist. All are
public URLs (they ship in the app bundle by design); none is a secret.

| Variable | What it needs to be |
|---|---|
| `EXPO_PUBLIC_API_URL` | The deployed backend origin, HTTPS, e.g. `https://landhere-api.onrender.com`. Not a LAN IP, not localhost, not plain HTTP. |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | Hosted privacy policy, HTTPS. `PRIVACY_POLICY_DRAFT_v2.md` is the content; it needs a URL. |
| `EXPO_PUBLIC_TERMS_URL` | Hosted terms, HTTPS. Content is in `TERMS_OF_SERVICE_DRAFT.md`. |
| `EXPO_PUBLIC_SUPPORT_URL` | A support page, HTTPS. Can be a simple page with the contact address. |

Rejected automatically: missing values, non-HTTPS, localhost/LAN/private IPs,
and anything containing `example.com`, `your-`, `todo`, `tbd`, `placeholder`.

### Also: delete the Unsplash line from `mobile/.env`

Your local `mobile/.env` still contains `EXPO_PUBLIC_UNSPLASH_KEY`. Nothing reads
it, and the build gate now refuses to build while it is present. Delete the line.

**Rotate the Unsplash key before deploying**, at
<https://unsplash.com/oauth/applications>. It was never committed to git, but any
build made while it was bundled is a distribution path. Put the new key on the
server only, as `UNSPLASH_ACCESS_KEY`.

## Backend production environment (Render)

| Variable | Value |
|---|---|
| `ENV` | `production` |
| `SECRET_KEY` | 64-char random: `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DATABASE_URL` | From the Render Postgres instance |
| `CORS_ALLOW_ORIGINS` | Explicit origin(s). Boot fails on `*` or empty. |
| `TRUST_PROXY_HEADERS` | `true` |
| `TRUSTED_PROXY_HOPS` | `1` |
| `REDIS_URL` | From Render Key Value. Without it the app runs a single worker. |
| `UNSPLASH_ACCESS_KEY` | The **rotated** key, server-side only |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | `43200` |

Deploy note: the container runs `alembic upgrade head` at boot. Refresh tokens
issued before this deploy have no `jti` and are rejected, so **every logged-in
user is signed out once.** Expected.

## Submission checklist, once the four URLs exist

1. Delete `EXPO_PUBLIC_UNSPLASH_KEY` from `mobile/.env`; rotate the key.
2. Deploy the backend; confirm `GET /health/ready` returns 200 over HTTPS.
3. Set the four `EXPO_PUBLIC_*` values as EAS build environment variables.
4. `cd mobile && npm run check:env` — must print `✔ Environment valid`.
5. `npx expo export --platform ios` and confirm the bundle no longer contains a
   LAN address.
6. `eas build --profile production --platform ios`.
7. Install via TestFlight and verify by hand:
   - sign up, sign out, sign back in;
   - Settings → Privacy Policy, Terms, Support all open;
   - Settings → Delete account works and the account is really gone;
   - no purchase, price, or "unlock" text anywhere;
   - content loads over the production API.
8. App Store Connect: privacy policy URL, support URL, age rating, data-collection
   answers, screenshots.
9. Set the app's price to **Free**.
10. Fill in `ascAppId` and `appleTeamId` in `mobile/eas.json` (both empty).

## Known limitations shipping in this build

- **Email enumeration is reduced, not eliminated.** Duplicate registration returns
  a generic message, but a 400 is still a signal. Email verification is the real
  fix and is deferred.
- **Rate limiting is single-worker** unless Redis is provisioned.
- No server-side entitlements exist. That is fine for a free app and is the
  blocker to re-enabling the paid tier.
