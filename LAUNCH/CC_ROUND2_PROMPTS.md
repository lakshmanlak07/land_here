# Claude Code — Round 2 Prompts (branch reconciliation)

_2026-07-31. Read the diagnosis before running these._

## Diagnosis

Claude Code was correct about what it saw, and correct to refuse to build against
missing code. It was looking at the wrong tree.

Verified facts:

| | |
|---|---|
| Your work sits on | `perf/list-and-image-optimizations` @ `a8e3e66` |
| Claude Code's worktree | `.claude/worktrees/festive-kepler-ae9258`, branch `claude/happy-chatelet-149d13` @ `6c01dd9` |
| Is `2d3e6c0` (paywall commit) an ancestor of `6c01dd9`? | **No** |
| `main` is at | `6c01dd9` — the same commit as CC's worktree |
| Your branch is ahead of `main` by | **12 commits** |

`paywall.tsx` and `purchaseStore.ts` were **untracked** files until I committed them
in `2d3e6c0`. A worktree branched before that commit cannot see untracked files —
so from CC's position the paywall genuinely does not exist. Its grep was honest.

**This also invalidates several of its "accepted risks."** It reported "no refresh
logic exists" and "7-day access tokens" — but `perf/list-and-image-optimizations`
contains `feat: mobile silent token refresh on 401` and `config.py` with
`ACCESS_TOKEN_EXPIRE_MINUTES=60` plus `REFRESH_TOKEN_EXPIRE_MINUTES`. Same cause.
Re-assess those on the correct branch before accepting them.

**Correction to earlier advice:** I told you to `git push origin main`. That was
wrong — your work is not on `main`. See Prompt 0.

---

## Prompt 0 — run this yourself first (not for Claude Code)

Confirm the state before anything merges:

```powershell
cd C:\Users\laksh\land_here
git log --oneline -3
git branch --show-current
git status --short
```

You should see `a8e3e66` and `perf/list-and-image-optimizations`. Then push
**that branch**, not main:

```powershell
git push -u origin perf/list-and-image-optimizations
```

---

## Prompt 1 — let Claude Code commit its work (do this before any merge)

```
Yes, commit your work now. Before you do:

1. Tell me exactly which branch and worktree you are on (`git branch --show-current`
   and `git rev-parse --show-toplevel`), and the SHA of your HEAD.
2. Commit in logical units with clear messages, not one giant commit.
3. Do NOT merge, rebase, force-push, or switch branches. I will handle integration.
4. List every file you changed, grouped by commit.
```

---

## Prompt 2 — reorient Claude Code onto the real branch

```
Important context correction: you were working in an isolated worktree on branch
claude/happy-chatelet-149d13 at commit 6c01dd9. My actual current work is on branch
perf/list-and-image-optimizations at a8e3e66, which is 12 commits ahead of main and
is NOT an ancestor of your worktree commit.

That is why your grep found no paywall. mobile/app/paywall.tsx and
mobile/lib/purchaseStore.ts were untracked files until commit 2d3e6c0, which your
worktree does not contain. You were right to refuse to build against code you
couldn't see — that was the correct call, and I don't want you to change that
instinct. You just had the wrong tree.

Please now:
1. Fetch and inspect perf/list-and-image-optimizations without merging yet.
2. Confirm you can see: mobile/app/paywall.tsx, mobile/lib/purchaseStore.ts,
   mobile/eas.json, render.yaml, railway.toml, Dockerfile, and LAUNCH/.
3. Re-check these three findings you previously reported as accepted risks, because
   I believe they were artifacts of the stale tree:
   - "no refresh logic exists" — perf/ has commit 26e6b41 "mobile silent token
     refresh on 401"
   - "7-day access tokens" — perf/ config.py sets ACCESS_TOKEN_EXPIRE_MINUTES=60
     and REFRESH_TOKEN_EXPIRE_MINUTES
   - "no deployment config in this worktree" — perf/ has Dockerfile
     (uvicorn --workers 2), render.yaml, railway.toml
4. Tell me which of your accepted risks survive on the correct branch and which
   were stale-tree artifacts. Do not fix anything yet — I want the corrected
   assessment first.
```

