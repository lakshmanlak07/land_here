DRAFT — UNVERIFIED

# Master Verification Checklist — Official Source Links

This is the single place to verify every official-source link before flipping any
content's `is_verified` flag to `true`. It covers two bodies of content:

1. The **India → US visa steps** (the 15 IN→US corridor info steps, sourced from
   `app/core/seed.py` `IN_US_STEPS` and mirrored in `CONTENT_TODO.md`).
2. The **necessities / mandatories content** drafted as markdown
   (`mandatories_us.md`, `necessities_us.md`, and the new UK and Canada drafts).

**How to use this:** open each URL yourself, confirm the page is live, correct,
and matches the step/section description, then tick the box. Only after every box
for a given content item is ticked should that item's `is_verified` be set true.

> This checklist itself is a planning artifact. It changes no code, data, or
> database state. Ticking a box here is a note to yourself, not a system action.

---

## Part A — India → US Visa Steps (`IN_US_STEPS`)

### Phase 1: After Acceptance
- [ ] **Step 1 — Receive Your Form I-20** — Study in the States (DHS)
  https://studyinthestates.dhs.gov/students/get-started
- [ ] **Step 2 — Review Your I-20 for Accuracy** — Understanding Your I-20
  https://studyinthestates.dhs.gov/students/prepare/understanding-the-form-i-20

### Phase 2: Visa Process
- [ ] **Step 1 — Pay the SEVIS I-901 Fee** — FMJFEE
  https://www.fmjfee.com/i901fee/index.html
- [ ] **Step 2 — Complete the DS-160** — CEAC
  https://ceac.state.gov/genniv/
- [ ] **Step 3 — Pay the MRV Visa Fee** — US Travel Docs (India) *(domain restructured — verify carefully)*
  https://www.ustraveldocs.com/in/en/step-2
- [ ] **Step 4 — Schedule Your Visa Interview** — US Travel Docs (India) *(verify carefully)*
  https://www.ustraveldocs.com/in/en/step-3
- [ ] **Step 5 — Attend the F-1 Visa Interview** — travel.state.gov
  https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/prepare-for-your-interview.html

### Phase 3: Before Departure
- [ ] **Step 1 — Arrange Housing** — Prepare for Departure
  https://studyinthestates.dhs.gov/students/prepare/prepare-for-departure
- [ ] **Step 2 — Obtain Health Insurance** — Health Insurance & F/M Status
  https://studyinthestates.dhs.gov/students/prepare/health-insurance-and-your-f-and-m-student-status
- [ ] **Step 3 — Book Your Flight (Entry Window)** — Entering the US
  https://studyinthestates.dhs.gov/students/prepare/entering-the-united-states
- [ ] **Step 4 — Organise Hand-Luggage Documents** — Documents to Carry
  https://studyinthestates.dhs.gov/students/prepare/documents-to-carry-when-entering-the-united-states

### Phase 4: After Arrival
- [ ] **Step 1 — Report to Your DSO** — Reporting to Your DSO
  https://studyinthestates.dhs.gov/students/study/report-to-your-dso
- [ ] **Step 2 — SEVIS Check-In** — SEVIS Check-In
  https://studyinthestates.dhs.gov/students/study/sevis-check-in
- [ ] **Step 3 — Open a US Bank Account** — CFPB Banking Basics
  https://www.consumerfinance.gov/consumer-tools/banking/
- [ ] **Step 4 — Get a US SIM Card** — FCC Choosing a Wireless Carrier
  https://www.fcc.gov/consumers/guides/choosing-wireless-carrier-or-reseller

---

## Part B — US Necessities & Mandatories Content

### `mandatories_us.md`
- [ ] **SEVIS Check-In** — Study in the States (SEVIS section)
  https://studyinthestates.dhs.gov/  *(confirm exact SEVIS check-in page)*
- [ ] **Report to International Office** — Study in the States (general framework)
  https://studyinthestates.dhs.gov/
- [ ] **Full-Time Enrollment** — Study in the States (Maintaining Status)
  https://studyinthestates.dhs.gov/  *(confirm exact Maintaining Status page)*
- [ ] **Health Insurance** — Healthcare.gov (concept reference)
  https://www.healthcare.gov/
- [ ] **Open a US Bank Account** — CFPB
  https://www.consumerfinance.gov/
