# Verification Record — India → United Kingdom (Student visa) Visa Steps

**Status: SEEDED & OWNER-VERIFIED.** Source: live seed data in `app/core/seed.py`
(`IN_UK_STEPS`, 14 steps), seeded with `is_verified=True` and `destination_code="UK"`,
`origin_code="IN"`. The owner personally verified each step against its official
gov.uk / nhs.uk source before wiring it in.

The 1 originally-unsourced **MISSING SOURCE** draft step (Arrange Accommodation) was
**DROPPED** — only steps with an official government source are seeded, matching how
`IN_US_STEPS` / `IN_CA_STEPS` are sourced. The earlier draft module
(`app/core/seed_in_uk_draft.py`) has been removed now that the verified content lives in
`seed.py`.

**UK Student-route specifics** (not copied from US/Canada): CAS from a licensed sponsor
(no I-20/SEVIS/DS-160/DLI/PAL); Immigration Health Surcharge (IHS); UKVI-approved TB test
for applicants in India; financial maintenance "28-day rule" (amounts deferred to source);
eVisa via a UKVI account (BRP phased out), often with a short-validity entry vignette; ATAS
for some postgraduate subjects; biometrics at the UKVI visa application centre (VFS Global).
No money amount or work-hour limit is hardcoded — each is deferred to the official page.

---

## ⚠️ DROPPED — MISSING SOURCE step NOT seeded

This draft step had no official government source and was **not** added to the corridor
(decision: drop). It remains documented here only as a record of what was excluded:

- **before_departure · Arrange Accommodation Before You Arrive** — preparation guidance, not a
  government Student-visa requirement; no official gov.uk source mandates it.

---

## Seeded steps (all `is_verified=True`, owner-verified 2026-06-25)

## Phase: after_acceptance

- [x] verified against this official source on 2026-06-25 — **Step 1 · Receive Your CAS (Confirmation of Acceptance for Studies) from Your Sponsor**
  - Source: GOV.UK – Student visa — https://www.gov.uk/student-visa

- [x] verified against this official source on 2026-06-25 — **Step 2 · Check Whether You Need ATAS (Academic Technology Approval Scheme) Clearance**
  - Source: GOV.UK – Academic Technology Approval Scheme (ATAS) — https://www.gov.uk/guidance/academic-technology-approval-scheme

## Phase: visa_process

- [x] verified against this official source on 2026-06-25 — **Step 1 · Confirm You Meet the Financial Maintenance Requirement**
  - Source: GOV.UK – Student visa: Money — https://www.gov.uk/student-visa/money

- [x] verified against this official source on 2026-06-25 — **Step 2 · Take the UKVI-Approved Tuberculosis (TB) Test (Required for Applicants in India)**
  - Source: GOV.UK – Tuberculosis tests for visa applicants — https://www.gov.uk/tb-test-visa

- [x] verified against this official source on 2026-06-25 — **Step 3 · Apply Online for the Student Visa and Pay the Visa Fee**
  - Source: GOV.UK – Student visa: How to apply — https://www.gov.uk/student-visa/apply

- [x] verified against this official source on 2026-06-25 — **Step 4 · Pay the Immigration Health Surcharge (IHS)**
  - Source: GOV.UK – Pay for UK healthcare as part of your immigration application (IHS) — https://www.gov.uk/healthcare-immigration-application

- [x] verified against this official source on 2026-06-25 — **Step 5 · Provide Your Biometrics at a UKVI Visa Application Centre (VFS Global)**
  - Source: GOV.UK – Student visa: How to apply — https://www.gov.uk/student-visa/apply

## Phase: before_departure

- [x] verified against this official source on 2026-06-25 — **Step 1 · Receive Your Decision, eVisa and (If Issued) Entry Vignette**
  - Source: GOV.UK – Get access to your eVisa — https://www.gov.uk/get-access-evisa

- [x] verified against this official source on 2026-06-25 — **Step 2 · Set Up Your UKVI Account and Check How to Prove Your Status**
  - Source: GOV.UK – View and prove your immigration status — https://www.gov.uk/view-prove-immigration-status

- [x] verified against this official source on 2026-06-25 — **Step 3 · Organise the Documents You Must Provide and Carry**
  - Source: GOV.UK – Student visa: Documents you must provide — https://www.gov.uk/student-visa/documents-you-must-provide

## Phase: after_arrival

- [x] verified against this official source on 2026-06-25 — **Step 1 · Access Your eVisa and Confirm Your Immigration Status**
  - Source: GOV.UK – View and prove your immigration status — https://www.gov.uk/view-prove-immigration-status

- [x] verified against this official source on 2026-06-25 — **Step 2 · Complete University Enrolment and Comply with Your Visa Conditions**
  - Source: GOV.UK – Student visa (overview and conditions) — https://www.gov.uk/student-visa

- [x] verified against this official source on 2026-06-25 — **Step 3 · Register with a GP for NHS Healthcare**
  - Source: NHS – How to register with a GP surgery — https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/

- [x] verified against this official source on 2026-06-25 — **Step 4 · Understand Your Work Rights as a Student**
  - Source: GOV.UK – Student visa: What you can and cannot do — https://www.gov.uk/student-visa/what-you-can-and-cannot-do
