# Claude Code Prompts — LandHere Pre-Launch Hardening

_Written 2026-07-31, grounded in a read of the actual codebase (not generic advice)._

**Run these in order.** Prompt 1 and 2 are revenue-critical and block launch. Commit
after each one so you can bisect if something breaks.

**A note on "hackproof":** nothing is. Your own `SECURITY_PLAN.md` says as much, and
it's right. These prompts close specific, identified holes and raise the cost of
attack. Treat any tool or person who tells you an app is unhackable as wrong.

---

## Prompt 1 — Server-side entitlement (THE revenue leak)

> **What I found:** `mobile/lib/purchaseStore.ts` stores the pro entitlement as the
> AsyncStorage string `landhere_purchased = 'true'`, and `grep` across `app/routes/`,
> `app/models/`, and `app/schemas/` returns **zero** entitlement checks. So the
> paywall is cosmetic twice over: a user can flip one local string to unlock pro, and
> more simply, every "pro" endpoint already returns full content to any authenticated
> free account. Anyone who reads the API can take the whole product for free.

```
The pro paywall in this app is currently client-side only and is trivially
bypassed. I need entitlement enforced on the server.

Context:
- mobile/lib/purchaseStore.ts persists entitlement to AsyncStorage as
  'landhere_purchased' = 'true'. That is the only gate.
- There are no entitlement checks anywhere in app/routes/, app/models/, or
  app/schemas/. Free accounts can already fetch all premium content directly.
- Product: one non-consumable IAP, com.landhere.app.pro, $1.99, iOS only for v1.

Implement, in this order:

1. Add an `is_pro` boolean (default False) and `pro_purchased_at` timestamp to the
   User model, with an Alembic migration. The current head is c3d5e7f9a1b2 — chain
   from it and keep the chain linear.

2. Add POST /purchases/verify. It accepts the App Store transaction receipt from
   the client, validates it server-side against Apple's verifyReceipt / App Store
   Server API, confirms the product ID is exactly com.landhere.app.pro and the
   transaction is not already bound to a different user, then sets is_pro on the
   authenticated user. Handle the sandbox-vs-production endpoint fallback (status
   21007) correctly. Never trust a client-supplied is_pro flag.

3. Add a FastAPI dependency `require_pro` and apply it to every route serving
   premium content. First, read the paywall logic in mobile/app/paywall.tsx and the
   gating in the journey and rankings screens to determine exactly which content is
   free vs pro, then mirror that split on the server. Show me the free/pro boundary
   you inferred before you enforce it — do not guess.

4. Add GET /auth/me → include is_pro, and make the mobile app treat the server as
   the source of truth. Keep the AsyncStorage value only as an offline cache that
   is overwritten by the server on every successful fetch, never the reverse.

5. Rework restorePurchases in purchaseStore.ts to call POST /purchases/verify
   rather than setting local state directly.

Write tests covering: free user blocked from pro routes, verified user allowed,
replayed/duplicate receipt rejected, receipt for a different product rejected,
and a receipt already claimed by another user rejected.
```

---

## Prompt 2 — The Unsplash key is shipped inside your app binary

> **What I found:** `mobile/lib/images.ts:62` reads `EXPO_PUBLIC_UNSPLASH_KEY` and
> calls `api.unsplash.com` directly from the device. **Every `EXPO_PUBLIC_*` variable
> is compiled into the JS bundle**, so anyone who downloads your IPA can extract that
> key in minutes. This is your most likely path to losing money or service: a stolen
> key burns your Unsplash rate limit (5,000 req/hr on production tier), which breaks
> images for all real users, and abuse under your key can get your Unsplash
> application suspended.