- [ ] **Apply for SSN** — SSA (Numbers for Noncitizens)
  https://www.ssa.gov/  *(confirm exact noncitizen SSN page)*

### `necessities_us.md`
- [ ] **US Phone Plan** — no single source; each carrier's coverage map
- [ ] **Transit Card** — city transit authority sites (e.g. https://www.mbta.com/ , https://www.mta.info/ )
- [ ] **Furniture / Household** — no official source (community knowledge)
- [ ] **Groceries** — no official source (community knowledge)
- [ ] **Weather-Appropriate Clothing** — US National Weather Service
  https://www.weather.gov/

---

## Part C — UK Necessities & Mandatories Content (NEW DRAFTS)

### `mandatories_uk.md`
- [ ] **BRP / eVisa (UKVI account)** — gov.uk *(confirm current BRP vs eVisa guidance — system is changing)*
  https://www.gov.uk/biometric-residence-permits
  https://www.gov.uk/  *(search "eVisa / UKVI account")*
- [ ] **University Enrolment / Sponsorship** — institution-specific (no single gov page)
- [ ] **Register with a GP (NHS)** — NHS
  https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/
- [ ] **Open a UK Bank Account** — Money Helper
  https://www.moneyhelper.org.uk/en/everyday-money/banking/how-to-open-a-bank-account
- [ ] **National Insurance Number** — gov.uk
  https://www.gov.uk/apply-national-insurance-number
- [ ] **Police Registration (abolished 2022)** — gov.uk *(verify it no longer applies)*
  https://www.gov.uk/

### `necessities_uk.md`
- [ ] **UK SIM / Phone Plan** — Ofcom
  https://www.ofcom.org.uk/phones-and-broadband/making-calls/choosing-a-provider
- [ ] **Transit / Oyster** — TfL and local operators
  https://tfl.gov.uk/  ·  Railcards: https://www.railcard.co.uk/
- [ ] **Furniture / Household** — no official source (community knowledge)
- [ ] **Groceries** — no official source (community knowledge)
- [ ] **Weather / Clothing** — Met Office
  https://www.metoffice.gov.uk/

---

## Part D — Canada Necessities & Mandatories Content (NEW DRAFTS)

### `mandatories_canada.md`
- [ ] **Study Permit Conditions / Maintain Status** — IRCC
  https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html
  *(confirm exact "study conditions / maintain your status" page)*
- [ ] **University Enrolment (DLI)** — institution-specific; DLI list:
  https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html
- [ ] **Social Insurance Number (SIN)** — Service Canada
  https://www.canada.ca/en/employment-social-development/services/sin/apply.html
- [ ] **Provincial Health Coverage** — province-specific health ministry sites *(no single national page — verify per province)*
- [ ] **Open a Canadian Bank Account** — Financial Consumer Agency of Canada
  https://www.canada.ca/en/financial-consumer-agency/services/banking/opening-bank-account.html

### `necessities_canada.md`
- [ ] **Canadian SIM / Phone Plan** — CRTC
  https://crtc.gc.ca/eng/phone/mobile/rights.htm
- [ ] **Transit Card** — city transit authority sites (Presto / OPUS / Compass, etc.)
- [ ] **Winter Clothing** — Environment and Climate Change Canada
  https://weather.gc.ca/
- [ ] **Furniture / Household** — no official source (community knowledge)
- [ ] **Groceries** — no official source (community knowledge)

---

## Cross-Cutting Verification Notes

- **`ustraveldocs.com`** restructured its `/step-2` and `/step-3` paths in the
  past — verify Part A Phase 2 Steps 3 and 4 especially.
- **`studyinthestates.dhs.gov`** is reorganised by DHS without notice — several
  Part B US-mandatory links point to the site root and need the exact deep page
  confirmed.
- **UK BRP → eVisa transition**: the UK is phasing out physical BRPs in favour of
  digital eVisas. Confirm which guidance is current before verifying the UK
  mandatories.
- **Canadian provincial health** and **provincial transit** have no single
  national URL — each must be verified against the relevant province/city site.
- Tick a box only after opening the URL yourself and confirming the live page
  matches the content description. Do not flip any `is_verified` flag until every
  box for that content item is ticked.

---

DRAFT — UNVERIFIED
