# LandHere — Project Status

_Honest snapshot as of 2026-06-16. Written by reading the codebase, not from memory._

LandHere is an information-first mobile companion for international students: it walks a
student from accepting an offer, through the visa process and departure, to settling in
after arrival — always in plain English, always linking the official source. It
deliberately gives **no** legal or immigration advice; every content row carries an
`official_source_url` and an `is_verified` flag so the team can track what a human has
actually checked.

Stack: **FastAPI + PostgreSQL + SQLAlchemy/Alembic** backend; **Expo SDK 54 / React
Native 0.81 / TypeScript** mobile app (Expo Router v6, Zustand for auth, TanStack Query
for server state, Axios HTTP).

> See also `README.md`, `ARCHITECTURE.md`, and `RUNNING.md`. Those were written ~Jun 12
> and predate the rankings feature, the necessities screen, and the splash screen — this
> file is the current superset.

---

## 1. What's BUILT and working

### Backend (FastAPI / Postgres / auth)
- **App factory** `app/main.py` with CORS, registering five routers: `auth`,
  `countries`, `info`, `guides`, `universities`. Health check at `GET /`.
- **Auth**: JWT (python-jose) + bcrypt (passlib). `POST /auth/register`,
  `POST /auth/login`, `GET /auth/me`. Config via pydantic-settings reading `.env`;
  token expiry 10080 min (7 days).
- **Data model** (SQLAlchemy 2, UUID PKs): `Country`, `User`, `InfoStep`,
  `CountryGuide`, `University`. Alembic migrations in `alembic/`.
- **Countries**: list / destinations / origins / by-code endpoints. 22 countries
  seeded (16 destinations, 6 origin-only) via `app/core/seed.py`.
- **Info-booth / journey**: `InfoStep` model scoped by corridor (`origin_code` +
  `destination_code`) across 5 phases. `GET /info/journey`, `/info/corridors`,
  `/info/phases`. Every step has source name, source URL, and `is_verified`.
- **Country guides**: `GET /guides/{country_code}` with optional `?section=` filter.

### Info-booth content
- **One corridor fully seeded: India → United States (IN→US)** — 15 InfoSteps across
  4 phases (after_acceptance, visa_process, before_departure, after_arrival).
- Draft journey content for **IN→UK** and **IN→Canada** exists as markdown in
  `mobile/content/drafts/` (not yet in the DB).

### Rankings (500 US schools, scored)
- **Ingestion pipeline** (all runnable as `python -m app.core.<module>`):
  - `ingest_scorecard.py` — pulls ~500 largest US 4-year universities from the
    **College Scorecard API** (net price, out-of-state/intl tuition, 10-yr median
    earnings, completion rate, median debt).
  - `ingest_openalex.py` — matches each school to **OpenAlex** for research metrics
    (citations, works count, mean citedness), recording `match_confidence`
    (high/low/none). Uses `institution_overrides.py` (76 manual overrides) and
    normalization; only 'high' matches keep research metrics.
  - `compute_scores.py` — percentile-ranks 5 metrics and combines them into the
    **LandHere Score** (0–100) using `ranking_config.SCORING_WEIGHTS`: research
    impact 0.30, research output 0.20, earnings 0.20, affordability 0.15, graduation
    0.15. Affordability is scored on **out-of-state/intl tuition** (what our users
    actually pay), not in-state net price. Sets `has_full_score`.
- **Endpoints**: `GET /universities` (filter by `search`, `max_tuition`, `state`;
  `limit`/`offset`; ordered by score desc; only `has_full_score == True`) and
  `GET /universities/{id}` (full breakdown).
- **Screens**: `app/(tabs)/rankings.tsx` (search + budget chips + infinite list) and
  `app/university/[id].tsx` (detail). **Methodology** screen at `app/methodology.tsx`,
  linked from the rankings header and a reusable `Disclaimer` component.

### Mobile app (screens & redesign)
- **Auth flows**: register (origin + destination selection), login, JWT persisted in
  `expo-secure-store`; `lib/store.ts` (Zustand) hydrates on launch via `GET /auth/me`;
  `lib/api.ts` Axios interceptor injects the bearer token.
- **Tab bar** (`app/(tabs)/_layout.tsx`): Home, Journey, Explore, **Rankings**,
  Profile — themed, redirects to login when unauthenticated.
