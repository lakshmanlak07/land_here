# LandHere — Project Status

_Honest snapshot as of **2026-08-01**, describing **v0.1.0-rc.3**._
_Written by reading the codebase, running the test suites, and executing the
migrations — not from memory. Supersedes the 2026-06-16 snapshot, which predates
the rankings fixes, the onboarding redesign, both security hardening rounds, and
the decision to ship free._

LandHere is an information-first mobile companion for international students: it
walks a student from accepting an offer, through the visa process and departure,
to settling in after arrival — in plain English, always linking the official
source. It gives **no** legal or immigration advice; every content row carries an
`official_source_url` and an `is_verified` flag so the team can track what a
human has actually checked.

Stack: **FastAPI + PostgreSQL + SQLAlchemy/Alembic** backend; **Expo SDK 54 /
React Native 0.81 / TypeScript** mobile app (Expo Router v6, Zustand for auth,
TanStack Query for server state, Axios).

> **This is a free app with one optional in-app purchase.** LandHere Pro,
> product id `com.landhere.app.pro`, US $1.99, one-time non-consumable.
> **No subscription.** Free users keep journey phases 1–2, the top 25 ranked
> universities, and the whole of scholarships, work rules and the methodology;
> Pro adds the later journey phases, the full rankings, and university detail
> pages. The gate is enforced server-side.
>
> _This supersedes the free-only position described in rc.2/rc.3 below._

> **Where to look next:** `LAUNCH/APP_STORE_SUBMISSION_CHECKLIST.md` is the
> ordered task list. `LAUNCH/LAUNCH_RUNBOOK.md` has the commands, deployment,
> and rollback procedures. `LAUNCH/RC3_VERIFICATION.md` is the evidence.
> `README.md`, `ARCHITECTURE.md`, and `RUNNING.md` date from ~Jun 12 and are
> substantially out of date.

---

## 1. Release state

**Tag `v0.1.0-rc.3` on branch `release/rc3-prep`** (cut from `v0.1.0-rc.2` on
`integrate/hardening-round2`).

- Not merged to `main`, not pushed
- Not deployed anywhere
- **Never run on a physical device or through TestFlight**

The repo *does* have a remote (`origin` → `github.com/lakshmanlak07/land_here`),
contrary to older notes in this file claiming it was not a git repo at all.

---

## 2. What's built and verified

Full evidence in `LAUNCH/RC3_VERIFICATION.md`.

### Backend
- App factory with CORS, GZip, generic 500 handler, and routers for `auth`,
  `account`, `countries`, `info`, `guides`, `universities`, `images`.
  Liveness/readiness split at `/health/live` and `/health/ready`.
- **Auth**: JWT access (60 min) + refresh (30 day) with server-side `jti`
  records, replay-safe rotation, family revocation on replay, per-email login
  throttle, timing equalisation, email normalisation.
- **Account deletion**: auth-gated, password-confirmed, rate-limited, cascades
  refresh tokens, and `/auth/refresh` re-checks the user exists so a deleted
  account cannot be resurrected.
- **Data model** (SQLAlchemy 2, UUID PKs): `Country`, `User`, `InfoStep`,
  `CountryGuide`, `University`, `RefreshToken`. 9 Alembic revisions, linear chain.
- **Production fails closed**: boot raises on placeholder `SECRET_KEY`, wildcard
  or empty `CORS_ALLOW_ORIGINS`, placeholder/localhost `DATABASE_URL`, or
  inconsistent proxy-trust settings. `/docs` disabled in production.
- **Rate limiting**: Redis sliding-window when `REDIS_URL` is set, per-process
  in-memory otherwise — and `start.sh` forces a single worker in that case so
  published limits stay true.

### Content — three verified corridors
IN→US, IN→UK, IN→CA journey content seeded and human-verified against official
sources (see the `VERIFY_*.md` files). Scholarships link only to official
sources. Work rules carry dated "last reviewed" stamps.

