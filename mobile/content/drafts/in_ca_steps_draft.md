# India → Canada — Corridor Steps (DRAFT)

> **DRAFT — UNVERIFIED**
>
> Drafts the IN→CA student journey to match the field structure of `IN_US_STEPS`
> in `app/core/seed.py` (`phase`, `step_number`, `title`, `explanation`,
> `official_source_name`, `official_source_url`, `is_verified`).
>
> **Every step has `is_verified: false`.** No fees, currency amounts, exact deadlines,
> or processing times are asserted as fact. Canadian study-permit rules have changed
> frequently (Provincial Attestation Letters, financial thresholds, the end of the
> Student Direct Stream) — every requirement below must be human-checked against
> current IRCC guidance before wiring in. Not legal or immigration advice.
>
> Suggested wiring values: `origin_code="IN"`, `destination_code="CA"`.

---

## Phase: after_acceptance

### Step 1
- **title:** Receive Your Letter of Acceptance from a Designated Learning Institution
- **explanation:** Your study permit application is built on a Letter of Acceptance (LOA)
  from a Designated Learning Institution (DLI) — a school approved by a province or
  territory to host international students. Confirm that your institution is on the current
  DLI list and that your LOA details match your passport. IRCC may verify the LOA directly
  with the institution.
- **official_source_name:** IRCC — Study permit: About the document
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html
- **is_verified:** false

### Step 2
- **title:** Obtain a Provincial Attestation Letter (PAL/TAL) If Required
- **explanation:** NEEDS VERIFICATION: Many study permit applications now require a
  Provincial/Territorial Attestation Letter (PAL/TAL) confirming you are counted within a
  provincial allocation, with some exemptions. Rules, exemptions, and how the letter is
  issued have changed and vary by province. Confirm whether you need one and how to get it
  on the current IRCC guidance before applying.
- **official_source_name:** IRCC — Get the documents you need (study permit)
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html
- **is_verified:** false

---

## Phase: visa_process

### Step 1
- **title:** Gather Proof of Financial Support
- **explanation:** You must show you can pay tuition and support yourself (and any
  accompanying family) in Canada. The minimum amount of available funds and the accepted
  forms of proof are set by IRCC and have been revised — do not rely on any figure quoted
  elsewhere; verify the current required amount and evidence on the official site (subject
  to change). NEEDS VERIFICATION: whether a Guaranteed Investment Certificate (GIC) is
  required depends on the route and current rules.
- **official_source_name:** IRCC — Get the documents you need (study permit)
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html
- **is_verified:** false

### Step 2
- **title:** Create an Account and Apply Online for the Study Permit
- **explanation:** Most applicants from India apply online through IRCC's secure account.
  You upload your LOA, PAL/TAL (if required), proof of funds, passport, and other documents
  on the application's document checklist, and answer the eligibility questions. NEEDS
  VERIFICATION: the Student Direct Stream (a faster processing route) was discontinued —
  confirm the current standard application route on the official site before applying.
- **official_source_name:** IRCC — Study permit: How to apply
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/apply.html
- **is_verified:** false

### Step 3
- **title:** Pay the Required Fees
- **explanation:** Study permit applications involve government processing fees, and
  biometrics typically carry a separate fee. Amounts are set by IRCC and may change — do
  not state a figure; verify current fees on the official site (subject to change). Keep
  all payment receipts.
- **official_source_name:** IRCC — Pay your fees
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/apply.html
- **is_verified:** false

### Step 4
- **title:** Give Your Biometrics
- **explanation:** Most applicants must provide biometrics (fingerprints and a photo) after
  applying. You receive a Biometric Instruction Letter and book an appointment at an
  authorised Visa Application Centre in India. Bring the instruction letter and your
  passport. Confirm current VAC locations through the official biometrics guidance.
- **official_source_name:** IRCC — Biometrics
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/biometrics.html
- **is_verified:** false