- **Home** (`index.tsx`): journey progress, fun-fact card, destination browser.
- **Journey** (`journey.tsx`): phased step list with read/unread tracking.
- **Explore** (`explore.tsx`): destination country list.
- **Profile** (`profile.tsx`): user details, country preferences, logout.
- **Country detail** (`app/country/[code].tsx`): country info + city image.
- Centralized theme in `context/ThemeContext.tsx` (light palette, spacing, radius,
  typography, phase colors) consumed via `useTheme()`.

### Necessities
- **Screen** `app/necessities.tsx` — two tiers, "Mandatories" (ordered, primary
  accent) and "Necessities" (unordered), each item with plain-English explanation,
  optional caveat note, and an official-source link button. Country-scoped.
- **Content** `constants/necessities.ts` — structured US data condensed from the
  drafted markdown (`content/mandatories_us.md`, `necessities_us.md`).
- Draft markdown for **UK** and **Canada** mandatories/necessities now also exists in
  `mobile/content/` (not yet wired into `constants/necessities.ts`).

### Splash screen, fun facts, rotating images
- **Splash**: `components/SplashScreen.tsx` — standalone animated intro (wordmark fade
  + scale, tagline, pulsing loading dots, `useNativeDriver`). **Built but not yet
  wired into app launch** — see `INTEGRATION_NOTE_splash.md`.
- **Fun facts**: `seed_facts.py` backend data + `constants/funFacts.ts` and
  `components/RotatingFacts.tsx` on the home screen.
- **Rotating images**: `components/RotatingImage.tsx` + `CityImage.tsx` (`lib/images.ts`),
  backed by the Unsplash key in `mobile/.env`.
- **Tests**: `tests/` (pytest, SQLite in-memory — no real DB needed).

---

## 2. What's BUILT BUT UNVERIFIED

### Content marked DRAFT / `is_verified = false` (needs the verification pass)
Every InfoStep ships with `is_verified = false` by default and must be human-checked
before it is treated as authoritative. Outstanding:
- **IN→US visa steps (15 links)** — enumerated with checkboxes in
  `mobile/content/CONTENT_TODO.md` (sourced from `app/core/seed.py` `IN_US_STEPS`).
- **US necessities/mandatories** content links.
- **All UK and Canada drafts** — `mobile/content/drafts/in_uk_journey_draft.md`,
  `in_ca_journey_draft.md`, and `mandatories_uk.md` / `necessities_uk.md` /
  `mandatories_canada.md` / `necessities_canada.md`, all headed `DRAFT — UNVERIFIED`.
- **City guides** — `content/*_guide_draft.md` (Boston, London, Toronto, Sydney,
  Berlin, Manchester, Vancouver, Melbourne) — drafted, not in the DB, unverified.
- A consolidated **`mobile/content/verification_checklist.md`** now lists every
  official link across the IN→US steps + necessities for systematic checking before
  flipping any `is_verified` to true. **Known fragile links**: `ustraveldocs.com`
  step paths, `studyinthestates.dhs.gov` deep links, the UK BRP→eVisa transition, and
  Canada's province-by-province health pages.

### Features built but not yet checked on a physical device
- **Rankings screens** — list + detail + methodology are coded but have **not been run
  against the live API on device**. Two concrete things to verify (found while reading
  the code):
  1. The list screen renders `item.rank` and `item.international_tuition`, but the API
     `UniversityListItem` schema returns neither — it returns `tuition_out_of_state`
     and no rank field. Rows may show a blank rank and missing tuition until this is
     reconciled.
  2. The screen sends `page` / `page_size` query params, but `GET /universities`
     accepts `limit` / `offset` (default limit 50). Pagination/infinite-scroll likely
     won't page correctly until the params line up.
- **Necessities screen** — coded and theme-wired, but **not yet verified on device**
  (rendering, source links opening, country scoping for non-US users).
- **Splash screen** — built and standalone but **not wired in** and therefore never
  seen in the running app yet.

---

## 3. What's NEXT, in order

1. **Verify Rankings on the phone** — run the ingestion (Scorecard → OpenAlex →
   compute_scores), then exercise the live list/detail/methodology screens on device;
   fix the `rank` / `international_tuition` field mismatch and the `page/page_size`
   vs `limit/offset` mismatch.
2. **Verify Necessities on the phone** — rendering, links, country scoping.
3. **Dark mode** — palette already exists in `ThemeContext` (`darkPalette`); wire the
   `isDark` toggle through and audit every screen.
