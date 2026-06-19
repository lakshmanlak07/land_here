# LandHere — Security Hardening Plan

**Status:** Planning document only. Nothing here has been implemented. This is a
prioritized, ready-to-execute plan based on a read-only review of the codebase on
2026-06-16. Each item lists the risk, the fix, and the exact Claude Code prompt to
run later (one at a time, watched).

**Scope reviewed:** FastAPI backend (`app/`), auth flow (`app/routes/auth.py`,
`app/core/security.py`, `app/core/config.py`, `app/main.py`), the user model/schema,
and the Expo mobile client's auth and API usage. No code was modified.

---

## Severity legend

| Level | Meaning |
|-------|---------|
| 🔴 P0 | Fix before any public/production deploy. Real exposure today. |
| 🟠 P1 | Fix before real users; meaningful risk. |
| 🟡 P2 | Hardening / good hygiene; do after P0/P1. |

---

## P0 — Critical (do first)

### 1. 🔴 `SECRET_KEY` is a dev placeholder (`temp-dev-key`)

**Where:** `.env` → `SECRET_KEY=temp-dev-key`, consumed in `app/core/security.py`
via `app/core/config.py`. JWTs are signed HS256 with this key.

**Risk:** The signing key is short, guessable, and clearly a placeholder. Anyone who
knows or guesses it can **forge a valid JWT for any user id** (`sub`), bypassing
login entirely and impersonating any account. With a 7-day token lifetime (see #6)
the blast radius is large. If this string ever ships to production as-is, the whole
auth system is effectively open.

**Fix:**
- Generate a long random secret: `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
- Put it in `.env` (never commit it) and in the deployment platform's secret store.
- Make `config.py` **fail loudly** if `SECRET_KEY` is missing or obviously weak
  (e.g. shorter than 32 chars, or equals a known placeholder) so the app refuses to
  boot insecure in production.
- Treat rotation as a known event: rotating the key invalidates all existing tokens
  (acceptable, users just re-login).

**Exact prompt to run later:**
> In the FastAPI backend, harden `SECRET_KEY` handling. In `app/core/config.py`, add a validator that raises at startup if `SECRET_KEY` is unset, shorter than 32 characters, or equal to a known placeholder like `temp-dev-key` or `change-me`. Do not hardcode a real key. Update `.env.example` comment to tell me to generate one with `python -c "import secrets; print(secrets.token_urlsafe(64))"`. Do not touch my real `.env`. Show me the diff before applying.

---

### 2. 🔴 Real secrets live in the working-tree `.env`

**Where:** `.env` contains a real Postgres password (redacted from this doc — see
`DATABASE_URL` in `.env`), a real `SCORECARD_API_KEY`, and a real `OPENALEX_API_KEY`.

**Risk:** `.env` is correctly **gitignored** (confirmed via `git check-ignore`), so
it is not in git history — good. But the real API keys and DB password sit in plain
text on disk and are easy to leak accidentally (screen-share, backup, pasted log,
copied into a bug report). The Scorecard/OpenAlex keys are live credentials that
should be rotatable. The DB password also appears URL-encoded in `DATABASE_URL`.

**Fix:**
- Confirm `.env` was never committed: `git log --all --full-history -- .env`
  (if it ever was, rotate everything and scrub history).
- Rotate the College Scorecard and OpenAlex API keys now that they've been on disk
  in a dev environment; treat them as low-sensitivity but rotate on a schedule.
- For production, move secrets into the hosting platform's secret manager
  (Render/Railway/Fly/AWS Secrets Manager) rather than a file on disk.
- Add a `SECRETS.md` runbook describing where each secret lives and how to rotate it.

**Exact prompt to run later:**
> Check whether `.env` was ever committed to git history with `git log --all --full-history -- .env` and report the result. Then create a `SECRETS.md` runbook in the repo root listing every secret the app uses (DATABASE_URL, SECRET_KEY, SCORECARD_API_KEY, OPENALEX_API_KEY, EXPO_PUBLIC_UNSPLASH_KEY), where each should live in production, and step-by-step rotation instructions for each. Do not print or move my real secret values. Do not modify `.env`.

---

### 3. 🔴 No rate limiting on any endpoint (auth especially)

**Where:** `app/main.py` registers routers with no rate-limiting middleware.
`/auth/login` and `/auth/register` accept unlimited attempts.

**Risk:** `/auth/login` is wide open to **credential-stuffing and brute-force**
password guessing. `/auth/register` can be hit to enumerate which emails exist
(see #5) and to mass-create accounts / spam the DB. Data endpoints
(`/universities`, `/countries`, `/info/journey`) can be hammered with no throttle,
enabling cheap denial-of-service and scraping.

**Fix:**
- Add `slowapi` (Redis-backed in prod, in-memory acceptable for a single dev
  instance) and apply a global default limit plus stricter per-route limits.
- **Auth target: 5 attempts / 15 minutes per IP+email on `/auth/login`** and a
  similar cap on `/auth/register`.
- Return `429 Too Many Requests` with a `Retry-After` header.
- Note: IP-based limiting needs `X-Forwarded-For` handling behind a proxy/load
  balancer — configure trusted proxies.

**Exact prompt to run later:**
> Add rate limiting to the FastAPI backend using `slowapi`. Add it to `requirements.txt`. In `app/main.py`, register a Limiter and a 429 handler. Apply a global default limit (e.g. 100/minute per IP) and override `/auth/login` and `/auth/register` to a strict 5 requests per 15 minutes keyed on client IP. Make the limiter use an in-memory store for now but leave a clear comment on how to switch to Redis for production. Don't change any response schemas. Show me the diff and the new dependency before applying.

---

## P1 — High (before real users)

### 4. 🟠 No input validation or payload size limits

**Where:** `app/schemas/user.py` — `UserRegister.password` is a bare `str` with no
length/complexity rules; `full_name`, `origin_country_code`,
`destination_country_code` are unbounded strings. No request body size cap anywhere.
List endpoints take `limit`/`offset` query params (used by `rankings.tsx`) — confirm
`limit` is capped server-side.

**Risk:**
- **Weak passwords:** a user can register with a 1-character password; combined with
  no rate limit (#3) this is trivially brute-forced.
- **Oversized payloads:** an unbounded `full_name` or giant JSON body can exhaust
  memory / fill the DB (the column is `String(200)` but Pydantic doesn't enforce a
  max before the DB rejects it — and the error path leaks DB detail).
- **Unbounded `limit`:** `GET /universities?limit=999999` can force a huge query and
  response, a cheap DoS / scraping vector.

**Fix:**
- Add Pydantic constraints: `password` min length 8 (consider a complexity check or
  a breached-password check via zxcvbn/HaveIBeenPwned k-anonymity), `full_name`
  `max_length=200`, country codes constrained to a short pattern (`^[A-Z]{2,10}$`).
- Add a request body size limit middleware (reject bodies over, say, 64 KB for auth;
  configurable).
- Clamp `limit` to a max (e.g. 100) in the universities route.

**Exact prompt to run later:**
> In the FastAPI backend, tighten input validation without changing endpoint behavior for valid input. In `app/schemas/user.py`, require `password` to be 8–128 chars, constrain `full_name` to `max_length=200`, and constrain `origin_country_code`/`destination_country_code` to a regex like `^[A-Z]{2,10}$`. In the universities list route, clamp the `limit` query param to a maximum of 100. Add a lightweight middleware in `app/main.py` that rejects request bodies larger than 64 KB with a 413. Show me the diff before applying.

---

### 5. 🟠 User/email enumeration on registration

**Where:** `app/routes/auth.py` → `register()` returns
`400 "Email already registered"`. (Login correctly returns a generic
"Invalid email or password" — good.)

**Risk:** An attacker can probe `/auth/register` to learn **which email addresses
have accounts**, then target those with phishing or focused credential-stuffing.
Combined with no rate limit (#3) this is fast and free.

**Fix:**
- Prefer a flow that doesn't confirm existence: on duplicate email, return the same
  generic success/202 shape and (in a real system) send a "you already have an
  account" email out-of-band, OR at minimum gate registration behind the rate
  limiter from #3 so enumeration is slow.
- Keep login's generic error as-is.

**Exact prompt to run later:**
> Review `app/routes/auth.py` for account-enumeration risk on the register endpoint. Propose two options: (a) keep the 400 but rely on the rate limiter, or (b) change the duplicate-email path to a generic non-revealing response. Recommend one for a consumer app, then implement only the one I pick. Don't change the login endpoint's existing generic error.

---

### 6. 🟠 Long-lived, non-revocable JWTs (7 days), no refresh

**Where:** `.env` → `ACCESS_TOKEN_EXPIRE_MINUTES=10080` (7 days). Token stored
client-side and sent as `Authorization: Bearer`. No refresh token, no server-side
revocation/blocklist.

**Risk:** A stolen token is valid for a full week and **cannot be revoked** — there's
no logout-on-server, no blocklist, no rotation. Logout in the app
(`profile.tsx → logout()`) only clears the client; the token still works if copied.
Combined with the weak `SECRET_KEY` (#1) this is severe.

**Fix:**
- Shorten the access token (e.g. 30–60 min) and add a refresh-token flow, OR
- If keeping long sessions, add a server-side token version / `jti` blocklist so
  logout and "log out everywhere" actually invalidate tokens.
- Add `iat`/`jti` claims; consider binding tokens loosely to device.

**Exact prompt to run later:**
> Propose a token-lifetime strategy for this app: either (a) short access token (~45 min) + refresh token with rotation, or (b) keep a longer token but add a server-side revocation list keyed on a `jti` claim so logout truly invalidates it. Lay out the DB/schema and route changes for each, recommend one for a solo-dev consumer app, and implement only after I choose. Don't implement yet — just the plan and recommendation first.

---

### 7. 🟠 CORS is fully open (`allow_origins=["*"]` with credentials)

**Where:** `app/main.py` — `CORSMiddleware` with `allow_origins=["*"]`,
`allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.

**Risk:** Wildcard origin with `allow_credentials=True` is a misconfiguration — it's
both overly permissive in intent and invalid per the CORS spec when credentials are
involved (browsers reject `*` + credentials, so it may silently break, or invite a
careless "fix" that whitelists everything). For a mobile-only API CORS is less
critical (native apps don't enforce it), but if you ever expose a web client this is
a cross-site request risk.

**Fix:**
- Replace `*` with an explicit allowlist of real origins (your web origin if any),
  driven by config/env.
- For a purely native mobile client, you can drop `allow_credentials` since the app
  uses bearer tokens, not cookies.

**Exact prompt to run later:**
> In `app/main.py`, replace the wildcard CORS config. Read an allowed-origins list from settings (default to an empty list / localhost for dev), and since the mobile app uses bearer tokens rather than cookies, set `allow_credentials=False` unless I tell you a web client needs cookies. Keep methods/headers reasonable rather than `*`. Show me the diff.

---

## P2 — Hardening (after P0/P1)

### 8. 🟡 No HTTPS enforcement / security headers / hosting hardening

**Risk:** Bearer tokens and passwords travel in request bodies/headers. Without TLS
in transit they can be sniffed. No HSTS, no security headers. The mobile client's
`EXPO_PUBLIC_API_URL` currently points at `http://localhost:8000`.

**Fix:**
- Terminate TLS at the host/proxy; never serve the API over plain HTTP in prod.
- Add HSTS and basic security headers (via middleware or the reverse proxy).
- Ensure the production `EXPO_PUBLIC_API_URL` is `https://`.
- Document the hosting model (managed Postgres with TLS, API behind HTTPS,
  secrets in platform secret store).

**Exact prompt to run later:**
> Create a `DEPLOYMENT_SECURITY.md` describing how to deploy this FastAPI + Postgres + Expo stack securely: TLS termination, HSTS and security headers, where secrets live, managed Postgres with TLS, and the production `EXPO_PUBLIC_API_URL`. Then add an optional security-headers middleware to `app/main.py` behind a config flag (off in dev). Show me the doc first, then the middleware diff.

---

### 9. 🟡 Data minimization — what we collect and how to reduce it

**What is collected today** (`app/models/user.py`):
`id`, `email`, `hashed_password` (bcrypt — good), `full_name` (optional),
`origin_country_code` (optional), `destination_country_code` (optional),
`created_at`. The mobile client also calls Unsplash with `EXPO_PUBLIC_UNSPLASH_KEY`
(third-party image requests leave the device).

**Assessment:** This is already a fairly minimal set — no phone, no address, no DOB,
no payment data. Good. `full_name` and corridor are optional and arguably useful for
personalization (home greeting, journey corridor). Passwords are bcrypt-hashed.

**Risk / improvements:**
- `full_name` is the only directly identifying field beyond email; confirm it's
  truly needed (the home screen uses first name for greeting — could be optional /
  "what should we call you?" nickname instead of legal name).
- No data-retention or deletion policy: there's no account-deletion endpoint, so a
  user can't remove their data (relevant for GDPR/Indian DPDP if you launch in those
  markets — your seeded corridor is IN→US).
- Third-party calls (Unsplash) mean image queries leave the device; document this.

**Fix:**
- Add an account-deletion endpoint (`DELETE /auth/me`) and a clear "delete my
  account" path in the app later.
- Decide a retention policy (e.g. delete inactive accounts after N months).
- Keep collecting the minimum; avoid adding fields without a clear use.

**Exact prompt to run later:**
> Add an account-deletion capability to the backend: a `DELETE /auth/me` endpoint (auth required) that deletes the current user and any owned rows, returning 204. Add a short data-retention note to a new `PRIVACY.md`. Don't build any UI yet — backend + doc only. Show me the diff.

---

### 10. 🟡 Privacy policy outline

**Why:** App stores require a privacy policy before publishing, and you collect
email + name + corridor. Below is a starter outline to expand into a real document
(have it reviewed before publishing — this is not legal advice).

**Privacy policy outline (draft skeleton):**
1. **Who we are** — LandHere, contact email, data controller.
2. **What we collect** — email, optional full name, optional origin/destination
   country, account-created timestamp, and on-device app progress (the
   `progressStore` checklist state — note whether this stays on-device or syncs).
3. **What we don't collect** — no payment data, no precise location, no contacts,
   no DOB, no government IDs.
4. **How we use it** — authenticate you, personalize your journey/corridor, show
   relevant content. We do **not** sell personal data.
5. **Third parties** — image providers (Unsplash) receive image-search queries;
   our data sources (College Scorecard, OpenAlex) are public and contain no user
   data; hosting/database provider names.
6. **Where data is stored & security** — region, encryption in transit (TLS),
   bcrypt password hashing.
7. **Retention & deletion** — how long we keep data and how to delete your account.
8. **Your rights** — access, correction, deletion, export (GDPR / India DPDP if
   relevant given the IN→US corridor focus).
9. **Children** — minimum age; the app targets prospective university students.
10. **Changes & contact** — how policy updates are communicated; contact for
    requests.

**Exact prompt to run later:**
> Using the outline in SECURITY_PLAN.md section 10, draft a full plain-English `PRIVACY.md` for LandHere tailored to what the app actually collects (email, optional name, optional origin/destination country, on-device checklist progress) and the third parties it touches (Unsplash for images; College Scorecard and OpenAlex as public data sources). Mark it clearly as a draft to be reviewed by a professional before publishing. Don't invent a company address or contact — leave clear placeholders.

---

## Quick reference — priority order

1. **P0** Replace weak `SECRET_KEY` + fail-fast validation (#1)
2. **P0** Secrets runbook + rotate exposed API keys (#2)
3. **P0** Rate limiting, 5/15min on auth (#3)
4. **P1** Input validation + payload/limit caps (#4)
5. **P1** Fix registration enumeration (#5)
6. **P1** Token lifetime + revocation strategy (#6)
7. **P1** Lock down CORS (#7)
8. **P2** HTTPS / security headers / hosting (#8)
9. **P2** Data minimization + account deletion (#9)
10. **P2** Privacy policy (#10)

---

*Generated as a read-only planning artifact. No application code, configuration,
database, or running service was modified in producing this document.*