### Step 5
- **title:** Complete the Medical Exam If Required
- **explanation:** Depending on your circumstances and length of stay, you may need an
  immigration medical exam performed by an IRCC-approved panel physician. Confirm whether
  it applies to you and find an approved physician through the official guidance; do not
  use a non-panel doctor.
- **official_source_name:** IRCC — Medical exams for temporary residents
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/medical-exams/requirements-temporary-residents.html
- **is_verified:** false

---

## Phase: before_departure

### Step 1
- **title:** Arrange Accommodation Before You Arrive
- **explanation:** Secure housing before leaving India. Many institutions offer on-campus
  residences for new international students if you apply by the deadline; otherwise confirm
  off-campus housing in writing before travelling. A confirmed address helps with later
  administrative steps.
- **official_source_name:** IRCC — Prepare for arrival (study in Canada)
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare-arrival.html
- **is_verified:** false

### Step 2
- **title:** Understand Your Approval Documents (Port of Entry Letter)
- **explanation:** If approved, you typically receive a Port of Entry (POE) Letter of
  Introduction and, where required, an electronic travel authorization or visa counterfoil
  in your passport. Your actual study permit is usually issued by a border officer when you
  arrive in Canada — not before. Read your approval letter carefully and follow its
  instructions.
- **official_source_name:** IRCC — Prepare for arrival (study in Canada)
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare-arrival.html
- **is_verified:** false

### Step 3
- **title:** Book Travel and Note Your Entry Timing
- **explanation:** Plan arrival around your study start date and any conditions in your
  approval. Confirm current entry-timing guidance on the official site (subject to change)
  and keep your travel confirmation accessible for the border interview.
- **official_source_name:** IRCC — Prepare for arrival (study in Canada)
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare-arrival.html
- **is_verified:** false

### Step 4
- **title:** Organise the Documents to Carry in Your Hand Luggage
- **explanation:** Carry your passport (with any visa counterfoil), POE Letter of
  Introduction, LOA, proof of funds, PAL/TAL if applicable, and any other documents listed
  in your approval — in your hand luggage. A Canada Border Services Agency officer reviews
  these and issues your study permit at the port of entry.
- **official_source_name:** IRCC — Prepare for arrival (study in Canada)
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare-arrival.html
- **is_verified:** false

---

## Phase: after_arrival

### Step 1
- **title:** Receive and Check Your Study Permit at the Port of Entry
- **explanation:** The border officer prints your study permit on arrival. Check that your
  name, permit conditions, DLI, and expiry are correct before leaving the inspection area,
  and raise any error immediately. Keep the permit safe — it sets the conditions of your
  stay and study.
- **official_source_name:** IRCC — Study permit: About the document
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html
- **is_verified:** false

### Step 2
- **title:** Report to Your Institution's International Student Office
- **explanation:** Soon after arriving, complete enrolment and check in with your
  institution's international student office. They confirm your registration (DLIs report
  enrolment to IRCC) and advise on maintaining your status, working, and any provincial
  health coverage you must arrange.
- **official_source_name:** IRCC — Study in Canada as an international student
- **official_source_url:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html
- **is_verified:** false

### Step 3
- **title:** Open a Canadian Bank Account
- **explanation:** A local account helps with rent, tuition, and daily spending. Banks
  typically ask for your passport, study permit, and proof of address; some offer
  newcomer/student accounts. Check each provider's current requirements.
- **official_source_name:** Financial Consumer Agency of Canada — Opening a bank account
- **official_source_url:** https://www.canada.ca/en/financial-consumer-agency/services/banking/opening-bank-account.html
- **is_verified:** false

### Step 4
- **title:** Get a Canadian SIM Card
- **explanation:** A local number is needed for banking, your institution's systems, and
  daily life. Prepaid SIMs from major carriers and sub-brands are available at shops and
  kiosks, usually with only proof of identity. Compare coverage and price for your city.
- **official_source_name:** Government of Canada — Cellphone services and plans
- **official_source_url:** https://www.canada.ca/en/services/finance/consumer-affairs.html
- **is_verified:** false

---

*DRAFT — UNVERIFIED. All links and requirements must be human-checked before use.*