### Rankings
Scorecard → OpenAlex → score pipeline; ~500 US schools; LandHere Score from five
percentile-ranked metrics (research impact 0.30, research output 0.20, earnings
0.20, affordability 0.15, graduation 0.15), affordability scored on
out-of-state/international tuition. Bounded query params. List, detail, and
methodology screens. The rc.1-era `rank`/`international_tuition` and
`page/page_size` vs `limit/offset` mismatches are resolved.

### Mobile
9-screen onboarding with persistence and merged signup; Home / Journey / Explore
/ Rankings / Profile tabs; money, scholarships, work-hours, necessities,
methodology screens; dark mode following device appearance; central motion config
with reduced-motion support; accessibility labels; lazy-loaded, right-sized,
persisted images.

Build-time safety: `lib/urlPolicy.ts` + `lib/config.ts` validate the four public
URLs, and `lib/checkBuildEnv.ts` runs as `eas-build-pre-install` so a
misconfigured EAS build **fails on the build machine** rather than shipping.

### Verification actually run for rc.3

| Check | Result |
|---|---|
| `pytest tests -q` | **67 passed** |
| `pytest tests/test_security.py -q` | **37 passed** |
| `alembic upgrade head` on empty PostgreSQL 16.2 | **exit 0**, 9 revisions |
| `downgrade base` → `upgrade head` → seed | **exit 0** (broken before rc.3) |
| `npx tsc --noEmit` | clean |
| `npm run lint` | **0 errors**, 63 warnings (ESLint never ran before rc.3) |
| `npm run check` | **23/23** |
| iOS + Android production exports | both succeed |
| Bundle scans, both platforms | **CLEAN**, mutation-tested |

---

## 3. What changed in rc.3

1. **`react-native-iap` fully removed** — from `package.json` **and** from the
   `app.json` plugins array. Until now the Expo config plugin was still
   registered, which injects StoreKit (iOS) and `com.android.vending.BILLING`
   (Android) into the native projects. rc.2's bundle scan could not see this,
   because nothing imported the SDK in JavaScript. A regression check now fails
   if either returns.
2. **ESLint made runnable and green.** `react-dom@19.2.8` arrives transitively
   via `expo-router` and peers on `react@^19.2.8` against the pinned
   `react@19.1.0`. Resolved with `"overrides": {"react-dom": "19.1.0"}` — not
   `--force`, not `--legacy-peer-deps`. `future/` is excluded from lint and
   TypeScript because it references the removed IAP dependency.
3. **Migration rollback fixed.** `ix_info_steps_origin_code` is created by the
   initial migration but was dropped by two separate downgrades, so
   `alembic downgrade base` died partway and left the database partially torn
   down — dangerous, given the container runs `upgrade head` at boot.
4. **Regression test for orphaned refresh tokens after account deletion.** The
   `refresh_tokens` table postdates the deletion endpoint and is cleaned only by
   an `ON DELETE CASCADE`; the privacy policy promises complete deletion.
5. **`scripts/scan-bundle.sh`** — a bundle scan that tests the real risk instead
   of substring-matching the validator's own rule table.
6. **Docs reconciled** — this file, the runbook, a consolidated submission
   checklist, App Store metadata with the $1.99 copy removed, and a verification
   record.

---

## 4. What is NOT done

- **Nothing is deployed.** The whole stack runs on one laptop.
- **Nothing has run on real hardware.** No `.ipa` has ever been built.
- **No hosted privacy policy, terms, or support page.**
- **No legal review.** Minimum age, parental consent, governing law, and
  liability wording are all open — and the audience plausibly includes under-18s.
- **Apple Developer enrolment / App Store Connect record** — status unknown to
  this document; `ascAppId` and `appleTeamId` are still placeholders.
- **`UNSPLASH_ACCESS_KEY` is not set anywhere**, so `GET /images/city` returns
  503 and city images do not load. The old client-side key must also be rotated.
