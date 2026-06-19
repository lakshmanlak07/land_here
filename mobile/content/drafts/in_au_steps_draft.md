# India → Australia — Corridor Steps (DRAFT)

> **DRAFT — UNVERIFIED**
>
> Drafts the IN→AU student journey to match the field structure of `IN_US_STEPS`
> in `app/core/seed.py` (`phase`, `step_number`, `title`, `explanation`,
> `official_source_name`, `official_source_url`, `is_verified`).
>
> **Every step has `is_verified: false`.** No fees, currency amounts, exact deadlines,
> or processing times are asserted as fact. Australian student-visa rules have changed
> (the Genuine Student requirement replaced the Genuine Temporary Entrant statement;
> financial-capacity figures are revised periodically) — every requirement must be
> human-checked against current Department of Home Affairs guidance before wiring in.
> Not legal or immigration advice.
>
> Suggested wiring values: `origin_code="IN"`, `destination_code="AU"`.

---

## Phase: after_acceptance

### Step 1
- **title:** Receive Your Confirmation of Enrolment (CoE)
- **explanation:** After you accept your offer and meet the institution's conditions
  (usually including an initial fee payment), your provider issues an electronic
  Confirmation of Enrolment (CoE) through the government PRISMS system. The CoE is required
  for the Student visa (subclass 500) application. Confirm that the CoE details match your
  passport and offer.
- **official_source_name:** Department of Home Affairs — Student visa (subclass 500)
- **official_source_url:** https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500
- **is_verified:** false

### Step 2
- **title:** Arrange Overseas Student Health Cover (OSHC)
- **explanation:** Student visa holders are generally required to hold Overseas Student
  Health Cover (OSHC) for the duration of their stay, usually arranged before the visa is
  granted. Confirm the current requirement and approved providers; do not state a premium
  amount (subject to change). Keep proof of cover for your application.
- **official_source_name:** Department of Health — Overseas Student Health Cover
- **official_source_url:** https://www.health.gov.au/topics/private-health-insurance/about-private-health-insurance/overseas-student-health-cover-oshc
- **is_verified:** false

---

## Phase: visa_process

### Step 1
- **title:** Confirm Eligibility and the Genuine Student Requirement
- **explanation:** Check the current subclass 500 eligibility, including the Genuine Student
  (GS) requirement, English language evidence, and any conditions for your situation. NEEDS
  VERIFICATION: the Genuine Student requirement replaced the former Genuine Temporary Entrant
  statement — confirm the exact current questions and evidence on the official visa page.
- **official_source_name:** Department of Home Affairs — Student visa (subclass 500): Eligibility
- **official_source_url:** https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500
- **is_verified:** false

### Step 2
- **title:** Prepare Evidence of Financial Capacity
- **explanation:** You must show you can cover tuition, travel, and living costs. The
  required amount and accepted evidence are set by the Department and revised periodically —
  do not rely on any figure quoted elsewhere; verify the current financial-capacity
  requirement on the official site (subject to change).
- **official_source_name:** Department of Home Affairs — Student visa (subclass 500)
- **official_source_url:** https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500
- **is_verified:** false

### Step 3
- **title:** Create an ImmiAccount and Lodge the Application Online
- **explanation:** Apply for the subclass 500 online through ImmiAccount. You attach your
  CoE, OSHC evidence, GS responses, financial and English evidence, passport, and other
  documents on the application's checklist, and pay the visa application charge (amount set
  by the Department — verify, subject to change).
- **official_source_name:** Department of Home Affairs — ImmiAccount
- **official_source_url:** https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/how-to-apply
- **is_verified:** false

### Step 4
- **title:** Complete Health Examinations and Biometrics If Required
- **explanation:** You may be asked to complete a health examination with an approved panel
  clinic and/or provide biometrics. Confirm whether these apply to you and follow the
  official instructions and approved providers; do not arrange a medical with a non-panel
  clinic.
- **official_source_name:** Department of Home Affairs — Health examinations
- **official_source_url:** https://immi.homeaffairs.gov.au/help-support/meeting-our-requirements/health
- **is_verified:** false

