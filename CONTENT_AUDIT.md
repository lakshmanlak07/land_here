# LandHere — Content Audit (read-only findings)

**Date:** 2026-06-19
**Scope:** User-facing information only — visa/corridor steps, country info, work-hours,
scholarships, university rankings data/methodology, necessities, fun facts, currency.
**Nature:** READ-ONLY audit. No content was edited, reworded, or re-verified, and **no
`is_verified` flag was changed**. Every item below is a flag with a suggested action for
*you* to take — nothing here has been applied.

## Method & limitations (read this first)
- I reviewed the wired-in data sources (backend `app/core/seed.py`, and
  `mobile/constants/*.ts`) and the screens that render them. The markdown files in
  `mobile/content/**` are drafts and are **not** loaded by the running app (see §9).
- **Links were NOT live-tested.** Government/official sites routinely block automated
  requests, which would produce false "dead link" results. Every URL below is classified
  by *domain* (official vs not). **Action for you:** do a real-browser link-check pass.
- Where I say a claim is "contestable," I am flagging it for *you* to verify — I am not
  asserting it is wrong.

---

## 1. Visa / Corridor Journey Steps
**Where:** `app/core/seed.py` (`IN_US_STEPS`), served via `/info/journey`, shown on the
Journey tab and Home hero.

- **[Verification] All 18 IN→US steps are `is_verified = false`.** Nothing in the corridor
  has been human-verified. This is the intended default (`app/models/info_step.py`,
  `ARCHITECTURE.md`), but it means the entire live visa journey is unverified.
  *Action:* Have a human verify each step against its linked source, then decide whether to
  flip flags (do that as a separate, deliberate task — not part of this audit).
- **[Only one corridor exists]** Only IN→US has steps; every other corridor is empty, so
  non-IN→US users see "No steps yet for this corridor." *Action:* Confirm this is intended
  for now; the UK/CA/AU/DE/IE step drafts exist only as unwired markdown (see §9).
- **[Link reliability — `ustraveldocs.com`]** Steps for the MRV fee and interview booking
  link to `https://www.ustraveldocs.com/in/en/step-2` and `/step-3`. This is the official
  US visa-appointment contractor, but `PROJECT_STATUS.md` already flags `ustraveldocs.com`
  as a "known fragile link," and the deep `/step-N` paths are the most likely to rot.
  *Action:* Verify these two deep links resolve; consider linking the site root instead.
- **[Official but `.com`]** SEVIS fee step links `https://www.fmjfee.com/i901fee/index.html`.
  This *is* the official I-901 payment site, but the `.com` domain can read as unofficial to
  a cautious student. *Action:* Optionally add a note that FMJfee is the official processor.
