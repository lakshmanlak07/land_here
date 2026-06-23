# LandHere — Improvement Plan (Prioritized)

> **Read-only review.** No code was changed and nothing was fixed. This is a prioritized,
> grouped action list covering backend (`app/`) and mobile (`mobile/`).
> Generated 2026-06-20.

## How this was produced

- **Manual code review** of `app/` (FastAPI backend) and `mobile/` (Expo / React Native).
  The installed `/code-review` skill is diff-scoped — it reviews pending changes against the
  branch, and the only uncommitted changes in the tree are new `.md` docs. There is no code
  diff to analyze, so a full manual pass was done instead.
- **Sentry integration queried live** (org `landhere`, region `us.sentry.io`).

## Sentry status — checked, currently NO data

The Sentry org `landhere` exists, but:

- **0 projects** under the org.
- **0 issues / events** across all queried windows (`is:unresolved`, `firstSeen:-90d`).

**Conclusion:** the app is **not sending events yet** — neither the FastAPI backend nor the
Expo client is instrumented. There are therefore **no real, live errors to prioritize**. That
makes "get error visibility before launch" the single highest-value action below (item **#1**).
*Not instrumenting it now per your instructions — listed as a recommendation only.*

---

## Priority summary

| # | Area | Item | Severity |
|---|------|------|----------|
| 1 | Cross | No crash/error reporting (Sentry not wired up) | **High** |
| 2 | Backend | CORS `allow_origins=["*"]` + `allow_credentials=True` | **High** |
| 3 | Backend | Rate limiter trusts `request.client.host` (broken behind a proxy) | **High** |
| 4 | Data | Email not normalized → duplicate / unloggable accounts | **High** |
| 5 | Backend | Long-lived JWT (7 days), no revocation / logout | **Medium** |
| 6 | Backend | Rate limiter is in-memory & single-process | **Medium** |
| 7 | Mobile | `EXPO_PUBLIC_API_URL` unset → silent total failure, no guard | **Medium** |
| 8 | Data | Live secrets sit in working-tree `.env`; verify never committed + prod separation | **Medium** |
| 9 | Mobile | Stale token not cleared from SecureStore on failed hydrate | **Low–Med** |
| 10 | Backend | Malformed `sub` → 500 instead of 401 in `get_current_user` | **Low** |
| 11 | Mobile | Redundant `/auth/me` round-trip after login/register | **Low** |
| 12 | Backend | `/` health check doesn't verify DB connectivity | **Low** |
| 13 | Backend | Dev scratch scripts + logs committed at repo root | **Low** |
| 14 | Tests | Thin coverage (no universities/guides tests) | **Low** |
| 15 | Mobile | `userInterfaceStyle` locked to `light` despite theme system | **Low** |

---

## Backend (`app/`)

### #2 — CORS allows any origin *with* credentials — **High**
- **Where:** `app/main.py:32-38`
- **What:** `allow_origins=["*"]` combined with `allow_credentials=True`. Starlette will echo
  back any requesting origin and permit credentialed cross-origin requests from *any* website.
  The risk is partially mitigated because auth is Bearer-token (not cookies), so classic CSRF
  doesn't apply — but this is still an unrestricted, launch-blocking misconfiguration and will
  bite the moment any web surface (or cookie) is added.
- **Fix:** Restrict `allow_origins` to a known allowlist (your web/admin origins). Since the
  mobile app uses Bearer tokens, drop `allow_credentials=True` unless a browser surface needs it.

### #3 — Rate limiter keys on `request.client.host` — **High**
- **Where:** `app/core/rate_limit.py:31-34`
- **What:** Behind any reverse proxy / load balancer / PaaS (Render, Fly, Nginx, Cloudflare),
  `request.client.host` is the **proxy's** IP, not the user's. Result: every user shares one
  bucket (locks everyone out together) or, with a single proxy IP, the limit is effectively
  global and useless against distributed credential-stuffing. The auth brute-force protection
  this file exists to provide will not work as deployed.
- **Fix:** Derive client IP from `X-Forwarded-For` (left-most untrusted hop) **only when behind
  a trusted proxy**, or enable Starlette's `ProxyHeadersMiddleware` / set the platform's trusted
  proxy config. Pair with #6.

### #5 — JWTs live 7 days with no revocation — **Medium**
- **Where:** `app/core/config.py:8` (`ACCESS_TOKEN_EXPIRE_MINUTES=10080`), `app/core/security.py`,
  `app/routes/auth.py` (`/auth` has no logout)
- **What:** A leaked token is valid for a week and cannot be invalidated. There's no refresh
  token, no `jti`, no server-side logout — `logout()` on the client just drops the local copy.
- **Fix:** Shorten access-token lifetime and add a refresh-token flow, or add a token
  version/`jti` denylist checked in `get_current_user`. At minimum, document the tradeoff and
  reduce the window before launch.

### #6 — Rate limiter is in-memory & single-process — **Medium**
- **Where:** `app/core/rate_limit.py:27` (module-level `dict`)
- **What:** State resets on every restart/deploy and is **not shared across workers/instances**.
  With >1 Uvicorn worker or >1 replica, each has its own counters, multiplying the effective
  limit. (Already acknowledged in the file's docstring and `PRE_LAUNCH_SECURITY.md`.)
- **Fix:** Move to a shared store (Redis via `slowapi` or similar) before scaling past one worker.

### #10 — Malformed `sub` returns 500 instead of 401 — **Low**
- **Where:** `app/core/deps.py:23` — `User.id == sub` (UUID column vs raw string)
- **What:** `id` is a `UUID` column; `sub` is a plain string from the token. A validly-signed
  token whose `sub` is not a UUID would raise a DB `DataError` → unhandled → 500, instead of a
  clean 401. Low real-world likelihood (tokens are minted by us with UUID subs), but it's an
  error-handling gap and would generate noise once Sentry is on.
- **Fix:** Parse `sub` with `uuid.UUID(sub)` in a `try/except` and return 401 on failure.

### #12 — Health check doesn't touch the DB — **Low**
- **Where:** `app/main.py:47-49`
- **What:** `/` returns `{"status":"ok"}` even if the database is down, so uptime checks/load
  balancers will report healthy during a DB outage.
- **Fix:** Add a lightweight `SELECT 1` (optionally a separate `/health/ready`) so readiness
  reflects DB connectivity.

### #13 — Dev scratch scripts & logs committed at repo root — **Low (housekeeping)**
- **Where (tracked in git):** `_get_ids.py`, `_lookup2.py`, `_lookup3.py`, `_lookup4.py`,
  `_lookup_overrides.py`, `lookup_ids.py`, `lookup_ids2.py`, `lookup_ut.py`, `run_ingest.py`,
  plus `ingest_run.log` / `ingest_run_err.log` in the tree.
- **What:** One-off ingest/lookup scratch files clutter the root and blur what's production
  code. Logs shouldn't be tracked.
- **Fix:** Move keepers under `app/core/` or a `scripts/` dir; delete the rest; add `*.log` to
  `.gitignore` and untrack the existing logs.

---

## Mobile (`mobile/`)

### #7 — `EXPO_PUBLIC_API_URL` unset → silent failure, no guard — **Medium**
- **Where:** `mobile/lib/api.ts:5`, `mobile/lib/store.ts:40`
- **What:** If the env var is missing, axios `baseURL` is `undefined` and `store.ts` fetches
  `undefined/auth/me`. Every request fails with a confusing message and there's no startup check
  pointing at the real cause (misconfigured env). Note `EXPO_PUBLIC_*` is **embedded in the JS
  bundle** — fine for a URL, but never put secrets there.
- **Fix:** Validate the env var once at startup (throw/log a clear dev error, show a config
  screen in dev) so a missing API URL is obvious instead of looking like a server outage.

### #9 — Stale token not cleared on failed hydrate — **Low–Medium**
- **Where:** `mobile/lib/store.ts:31-55`
- **What:** When `/auth/me` returns non-OK (e.g. expired/invalid token), hydrate falls through to
  signed-out state **but leaves the bad token in SecureStore**. It'll be re-sent and re-rejected
  on every cold start. (The catch-all also can't distinguish "backend down" from "token invalid",
  so it can't safely delete in all cases — needs explicit status handling.)
- **Fix:** On an explicit 401, delete the token from SecureStore; on network failure, keep it and
  retry next launch.

### #11 — Redundant `/auth/me` after login/register — **Low**
- **Where:** `mobile/app/(auth)/login.tsx:40-47`, `mobile/app/(auth)/register.tsx:188-198`
- **What:** Login/register return a token, then the client makes a second round-trip to `/auth/me`
  for the user object. Extra latency on the most latency-sensitive screen, and an extra failure
  point right after a successful auth.
- **Fix:** Have `/auth/login` and `/auth/register` return the user alongside the token (extend
  `TokenOut` or add a combined response), and drop the follow-up call.

### #15 — Theme system present but UI locked to light — **Low**
- **Where:** `mobile/app.json` (`"userInterfaceStyle": "light"`) vs `mobile/context/ThemeContext.tsx`
- **What:** There's a full theme context, but the app forces light mode. Either wire up
  system/dark support or this is dead flexibility. Cosmetic.
- **Fix:** Decide intentionally — support `automatic` or document that light-only is deliberate.

### Mobile — things that are already good (no action)
- Root `ErrorBoundary` with themed fallback (`components/ErrorBoundary.tsx`) — solid.
- `getErrorMessage` maps timeouts/network/422/5xx to human messages (`lib/api.ts`) — well done.
- Rankings list uses `FlatList` + `useInfiniteQuery` + debounced search + windowing
  (`app/(tabs)/rankings.tsx`) — no perf concern. Only `Array.from({length:8})` skeletons are
  `.map`-ed, which is fine (tiny, fixed).
- Only 3 source files contain `console.*` calls — not a leak concern (the boundary's
  `console.error` should become a Sentry capture once #1 lands).

---

## Data / config / secrets

### #4 — Email is never normalized — **High (data integrity + auth UX)**
- **Where:** `app/routes/auth.py:26-33` (register), `:47` (login); `app/schemas/user.py`
- **What:** `email` is stored and matched as-typed. `Foo@x.com` and `foo@x.com` are treated as
  two different accounts (the column is `unique`, so this also produces confusing "already
  registered" vs "invalid credentials" outcomes depending on casing). Users will lock themselves
  out by capitalizing their email differently than at signup.
- **Fix:** Normalize to lowercase (and `.strip()`) on **both** register and login before query/
  insert — ideally in the Pydantic schema so it's enforced in one place. Add a one-off migration
  to lowercase existing rows if any exist.

### #8 — Live secrets in working-tree `.env` — **Medium (operational)**
- **Where:** `./.env` (DB password, `SECRET_KEY`, `SCORECARD_API_KEY`, `OPENALEX_API_KEY`)
- **What:** `.env` is correctly **git-ignored** (verified: not tracked; only `mobile/.env.example`
  is tracked), so this is *not* a committed leak. But real, live credentials sit in the working
  tree, and the JWT `SECRET_KEY` here must never be reused in production — anyone with it can
  forge tokens.
- **Fix before launch:**
  - Confirm `.env` was never committed in history (`git log --all -- .env`).
  - Use a **separate, secret** `SECRET_KEY` in production (managed secret, not this value).
  - Rotate the Scorecard/OpenAlex keys if the file was ever shared; treat the DB password as
    sensitive. (Scorecard/OpenAlex keys are low-sensitivity but still shouldn't circulate.)

---

## Tests

### #14 — Thin test coverage — **Low**
- **Where:** `tests/` — `test_auth.py`, `test_countries.py`, `test_health.py`, `test_info.py`
- **What:** Good that auth/countries/info/health are covered, but there are no tests for the
  `universities` (search/filter/pagination) or `guides` endpoints — the two with the most query
  logic and the most user-facing surface.
- **Fix:** Add endpoint tests for universities filtering/pagination and guides section filtering,
  including the 404 paths.

---

## #1 — Recommended: instrument the app with Sentry (do NOT do now) — **High**

Because Sentry currently has **no projects and no events**, you are flying blind: any backend 500
or mobile crash today goes unseen. This is the highest-leverage pre-launch item.

- **Backend:** add `sentry-sdk[fastapi]`, init in `app/main.py`, and capture inside the existing
  `unhandled_exception_handler` (`app/main.py:18-30`) so 500s are reported with request context.
- **Mobile (Expo):** add `@sentry/react-native` (Expo plugin), init in `app/_layout.tsx`, and
  report from `ErrorBoundary.componentDidCatch` (`components/ErrorBoundary.tsx:51`) instead of the
  current console-only log.
- Create the two Sentry projects under the `landhere` org and wire DSNs via env (server DSN as a
  real secret; mobile DSN via `EXPO_PUBLIC_*`).

*Per your instructions this is a recommendation only — not implemented in this pass.*

---

## Honest notes

- **No critical/live issues.** Nothing is actively crashing (Sentry empty) and nothing is trivially
  exploitable (Bearer auth, secrets not committed, SQL is parameterized via the ORM). The "High"
  items are launch-readiness/security-hardening, not active fires.
- The codebase is generally clean and thoughtfully commented; several risk areas (rate-limit
  fail-open, hydrate timeouts, error mapping, password length caps) are already handled and
  documented. The list above is deliberately not padded with style nitpicks.
