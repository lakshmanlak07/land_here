# Draft Review — Scholarships (Tier 1) + Necessities Drafts (Tier 2)

Generated 2026-06-20. Additive content work only.
**No app code, navigation, theme, or backend logic was modified. Nothing pushed.**

Files touched:
- **Tier 1 (LIVE):** `mobile/constants/scholarshipSources.ts` — appended sources only.
- **Tier 2 (DRAFTS, not wired in):** `mobile/content/drafts/necessities/*.md` — new files.
- The live necessities data (`mobile/constants/necessities.ts`) and screen
  (`mobile/app/necessities.tsx`) were **not** changed — the five countries still
  show "coming soon" exactly as before.

---

## TIER 1 — Scholarships added (live, link-only)

Each entry is **name + one-line description + official URL** only — no amounts,
deadlines, or eligibility detail. Appended to existing destination groups; one new
group (Sweden) added. No existing entries edited. 14 new sources.

> Note: the only duplicate URL in the file (`foreign.fulbrightonline.org`) is the
> **pre-existing** Fulbright cross-listing in GLOBAL + US — not introduced here.

### Start here (GLOBAL)
| Name | Official URL |
|------|--------------|
| Aga Khan Foundation — International Scholarship Programme | https://www.akdn.org/our-agencies/aga-khan-foundation/international-scholarship-programme |
| Joint Japan/World Bank Graduate Scholarship Program | https://www.worldbank.org/en/programs/scholarships |

### United States (US)
| Name | Official URL |
|------|--------------|
| Hubert H. Humphrey Fellowship Program | https://www.humphreyfellowship.org/ |
| AAUW International Fellowships | https://www.aauw.org/resources/programs/fellowships-grants/international-fellowships/ |
| P.E.O. International Peace Scholarship | https://www.peointernational.org/about-peo-international-peace-scholarship-ips |

### United Kingdom (GB)
| Name | Official URL |
|------|--------------|
| GREAT Scholarships | https://study-uk.britishcouncil.org/scholarships/great-scholarships |
| Marshall Scholarships | https://www.marshallscholarship.org/ |
| Clarendon Fund Scholarships | https://www.ox.ac.uk/clarendon |

### Germany (DE)
| Name | Official URL |
|------|--------------|
| Deutschlandstipendium | https://www.deutschlandstipendium.de/ |

### Australia (AU)
| Name | Official URL |
|------|--------------|
| Destination Australia | https://www.education.gov.au/destination-australia |

### Netherlands (NL)
| Name | Official URL |
|------|--------------|
| Orange Tulip Scholarship | https://www.studyinnl.org/finances/orange-tulip-scholarship |

### Japan (JP)
| Name | Official URL |
|------|--------------|
| JASSO Scholarships for International Students | https://www.jasso.go.jp/en/study_j/scholarships/index.html |

### Switzerland (CH)
| Name | Official URL |
|------|--------------|
| ETH Zurich Excellence Scholarship (ESOP) | https://ethz.ch/en/studies/financial/scholarships/excellencescholarship.html |

### Sweden (SE) — new group
| Name | Official URL |
|------|--------------|
| Swedish Institute Scholarships for Global Professionals | https://si.se/en/apply/scholarships/ |

**Tier 1 verification note:** all URLs are official program / government / foundation /
university domains. Two were intentionally kept at a stable parent path rather than a
deep link to avoid breakage (**JASSO**, **Swedish Institute**) — worth a quick click-through.
Descriptions deliberately avoid amounts/deadlines/eligibility specifics per the file's rules.

---

## TIER 2 — Necessities drafts created (NOT wired in)

Five countries that currently show "coming soon" in the necessities picker
(US already has live content). Each draft mirrors the live `NecessitySection[]`
structure (a `mandatories` and a `necessities` section, items with
`id / title / explanation / optional note / optional source`), plus draft-safety
fields: every item carries `is_verified: false`, every file is bracketed with
`DRAFT — UNVERIFIED`, and anything not asserted as fact is flagged `NEEDS VERIFICATION`.

Specific fees, figures, and hard timeframes are **not** stated as fact — the
requirement is described and the official source linked. Drafts were derived from
the existing vetted narrative drafts in `mobile/content/` (e.g. `mandatories_uk.md`).

