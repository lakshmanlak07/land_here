# LandHere v0.1.0-rc.4 — verification record

> **This is a CODE-SIDE release candidate. It is not launched, not deployed, not
> submitted, and not verified on any physical device.**

Every result below was executed during the freeze, on a **clean worktree checked
out from `origin/feat/pro-iap`** with a **fresh virtualenv** and a **fresh
`npm ci`**. Nothing here is copied from an earlier run.

| | |
|---|---|
| Tag | `v0.1.0-rc.4` |
| Tagged commit | whatever `v0.1.0-rc.4` points at — resolve with `git rev-parse v0.1.0-rc.4^{commit}` |
| **Code verified at** | **`1349b6076b35730347a797c6be9f30ffb8425065`** |
| Branch | `feat/pro-iap` (pushed; 0 unpushed commits) |
| Commits since `v0.1.0-rc.3` | **19** |
| Frozen | 2026-08-18 |

The tagged commit is the parent plus this verification record and the two
status headers — **documentation only**. Confirm with:

```bash
git diff --stat 1349b60..v0.1.0-rc.4
```

Every gate below was executed at `1349b60`, whose tree is identical to the
tagged tree in all non-documentation files.

## Environment

| Tool | Version |
|---|---|
| Python | 3.12.4 (fresh venv, `requirements.txt` + `requirements-dev.txt`) |
| Node | v26.3.0 |
| npm | 11.16.0 (`npm ci` from `package-lock.json`) |
| PostgreSQL | 18.4 |

⚠️ The environment differs from what rc.3 was verified on (Node 22 / Python 3.10
/ PostgreSQL 16.2) and from what production will run. The managed Postgres
version in particular is not yet known.

---

## Gate results

| # | Gate | Command | Result |
|---|---|---|---|
| 1 | Backend suite | `pytest tests -q` | **170 passed, 6 skipped** |
| 2 | PostgreSQL integration | `pytest tests/test_postgres_integration.py` with `INTEGRATION_DATABASE_URL` | **6 passed** (against a database that did not previously exist) |
| 3 | Migrations | upgrade to head from **every** historical revision, individually | **13/13 exit 0** |
| 4 | Migration cycle | `downgrade base` → `upgrade head` → seed | exit 0 |
| 5 | Seed idempotency | seed ×3 on a head database | 22 countries / 41 info_steps — **not multiplied** |
| 6 | TypeScript | `npx tsc --noEmit` | clean |
| 7 | Lint | `npm run lint` | **0 errors, 0 warnings** |
| 8 | Policy checks | `npm run check` | **42/42** |
| 9 | expo-doctor | `npx expo-doctor` | **18/18** |
| 10 | iOS export | `npx expo export --platform ios` | exit 0 |
| 11 | Android export | `npx expo export --platform android` | exit 0 |
| 12 | iOS bundle scan | `scripts/scan-bundle.sh dist-ios <origin>` | **CLEAN** |
| 13 | Android bundle scan | `scripts/scan-bundle.sh dist-android <origin>` | **CLEAN** |

The 6 skips in gate 1 are the PostgreSQL integration tests, which skip when no
database is reachable and are run explicitly as gate 2.

### What the bundle scan proves

Absent from both bundles: `landhere_purchased`, `react-native-iap`,
`EXPO_PUBLIC_UNSPLASH_KEY`, `api.unsplash.com`, `Client-ID`, any
`BEGIN PRIVATE KEY` / `-----BEGIN`, `appstoreconnect-issuer`, `APPLE_ROOT_CA`,
`service_account`, `private_key_id`, `androidpublisher`,
`GOOGLE_PLAY_SERVICE_ACCOUNT`, `GOOGLE_PUBSUB_`.

Present, as required: `com.landhere.app.pro`, `Restore Purchases`,
`/purchases/verify`, `/purchases/verify/google`, and the expected production API
origin. No private or LAN origin embedded.

---

## Secrets audit

Run over **all 103 reachable commits**, not just the diff.

| Check | Result |
|---|---|
| `.env`, `.p8`, `.pem`, `.key`, `.p12`, keystores, `service-account*.json`, `.npmrc`, `.netrc` ever committed | **none** |
| Private keys, AWS `AKIA*`, GitHub PATs, Stripe `sk_*`, Slack `xox*`, Google `AIza*`, `"private_key":` | **none** |
| DSNs with embedded passwords added in the rc.4 diff | **none** |
| Secret-shaped additions in the rc.4 diff | none — two hits are the detector rule tables in `scan-bundle.sh` / `urlPolicy.check.ts` |

### One historical finding, closed

`SECURITY_PLAN.md:53` contains a real local PostgreSQL development password in
**18 commits**. Status:

- **All 18 are already ancestors of `origin/main`** — published months before
  this branch existed. rc.4 adds zero new exposure.
- **Absent from the rc.4 tree.**
- **The credential has been rotated.** Verified during this freeze: the old
  password is rejected with `password authentication failed`.

History was deliberately **not** rewritten: the credential was a local dev
password, it is rotated, and a force-push would invalidate every existing clone
for no security gain.

---

## Accepted risks

### Build-toolchain vulnerabilities — 25 advisories, none shipped

