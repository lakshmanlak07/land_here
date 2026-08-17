# LandHere — Architecture

## Overview

LandHere is a two-tier application: a FastAPI backend (Python) served over HTTP, and an Expo React Native mobile client that talks to it over a local network during development. There is no web frontend.

```
┌─────────────────────────────┐        HTTP / JSON        ┌───────────────────────────┐
│  Expo React Native (mobile) │ ◄──────────────────────► │  FastAPI backend           │
│  Expo Router (navigation)   │   Bearer JWT in header    │  SQLAlchemy ORM            │
│  TanStack Query (caching)   │                           │  PostgreSQL                │
│  Zustand (auth state)       │                           │  Alembic (migrations)      │
└─────────────────────────────┘                           └───────────────────────────┘
```

---

## Data model

### `Country`

The master table of countries. A country can be a destination, an origin, or both.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | primary key |
| `code` | String(10) | ISO-style code (e.g. `US`, `UK`, `IN`) — unique |
| `name` | String(100) | display name |
| `student_visa_name` | String(200) | official visa product name, nullable |
| `official_immigration_url` | String(500) | government source URL, nullable |
| `currency_code` | String(10) | e.g. `USD`, `GBP` |
| `is_destination` | Boolean | can students travel TO this country? |
| `is_origin` | Boolean | can students come FROM this country? |

At the time of writing there are 22 countries: 16 destinations and 6 origin-only.

### `User`

A registered student account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | primary key |
| `email` | String(255) | unique |
| `hashed_password` | String(255) | bcrypt |
| `full_name` | String(200) | nullable |
| `origin_country_code` | FK → `countries.code` | nullable |
| `destination_country_code` | FK → `countries.code` | nullable |
| `created_at` | DateTime(tz) | UTC |

The `origin_country_code` / `destination_country_code` pair defines the student's **corridor** — the specific journey the app tailors content for.

### `InfoStep`

The core content model. Each row is one actionable step in a student's journey.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | primary key |
| `origin_code` | String(10) | nullable — `null` means step applies to all origins |
| `destination_code` | FK → `countries.code` | required |
| `phase` | String(50) | one of the 5 valid phases (see below) |
| `step_number` | Integer | ordering within a phase |
| `title` | String(300) | short step label |
| `explanation` | Text | plain-English full explanation |
| `official_source_name` | String(300) | human-readable source name |
| `official_source_url` | String(500) | direct link to the official page |
| `is_verified` | Boolean | has a human confirmed this is accurate? |

**Valid phases** (in chronological order):

1. `before_applying` — research and preparation before applying
2. `after_acceptance` — actions required immediately after receiving an offer
3. `visa_process` — fee payments, form submissions, interview
4. `before_departure` — housing, health insurance, document packing
5. `after_arrival` — check-ins, bank account, SIM card

### `CountryGuide`

Longer-form reference content about living in a country, organised into sections.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | primary key |
| `country_code` | FK → `countries.code` | |
| `section` | String(50) | one of: `banking`, `healthcare`, `working`, `cost_of_living`, `culture`, `transport`, `sim_phone` |
| `title` | String(300) | section heading |
| `content` | Text | plain-English body |
| `official_source_url` | String(500) | nullable |
| `is_verified` | Boolean | human-checked flag |

---

## The corridor concept

A **corridor** is an (origin, destination) pair — for example, India → United States (`IN → US`). `InfoStep` rows are scoped to a corridor via `origin_code` + `destination_code`. A step with `origin_code = null` applies to all origins travelling to that destination.

The journey endpoint (`GET /info/journey?origin=IN&destination=US`) queries all steps where `destination_code = 'US'` AND (`origin_code = 'IN'` OR `origin_code IS NULL`), then groups them by phase in chronological order.

Currently one corridor is fully seeded: **IN → US** (15 steps, 4 phases).

---

## The info-booth model

Every piece of content in LandHere follows the same pattern:

1. **Plain English** — the `explanation` field gives a clear, jargon-free description of what the student needs to do and why.
2. **Official source link** — every step carries `official_source_name` and `official_source_url` so the student can verify the information directly from the government or institution.
3. **Verified flag** — `is_verified` is `false` by default. A human must review and tick it to true before the content is considered production-ready. This prevents unreviewed drafts from appearing as authoritative.