### Step 5
- **title:** Await the Decision and Note Your Visa Conditions
- **explanation:** If granted, you receive a visa grant notification with your visa
  conditions (such as work limits and the requirement to maintain enrolment and OSHC). Save
  the grant notice; Australia uses a digital visa linked to your passport, so there is
  usually no physical label.
- **official_source_name:** Department of Home Affairs — Student visa (subclass 500)
- **official_source_url:** https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500
- **is_verified:** false

---

## Phase: before_departure

### Step 1
- **title:** Arrange Accommodation Before You Arrive
- **explanation:** Secure housing before leaving India. Many institutions help arrange
  managed student accommodation or homestays; otherwise confirm a rental in writing before
  travelling. A confirmed address eases later setup.
- **official_source_name:** Study Australia (Australian Government) — Accommodation
- **official_source_url:** https://www.studyaustralia.gov.au/
- **is_verified:** false

### Step 2
- **title:** Check Your Visa Grant and Conditions Online
- **explanation:** Review your visa grant notice and conditions, and confirm your details
  using the official online checking service. Understand obligations such as maintaining
  enrolment, OSHC, and any work-hour limits before you travel.
- **official_source_name:** Department of Home Affairs — Visa Entitlement Verification Online (VEVO)
- **official_source_url:** https://immi.homeaffairs.gov.au/visas/already-have-a-visa/check-visa-details-and-conditions
- **is_verified:** false

### Step 3
- **title:** Book Travel and Plan Your Arrival Timing
- **explanation:** Plan your arrival around your course start date and any orientation. Keep
  your visa grant notice and CoE accessible for airline check-in and Australian border
  clearance. Verify current arrival guidance on the official site (subject to change).
- **official_source_name:** Department of Home Affairs — Student visa (subclass 500)
- **official_source_url:** https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500
- **is_verified:** false

### Step 4
- **title:** Organise Documents and Check Biosecurity Rules
- **explanation:** Carry your passport, visa grant notice, CoE, OSHC evidence, and financial
  documents in your hand luggage. Australia has strict biosecurity rules — check what you
  must declare and what cannot be brought in before you pack.
- **official_source_name:** Department of Agriculture, Fisheries and Forestry — Bringing goods into Australia
- **official_source_url:** https://www.agriculture.gov.au/biosecurity-trade/travelling/bringing-mailing-goods
- **is_verified:** false

---

## Phase: after_arrival

### Step 1
- **title:** Clear Immigration and Biosecurity at the Airport
- **explanation:** On arrival, clear immigration (your visa is digital and linked to your
  passport) and complete the Incoming Passenger Declaration for biosecurity. Declare any
  required items honestly. Keep your CoE and visa details handy in case you are asked.
- **official_source_name:** Australian Border Force — Entering and leaving Australia
- **official_source_url:** https://www.abf.gov.au/entering-and-leaving-australia
- **is_verified:** false

### Step 2
- **title:** Enrol and Report to Your Institution
- **explanation:** Complete enrolment and attend orientation with your institution's
  international student support team. They confirm your enrolment in PRISMS and advise on
  maintaining your visa conditions, working, and student services.
- **official_source_name:** Study Australia (Australian Government)
- **official_source_url:** https://www.studyaustralia.gov.au/
- **is_verified:** false

### Step 3
- **title:** Open an Australian Bank Account
- **explanation:** A local account helps with rent, wages, and daily spending. Banks
  typically ask for your passport and proof of address; some let you begin the process
  before arrival. Check each provider's current requirements, and note you may need a Tax
  File Number for some purposes.
- **official_source_name:** Australian Taxation Office — Tax file number
- **official_source_url:** https://www.ato.gov.au/individuals-and-families/tax-file-number
- **is_verified:** false

### Step 4
- **title:** Get an Australian SIM Card
- **explanation:** A local number is needed for banking, your institution's systems, and
  daily life. Prepaid SIMs from major carriers and sub-brands are widely available at shops
  and airports, usually with proof of identity. Compare coverage for your city.
- **official_source_name:** Australian Communications and Media Authority — Mobile services
- **official_source_url:** https://www.acma.gov.au/mobile-phone-services
- **is_verified:** false

---

*DRAFT — UNVERIFIED. All links and requirements must be human-checked before use.*