Every one traces to **metro** (the bundler) and from there to `image-size`,
`postcss`, `tar`, `js-yaml`, `shell-quote`, `brace-expansion`, `nanoid`. None
executes in the shipped app.

**No upgrade removes them**, verified rather than assumed:

- the `image-size` advisories (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq) cover
  `<= 2.0.2`, and **2.0.2 is the latest published version** — there is nothing
  to upgrade to;
- npm suggests `expo@57` (two major SDK jumps), but `metro@latest` still
  declares `image-size: ^1.0.2`, so the newest toolchain pulls a vulnerable copy
  anyway;
- an `overrides` pin cannot help, for the same reason.

**Residual risk:** a crafted ICNS/JXL/HEIF asset could hang the bundler during a
build. Requires write access to the repository or to a dependency's assets;
impact is a stalled build, not a compromised app.

### `ecdsa` PYSEC-2026-1325 — no upstream fix

Reaches us through `python-jose`. The app signs and verifies JWTs with **HS256
only** (HMAC), so the package's EC code paths are never entered and no
attacker-controlled EC key or signature enters the process. Revisit if
`ALGORITHM` ever becomes `ES*`.

### Rate limiting is fail-open

Any unexpected error — including a Redis blip — allows the request through. A
Redis outage removes rate limiting rather than locking users out. Deliberate;
recorded so it is a decision, not a surprise.

### Apple notification ordering

Events are ordered by Apple's `signedDate`. An event carrying **no** `signedDate`
is never treated as stale, and equal timestamps are not treated as stale. Both
are deliberate: dropping a real refund is worse than applying one slightly out of
order, and duplicates are already handled by `notificationUUID`.

---

## What is in rc.4 that was not in rc.3

- **Cross-platform in-app purchase.** Apple JWS verification (offline, against
  Apple's public roots) and Google Play verification (`productsv2`, authenticated
  to Google) as **separate, non-interchangeable paths** — each rejects the
  other's evidence — feeding one server-authoritative entitlement.
- **Pub/Sub push OIDC** on the Play notification endpoint: issuer, signature,
  expiry, audience and service account all verified. The shared-secret guard it
  replaced was removed, not kept as a fallback.
- **Deterministic Apple event ordering** by `signedDate`, replacing arrival-order
  last-write-wins.
- **Server-side Play acknowledgement** after verification and account linking —
  without it Google auto-refunds every purchase after three days.
- **Red-team fixes**: a purchase-path insert race that returned 500; a ranking
  gate bypassable through `?search=` / `?state=` filters; a React Query cache
  that served one account's paid content to the next account on the same device.
- **Three route components restored** — journey, scholarships and work-hours had
  shipped with no component since rc.2 and rendered nothing.
- **PostgreSQL integration coverage** for the concurrency, constraint, cascade
  and timezone behaviour that SQLite cannot exercise.

---

## External verification — all still BLOCKED

None of the following can be satisfied by code, and none has been attempted.

| Gate | Owner | Status |
|---|---|---|
| Apple Developer Program enrolment ($99/yr) | you | **blocked** |
| `ascAppId`, `appleTeamId`, App Store Connect record | you | **blocked** |
| IAP product `com.landhere.app.pro` + Paid Applications agreement, tax, banking | you | **blocked** |
| Apple root CA in `vendor/apple-root-ca/`, `APPLE_APP_APPLE_ID` | you | **blocked** — verification returns 503 without it |
| App Store Server Notification URL | you | **blocked** |
| Google Play Developer account ($25 once) | you | **blocked** |
| Play payments profile, IAP product, **both** service-account permissions | you | **blocked** |
| Pub/Sub topic, OIDC push subscription, `GOOGLE_PUBSUB_*` | you | **blocked** |
| Backend deployed; Postgres + Redis provisioned | you | **blocked** |
| Hosted privacy / terms / support URLs | you | **blocked** |
| Backup taken and a restore rehearsed | needs infrastructure | **blocked** |
| Legal review of the privacy policy and terms | qualified lawyer | **blocked** |
| Every real-device purchase, restore, cancel, deferred, already-owned, refund, offline and accessibility case | you + devices | **blocked** |

**No StoreKit call and no Google Play API call has ever executed.** The Apple
tests exercise real cryptography against a synthetic certificate chain; the
Google tests simulate Google's HTTP responses, because a Play token is opaque and
Google's API *is* the oracle. Both prove our side of the boundary and nothing
about the far side.

---

## Rollback

| | |
|---|---|
| This candidate | `v0.1.0-rc.4` (code at `1349b6076b35730347a797c6be9f30ffb8425065`) |
| Previous candidate | `v0.1.0-rc.3` → `68e31235bc1f4a31bca2c78eb4a84ebb6da0ec6c` |

Reverting to rc.3 returns to a **free-only** build with no purchase code — and
one with three route components missing (journey, scholarships, work-hours render
nothing). rc.3 is a rollback target for the *purchase* work only, not a shippable
alternative.

Nothing is deployed, so there is no runtime rollback to perform. Database
rollback below `e5f7a9b1c3d5` destroys every entitlement record; see
`LAUNCH/DEPLOYMENT_RUNBOOK.md`.