- **[Authoritative claims w/ sources]** Steps state specific procedural facts (e.g. the
  30-day-before-start entry window, SEVIS check-in deadlines). Each has an official source
  link, which is good — but the specifics still need human verification (they're unverified).

All other IN→US step links are official (`studyinthestates.dhs.gov`, `travel.state.gov`,
`ceac.state.gov`, `consumerfinance.gov`, `fcc.gov`). No non-official aggregator links found.

---

## 2. Country Info (visa name, currency, official immigration link)
**Where:** `app/core/seed.py` `COUNTRIES[]` → Country detail screen
(`mobile/app/country/[code].tsx`).

- **[Links — all official]** Every `official_immigration_url` points to an official
  government/official portal (`travel.state.gov`, `gov.uk`, `canada.ca`,
  `immi.homeaffairs.gov.au`, `auswaertiges-amt.de`, `campusfrance.org`, `mfa.gov.cn`,
  `mofa.go.jp`, `ind.nl`, `irishimmigration.ie`, `ica.gov.sg`, `immigration.govt.nz`,
  `hikorea.go.kr`, `u.ae`, `esteri.it`, etc.). No aggregators. *Action:* Spot-check the
  deep links most likely to rot — Germany's is a FAQ deep link
  (`auswaertiges-amt.de/.../-/606852`).
- **[Code inconsistency: "UK" vs "GB"]** The app uses `UK` for the United Kingdom
  (`mobile/constants/countries.ts` notes this deviates from ISO `GB`). Other data sources mix
  the two: `funFacts.ts` defines both `GB` and `UK`; `scholarshipSources.ts` uses `GB`;
  `currencies.ts` maps both. Today this does **not** drop content (fun facts has a `UK` key;
  the scholarships screen shows all groups regardless of code — see §4), but it's fragile.
  *Action:* Pick one canonical code and document it, so a future feature that filters by
  destination code doesn't silently miss UK.

---

## 3. Work Hours Per Country
**Where:** `mobile/constants/workRules.ts` → Country detail "Working as a student" card.

- **[Authoritative numeric limits — verify]** States specific limits as fact: US 20 hrs/wk,
  GB 20 hrs/wk, CA 24 hrs/wk, AU 48 hrs/fortnight, DE 140 days/yr (or 280 half-days), IE
  20 hrs/wk term / 40 hrs/wk breaks. Each has an official source link **and** the screen shows
  a "verify on the official source" disclaimer — good framing. But the file itself says these
  "change often," and **US, GB, and IE carry no recency `note`** (CA/AU/DE do). *Action:*
  Human-verify each number against its linked source; consider adding `note` caveats to US/GB/IE.
- **[Source link mismatch — AU]** The AU source is labelled "Subclass 500 work conditions"
  but the URL is the generic subclass-500 landing page
  (`immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500`), not a
  work-conditions-specific page. *Action:* Point to the specific work-conditions page or
  relabel.

---

## 4. Scholarships
**Where:** `mobile/constants/scholarshipSources.ts` → Scholarships screen
(`mobile/app/scholarships.tsx`).

- **[Links — all official-domain]** Every entry links a government / official-program /
  university domain (`*.state.gov`, `foreign.fulbrightonline.org`, `erasmus-plus.ec.europa.eu`,
  `studentaid.gov`, `knight-hennessy.stanford.edu`, `chevening.org`, `cscuk.fcdo.gov.uk`,
  `study-uk.britishcouncil.org`, `gatescambridge.org`, `rhodeshouse.ox.ac.uk`, `daad.de`,
  `campusfrance.org`, `educanada.ca`, `vanier.gc.ca`, `dfat.gov.au`, `studyaustralia.gov.au`,
  `studyinnl.org`, `hea.ie`, `studyinjapan.go.jp`, `sbfi.admin.ch`, `schwarzmanscholars.org`,
  `nzscholarships.govt.nz`, `studyinkorea.go.kr`). No aggregators/blogs found. *Action:*
  Run a real-browser dead-link pass (not done here — see Method).
- **[Entry shown to all users]** The screen renders every group regardless of the user's
  destination, so there is no "missing scholarships for UK" bug despite the `GB`/`UK` split.
  *Action:* none required; noting it because it interacts with §2.
- **[Content style — by design, confirm]** Entries are name + one-line description + URL, with
  no amounts/deadlines/eligibility. This matches the file's stated rules. *Action:* confirm
  the descriptions you didn't author (pre-existing) contain no eligibility creep
  (e.g. "for students from Commonwealth countries").

---

## 5. University Rankings — Data & Methodology
**Where:** `app/core/ranking_config.py`, `mobile/app/methodology.tsx`,
`mobile/app/(tabs)/rankings.tsx`, `mobile/app/university/[id].tsx`.

- **[Consistency — OK]** Methodology screen's 50/50 Research/Outcomes split matches
  `ranking_config.py` (Research = 0.30+0.20; Outcomes = 0.20+0.15+0.15). No inconsistency. The
  screen does not show the individual factor weights (30/20/20/15/15) — informational only.
- **[Scope not stated]** Rankings cover **US universities only** (College Scorecard data), but
  neither the Rankings screen nor the Methodology screen says so. A user could read it as
  global. *Action:* Consider a one-line "US universities" scope note.
- **[Ranking lookups are Google-search redirects, not official pages]** On the university
  detail screen, the "Look this school up on QS / Times Higher Ed / US News" buttons open
  `https://www.google.com/search?q=<name>+site:<domain>` — i.e. a Google search, not the
  ranking site's own page for that school. The code comment explains why (the sites' native
  search is unreliable). *Action:* Decide if a search-redirect is acceptable UX; it can land
  on the wrong result or break if Google changes its URL format. Not an "official source" link.
