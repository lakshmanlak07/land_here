# Round 2 — single paste for Claude Code

Paste everything inside the fence below into Claude Code as one message.
It has **three hard STOP gates** — Claude Code must pause and wait for you at each.
Diagnosis and background: `CC_ROUND2_PROMPTS.md`.

---

```
CONTEXT CORRECTION FIRST — please read this before acting.

You were working in an isolated worktree at
C:/Users/laksh/land_here/.claude/worktrees/festive-kepler-ae9258, on branch
claude/happy-chatelet-149d13 at commit 6c01dd9.

My actual current work is on branch perf/list-and-image-optimizations at commit
a8e3e66. It is 12 commits ahead of main, and commit 2d3e6c0 (which added the
paywall) is NOT an ancestor of your worktree commit. main is also sitting at
6c01dd9 — same as your worktree.

That is why your grep found no paywall: mobile/app/paywall.tsx and
mobile/lib/purchaseStore.ts were untracked files until 2d3e6c0, and a worktree
branched before that commit cannot see untracked files.

You were right to refuse to build StoreKit verification against code you couldn't
see. That was the correct call and I don't want you to lose that instinct — you
simply had the wrong tree. Apply the same skepticism to everything below: if
something I assert doesn't match what you actually find in the repo, stop and tell
me rather than building around it.

Work through these phases in order. STOP where marked and wait for my approval.

────────────────────────────────────────────
PHASE 1 — Commit your existing work
────────────────────────────────────────────
1. Report your current branch, worktree root, and HEAD SHA.
2. Commit your hardening work in logical units with clear messages — not one
   giant commit.
3. Do NOT merge, rebase, force-push, or switch branches yet.
4. List every file you changed, grouped by commit.

────────────────────────────────────────────
PHASE 2 — Reorient onto the real branch
────────────────────────────────────────────
5. Fetch and inspect perf/list-and-image-optimizations WITHOUT merging.
6. Confirm you can now see: mobile/app/paywall.tsx, mobile/lib/purchaseStore.ts,
   mobile/eas.json, render.yaml, railway.toml, Dockerfile, LAUNCH/.
7. Re-check these three findings you previously filed as accepted risks. I believe
   all three were artifacts of the stale tree — verify rather than take my word:
   - "no refresh logic exists" → perf/ has commit 26e6b41 "mobile silent token
     refresh on 401"
   - "7-day access tokens, no refresh/revocation" → perf/ app/core/config.py sets
     ACCESS_TOKEN_EXPIRE_MINUTES=60 and REFRESH_TOKEN_EXPIRE_MINUTES=43200
   - "no deployment config in this worktree" → perf/ has Dockerfile (uvicorn
     --workers 2), render.yaml, railway.toml
8. Also reconsider one risk you accepted on its merits, not staleness: "register
   reveals email existence via 400." Standard UX, yes — but this app serves
   international students in an immigration context, so an enumerable account list
   carries a different weight here than in a generic consumer app. Give me your
   recommendation; I'll decide.

*** STOP 1. Report the corrected risk assessment. Fix nothing yet. Wait for me. ***

────────────────────────────────────────────
PHASE 3 — Integration (scratch branch first)
────────────────────────────────────────────
9. Create a scratch branch from perf/list-and-image-optimizations (e.g.
   integrate/hardening-round2). Do all integration there. Never force-push and
   never rewrite history on perf/list-and-image-optimizations.
10. Before executing the merge, tell me the direction you plan to merge and where
    you expect conflicts. We both modified these four files, so expect conflicts
    in: app/core/config.py, app/core/rate_limit.py, app/routes/auth.py,
    mobile/lib/api.ts.

*** STOP 2. Show me the integration plan and expected conflicts. Wait for me. ***

11. After I approve: perform the merge on the scratch branch, then run
    `pytest tests -q` and `tsc --noEmit`.
12. Your baseline is 45 passing tests and a clean tsc. If either regresses, STOP
    and show me the failures. Do not patch over a regression to make it green.
13. Only after both are clean do we fast-forward perf/list-and-image-optimizations.

────────────────────────────────────────────
PHASE 4 — Redis rate limiting
────────────────────────────────────────────
14. Dockerfile runs uvicorn with --workers 2 while app/core/rate_limit.py falls
    back to a per-process in-memory counter when REDIS_URL is unset — so every
    limit is effectively doubled in production. Verify the Redis backend uses an
    atomic INCR+EXPIRE (pipeline or Lua), not read-then-write.
15. Add REDIS_URL to render.yaml as a required env var and document the Render Key
    Value provisioning step.
16. Keep the loud startup warning you added.
17. Confirm per-IP and per-email login limits are both enforced alongside your new
    per-account lockout, and that the two don't cancel each other out.

────────────────────────────────────────────
PHASE 5 — Server-side entitlement
────────────────────────────────────────────
Confirmed facts about the current implementation (verify each before relying on it):
- mobile/lib/purchaseStore.ts persists entitlement as AsyncStorage
  'landhere_purchased' = 'true' — that is the ONLY gate
- PRODUCT_ID = 'com.landhere.app.pro', one non-consumable, $1.99, iOS only for v1
- restorePurchases() calls getAvailablePurchases() and sets local state directly
- No entitlement checks exist in app/routes/, app/models/, or app/schemas/
- Alembic head is c3d5e7f9a1b2 — re-verify after integration

18. Read paywall.tsx plus the journey and rankings screens, and derive the exact
    free-vs-pro content boundary the UI currently implements. Present it to me as
    a list.
19. Do NOT guess or invent product rules. If the boundary is ambiguous anywhere,
    ask me instead of deciding.

*** STOP 3. Show me the free/pro boundary. Wait for my confirmation. ***

20. After I confirm: implement server-side receipt validation against Apple
    (handle the sandbox/production fallback, status 21007), an is_pro column plus
    migration chained off the current head, and a require_pro dependency applied
    to the pro routes.
21. Server is the source of truth. AsyncStorage becomes an offline cache that the
    server overwrites on every successful fetch — never the reverse. Never trust a
    client-supplied is_pro flag.
22. Tests required: free user blocked from pro routes; verified user allowed;
    replayed/duplicate receipt rejected; wrong product ID rejected; receipt already
    claimed by a different user rejected.

────────────────────────────────────────────
GROUND RULES
────────────────────────────────────────────
- Never force-push. Never rewrite history on perf/list-and-image-optimizations.
- Do not fabricate contracts against code you cannot see. If a premise I gave you
  doesn't match the repo, say so and stop.
- Report regressions honestly rather than making tests pass.
- I am handling these myself — do not attempt them: rotating the Unsplash key,
  setting production env vars on Render, provisioning Redis.
```

---

## Your manual steps (not for Claude Code)

Push the correct branch first:

```powershell
cd C:\Users\laksh\land_here
git push -u origin perf/list-and-image-optimizations
```

Then, in your own time:

1. **Rotate the Unsplash key** at unsplash.com/oauth/applications. CC confirmed the
   real key was never committed — good — but any build that bundled it is still a
   distribution path. Rotating costs nothing.
2. **Production env vars on Render:** `ENV=production`, strong `SECRET_KEY`,
   explicit `CORS_ALLOW_ORIGINS`, `TRUST_PROXY_HEADERS=true` + correct hop count,
   `UNSPLASH_ACCESS_KEY`, `REDIS_URL`.
3. **Provision Redis** on Render.