- **Android** — no build, no Play Console.
- **Unverified content stays excluded**: AU / IE / NL / NZ / FR / SG work rules,
  and the city-guide drafts.

---

## 5. Open risks

- **Never tested on real hardware.** Export success is not device success. Expect
  to find real issues in the first TestFlight pass — plan for it rather than
  treating submission as the finish line.
- **Legal position unsettled**, and it gates submission.
- **Superseded listing and legal drafts have been moved to `LAUNCH/archive/`.**
  Their free/paid split is wrong — they sell scholarships and work rules, which
  are free. Use `LAUNCH/APP_STORE_METADATA.md` and nothing else.
- **The legal pack is unreviewed.** `LAUNCH/PRIVACY_POLICY.md` and
  `LAUNCH/TERMS_OF_SERVICE.md` are drafts marked for legal review. No compliance
  claim is made. `LAUNCH/ATTORNEY_REVIEW_PACKET.md` is what goes to counsel.
- **Google Play purchases are implemented and tested against a simulated Google
  API.** No Play account exists, so no real token has ever been verified, no
  refund observed, and no RTDN received. See
  `LAUNCH/PLAY_STORE_SUBMISSION_CHECKLIST.md`.
- **The purchase flow has never touched real StoreKit.** No device build exists,
  and no real App Store notification has ever been received — the notification
  endpoint is tested only against a synthetic certificate chain.
- **Nothing is deployed.** `LAUNCH/DEPLOYMENT_RUNBOOK.md` is a procedure, not a
  record: no infrastructure exists and no account has been created.
- **25 build-toolchain advisories are accepted, not outstanding work.** They
  all trace to metro's dependencies; `image-size` has no non-vulnerable
  release, and `metro@latest` still depends on it, so no upgrade clears them.
  Reasoning and residual risk in `LAUNCH/LAUNCH_RUNBOOK.md` §6b.
- **`vendor/apple-root-ca/` is empty.** Apple's public root certificate must be
  downloaded into it, or purchase verification returns 503 and nobody can buy.
- **Backup and rollback are documented but unrehearsed** — there is no
  infrastructure to rehearse them on yet. Do it before you have users.
- **Content decay.** Government sources change without notice; the 90-day
  re-verification cadence is a real operational commitment.
- **Single maintainer, and the rc.3 tag exists only locally.**
- **Rankings data freshness** depends on external APIs; only `has_full_score`
  schools appear, and a prior OpenAlex ingest hit rate-limit retries.

---

## 6. Cold-start commands

Full detail in `RUNNING.md` and `LAUNCH/LAUNCH_RUNBOOK.md`.

1. `ipconfig` → note the Wi-Fi IPv4; update `EXPO_PUBLIC_API_URL` in
   `mobile/.env` if it changed.
2. Backend, from repo root with the venv active:
   `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
   First run only: `python -m app.core.seed`.
   Rankings data as needed: `python -m app.core.ingest_scorecard` →
   `ingest_openalex` → `compute_scores`.
3. Mobile, from `mobile/`: `npx expo start --clear`, then force-close Expo Go and
   rescan the QR.

A LAN address in `EXPO_PUBLIC_API_URL` is correct for development and is
**rejected by the production build gate** — that is the gate working.

### Secrets
Backend secrets in the root `.env`; mobile public config in `mobile/.env`. Both
gitignored. Names only: `SECRET_KEY`, `DATABASE_URL`, `SCORECARD_API_KEY`,
`OPENALEX_API_KEY`, `UNSPLASH_ACCESS_KEY` (server-side only), `REDIS_URL`.
`EXPO_PUBLIC_UNSPLASH_KEY` has been removed from `mobile/.env` and must be
rotated.

---

_This document is a status snapshot. The only files changed to produce it are
listed in `LAUNCH/RC3_VERIFICATION.md`._
