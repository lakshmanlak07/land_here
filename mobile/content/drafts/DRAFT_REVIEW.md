# DRAFT_REVIEW — Visa/Relocation Corridor Steps

> **DRAFT — UNVERIFIED.** This folder contains *draft content only*. Nothing here is
> wired into the app, and no existing file, app code, schema, migration, or seed data was
> modified. Every step in every file has `is_verified: false`. No fees, currency amounts,
> exact deadlines, or processing times are asserted as fact — where unavoidable they are
> labelled "verify on official site, subject to change" and point at the official portal.
>
> **Before wiring any of this in, a human must check every link and every requirement
> against the current official government source for that country.** Immigration rules and
> URLs change without notice. This is not legal or immigration advice.

## How these match the existing corridor format

The source-of-truth structure is `IN_US_STEPS` in `app/core/seed.py`. Each step is a dict
with: `phase`, `step_number`, `title`, `explanation`, `official_source_name`,
`official_source_url`, plus `is_verified` (set per-step). Valid phases come from
`VALID_PHASES` in `app/models/info_step.py`:
`before_applying`, `after_acceptance`, `visa_process`, `before_departure`, `after_arrival`.

Each draft below uses the same four phases the US corridor uses (`after_acceptance`,
`visa_process`, `before_departure`, `after_arrival`) and the same fields, so steps can be
transcribed into `seed.py` later. Confirm the exact `destination_code` values used in your
`countries` table before wiring (drafts suggest `GB`, `CA`, `AU`, `DE`, `IE`).

> Note: two *pre-existing* prose drafts (`in_uk_journey_draft.md`,
> `in_ca_journey_draft.md`) were already in this folder and were **not** modified. The new
> structured drafts below use the `*_steps_draft.md` naming to avoid touching them.

## Files created (new, additive only)

| Corridor | File |
|---|---|
| India → United Kingdom | `in_uk_steps_draft.md` |
| India → Canada | `in_ca_steps_draft.md` |
| India → Australia | `in_au_steps_draft.md` |
| India → Germany | `in_de_steps_draft.md` |
| India → Ireland | `in_ie_steps_draft.md` |

---

## Steps flagged NEEDS VERIFICATION

These are the points I was least certain about and explicitly would not assert. Check each
against the official portal before use. (In addition, **every** step is `is_verified: false`
and needs review — this list is just the highest-risk items.)

### India → United Kingdom (`in_uk_steps_draft.md`)
- **visa_process / Step 4 — Biometrics:** confirm the current provider and city locations in
  India for the visa application centre (provider/branding has changed over time).
- **before_departure / Step 2 — eVisa vs BRP:** the UK has been moving from physical BRPs to
  a digital eVisa, possibly with a short-validity entry vignette. Confirm exactly how the
  visa is issued for current applicants.
- **after_arrival / Step 1 — Visa collection / eVisa setup:** confirm whether arrivals must
  collect a BRP or set up online status, and any time limit.

### India → Canada (`in_ca_steps_draft.md`)
- **after_acceptance / Step 2 — Provincial Attestation Letter (PAL/TAL):** confirm whether
  one is required, the exemptions, and how it is issued (rules changed and vary by province).
- **visa_process / Step 1 — Proof of funds / GIC:** confirm the current minimum funds figure
  and whether a Guaranteed Investment Certificate is required for the route used.
- **visa_process / Step 2 — Application route:** the Student Direct Stream (SDS) was
  discontinued; confirm the current standard application route.

### India → Australia (`in_au_steps_draft.md`)
- **visa_process / Step 1 — Genuine Student requirement:** the Genuine Student (GS)
  requirement replaced the former Genuine Temporary Entrant statement; confirm the exact
  current questions and evidence.
- (Also re-check the financial-capacity requirement in visa_process / Step 2 — figure set by
  the Department and revised periodically; no amount stated in the draft.)

### India → Germany (`in_de_steps_draft.md`)
- **after_acceptance / Step 1 — Admission type vs visa category:** conditional admission or a
  preparatory/language course may need a different visa category; confirm the correct one.
- **visa_process / Step 1 — Blocked account (Sperrkonto) amount:** the required amount is set
  by the authorities and revised; confirm the current figure and accepted alternatives.
- **visa_process / Step 3 — Appointment process at German missions in India:** confirm the
  responsible mission by jurisdiction, the booking method, and whether a service provider is
  used.

### India → Ireland (`in_ie_steps_draft.md`)
- **after_acceptance / Step 1 — ILEP listing & fee payment:** confirm the course is on the
  current Interim List of Eligible Programmes and whether tuition (or a portion) must be paid
  before applying.
- **visa_process / Step 1 — Finances & medical insurance:** confirm the current required
  funds and accepted insurance.
- **after_arrival / Step 2 — Registration & IRP:** confirm the current registration process
  (Dublin online/appointment vs regional offices), location, and fee.

---

## General review checklist (applies to every file)

- [ ] Open every `official_source_url` and confirm it resolves to the current official page
      (government immigration/student-visa portal — not a blog or aggregator).
- [ ] Confirm the `destination_code` for each corridor matches the `countries` table.
- [ ] Re-read every `explanation` for any implied requirement that should be removed or
      corrected; replace anything uncertain with verified text.
- [ ] Confirm no hard fees, amounts, deadlines, or processing times have crept in; keep the
      "verify on official site, subject to change" framing until verified.
- [ ] Only after verification, set `is_verified: true` on a per-step basis.

*DRAFT — UNVERIFIED. Human verification required before any of this content is wired in.*