```
mobile/lib/images.ts calls api.unsplash.com directly from the device using
EXPO_PUBLIC_UNSPLASH_KEY. Because EXPO_PUBLIC_* vars are embedded in the JS
bundle, that key is extractable from the shipped app. Move it server-side.

1. Add a backend image-proxy endpoint (e.g. GET /images/city?query=...) that holds
   the Unsplash key in a server-only env var, calls Unsplash, and returns only the
   image URL and attribution fields the client actually needs.

2. Require authentication on that endpoint and rate-limit it per user — it must not
   become an open proxy that lets anyone drain the quota through my server.

3. Cache responses server-side keyed by query string. These are city and campus
   images that change ~never, so cache aggressively (persistent, long TTL). This
   should cut Unsplash calls by orders of magnitude and keep me far under quota.

4. Update mobile/lib/images.ts to call my endpoint. Delete EXPO_PUBLIC_UNSPLASH_KEY
   from the client entirely, and remove it from .env.example and any docs.

5. Audit every other EXPO_PUBLIC_* var in the mobile app and tell me if any other
   secret is being shipped to the client. EXPO_PUBLIC_API_URL is fine (it is a
   public URL); flag anything that is a credential.

Then tell me plainly: after this change, is there any remaining credential in the
client bundle? If yes, name it.
```

**After running this, rotate the Unsplash key** — assume the old one is compromised
if any build with it ever left your machine.

---

## Prompt 3 — Rate limiter is per-process but you run 2 workers

> **What I found:** `Dockerfile` starts uvicorn with `--workers 2`, and
> `app/core/rate_limit.py` falls back to an **in-memory, per-process** counter when
> `REDIS_URL` is unset. Two processes = every limit is silently double what you
> intended, and it resets on each deploy. Your login endpoint is the one that matters.

```
My Dockerfile runs uvicorn with --workers 2, but app/core/rate_limit.py uses a
per-process in-memory counter unless REDIS_URL is set. Every rate limit is
therefore effectively 2x the configured value, and resets on redeploy.

1. Confirm the Redis backend in rate_limit.py is correct and atomic (use INCR with
   EXPIRE in a pipeline or a Lua script — not a read-then-write race).
2. Make the app log a loud startup WARNING if REDIS_URL is unset while more than
   one worker is configured, so this mismatch can never ship silently again.
3. Review the current limits on POST /auth/login and POST /auth/register
   specifically. These are the credential-stuffing targets. Recommend limits based
   on the fact that this is a brand-new app with low traffic, and implement
   per-IP AND per-email limits on login, not just per-IP.
4. Add exponential backoff or temporary lockout after repeated failed logins for
   the same email.
```

---

## Prompt 4 — Auth and account-security review

```
Do a focused security review of authentication in this FastAPI app. Read
app/routes/auth.py, app/core/deps.py, app/core/config.py, app/models/user.py, and
the mobile auth flow in mobile/lib/store.ts and mobile/lib/api.ts.

Check specifically and report findings before fixing:
- JWT: algorithm confusion (is `alg` pinned?), missing exp/iat validation, whether
  refresh tokens can be replayed, and whether logout actually invalidates anything.
- Whether refresh tokens are rotated on use and revocable server-side.
- Password rules: bcrypt cost factor, minimum length, and the bcrypt 72-byte
  truncation issue if long passwords are allowed.
- User enumeration: do register/login/password-reset responses or timings reveal
  whether an email exists?
- IDOR: can any authenticated user read or modify another user's data by changing
  a UUID in a path?
- Account deletion (app/routes/account.py): does it actually delete, and does it
  match what ACCOUNT_DELETION.md and the privacy policy promise? A mismatch here
  is both a security bug and a legal problem.

Fix in severity order. Show me the list before you start.
```

---

## Prompt 5 — Input validation and injection surface

```
Audit every request-accepting endpoint for input validation. Focus on:

- GET /universities takes `search`, `max_tuition`, `state`, `limit`, `offset`.
  Verify `limit` is capped (an uncapped limit is a cheap DoS — one request pulling
  500+ rows repeatedly), offset is bounded, and `search` cannot inject SQL through
  any raw or f-string query. Confirm every query uses SQLAlchemy parameter binding.
- All Pydantic schemas: are string fields length-bounded? An unbounded full_name or
  email lets someone write large rows into my database for free.
- Reject oversized request bodies at the app or proxy layer.
- Confirm errors never leak stack traces, SQL, or file paths in production
  responses.

Add tests for the malicious cases, not just the happy path.
```