This three-part model ensures LandHere never makes legal or immigration claims — it points students to the real sources.

---

## API routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Health check |
| POST | `/auth/register` | — | Create account, returns JWT |
| POST | `/auth/login` | — | Verify credentials, returns JWT |
| GET | `/auth/me` | Bearer JWT | Return current user |
| GET | `/countries` | — | All countries (alphabetical) |
| GET | `/countries/destinations` | — | `is_destination = true` only |
| GET | `/countries/origins` | — | `is_origin = true` only |
| GET | `/countries/{code}` | — | Single country by code |
| GET | `/info/phases` | — | Ordered list of valid phase names |
| GET | `/info/corridors` | — | All (origin, destination) pairs that have content |
| GET | `/info/journey` | — | Steps for a corridor, grouped by phase |
| GET | `/guides/{country_code}` | — | Country guide sections (optional `?section=` filter) |
| GET | `/universities` | optional | Ranked list. **Free callers are clamped to the top 25.** |
| GET | `/universities/{id}` | Bearer JWT + Pro | University detail. **LandHere Pro only.** |
| POST | `/purchases/verify` | Bearer JWT | Verify an Apple-signed transaction and record the entitlement |
| GET | `/purchases/entitlements` | Bearer JWT | What this account owns |
| POST | `/purchases/notifications` | **none — Apple's signature** | App Store Server Notifications V2 (refunds, revocations) |
| POST | `/purchases/verify/google` | Bearer JWT | Verify a Google Play purchase token and record the entitlement |
| POST | `/purchases/notifications/google` | shared secret header | Play RTDN prompt — triggers a re-check against Google |

`GET /info/journey` also takes optional auth: a free or anonymous caller receives
only the free phases.

---

## Purchases and entitlement

LandHere sells one non-consumable in-app purchase, `com.landhere.app.pro`
(distinct from the app bundle id `com.landhere.app`). The governing rule is that
**the device never decides whether a user owns Pro.**

```
StoreKit ──► purchase.purchaseToken (iOS: Apple's JWS)
          └► POST /purchases/verify   (mobile/lib/purchaseStore.ts)
                 │
                 ├─ app/core/appstore.py  verify the JWS against Apple's
                 │                        public root CAs, check bundle id,
                 │                        product id, type, revocation
                 │
                 └─ app/models/purchase.py  insert, UNIQUE on
                                            (platform, platform_transaction_id)
```

- **No Apple secret is involved.** Verification uses Apple's *public* root
  certificates, so there is no `.p8`, no issuer id, and no shared secret — not on
  the server and certainly not in the bundle.
- **Fails closed.** With no root certificates configured the endpoint returns
  503 rather than trusting a payload it cannot check.
- **`purchases` is UNIQUE on (platform, platform_transaction_id).** That
  constraint *is* the entitlement model: one Apple purchase entitles exactly one LandHere account, so
  a restore presented on a second account collides (409) instead of cloning Pro.
- **Buying and restoring are the same path.** Restore is not a second, weaker
  route to entitlement; both submit a signed transaction to the same endpoint.
- **Rows cascade with the user**, so account deletion removes the purchase record
  along with everything else.

### Google Play: the same goal, an opposite mechanism

`app/core/googleplay.py` is a deliberately separate module with its own error
types and no shared entry point with the Apple path, because the two are not
variants of one idea:

| | Apple | Google |
|---|---|---|
| What the client hands us | a JWS **signed by Apple** | an **opaque token** |
| How we verify | offline, against public root CAs | by **asking Google**, authenticated |
| Credential needed | none | a service-account **private key** |
| Test purchases | `environment: Sandbox` | `testPurchaseContext.fopType == TEST` |
| Delivery deadline | none | **acknowledge within 3 days or Google auto-refunds** |

Keeping them apart is a security property, not tidiness. A single "verify some
proof of purchase" function would have to guess the platform, and the guess would
be the vulnerability — an Apple JWS offered as Android evidence, or the reverse.
Two endpoints, two request fields, and tests that prove each rejects the other's.

Endpoint used: `purchases.productsv2.getproductpurchasev2` — the current form for
one-time products (`purchases.products.get` is the superseded v1).

**Fail-closed has a useful side effect on Android.** No service-account
credentials means 503, never a grant. Because the client only acknowledges after
the server confirms, an unverifiable purchase is never acknowledged — so Google
auto-refunds it within three days and the user gets their money back.