---

## Prompt 3 — integrate the two lines of work

```
I need your hardening work and my perf/list-and-image-optimizations branch combined.
Your 45 passing tests and the mobile tsc-clean state must survive.

1. Propose an integration strategy (merge direction, conflict expectations) BEFORE
   executing. I want to approve it.
2. Flag any place where your changes and mine touch the same file — especially
   app/core/config.py, app/core/rate_limit.py, app/routes/auth.py, and
   mobile/lib/api.ts, all of which both of us modified.
3. After integration: run `pytest tests -q` and `tsc --noEmit` and report results.
   If either regresses, stop and show me the failures rather than patching over them.
4. Do not force-push. Do not rewrite history on perf/list-and-image-optimizations.
```

---

## Prompt 4 — entitlement work, now with real context

Only run after Prompt 3 integrates cleanly.

```
Now that you can see mobile/app/paywall.tsx and mobile/lib/purchaseStore.ts, revisit
the server-side entitlement task.

Confirmed facts about the current implementation:
- purchaseStore.ts persists entitlement as AsyncStorage 'landhere_purchased' = 'true'
- PRODUCT_ID = 'com.landhere.app.pro', one non-consumable, $1.99, iOS only for v1
- restorePurchases() calls getAvailablePurchases() and sets local state directly
- There are no entitlement checks in app/routes/, app/models/, or app/schemas/
- Alembic head is c3d5e7f9a1b2 (verify this is still true after integration)

Before writing code: read paywall.tsx and the journey/rankings screens, determine
the exact free-vs-pro content boundary the UI implements, and show me that boundary
as a list. Do not guess it and do not invent product rules — if the boundary is
ambiguous anywhere, ask me rather than deciding.

Once I confirm the boundary, implement server-side receipt validation, an is_pro
column with migration, a require_pro dependency on the pro routes, and tests for:
free user blocked, verified user allowed, replayed receipt rejected, wrong product
rejected, receipt already claimed by another user rejected.
```

---

## Prompt 5 — Redis rate limiting, now that deploy config is in scope

```
Dockerfile on perf/list-and-image-optimizations starts uvicorn with --workers 2,
while app/core/rate_limit.py falls back to a per-process in-memory counter when
REDIS_URL is unset. Every limit is therefore effectively doubled in production.

1. Verify the Redis backend uses an atomic INCR+EXPIRE (pipeline or Lua), not
   read-then-write.
2. Add REDIS_URL to render.yaml as a required env var and document the Render Redis
   (Key Value) provisioning step.
3. Keep the loud startup warning you already added.
4. Re-check the login limits with the per-account lockout you built — confirm
   per-IP and per-email are both enforced and that the two don't cancel out.
```

---

## Things Claude Code cannot do — yours

1. **Rotate the Unsplash key** at unsplash.com/oauth/applications. Its finding that
   the real key was never committed is good news, but any TestFlight or local build
   that bundled it is a distribution path. Rotate anyway; it costs nothing.
2. **Set production env vars** on Render: `ENV=production`, strong `SECRET_KEY`,
   explicit `CORS_ALLOW_ORIGINS`, `TRUST_PROXY_HEADERS=true` + correct hop count,
   `UNSPLASH_ACCESS_KEY`, `REDIS_URL`.
3. **Provision Redis** on Render.

## One accepted risk worth re-examining

CC accepted "register reveals email existence via 400" as standard UX. That is a
defensible tradeoff for most apps — but your users are international students, and
your own privacy policy positions the app around people in a sensitive immigration
context. An enumerable account list tied to a study-abroad app is a slightly
different risk profile than a generic consumer app. Worth a deliberate decision
rather than a default, especially since your lawyer is already reviewing the
privacy posture.