---

## Prompt 6 — Stability: make it not crash

```
Improve resilience across the app. This is a mobile client talking to a single
backend over unreliable student wifi and mobile data.

Backend:
- Ensure every external call (Unsplash, Frankfurter/ECB, College Scorecard,
  OpenAlex) has an explicit timeout and cannot hang a request thread. Find any
  call missing one.
- Add graceful degradation: if an external API is down, the app should serve
  cached or partial data rather than 500.
- Verify DB session lifecycle — no leaked sessions on exception paths.
- Confirm the health check at GET / actually verifies DB connectivity rather than
  just returning 200 unconditionally.

Mobile:
- Review mobile/components/ErrorBoundary.tsx — confirm it covers the whole tree
  and that a render error shows a recoverable screen, not a white screen.
- Every network call should handle offline, timeout, and 5xx with a retry
  affordance. Find screens that assume success.
- Verify token-refresh-on-401 in lib/api.ts cannot infinite-loop when the refresh
  itself 401s.

Report what you found before fixing.
```

---

## Prompt 7 — Test coverage on what actually matters

```
Look at the tests/ directory and TEST_CHECKLIST.md, then tell me what critical
paths are untested. Prioritise by blast radius, not coverage percentage:

1. Purchase verification and entitlement enforcement (after Prompt 1).
2. Auth: register, login, refresh, logout, account deletion.
3. Rate limiting actually rejecting at the boundary.
4. The free-vs-pro content boundary — a test that fails loudly if premium content
   ever becomes reachable by a free account.

Write the missing tests. I would rather have 20 tests on these paths than 200
tests on serializers.
```

---

## Prompt 8 — Cost and abuse control (money leaks)

```
Find every way this app could cost me unexpected money or get a service account
suspended, then fix what you can and list what needs my decision.

Cover:
- Third-party API quotas: Unsplash, Frankfurter/ECB, College Scorecard, OpenAlex.
  For each: where is it called from, is it called per-user-request or only during
  offline ingestion, what is the free-tier limit, and what happens when we exceed
  it? Anything called per-request from the client is a cost/abuse risk — cache it.
- Database growth: can an unauthenticated or free user cause unbounded row
  creation? Registration is the obvious one — is there anything stopping a script
  from creating 100k accounts?
- Egress and compute: any endpoint that returns large payloads without pagination.
- Log volume: are we logging per-request in a way that would explode a hosting log
  quota under traffic?

For each risk give me: the concrete scenario, the realistic cost, and the fix.
Implement the caching and pagination fixes directly.
```

---

## Prompt 9 — Final pre-submission sweep

```
Read PRE_LAUNCH_SECURITY.md and SECURITY_PLAN.md, then check each item against the
current state of the code and tell me honestly which are done, which are partially
done, and which are still open. Do not mark something done because it is written
down — verify it in the code.

Then confirm the production deployment specifics:
- SECRET_KEY validator rejects weak keys (I believe this is already in
  app/core/config.py — verify it fires).
- CORS_ALLOW_ORIGINS is not "*" in the production env.
- TRUST_PROXY_HEADERS and TRUSTED_PROXY_HOPS match the actual Render setup, since
  getting this wrong makes IP-based rate limiting either spoofable or useless.
- No debug mode, no verbose errors, no seed/admin endpoints exposed in prod.
- Nothing sensitive in git history: `git log -p --all | grep -iE 'secret|api[_-]?key|password'`

Give me a go/no-go list with severity, and be blunt about anything you would not
ship.
```

---

## Things no prompt can fix — your calls

- **Render free Postgres expires after 90 days and is deleted.** Move to a paid
  tier before you have users worth keeping.
- **Rotate the Unsplash key** after Prompt 2.
- **Rotate `SECRET_KEY`** for production — never reuse the dev value. Rotating
  invalidates existing tokens, which is free to do now and painful later.
- **Legal sign-off** still blocks submission (see `ATTORNEY_BRIEF.md`).
