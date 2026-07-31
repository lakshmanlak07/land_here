# Release Candidate v0.1.0-rc.1 — checklist

Branch `integrate/hardening-round2`, commit `11c7a17`, tag `v0.1.0-rc.1`.
Not merged to main, not pushed.

## Verified in this build

- [x] Backend suite: 63 passed, 0 failed
- [x] Mobile `tsc --noEmit`: clean
- [x] iOS production export (`expo export --platform ios`): succeeds, 5.23 MB bundle
- [x] Unsplash key absent from the built bundle (byte-scanned; `Client-ID` and
      `api.unsplash.com` both absent)
- [x] `alembic upgrade head` on an empty database: completes (single head
      `d4e6f8a0b2c4`)
- [x] No placeholder/Lorem/TODO copy in shipped screens

## NOT verified

- [ ] **ESLint never ran.** `expo lint` bootstraps a config but `npm install`
      fails on a pre-existing peer conflict (`react-dom@19.2.8` wants
      `react@^19.2.8`, project pins `react@19.1.0`). Unrelated to this work.
      The scaffolding was reverted rather than committing an unrunnable config.
- [ ] No real device / TestFlight run of this build.
- [ ] No load or multi-worker test against real Redis.
- [ ] StoreKit purchase flow is unchanged and still client-trusted (below).

## Blockers before submission

### 1. Entitlements are still client-side only — HARD BLOCKER for a paid app
Phase 5 was not started (out of scope tonight). `mobile/lib/purchaseStore.ts`
still grants pro from AsyncStorage `landhere_purchased`, and the server has no
entitlement concept. Anyone can unlock the $1.99 purchase by writing one key,
and there is no receipt validation. Ship only if you accept that.

### 2. Production API URL is a LAN address
`mobile/.env` has `EXPO_PUBLIC_API_URL=http://192.168.0.113:8000`, and that
string is baked into the exported bundle. A build made from this .env is
unusable off your network. Set the real HTTPS backend URL before `eas build`.
Also note plain `http://` will hit App Transport Security — the production URL
must be `https://`.

### 3. Unsplash key still in `mobile/.env`
The line `EXPO_PUBLIC_UNSPLASH_KEY=...` is now unused by code but still sits in
your local env file. Delete the line, and rotate the key regardless (any earlier
build that bundled it is a distribution path).

### 4. Privacy policy / terms are drafts, unhosted, unlinked
`PRIVACY_POLICY_DRAFT_v2.md` and `TERMS_OF_SERVICE_DRAFT.md` are repo files. App
Store Connect requires a reachable privacy policy URL. The app UI links neither.

### 5. Support contact is a personal Gmail
`components/ErrorBoundary.tsx` and the profile screen use
`lakshmanlak07@gmail.com`. Acceptable to Apple, but it becomes public.

## Required production environment variables (Render)

| Variable | Value | Notes |
|---|---|---|
| `ENV` | `production` | Enables the boot-time config guards |
| `SECRET_KEY` | 64-char random | `python -c "import secrets; print(secrets.token_urlsafe(64))"` — rotating it invalidates every session |
| `DATABASE_URL` | from Render Postgres | Boot fails on localhost/placeholder values |
| `CORS_ALLOW_ORIGINS` | explicit origin(s) | Boot fails on `*` or empty |
| `TRUST_PROXY_HEADERS` | `true` | Render terminates TLS in front of the app |
| `TRUSTED_PROXY_HOPS` | `1` | Must match the real proxy count |
| `REDIS_URL` | from Render Key Value | **Without it the app runs 1 worker** |
| `UNSPLASH_ACCESS_KEY` | rotated key | Server-side only |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | `43200` | 30 days |

Deploy note: the container runs `alembic upgrade head` at boot. The new
`refresh_tokens` migration (`d4e6f8a0b2c4`) applies automatically. Existing
refresh tokens issued before this deploy have no `jti` and will be rejected —
**every logged-in user is signed out once by this deploy.** Expected, not a bug.

## Deferred, deliberately

- Email verification (the real fix for account enumeration)
- Server-side entitlements / StoreKit receipt validation
- App Store refund + revocation notification handling
