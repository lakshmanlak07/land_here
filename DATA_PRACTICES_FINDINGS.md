# LandHere — Actual Data Practices (code audit)

*Read-only audit of what the app actually collects, stores, shares, and secures —
derived from the codebase, not from intentions or planning docs. Audited
2026-06-20. No app code was modified. Items that could not be confirmed from code
alone are marked **UNCONFIRMED — verify**.*

---

## 1. Personal data stored — `users` table

Source: `app/models/user.py`, `app/schemas/user.py`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | yes | random UUID4, not derived from personal data |
| `email` | string(255) | yes | unique; stored in plaintext column |
| `hashed_password` | string(255) | yes | **bcrypt hash** (not the password) |
| `full_name` | string(200) | no (optional) | only directly identifying free-text field |
| `origin_country_code` | string(10) | no (optional) | ISO country code (FK → countries) |
| `destination_country_code` | string(10) | no (optional) | ISO country code (FK → countries) |
| `created_at` | timestamp | auto | account creation time |

**Not collected anywhere in code:** date of birth / age, phone number, postal
address, profile photo, gender, government ID / passport number, payment / card
data, precise location/GPS, contacts. There are no other user-data tables.

## 2. Registration / login — what is collected on signup

Source: `app/routes/auth.py`, `mobile/app/(auth)/register.tsx`.

- **`POST /auth/register`** collects: `email`, `password`, optional `full_name`,
  optional `origin_country_code`, optional `destination_country_code`. Returns a
  JWT access token.
- **`POST /auth/login`** collects: `email`, `password`. Returns a JWT.
- **`GET /auth/me`** returns the current user's record (the fields in §1, minus the
  password hash).
- Mobile client requires email, password (min 8 chars), and both corridor countries
  before submitting; `full_name` is optional ("Full name (optional)").

## 3. Other features — do they store any per-user data?

**No.** Every non-auth route is read-only and serves seeded/public content only:

- `app/routes/countries.py`, `guides.py`, `info.py`, `universities.py` — all are
  `GET` endpoints reading seeded tables (`countries`, `country_guides`,
  `info_steps`, `universities`). No `POST`/`PUT`/`DELETE`, no per-user writes.
- The visa/corridor "journey" is filtered seeded content keyed on country codes
  passed as query params; **no passport numbers, dates, or per-user progress are
  sent to or stored on the server.**
- **Checklist progress** (`mobile/lib/progressStore.ts`) is an in-memory Zustand
  store with **no persistence** (no AsyncStorage / SecureStore / backend sync) —
  completed items exist only for the current app session and are lost on app
  restart. They never leave the device.

## 4. Password handling

Source: `app/core/security.py`.

- Hashed with **bcrypt** via passlib (`CryptContext(schemes=["bcrypt"])`).
- **No plaintext password is stored anywhere.** The raw password is only received in
  the request body, hashed, and discarded; only `hashed_password` is persisted.
- Minimum length 8 enforced both client-side and server-side (Pydantic
  `min_length=8`); max 128.

## 5. Transport & storage

- **Storage:** PostgreSQL (`DATABASE_URL`, `app/core/database.py`). User fields other
  than the password are stored in **plaintext columns**.
- **Field-level / application-level encryption:** **none implemented.** The only
  cryptographic protection of stored data is the bcrypt password hash. Email, name,
  and country codes are not encrypted at the application layer. (Disk/database
  encryption-at-rest, if any, would be a hosting-provider feature — **UNCONFIRMED —
  verify** with the host.)
- **HTTPS / TLS in transit:** **not enforced in application code.** There is no
  HTTPS-redirect or HSTS middleware in `app/main.py`. The mobile client reads its
  base URL from `EXPO_PUBLIC_API_URL` (dev points at `http://localhost`). Whether
  production traffic is encrypted depends entirely on the deployment/reverse-proxy.
  **UNCONFIRMED — verify** TLS is terminated in front of the API in production.
- **Auth token storage (client):** JWT is stored on-device in **expo-secure-store**
  (OS keychain/keystore) — `mobile/lib/store.ts`.
