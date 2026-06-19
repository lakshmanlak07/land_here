# India → United Kingdom — Corridor Steps (DRAFT)

> **DRAFT — UNVERIFIED**
>
> This file drafts the IN→GB student journey to match the exact field structure of
> `IN_US_STEPS` in `app/core/seed.py` (`phase`, `step_number`, `title`, `explanation`,
> `official_source_name`, `official_source_url`, `is_verified`).
>
> **Every step has `is_verified: false`.** No fees, currency amounts, exact deadlines,
> or processing times are asserted as fact. Every link and requirement must be
> human-checked against current official UK government guidance before wiring in.
> This is not legal or immigration advice.
>
> Suggested wiring values: `origin_code="IN"`, `destination_code="GB"` (confirm the
> destination country code used in `seed.py`/`countries` before wiring).

---

## Phase: after_acceptance

### Step 1
- **title:** Receive Your Confirmation of Acceptance for Studies (CAS)
- **explanation:** After you accept your offer, your university (a licensed student
  sponsor) issues a Confirmation of Acceptance for Studies (CAS) — a unique reference
  number held in the Home Office system, accompanied by a CAS statement listing your
  course and the details the sponsor has assessed. You receive the number, not a
  physical document. You cannot apply for a Student visa without a CAS, and the visa
  form requires the CAS number.
- **official_source_name:** UK Visas and Immigration — Student visa
- **official_source_url:** https://www.gov.uk/student-visa
- **is_verified:** false

### Step 2
- **title:** Check Your CAS Statement for Accuracy
- **explanation:** Carefully read the CAS statement before applying. Confirm your name
  matches your passport exactly, your date of birth is correct, and the course details
  match your offer. The Home Office cross-references your application against the CAS
  record; discrepancies can cause delay or refusal. If anything is wrong, contact your
  university's international admissions team to have the CAS corrected.
- **official_source_name:** UK Visas and Immigration — Apply for a Student visa
- **official_source_url:** https://www.gov.uk/student-visa/apply
- **is_verified:** false

---

## Phase: visa_process

### Step 1
- **title:** Confirm You Need a Student Visa
- **explanation:** Most Indian nationals studying in the UK for longer than six months
  apply for a Student visa (formerly Tier 4). Shorter courses may use a different route.
  Check the current eligibility rules and route on the official government checker before
  you apply.
- **official_source_name:** UK government — Check if you need a UK visa
- **official_source_url:** https://www.gov.uk/check-uk-visa
- **is_verified:** false

### Step 2
- **title:** Pay the Immigration Health Surcharge (IHS)
- **explanation:** As part of the application you are normally required to pay the
  Immigration Health Surcharge, which gives access to the NHS during your stay. The
  amount and the way it is calculated are set by the government and may change — do not
  rely on any figure quoted elsewhere; verify on the official page (subject to change).
  Keep the IHS reference, as it is used to complete the visa application.
- **official_source_name:** UK government — Pay for UK healthcare as part of your immigration application
- **official_source_url:** https://www.gov.uk/healthcare-immigration-application
- **is_verified:** false

### Step 3
- **title:** Complete the Online Student Visa Application
- **explanation:** Apply online through the official UK Visas and Immigration service.
  You provide your CAS number, passport details, financial evidence, and (where required)
  proof of English language ability and an ATAS certificate for certain subjects. You must
  show you have enough money for tuition and living costs; the required amount and the
  period funds must be held are set by the Home Office — verify on the official site,
  subject to change. Many applicants meet the English requirement through a degree taught
  in English, but check the current accepted evidence.
- **official_source_name:** UK Visas and Immigration — Apply for a Student visa
- **official_source_url:** https://www.gov.uk/student-visa/apply
- **is_verified:** false

### Step 4
- **title:** Provide Your Biometrics at a Visa Application Centre
- **explanation:** After applying online you book an appointment to enrol your biometric
  information (fingerprints and a photograph). In India this is handled at a commercial
  visa application centre. NEEDS VERIFICATION: confirm the current provider and city
  locations on the official application service before booking. Bring your passport and
  appointment confirmation.
- **official_source_name:** UK Visas and Immigration — Apply for a Student visa
- **official_source_url:** https://www.gov.uk/student-visa/apply
- **is_verified:** false

### Step 5
- **title:** Submit Your Supporting Documents
- **explanation:** Upload or present the supporting documents on the checklist generated
  by your application — typically the CAS statement, financial evidence, academic
  qualifications, and English language evidence. Follow the document list the official
  service produces for your specific application.
- **official_source_name:** UK government — Documents you must provide (Student visa)
- **official_source_url:** https://www.gov.uk/student-visa/documents-you-must-provide
- **is_verified:** false

