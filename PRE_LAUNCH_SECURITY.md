# Pre-Launch Security Checklist

Items deliberately **NOT** applied during the hardening pass because they would
break local development / Expo testing, or are production-environment concerns.
Work through these before exposing the app to real users on the public internet.

This list complements `SECURITY_PLAN.md`. None of it is a guarantee of being
"unhackable" — it closes the common, well-known gaps and reduces attack surface.

---

## 1. SECRET_KEY — generate a strong value and fail-fast on weak ones
- Generate a fresh key:
  ```
  python -c "import secrets; print(secrets.token_urlsafe(64))"
  ```
  Put it in the **production** environment (secret manager / platform env var),
  never in a committed file. The local dev `.env` value must never reach prod.
- If the local `.env` currently uses a placeholder (e.g. `temp-dev-key`), rotate
  it. Rotating invalidates all existing JWTs (users must log in again) — fine
  pre-launch.
- Add startup validation in `app/core/config.py` so the app refuses to boot with
  a weak/placeholder key. **Not applied now** because it would block local dev if
  your current `.env` key is weak:
  ```python
  from pydantic import field_validator

  @field_validator("SECRET_KEY")
  @classmethod
  def _strong_secret(cls, v: str) -> str:
      weak = {"change-me", "temp-dev-key", "change-me-to-a-strong-random-secret"}
      if len(v) < 32 or v in weak:
          raise ValueError("SECRET_KEY must be a strong random value (>=32 chars)")
      return v
  ```

## 2. CORS — lock origins to the real web/prod domain(s)
**Done:** `allow_credentials` is `False` in `app/main.py`, and allowed origins now
come from the **`CORS_ALLOW_ORIGINS`** env var (comma-separated), parsed by
`settings.cors_allow_origins`. The default is `"*"`, which keeps local Expo testing
against the LAN IP working. Because the app authenticates with **Bearer tokens
(Authorization header), not cookies**, a wildcard origin with `allow_credentials=False`
is safe — a wildcard only matters for credentialed (cookie) requests, and the native
mobile client isn't subject to CORS at all. `main.py` also asserts that `"*"` can never
be combined with credentials.

**Still TODO before launch:**
- **Set `CORS_ALLOW_ORIGINS`** in the production environment to the explicit web/prod
  origin(s) you actually serve (e.g. `https://app.example.com,https://admin.example.com`),
  instead of leaving the `"*"` default. Only relevant once there's a browser-based
  client; the mobile app does not need it.
- Never reintroduce `allow_credentials=True` alongside `"*"` — browsers reject that
  combination, and it would be unsafe. If a cookie-based flow is ever added, set an
  explicit origin allowlist *and* `allow_credentials=True` together, never wildcard.

## 3. HTTPS / HSTS
- Terminate TLS at the proxy/load balancer; redirect HTTP → HTTPS.
- Send `Strict-Transport-Security` (HSTS) on HTTPS responses.
- **Not applied now** — forcing HTTPS breaks local `http://` Expo testing.

## 4. Security response headers
Add at the proxy or via middleware in production:
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, and a Content-Security-Policy for any web build.

## 5. Rate limiting — shared store + trusted-proxy config in production
The current limiter (`app/core/rate_limit.py`) is **in-memory, single-process,
fail-open**. It resets on restart and does not coordinate across workers.
- For multi-worker / multi-instance production, back it with Redis
  (e.g. `slowapi` + Redis) so limits hold globally.
- Re-tune limits under real traffic; consider per-account lockout on repeated
  failed logins, not just per-IP.

**Trusted-proxy client-IP resolution (done in dev, must be configured in prod):**
- `_client_ip()` now reads the real client IP from `X-Forwarded-For`, but only
  when `TRUST_PROXY_HEADERS=true` (default **false** for local dev, where there is
  no proxy and the socket peer is correct). In production **behind a reverse proxy
  / load balancer**, set:
  - `TRUST_PROXY_HEADERS=true`
  - `TRUSTED_PROXY_HOPS=<number of proxies in front of the app>` (e.g. `1`).
- Getting the hop count wrong matters: too low trusts a spoofable client-supplied
  value; too high keys everyone by the proxy IP again. Confirm against your actual
  deployment topology, and make sure the proxy **overwrites** (not just appends)
  inbound `X-Forwarded-For` so clients can't pre-seed fake hops.
- Leaving `TRUST_PROXY_HEADERS=false` in production behind a proxy reintroduces the
  original bug (all users share one bucket — finding #3). The in-memory store
  (finding #6, above) still needs Redis regardless.

## 6. Token / auth lifecycle
- `ACCESS_TOKEN_EXPIRE_MINUTES` is currently **10080 (7 days)**. Consider a
  shorter access-token lifetime plus a refresh-token flow.
- Add email verification on registration.
- Consider account lockout / exponential backoff after repeated failed logins.
- Server-side password strength is currently min-length 8 only; consider a
  stronger policy (and check against known-breached password lists).

## 7. Dependencies — remaining advisories
- **npm (mobile):** 20 *moderate* advisories remain, all in deep Expo transitive
  deps (`@expo/config-plugins` → `xcode`, `expo-constants`, `expo-router`, and a
  `js-yaml` DoS via `@istanbuljs`). They only resolve via **breaking** changes
  (`npm audit fix --force`, which would bump `react-native` major). Do this as a
  deliberate Expo SDK upgrade with full re-test — not a quick fix. (The 2 *high*
  `form-data` CRLF advisories were already fixed, non-breaking.)
- **pip (backend):** the app's own dependencies are clean after the
  `starlette>=1.3.1` bump. NOTE: `pip-audit` run against the whole machine venv
  reports many CVEs in **unrelated** packages (bokeh/dask/flask/etc.) that the
  app does not use — scope audits to `requirements.txt`.
- Keep `pip-audit` and `npm audit` in CI so new advisories surface automatically.

## 8. Secrets management in production
- Inject `DATABASE_URL`, `SECRET_KEY`, `SCORECARD_API_KEY`, `OPENALEX_API_KEY`
  via the platform's secret manager / env vars — never via a committed file.
- `EXPO_PUBLIC_*` vars (incl. the Unsplash key) are **bundled into the client and
  are public by design** — never put a real secret behind an `EXPO_PUBLIC_` name.

## 9. Database hardening
- Use a least-privilege Postgres role for the app (not a superuser).
- Require TLS for the DB connection in production.
- Confirm automated backups + tested restore.

## 10. Runtime / debug
- Run uvicorn **without** `--reload` in production; never set FastAPI `debug=True`.
- Confirm logs don't capture secrets or full request bodies. (The new exception
  handler logs only method + path, not the body — keep it that way.)

## 11. Housekeeping (not security-critical)
- The auth test suite (`tests/test_auth.py`) currently fails 7 tests because it
  uses `@example-test-only.invalid` addresses, which the installed
  `email-validator` rejects as a reserved TLD (RFC 6761). This is a **test-data**
  issue, not an app or security bug — registration works with real emails. Update
  the test emails (e.g. to a non-reserved domain) so the suite can guard auth.