A 401/403 from Google is reported as **503, not 400**. Treating a rejected
credential as a bad purchase would silently deny every purchase the moment the
service account lost its permission.

**The Play notification endpoint does not trust its request body.** Google's RTDN
messages carry no signature over their contents, so the message is only a prompt
to re-ask Google; a forged one achieves nothing because the lookup returns
PURCHASED. It is additionally guarded by a shared-secret header, constant-time
compared, because the lookup itself spends Google API quota.

### Refunds and revocations

`POST /purchases/notifications` receives App Store Server Notifications V2.

It is **unauthenticated**, because Apple calls it and holds no credential of
ours — Apple's signature over the payload *is* the authentication. That makes
fail-closed verification more important here than on the purchase path, not
less: a forged notification would be an unauthenticated way to revoke a paying
user's access. The envelope is verified, and the transaction inside it is
verified separately rather than trusted because the envelope was valid.

| Notification | Effect |
|---|---|
| `REFUND`, `REVOKE` | sets `revoked_at` — closes every gate at once |
| `REFUND_REVERSED` | clears `revoked_at` |
| `TEST` | accepted, acts on nothing |
| anything else | accepted, acts on nothing |

Status codes are chosen around Apple's retry behaviour: **200** for anything
verified (so Apple stops retrying), **4xx** only for payloads we could not
verify, **503** for our own misconfiguration — the last two being cases where a
retry is what we want rather than a silently dropped refund.

`purchase_notifications` is UNIQUE on `notification_uuid`. Apple re-sends until
it gets a 2xx, so duplicates are ordinary traffic; without the constraint a
re-sent `REFUND` landing after a `REFUND_REVERSED` would leave the entitlement
wrong. The table is deliberately not linked to a user and does not cascade — it
must outlive the account so a replayed notification is still recognised. This is
the one documented exception to the deletion promise; see the privacy policy.

### Where the gate is enforced

| Surface | Free | Enforced in |
|---|---|---|
| Journey | Phases 1–2 only | `app/routes/info.py` — later phases are dropped **before serialisation** |
| Rankings list | Top 25 | `app/routes/universities.py` — applied to the SQL window |
| University detail | — | `app/routes/universities.py` via `require_pro` |
| Scholarships, work rules, methodology, guides, necessities, money tools | Everything | not gated |

Withheld content is never transmitted, so it cannot be recovered from a response
body, the JS bundle, or a cached payload. Journey and rankings responses are
`private, no-store` precisely because they now vary by entitlement — a shared
cache would otherwise be able to hand a Pro response to a free user.

`mobile/lib/purchaseStore.ts` holds no persisted entitlement flag at all. An
earlier release kept `landhere_purchased` in AsyncStorage, which any user with
device access could set; that is the mistake this design exists to prevent.

---

## How the mobile app talks to the backend

**Base URL** is set in `mobile/.env` as `EXPO_PUBLIC_API_URL` (e.g. `http://192.168.0.113:8000`). The value must be the host machine's LAN IPv4 address — `localhost` does not work on a physical device.

**HTTP client** — `mobile/lib/api.ts` creates an Axios instance with `baseURL` from the env var. A request interceptor reads the JWT from Zustand's `useAuthStore` and injects `Authorization: Bearer <token>` on every request if a token is present.

**Auth state** — `mobile/lib/store.ts` (Zustand) holds `token`, `user`, and `hydrated`. On app launch, `hydrate()` reads the token from `expo-secure-store`, calls `GET /auth/me` to validate it, and populates the user object. On logout it clears both memory state and SecureStore.

**Server state / caching** — TanStack Query is used for all API data. Query keys include the user's origin/destination codes where relevant so the cache invalidates when the user changes their corridor.

**Navigation** — Expo Router uses a file-system convention. `app/(auth)/` contains the login/register screens. `app/(tabs)/` contains the four main tabs. `app/_layout.tsx` reads `hydrated` + `token` from Zustand and redirects to `/(auth)/login` if the user is not authenticated.

---

## Database migrations

Alembic manages schema migrations. The `alembic/` directory contains the migration history. To generate a new migration after changing a model:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

The initial migration (`5a2934344d6f_initial_schema.py`) created all four tables.
