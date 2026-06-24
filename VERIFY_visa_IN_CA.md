# Verification Record — India → Canada (Study Permit) Visa Steps

**Status: SEEDED & OWNER-VERIFIED.** Source: live seed data in `app/core/seed.py`
(`IN_CA_STEPS`, 12 steps), seeded with `is_verified=True`. The owner personally verified
each step against its official IRCC / Government of Canada source before wiring it in.

The 3 originally-unsourced **MISSING SOURCE** draft steps were **DROPPED** — only steps
with an official government source are seeded, matching how `IN_US_STEPS` is sourced. The
earlier draft module (`app/core/seed_in_ca_draft.py`) has been removed now that the
verified content lives in `seed.py`.

**Canada differs from the US F-1 process** (reflected in the steps, not copied from the US):
study *permit* (not a visa) + a TRV for travel; the permit is printed at the Port of Entry,
not stamped before you fly; **PAL/TAL** provincial attestation is required; proof of funds can
use a **GIC** (the GIC-based SDS stream ended 8 Nov 2024 and is not referenced); **biometrics**
are required at the IRCC-designated VAC (VFS Global). There is no I-20, SEVIS, DS-160, MRV fee,
or consular interview.

---

## ⚠️ DROPPED — MISSING SOURCE steps NOT seeded

These draft steps had no official government source and were **not** added to the corridor
(decision: drop). They remain documented here only as a record of what was excluded:

- **before_departure · Arrange Health Insurance Coverage** — provincial/DLI-specific, no single federal source.
- **before_departure · Arrange Housing Before You Arrive** — preparation guidance, not a government requirement.
- **after_arrival · Register for Provincial Health Coverage** — administered provincially, not by IRCC.

---

## Seeded steps (all `is_verified=True`, owner-verified 2026-06-25)

## Phase: after_acceptance

- [x] verified against this official source on 2026-06-25 — **Step 1 · Receive Your Letter of Acceptance from a Designated Learning Institution (DLI)**
  - Source: IRCC – Designated Learning Institutions list — https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html

- [x] verified against this official source on 2026-06-25 — **Step 2 · Obtain Your Provincial or Territorial Attestation Letter (PAL/TAL)**
  - Source: IRCC – Provincial/territorial attestation letter — https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/provincial-territorial-attestation-letter.html

## Phase: visa_process

- [x] verified against this official source on 2026-06-25 — **Step 1 · Show Proof of Financial Support (a GIC Is One Accepted Option)**
  - Source: IRCC – Get your documents (proof of funds) — https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html

- [x] verified against this official source on 2026-06-25 — **Step 2 · Create an IRCC Secure Account and Apply for the Study Permit Online**
  - Source: IRCC – Apply for a study permit — https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/apply.html

- [x] verified against this official source on 2026-06-25 — **Step 3 · Complete an Immigration Medical Exam with a Panel Physician (If Required)**
  - Source: IRCC – Medical exams for visitors, students and workers — https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/medical-exams.html

- [x] verified against this official source on 2026-06-25 — **Step 4 · Pay the Study Permit and Biometrics Fees and Submit**
  - Source: IRCC – Apply for a study permit — https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/apply.html

- [x] verified against this official source on 2026-06-25 — **Step 5 · Give Your Biometrics at the IRCC-Designated Visa Application Centre (VFS Global)**
  - Source: IRCC – Biometrics — https://www.canada.ca/en/immigration-refugees-citizenship/services/biometrics.html

## Phase: before_departure

- [x] verified against this official source on 2026-06-25 — **Step 1 · Receive Your POE Letter of Introduction and Travel Document (TRV/eTA)**
  - Source: IRCC – Prepare for your arrival — https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare-arrival.html

- [x] verified against this official source on 2026-06-25 — **Step 2 · Organise the Documents to Carry in Your Hand Luggage for the Port of Entry**
  - Source: IRCC – Prepare for your arrival — https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare-arrival.html

## Phase: after_arrival

- [x] verified against this official source on 2026-06-25 — **Step 1 · Get Your Study Permit at the Port of Entry**
  - Source: IRCC – Prepare for your arrival — https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare-arrival.html

- [x] verified against this official source on 2026-06-25 — **Step 2 · Apply for a Social Insurance Number (SIN) If You Plan to Work**
  - Source: Service Canada – Social Insurance Number — https://www.canada.ca/en/employment-social-development/services/sin.html

- [x] verified against this official source on 2026-06-25 — **Step 3 · Understand Your On- and Off-Campus Work Conditions**
  - Source: IRCC – Work off campus as an international student — https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html
