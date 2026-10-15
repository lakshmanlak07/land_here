# LandHere — Operations runbook (Render)

Nothing here has been executed against real infrastructure yet: no Render account
is connected, and nothing has been pushed or deployed. Steps are written against
`render.yaml` and Render's documented Blueprint flow. Every check marked **verify**
must be confirmed on first use.

## 1. First deploy (production)
Prerequisites (owner): Render account with GitHub connected; approval of about $13/month
(see `render.yaml`); Resend domain verified (section 6).

1. Push the release branch to GitHub. This needs owner approval.
2. In Render, go to **New → Blueprint**, pick the repo and branch. Render reads `render.yaml`
   and proposes `landhere-api` (Starter, Singapore) and `landhere-db` (Basic-256mb, Singapore).
3. Fill the dashboard-only secrets: `RESEND_API_KEY`, `EMAIL_FROM` and, optionally,
   `UNSPLASH_ACCESS_KEY`. Never put them in git or chat.
4. Apply. On boot, `start.sh` runs:
   - `alembic upgrade head`;
   - `python -m app.core.seed` and `python -m app.core.universities_dataset load`
     (idempotent, reference data only);
   - uvicorn, single worker without Redis, with uvicorn's access log off.
5. **Verify** (`<api>` = the `onrender.com` URL Render shows):
   - `curl https://<api>/health/ready` returns `{"status":"ok"}`.
   - `python scripts/smoke_api.py https://<api>` reports 22/22. It creates and deletes one test account.
   - Response headers include `strict-transport-security` and `x-request-id`.
   - Request a reset for your own email and confirm the email arrives (Resend dashboard → Emails).
   - Proxy hop count: confirm per-IP rate limiting sees real client IPs. Send a few
     requests from two networks and check that the 429s are independent. If all clients
     share one bucket, adjust `TRUSTED_PROXY_HOPS`.
6. In EAS, set the production env vars: `EXPO_PUBLIC_API_URL=https://<api>` and the three
   legal URLs. Build: `eas build -p android --profile production`.

## 2. Routine deploy
- `autoDeploy` is off. In the dashboard, open **landhere-api → Manual Deploy → the commit**.
- Migrations run automatically at boot. If a migration fails, the new instance never
  becomes healthy and Render keeps serving the previous version.
- Before deploying a migration that **drops or rewrites** data, take a manual backup (section 4).

## 3. Rollback
- **Code:** in the dashboard, open **landhere-api → Deploys → a previous deploy → Rollback**.
- **Schema:** the app at the previous commit must tolerate the newer schema. Additive
  migrations are safe. For a destructive migration, restore from backup (section 4) rather
  than running `alembic downgrade` against production.
- **Content:** journey and university data are versioned in git. Rolling back the code and
  redeploying re-syncs them through the boot-time seed.

## 4. Backups and restore
- On paid Render Postgres plans: daily backups plus point-in-time recovery (PITR). The
  pricing page shows a 3-day PITR window on the Hobby workspace, with "limitations apply";
  **verify** in the dashboard after creation.
- Manual logical backup, before risky changes: copy the **External** connection string
  from the dashboard (secret), then run
  `pg_dump --format=custom --file=landhere_$(date +%F).dump "<external-url>"`.
  Store the dump encrypted and outside the repo.
- Restore drill (do once before launch): create a **free** temporary database and run
  `pg_restore --no-owner --dbname "<temp-url>" landhere_<date>.dump`. Point a local server
  at it, run `scripts/smoke_api.py`, then delete the temporary database.
- PITR restore: dashboard → `landhere-db` → Recovery → choose a time. This creates a new
  database. Repoint `DATABASE_URL`, redeploy, and verify.

## 5. Monitoring
- Render shows metrics (CPU, memory, request latency) and logs.
- The app logs one JSON access line per request: request id, method, route, status and
  duration. It logs no IPs, query strings or bodies. Search by `request_id` to trace a
  user report.
- Alert thresholds that justify scaling (`docs/CAPACITY.md`): CPU above 70% sustained,
  p95 above 500 ms, or 503s from the concurrency limiter.
- External uptime check (optional, free tiers exist): poll `/health/ready`.

## 6. Resend (password-reset email)
1. In Resend, go to **Domains → Add domain** and use a domain you control, e.g. `landhere.app`.
2. Add the DNS records Resend shows (SPF/DKIM TXT/MX) at your registrar, then click **Verify**.
3. Go to **API Keys → Create**, with "Sending access" for that domain only. Paste the key
   into the Render dashboard as `RESEND_API_KEY`, and only there.
4. Set `EMAIL_FROM` to `LandHere <no-reply@yourdomain>`. It must use the verified domain.
5. Verify with the reset email described in section 1, step 5. The free plan allows
   3,000 emails per month and 100 per day.

## 7. Refreshing university data
Locally, with API keys in `.env`:
1. Run the ingest: `python -m app.core.ingest_scorecard`, then `ingest_openalex`, then `compute_scores`.
2. Export the dataset: `python -m app.core.universities_dataset export`.
3. Review the diff of `data/universities.json`, commit, and deploy. Boot loads it idempotently.

## 8. Content re-verification
Every 90 days, and immediately on rule changes:
1. Re-run the link checks and re-read each source.
2. Update `app/core/content_in_us.py` and `seed.py`, plus the `VERIFY_*.md` records.
3. Deploy. The boot seed syncs existing rows in place, so user progress is preserved.
