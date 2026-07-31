# Verification Record — India → Australia (Student visa, subclass 500)

**Status: DRAFT — UNVERIFIED. NOT SEEDED.** Source: `app/core/seed_in_au_draft.py`
(`IN_AU_STEPS_DRAFT`, 15 draft steps), which is un-imported and `IS_VERIFIED = False`.
seed() does not touch IN→AU. Nothing here has been verified or wired in yet.

This file is the gate for promoting the IN→AU corridor into `app/core/seed.py`. The owner
must personally verify each step below against its official Department of Home Affairs /
federal-government source, tick its box, resolve every MISSING SOURCE item, and sign the
"Cleared to seed" gate **before** any of this is moved into `seed.py` with `is_verified=True`.

**Australia differs from the US/CA/UK flows** (reflected in the steps): electronic
Confirmation of Enrolment (CoE) via the PRISMS system; Overseas Student Health Cover (OSHC);
the **Genuine Student (GS)** requirement, which replaced the former Genuine Temporary Entrant
(GTE) statement; financial-capacity evidence whose amount is revised periodically; online
lodgement via **ImmiAccount**; a **digital visa** linked to the passport (usually no physical
label); **VEVO** to check conditions; strict biosecurity on arrival. There is no I-20/SEVIS,
DS-160/MRV, CAS/IHS, or PAL/TAL.

---

## ⚠️ MISSING SOURCE — resolve before seeding (3)

These draft steps were sourced only to a homepage or a non-specific page. No source was
invented. Each must either get a real, specific official source or be **dropped** (matching how
Canada/UK dropped their unsourced steps) before the corridor is seeded.

- [ ] **before_departure · Arrange Accommodation Before You Arrive** — original draft cited the Study Australia homepage (`https://www.studyaustralia.gov.au/`). Find a specific official accommodation page, or drop.
  - Decision (find source / drop): ____________________
- [ ] **after_arrival · Enrol and Report to Your Institution** — original draft cited the Study Australia homepage. Find a specific official page, or drop.
  - Decision (find source / drop): ____________________
- [ ] **after_arrival · Open an Australian Bank Account** — original draft cited the ATO **Tax File Number** page, which is about TFNs, not opening a bank account. Find a specific official banking/settlement page, or drop.
  - Decision (find source / drop): ____________________

---

## Steps to verify (all currently `is_verified=False`)

> Tick a box only after you have personally opened the source URL and confirmed it supports
> the step as written. Fill in the date you checked it.

## Phase: after_acceptance

- [ ] verified against this official source on ____-__-__ — **Step 1 · Receive Your Confirmation of Enrolment (CoE)**
  - Source: Department of Home Affairs — Student visa (subclass 500) — https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500

- [ ] verified against this official source on ____-__-__ — **Step 2 · Arrange Overseas Student Health Cover (OSHC)**
  - Source: Department of Health — Overseas Student Health Cover — https://www.health.gov.au/topics/private-health-insurance/about-private-health-insurance/overseas-student-health-cover-oshc

## Phase: visa_process

- [ ] verified against this official source on ____-__-__ — **Step 1 · Confirm Eligibility and the Genuine Student Requirement**
  - Source: Department of Home Affairs — Student visa (subclass 500): Eligibility — https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500
  - ⚠️ Verifier note: source is the generic subclass-500 page. Pin the dedicated Genuine Student requirement page if one exists (no GS-specific URL was invented here).

- [ ] verified against this official source on ____-__-__ — **Step 2 · Prepare Evidence of Financial Capacity**
  - Source: Department of Home Affairs — Student visa (subclass 500) — https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500
  - ⚠️ Verifier note: confirm the current financial-capacity amount on the official page; do not hardcode a figure.

- [ ] verified against this official source on ____-__-__ — **Step 3 · Create an ImmiAccount and Lodge the Application Online**
  - Source: Department of Home Affairs — Student visa (subclass 500): How to apply — https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/how-to-apply

- [ ] verified against this official source on ____-__-__ — **Step 4 · Complete Health Examinations and Biometrics If Required**
  - Source: Department of Home Affairs — Health examinations — https://immi.homeaffairs.gov.au/help-support/meeting-our-requirements/health

- [ ] verified against this official source on ____-__-__ — **Step 5 · Await the Decision and Note Your Visa Conditions**
  - Source: Department of Home Affairs — Student visa (subclass 500) — https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500

## Phase: before_departure

- [ ] verified against this official source on ____-__-__ — **Step 2 · Check Your Visa Grant and Conditions Online**
  - Source: Department of Home Affairs — Visa Entitlement Verification Online (VEVO) — https://immi.homeaffairs.gov.au/visas/already-have-a-visa/check-visa-details-and-conditions

- [ ] verified against this official source on ____-__-__ — **Step 3 · Book Travel and Plan Your Arrival Timing**
  - Source: Department of Home Affairs — Student visa (subclass 500) — https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500
  - ⚠️ Verifier note: the generic subclass-500 page does not specifically document travel booking. Tighten the source or drop this step.

- [ ] verified against this official source on ____-__-__ — **Step 4 · Organise Documents and Check Biosecurity Rules**
  - Source: Department of Agriculture, Fisheries and Forestry — Bringing goods into Australia — https://www.agriculture.gov.au/biosecurity-trade/travelling/bringing-mailing-goods

> (before_departure · Step 1 "Arrange Accommodation" is listed above under MISSING SOURCE.)

## Phase: after_arrival

- [ ] verified against this official source on ____-__-__ — **Step 1 · Clear Immigration and Biosecurity at the Airport**
  - Source: Australian Border Force — Entering and leaving Australia — https://www.abf.gov.au/entering-and-leaving-australia

- [ ] verified against this official source on ____-__-__ — **Step 4 · Get an Australian SIM Card**
  - Source: Australian Communications and Media Authority — Mobile services — https://www.acma.gov.au/mobile-phone-services

> (after_arrival · Step 2 "Enrol and Report" and Step 3 "Open an Australian Bank Account" are listed above under MISSING SOURCE.)

---

## ✅ Cleared to seed — GATE (do not seed until ALL are true)

- [ ] All 12 sourced steps above are ticked and dated.
- [ ] All 3 MISSING SOURCE steps are resolved (specific official source found, or dropped).
- [ ] Genuine Student requirement confirmed as the current standard (GTE no longer in use).
- [ ] No fees, currency amounts, or processing times are hardcoded in the seeded steps.
- [ ] Destination code confirmed as `"AU"`, origin `"IN"`.

**Cleared by:** ____________________   **Date:** ____-__-__

When (and only when) this gate is signed: promote the kept steps from
`app/core/seed_in_au_draft.py` into an `IN_AU_STEPS` list in `app/core/seed.py`, add an
idempotent IN→AU insert block in `seed()` mirroring the IN→CA / IN→UK blocks
(`is_verified=True`), delete `seed_in_au_draft.py`, and update this file to a
SEEDED & OWNER-VERIFIED record like `VERIFY_visa_IN_CA.md`.