- **[Earnings framing — item 7]** University detail shows "Median earnings, 10yr" with hint
  "Graduates, decade out"; methodology says "Median earnings of graduates." College Scorecard's
  metric is *median earnings ~10 years after entry* for the federally-aided student cohort
  (which can include non-completers), **not strictly graduates**. It **is** historical cohort
  data (correctly *not* framed as a prediction of the user's future earnings — good), but the
  word "graduates" may misstate what the number is. *Action:* Verify the label matches the
  Scorecard definition; consider "students, ~10 yrs after entry."
- **[Per-university data not auditable here]** `landhere_score`, tuition, earnings, completion,
  works/citations, and `official_url` come from ingested data (`ingest_scorecard.py`,
  `ingest_openalex.py`) in the DB, not from static files. *Action:* Spot-check a few schools'
  `official_url` (used by "Visit official site") and headline numbers against the live sources.

---

## 6. Necessities
**Where:** `mobile/constants/necessities.ts` → Necessities screen
(`mobile/app/necessities.tsx`).

- **[US-only content + silent fallback]** Only US necessities exist. The country picker
  correctly gates GB/CA/AU/DE/IE to a non-pressable "Coming soon," **but** `getNecessities()`
  falls back to the US sections for *any* country code. If the detail screen is ever reached
  with a non-US `code` (deep link, or a future nav path), it will show US-specific steps
  (SEVIS, I-20/DS-2019, SSN) — wrong for other countries — while the header reads "the United
  States." *Action:* Confirm no navigation path passes a non-US code today, and consider making
  the fallback explicit (e.g. show "not available yet") instead of silently serving US content.
- **[Authoritative claims w/ sources]** "Full-time = typically 12 credits undergrad / 9 grad,"
  "wait at least 10 days after entering the US" (SSN). Hedged with "typically" and linked to
  official sources (DHS, SSA, CFPB, HealthCare.gov, NWS). *Action:* Human-verify the credit
  figures and SSN timing against the linked sources.
- **[Lifestyle items unsourced — acceptable]** Phone/transit/furniture/groceries name specific
  brands/systems (CharlieCard, OMNY, Aldi, etc.) with no source. These are practical tips, not
  authoritative rules — acceptable, but confirm brand lists don't read as endorsements.

---

## 7. Fun Facts
**Where:** `mobile/constants/funFacts.ts` (live, via `getFunFacts` in `SwipeableFacts` /
`RotatingFacts`); `app/core/seed_facts.py` (not wired — "prepared for future seeding").

- **[Inconsistency — item 4]** `seed_facts.py`'s header says *"These facts match the mobile
  constants/funFacts.ts content,"* but they do **not** match: `funFacts.ts` has ~20 facts per
  country, `seed_facts.py` has 7–8; `seed_facts.py` claims "all facts under 120 characters"
  while many `funFacts.ts` entries exceed that; and they handle UK differently (see below).
  *Action:* Treat the two as out of sync; reconcile (or correct the stale "match" claim) before
  seeding facts into the DB.
- **[Redundant GB/UK keys]** `funFacts.ts` defines both `GB` and `UK` with identical 20-fact
  arrays; `seed_facts.py` uses only `UK`. Harmless today but duplicated. *Action:* De-dupe to
  one canonical key (see §2).
- **[Unsourced authoritative-sounding superlatives — verify or soften]** Facts carry no source
  (acceptable for trivia) but many are stated as hard fact and are contestable or likely
  outdated. Representative examples to check (not exhaustive):
  - US: "over 4,000 universities — more than any other country in the world."
  - US: "Library of Congress ... world's largest library ... over 170 million items" **and**
    GB: "The British Library holds over 170 million items" — the *same* 170M figure for two
    different libraries looks suspect; verify both.
  - US: "New York City's subway has 472 stations — the most of any metro system in the world."
  - AU: "8 of the world's top 100 universities are in Australia" (ranking-dependent, changes yearly).
  - DE: "Most German public universities charge no tuition fees — even for international
    students" (note: Baden-Württemberg charges non-EU/international tuition — so "even for
    international students" may be inaccurate).
  - DE: "second-largest exporter of goods, behind only China" (rankings shift; may be outdated).
  - IN: "world's largest student population ... over 38 million."
  *Action:* These are low-stakes trivia, but since they're stated as fact, have a human verify
  the numeric/superlative ones or soften them ("one of the largest…").

---

## 8. Currency Converter
**Where:** `mobile/constants/currencies.ts` + `mobile/components/CurrencyConverter.tsx`
(Frankfurter / ECB reference rates).

- **[AED unsupported — handled]** `COUNTRY_CURRENCY` maps `AE → AED`, but Frankfurter doesn't
  support AED, so `resolveCurrency` falls back (to USD). This is acknowledged in code and not a
  data error. *Action:* none required; just be aware UAE users won't see AED conversions.
- **[Rate type]** Rates are ECB reference rates, not live transfer/market rates. *Action:*
  Confirm the converter UI frames the result as indicative (so users don't treat it as a
  bank/transfer quote). I did not audit the converter's on-screen copy in detail.

---

## 9. Draft / Unverified content present in the repo (item 5)
**Where:** `mobile/content/**` and `mobile/content/drafts/**`.

32 files carry `DRAFT — UNVERIFIED` / `NEEDS VERIFICATION` / `UNVERIFIED` markers. **None of
these markdown files are loaded by the running app** — they are reference drafts. Listing them
so you know what's unverified and unwired:

- **Corridor step drafts (not wired; only IN→US is live):**
  `mobile/content/drafts/in_uk_steps_draft.md`, `in_ca_steps_draft.md`, `in_au_steps_draft.md`,
  `in_de_steps_draft.md`, `in_ie_steps_draft.md`, plus older
  `drafts/in_uk_journey_draft.md`, `drafts/in_ca_journey_draft.md`, and
  `drafts/DRAFT_REVIEW.md` (its own checklist of `NEEDS VERIFICATION` items).
- **Necessities / mandatories drafts (only US is hand-ported into `necessities.ts`):**
  `mandatories_{us,uk,canada,australia,germany,ireland}.md`,
  `necessities_{us,uk,canada,australia,germany,ireland}.md`, `necessities_structure.md`.
- **City guide drafts (NOT served — `/guides` is unused by the app and the guides table is
  seeded empty per `seed.py`):** `berlin_guide_draft.md`, `boston_guide_draft.md`,
  `london_guide_draft.md`, `manchester_guide_draft.md`, `melbourne_guide_draft.md`,
  `sydney_guide_draft.md`, `toronto_guide_draft.md`, `vancouver_guide_draft.md`.
- **Repo docs with the markers:** `app_copy.md`, `verification_checklist.md`,
  `PROJECT_STATUS.md`.

*Action:* When you wire any of these in, run them through `verification_checklist.md` first;
nothing here should reach users while still marked DRAFT/NEEDS VERIFICATION.

---

## 10. `is_verified = true` audit (item 3)
**Finding: there are NO records with `is_verified = true` anywhere.** All IN→US steps are
seeded `is_verified=False` (`app/core/seed.py`), and the `country_guide` table (also has an
`is_verified` column, default false) is seeded empty. So there is nothing for you to
double-check as "claimed verified."
*Implication to confirm:* (a) Nothing in the app has been human-verified yet. (b) If the UI has
any "Verified" badge tied to this flag, it currently never shows — confirm that's expected.

---

## Quick triage (highest-value items to look at first)
1. **§6** Necessities silent US fallback for non-US codes (potential wrong-country content).
2. **§5** Earnings labelled "graduates" vs Scorecard's "10 yrs after entry" cohort (item 7).
3. **§1** `ustraveldocs.com` deep links (already flagged fragile) + all IN→US steps unverified.
4. **§7** `seed_facts.py` "matches funFacts.ts" claim is false; several trivia superlatives
   contestable (esp. DE tuition "even for international students").
5. **§3** US/GB/IE work-hour numbers have no recency caveat; verify all limits.
6. **§2** Decide a single canonical UK code (`UK` vs `GB`) before any destination-filtered feature.

*End of audit. No content, flags, or app code were modified in producing this report.*