- **JWT lifetime:** 7 days (`ACCESS_TOKEN_EXPIRE_MINUTES=10080`), HS256. No
  server-side revocation/blocklist — logout only clears the client copy.
- **CORS:** `allow_origins=["*"]` with `allow_credentials=True` in `app/main.py`
  (over-permissive / spec-invalid combination; security note, not a data-collection
  issue).
- **Rate limiting:** present on auth routes (`app/routes/auth.py` uses
  `app/core/rate_limit.py`): register 15/min, login 30/min per IP, fail-open.

## 6. Third-party services & external APIs

### Analytics / crash reporting / email / payments / social sign-in / ads
**None integrated.** Confirmed by inspecting `mobile/package.json`, `requirements.txt`,
and grepping the source: no Sentry, Firebase, Crashlytics, Mixpanel, Amplitude,
Segment, PostHog; no Stripe / Apple Pay / payments; no SendGrid / Mailchimp; no
Google/Apple social sign-in; no ad SDK / IDFA / ad tracking. (The only grep hits for
"tracking" were the CSS `letterSpacing` property — false positives.)

### External APIs actually called

| API | Called from | Data sent | Any user personal data? |
|-----|-------------|-----------|--------------------------|
| **College Scorecard** (`api.data.gov`) | Backend ingestion script (`ingest_scorecard.py`), offline/admin only | API key + public school filters | **No.** Public school data only. Not called per user. |
| **OpenAlex** (`api.openalex.org`) | Backend ingestion script (`ingest_openalex.py`), offline/admin only | API key + institution name search | **No.** Public institution data only. Not called per user. |
| **Frankfurter** (`api.frankfurter.dev`) | **Mobile device** (`CurrencyConverter.tsx`) | currency codes (`from`, `to`) only | **No** personal data in payload. (Request originates from the user's device, so the user's IP is necessarily visible to the endpoint — true of any client HTTP request. No API key.) |
| **Unsplash** (`api.unsplash.com`) | **Mobile device** (`lib/images.ts`) | image search query (city/campus names) + `EXPO_PUBLIC_UNSPLASH_KEY` | **No** personal data in payload. (Same device-IP caveat as above.) |

So: backend data sources (Scorecard, OpenAlex) are public and receive **no** user
data. The two device-side calls (Frankfurter, Unsplash) send only non-personal query
strings; the only user-linked exposure is the device IP inherent to any outbound
request.

## 7. Document / file upload

**None.** There is no upload endpoint or client upload UI anywhere — no transcripts,
essays, IDs, or any file upload exists in the code.

---

## 8. Flags — things that create an obligation or need a decision

1. **No account-deletion or data-export mechanism exists.** There is no
   `DELETE /auth/me` (or any delete/export route) and no in-app "delete my account"
   path. Users currently cannot delete or export their data through the app. This is
   a likely obligation under GDPR / India DPDP / CCPA if the app launches in those
   markets — and the seeded corridor is IN→US, i.e. an Indian-resident audience.
2. **Possible minors in the audience, with no age gate.** The app targets prospective
   university students; some applicants may be under 18. No DOB/age is collected, so
   **age cannot be verified** and there is no minimum-age gate in code. Needs a
   founder decision on minimum age + legal review (COPPA/GDPR-age-of-consent/DPDP).
3. **No data-retention policy or mechanism** — accounts and their data persist
   indefinitely; nothing prunes or expires them.
4. **TLS not enforced in code** — confirm HTTPS is terminated in front of the API in
   production, otherwise passwords/tokens could travel in cleartext (**UNCONFIRMED**).
5. **Encryption at rest is not implemented at the application layer** — only the
   password is hashed; confirm whether the hosting/database provides
   encryption-at-rest (**UNCONFIRMED**).
6. **CORS `*` + credentials** and **7-day non-revocable JWTs** are pre-existing
   security-hardening items (see `SECURITY_PLAN.md`); noted here only because they
   bear on how well stored/auth data is protected.