---

## Phase: before_departure

### Step 1
- **title:** Arrange Accommodation Before You Travel
- **explanation:** Secure housing before leaving India. Many universities offer managed
  halls of residence for first-year international students if you apply by the stated
  deadline; otherwise confirm a private tenancy in writing before you travel. Arriving
  without a confirmed address is stressful and can complicate later registration steps.
- **official_source_name:** UKCISA — Accommodation
- **official_source_url:** https://www.ukcisa.org.uk/Information--Advice/Studying--living-in-the-UK/Accommodation
- **is_verified:** false

### Step 2
- **title:** Understand How Your Visa Is Issued (eVisa / vignette)
- **explanation:** NEEDS VERIFICATION: The UK has been moving from physical Biometric
  Residence Permits (BRP) to a digital immigration status (eVisa), and applicants may
  receive a short-validity entry vignette in the passport plus an online status. Confirm
  the current arrangement for your application on the official eVisa guidance before you
  travel, and follow the exact instructions in your decision letter.
- **official_source_name:** UK government — UK Visas and Immigration accounts and eVisas
- **official_source_url:** https://www.gov.uk/evisa
- **is_verified:** false

### Step 3
- **title:** Book Travel Within Your Permitted Entry Window
- **explanation:** Any entry vignette or permission specifies the earliest date you may
  enter the UK; do not arrange to arrive before it. Note the relationship between your
  arrival date and your course start date, and any time-limited steps you must complete
  after arrival. Verify dates and arrival guidance on the official site (subject to change).
- **official_source_name:** UK government — Student visa: When you arrive
- **official_source_url:** https://www.gov.uk/student-visa/when-you-arrive
- **is_verified:** false

### Step 4
- **title:** Organise the Documents to Carry in Your Hand Luggage
- **explanation:** Carry your passport (with any visa vignette), CAS statement or number,
  university offer/acceptance letter, financial evidence, IHS reference, and any decision
  letter or collection instructions in your hand luggage. UK Border Force may ask to see
  supporting documents at the port of entry.
- **official_source_name:** UK government — Student visa: When you arrive
- **official_source_url:** https://www.gov.uk/student-visa/when-you-arrive
- **is_verified:** false

---

## Phase: after_arrival

### Step 1
- **title:** Complete Any Required Visa Collection or eVisa Setup
- **explanation:** NEEDS VERIFICATION: Depending on how your visa was issued, you may need
  to collect a BRP or set up access to your online immigration status (eVisa) promptly
  after arrival, often within a time limit stated in your decision letter. Follow the exact
  instructions you were given and the current official guidance.
- **official_source_name:** UK government — UK Visas and Immigration accounts and eVisas
- **official_source_url:** https://www.gov.uk/evisa
- **is_verified:** false

### Step 2
- **title:** Register With Your University's International Student Office
- **explanation:** Within the first few days, complete enrolment and register with the
  international student office. This activates your student record, which the university
  needs to confirm your attendance to UKVI. Bring your passport, immigration documents, and
  anything your university requests.
- **official_source_name:** UKCISA — Arriving in the UK
- **official_source_url:** https://www.ukcisa.org.uk/Information--Advice/Studying--living-in-the-UK/Arriving-in-the-UK
- **is_verified:** false

### Step 3
- **title:** Register With a GP (NHS)
- **explanation:** Register with a local NHS GP surgery once you have a UK address. Your
  university health centre can guide you. You will usually need proof of your UK address
  and your identity/immigration documents.
- **official_source_name:** NHS — How to register with a GP surgery
- **official_source_url:** https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/
- **is_verified:** false

### Step 4
- **title:** Open a UK Bank Account
- **explanation:** A UK account helps with rent, wages, and everyday spending. Banks
  typically ask for your immigration documents, proof of address, and a university
  enrolment letter; some app-based banks can be opened earlier. Check each provider's
  current requirements.
- **official_source_name:** MoneyHelper — How to open a bank account
- **official_source_url:** https://www.moneyhelper.org.uk/en/everyday-money/banking/how-to-open-a-bank-account
- **is_verified:** false

### Step 5
- **title:** Get a UK SIM Card
- **explanation:** A local number is needed for bank verification, university systems, and
  daily life. Prepaid SIMs are widely available from major networks and sub-brands at shops
  and supermarkets, typically without documentation beyond proof of identity.
- **official_source_name:** Ofcom — Advice for consumers
- **official_source_url:** https://www.ofcom.org.uk/phones-and-broadband/
- **is_verified:** false

---

*DRAFT — UNVERIFIED. All links and requirements must be human-checked before use.*
