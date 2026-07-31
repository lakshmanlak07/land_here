# LandHere — Launch Runbook
_Prepared July 2, 2026 · Target: submit ASAP_

## ⚠️ Honest timeline first

**"Live in the App Store by tomorrow night" is not achievable** unless ALL of the
following are already true today: Apple Developer enrollment approved, backend
deployed to a production host, and a lawyer has cleared the privacy policy/minors
position. Apple review alone takes 1–3 days (often longer for apps that serve
minors). What IS achievable by tomorrow night: **backend live in production +
build submitted to App Store review + TestFlight in your hands.** Realistic public
launch: **5–7 days** from enrollment.

## Tonight (blockers — in order)

1. **Apple Developer Program** — enroll NOW at developer.apple.com/programs/enroll
   ($99/yr, identity check takes 1–3 days). Nothing ships without it. *(You only)*
2. **Deploy backend** — Railway or Render (repo already has `railway.toml`,
   `render.yaml`, `Dockerfile`):
   - Create a managed PostgreSQL instance.
   - Set env vars: `DATABASE_URL`, a NEW long random `SECRET_KEY` (never the dev
     one), `CORS_ALLOW_ORIGINS` = your production origin(s) — not `*`.
   - Run `alembic upgrade head`, then `python -m app.core.seed`.
   - Verify `GET /` health check and `GET /countries/destinations` returns 3.
3. **Point the app at production** — set `EXPO_PUBLIC_API_URL` in `mobile/.env` /
   app config to the HTTPS URL. Delete any tunnel/LAN workarounds.
4. **Send legal pack to a lawyer** — `PRIVACY_POLICY.md` + `TERMS_OF_SERVICE.md`
   (this folder). They must set: minimum age, parental-consent position,
   governing law, liability wording, minors-purchase position. *(You only)*

## Tomorrow

5. **App Store Connect** — create the app record (bundle ID must match
   `mobile/app.json`).
6. **IAP product** — create Non-Consumable `com.landhere.app.pro` at **$1.99**
   (Tier 2). Attach it to the first app version for review. The product ID must
   match `mobile/lib/purchaseStore.ts` exactly.
7. **Host the privacy policy** at a public URL (required field). A simple
   GitHub Pages / Notion-public page works on day one.
8. **Assets** — 1024×1024 icon (no alpha/rounded corners), ≥3 screenshots per
   required size (6.9" and 6.5"). Show: onboarding plan reveal, journey, rankings,
   dark mode.
9. **Build & submit** — `eas build --platform ios --profile production`, then
   `eas submit`. Test the exact build via TestFlight on a real device first:
   register → onboard → journey (half free) → hit paywall → **sandbox purchase**
   → verify unlock persists after app restart → restore purchases on a second
   sandbox account.
10. **Fill the privacy nutrition label** exactly per `APP_STORE_LISTING.md`.

## Conversion levers already in the build

- Free taste: first half of journey + top-10 rankings visible before any ask.
- Ghost-preview paywalls on every locked surface, all routing to one paywall.
- $1.99 one-time (impulse tier), "no subscription" stated at every touchpoint.
- Trust markers: verified badges, official-source links, dated review of work
  rules, honest scope disclaimer on rankings — these earn the 5-star reviews
  that drive organic installs.

## Do NOT ship

- Android build (doesn't exist yet — separate milestone; India is Android-heavy,
  so open a Play Console account and start that build next week).
- Any corridor beyond IN→US/CA/UK (unverified content stays out; the app's
  destination picker is already restricted to live corridors).
- Claims of "verified" on anything a human hasn't checked against the official
  source (AU / IE / NL / NZ / FR / SG work rules remain marked unverified).

## Known open items (post-launch OK)

- Redis-backed rate limiter (in-memory is fine for a single-worker launch).
- Privacy-safe funnel counts (you're flying blind on onboarding drop-off).
- Waitlist capture for unsupported corridors + Android interest.
- Re-verification cadence: re-check work rules and visa steps every 90 days;
  update the "last reviewed" date in `mobile/constants/workRules.ts`.