4. **Polish pass** — splash wire-in, spacing/typography, empty/error states, motion.
5. **Cost predictor** — estimate total cost of attendance per school/corridor.
6. **Scholarships** — surface relevant funding.
7. **Visa verification** — complete the human verification pass and flip `is_verified`.
8. **Housing** — accommodation search/guidance (its own feature).
9. **Community chat** — student-to-student.
10. **H1B version** — post-graduation / work-visa companion (later).

---

## 4. KEY THINGS TO REMEMBER

### Cold-start commands (full detail in `RUNNING.md`)
1. `ipconfig` → note Wi-Fi IPv4; if changed, update `EXPO_PUBLIC_API_URL` in
   `mobile/.env`.
2. Backend (from `land_here/` root, venv active):
   - Activate: `.venv\Scripts\Activate.ps1` (PowerShell)
   - Run: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
   - First run only — seed: `python -m app.core.seed`
   - Rankings data (as needed): `python -m app.core.ingest_scorecard` →
     `python -m app.core.ingest_openalex` → `python -m app.core.compute_scores`
3. Mobile (from `mobile/`): `npx expo start --clear`, then force-close Expo Go and
   rescan the QR.

### Folder structure
- **Backend lives in `land_here/`** (the repo root): `app/` (FastAPI), `alembic/`,
  `tests/`, `requirements*.txt`, `alembic.ini`.
- **Frontend lives in `land_here/mobile/`**: `app/` (Expo Router screens),
  `components/`, `constants/`, `context/`, `lib/`, `content/` (draft markdown).

### The IP-in-`.env` note
The phone reaches the backend over the LAN, so `EXPO_PUBLIC_API_URL` in `mobile/.env`
**must be the laptop's current Wi-Fi IPv4** (e.g. `http://192.168.0.113:8000`) — not
`localhost`. The IP changes when you switch networks/reboot; update it and restart Expo
with `--clear`. Port 8000 must be allowed through Windows Firewall on private networks.

### Secrets / `.env`
- Backend secrets live in **`land_here/.env`**; mobile public config in
  **`mobile/.env`**. **These files must never be committed to git.**
- ⚠️ As of now `land_here/` is **not a git repo at all** (no `.git`, no `.gitignore`),
  so there is no ignore rule protecting the backend `.env` yet — add a `.gitignore`
  ignoring `.env`, `.venv/`, `__pycache__/`, and logs *before* the root is ever
  initialized/pushed. The `mobile/` folder is a git repo; confirm its `.gitignore`
  excludes `.env`.

### API keys in use (names only — values are in the `.env` files, never here)
- `SCORECARD_API_KEY` — College Scorecard / data.gov (backend `.env`).
- `OPENALEX_API_KEY` — OpenAlex polite/authenticated pool (backend `.env`).
- `SECRET_KEY` — JWT signing (backend `.env`; currently a dev placeholder — rotate to a
  strong secret before any real deployment).
- `DATABASE_URL` — Postgres connection incl. DB password (backend `.env`).
- `UNSPLASH_ACCESS_KEY` — Unsplash images (backend `.env`, server-side only).
  Was previously `EXPO_PUBLIC_UNSPLASH_KEY` in the mobile `.env`; moved because
  `EXPO_PUBLIC_*` vars are bundled into the client and are not secret-grade.
  The mobile app now calls `GET /images/city` instead of Unsplash directly.

---

## 5. OPEN RISKS

- **Not on GitHub yet (URGENT).** The backend root `land_here/` isn't even a git repo.
  No remote backup, no history, no `.gitignore` guarding `.env`. Initialize, add a
  proper `.gitignore` (so secrets/venv/caches never get staged), and push to a
  **private** remote. Rotate any key that has ever been shared in plaintext.
- **Security pass still pending.** Before any real users: rotate `SECRET_KEY` off the
  dev placeholder, lock down CORS (currently `allow_origins=["*"]`), add rate limiting
  on auth, review password/JWT handling, and confirm no secrets are logged.
- **Hosting eventually needed.** Everything runs locally today (laptop Postgres +
  uvicorn + LAN IP). Production needs managed Postgres, a hosted API (HTTPS, stable
  domain), env-var secret management, and a real build/distribution path for the Expo
  app (EAS).
- **Rankings data freshness/coverage.** Scores depend on external APIs (Scorecard,
  OpenAlex) and only `has_full_score` schools appear; the last OpenAlex ingest hit
  rate-limit retries (see `ingest_run.log`). Re-running and confirming match coverage
  is part of the rankings verification step.

---

_This document is a status snapshot only. No code, schema, database, or running process
was changed to produce it._