| Country | Draft file | Sections (items) |
|---------|-----------|------------------|
| United Kingdom (GB) | `mobile/content/drafts/necessities/gb_necessities_draft.md` | Mandatories (6), Necessities (5) |
| Canada (CA) | `mobile/content/drafts/necessities/ca_necessities_draft.md` | Mandatories (5), Necessities (5) |
| Australia (AU) | `mobile/content/drafts/necessities/au_necessities_draft.md` | Mandatories (6), Necessities (5) |
| Germany (DE) | `mobile/content/drafts/necessities/de_necessities_draft.md` | Mandatories (6), Necessities (5) |
| Ireland (IE) | `mobile/content/drafts/necessities/ie_necessities_draft.md` | Mandatories (5), Necessities (5) |

All five cover the standard categories: essential documents / immigration status,
opening a bank account, SIM/phone, health insurance & healthcare, local transit,
and housing/furniture basics (plus groceries and weather-appropriate clothing).

### Items flagged NEEDS VERIFICATION (must confirm before wiring in)

These are the points I would not assert as fact — verify against the linked official
source (and your university's international office) before publishing:

**United Kingdom (GB)**
- eVisa vs physical BRP depends on the individual grant (`gb-mand-status`).
- University enrolment steps — no single government page (`gb-mand-enrol`).
- NI number: work-hour limits / right-to-work conditions (`gb-mand-ni`).
- Police registration: abolished 2022 — confirm it is absent from the user's visa (`gb-mand-police`).
- GP registration documents vary by surgery (`gb-mand-gp`); transit/Railcard eligibility varies (`gb-nec-transit`); city climate (`gb-nec-clothing`).

**Canada (CA)**
- Study Permit enrolment/work conditions (`ca-mand-permit`); SIN work-eligibility (`ca-mand-sin`).
- **Health coverage is province-specific with possible waiting periods — no single national URL** (`ca-mand-health`).
- Bank document requirements (`ca-mand-bank`); transit + U-Pass differ by city/university (`ca-nec-transit`); city winter climate (`ca-nec-winter`).

**Australia (AU)**
- subclass 500 conditions, CoE, address-reporting timeframe (`au-mand-enrol`, `au-mand-address`, `au-mand-conditions`).
- OSHC requirement & approved providers (`au-mand-oshc`); TFN work-hour limits (`au-mand-tfn`).
- **Transit concession eligibility for international students varies by state — some are NOT eligible** (`au-nec-transit`); city seasonal climate (`au-nec-clothing`).

**Germany (DE)**
- **Anmeldung deadline/documents vary by municipality — no national URL** (`de-mand-anmeldung`).
- Enrolment documents (`de-mand-immatrikulation`); **public vs private health-insurance eligibility and accepted insurers** (`de-mand-insurance`).
- Sperrkonto/bank docs (`de-mand-bank`); residence-permit docs vary by city/nationality (`de-mand-permit`); Rundfunkbeitrag fee/exemptions (`de-mand-rundfunk`); Semesterticket/Deutschlandticket coverage (`de-nec-transit`); city climate (`de-nec-clothing`).

**Ireland (IE)**
- ILEP eligible-course rules (`ie-mand-enrol`); IRP process differs inside vs outside Dublin (`ie-mand-irp`).
- PPS process + work-hour limits (`ie-mand-pps`); bank documentation (`ie-mand-bank`); **private medical insurance requirement & accepted cover** (`ie-mand-insurance`); Leap Card types/student eligibility (`ie-nec-leap`); seasonal climate (`ie-nec-clothing`).

### Source links left blank in drafts (no official URL by design)
Practical "community knowledge" items — **furniture** and **groceries** in every
country, plus **phone/SIM** for AU/DE/IE (carrier coverage maps, not one official
page) — have an empty `source` and an explanatory `flags` line. These are intentional,
matching the live US content where furniture/groceries/phone also carry no source.

---

## What was NOT done (by design / constraints)
- No live necessities content was changed; "coming soon" placeholders untouched.
- Drafts are markdown only and are **not imported anywhere**, so they cannot reach
  the bundle or a screen until someone transcribes them into `necessities.ts`.
- No commit, no push. Changes are left in the working tree for your verification.
