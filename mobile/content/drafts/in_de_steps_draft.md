# India → Germany — Corridor Steps (DRAFT)

> **DRAFT — UNVERIFIED**
>
> Drafts the IN→DE student journey to match the field structure of `IN_US_STEPS`
> in `app/core/seed.py` (`phase`, `step_number`, `title`, `explanation`,
> `official_source_name`, `official_source_url`, `is_verified`).
>
> **Every step has `is_verified: false`.** No fees, currency amounts, exact deadlines,
> or processing times are asserted as fact. German student-visa requirements (the
> blocked-account amount, health-insurance rules, appointment procedures at the German
> missions in India) change and vary by case — every requirement must be human-checked
> against the German Federal Foreign Office and the German missions in India before
> wiring in. Not legal or immigration advice.
>
> Suggested wiring values: `origin_code="IN"`, `destination_code="DE"`.

---

## Phase: after_acceptance

### Step 1
- **title:** Receive Your University Admission Letter (Zulassungsbescheid)
- **explanation:** Your visa application is based on a formal admission letter
  (Zulassungsbescheid) from a recognised German higher education institution. NEEDS
  VERIFICATION: if you only hold a conditional admission or a place on a preparatory/
  language course, a different visa category may apply — confirm the correct category for
  your situation on the official guidance. Check that your admission details match your
  passport.
- **official_source_name:** Make it in Germany (German Government) — Visa for studies
- **official_source_url:** https://www.make-it-in-germany.com/en/studying-training/studying/visa-for-studies
- **is_verified:** false

### Step 2
- **title:** Confirm Which National Visa Category You Need
- **explanation:** Indian nationals normally need a national (category D) visa to study in
  Germany; the exact category depends on whether you are starting a degree, a preparatory
  course, or are still applying to universities. Confirm the correct category and current
  requirements on the official Federal Foreign Office guidance before applying.
- **official_source_name:** German Federal Foreign Office — Visa for studying / Studienkolleg
- **official_source_url:** https://www.auswaertiges-amt.de/en/visa-service/-/231148
- **is_verified:** false

---

## Phase: visa_process

### Step 1
- **title:** Open a Blocked Account or Arrange Proof of Financial Resources
- **explanation:** You must prove you can finance your studies, most commonly via a blocked
  account (Sperrkonto), but a scholarship, formal sponsorship (Verpflichtungserklärung), or
  other accepted evidence may also qualify. NEEDS VERIFICATION: the blocked-account amount
  is set by the authorities and revised periodically — do not state a figure; verify the
  current required amount and accepted forms of proof on the official site (subject to
  change).
- **official_source_name:** Make it in Germany (German Government) — Financing your studies
- **official_source_url:** https://www.make-it-in-germany.com/en/studying-training/studying/financing
- **is_verified:** false

### Step 2
- **title:** Arrange Health Insurance Accepted for the Visa
- **explanation:** You generally need health insurance valid in Germany for the visa, with
  the type required depending on your status (for example travel cover for the initial
  period and statutory or recognised private cover once enrolled). Confirm the current
  accepted insurance for your situation on the official guidance.
- **official_source_name:** Make it in Germany (German Government) — Health insurance
- **official_source_url:** https://www.make-it-in-germany.com/en/living-in-germany/insurance/health-insurance
- **is_verified:** false

### Step 3
- **title:** Book a Visa Appointment at the German Mission in India
- **explanation:** National student visas are applied for in person at the competent German
  mission (Embassy/Consulates-General) or its appointed service provider in India, by
  jurisdiction. NEEDS VERIFICATION: appointment booking, the responsible mission for your
  region, and whether a service provider is used change — confirm on the German Missions in
  India website before booking.
- **official_source_name:** German Missions in India — Visa / Studying in Germany
- **official_source_url:** https://india.diplo.de/in-en/service/visa-einreise
- **is_verified:** false

### Step 4
- **title:** Complete the National Visa Application Form and Documents
- **explanation:** Complete the long-stay (national/D) visa application (commonly via the
  online VIDEX form) and assemble the document set: passport, admission letter, proof of
  financial resources, health insurance, academic records, and language evidence as
  required. Follow the exact checklist published by the responsible German mission for your
  jurisdiction.
- **official_source_name:** German Federal Foreign Office — Visa application (VIDEX)
- **official_source_url:** https://www.auswaertiges-amt.de/en/visa-service
- **is_verified:** false

### Step 5
- **title:** Attend the Appointment and Submit Biometrics
- **explanation:** Attend your appointment in person to submit documents and provide
  biometric data (fingerprints and a photo). Bring originals and copies as instructed. Visa
  fees apply and are set by the authorities — verify the current fee (subject to change).
  Keep all receipts and your application reference.
- **official_source_name:** German Missions in India — Visa / Studying in Germany
- **official_source_url:** https://india.diplo.de/in-en/service/visa-einreise
- **is_verified:** false

---

## Phase: before_departure

### Step 1
- **title:** Arrange Initial Accommodation Before You Travel
- **explanation:** Secure at least temporary accommodation before leaving India. A
  confirmed address is needed for the mandatory city registration (Anmeldung) after arrival
  and for opening accounts. University housing (Studierendenwerk) and private options exist;
  confirm in writing before travelling.
- **official_source_name:** Make it in Germany (German Government) — Looking for accommodation
- **official_source_url:** https://www.make-it-in-germany.com/en/living-in-germany/accommodation/find
- **is_verified:** false

### Step 2
- **title:** Collect Your Visa and Check the Details
- **explanation:** Once approved, collect your national visa (a label in your passport valid
  for an initial period) as instructed by the mission. Check that your name, validity, and
  purpose are correct, and note that you will need to apply for a residence permit in
  Germany before the visa expires.
- **official_source_name:** German Missions in India — Visa / Studying in Germany
- **official_source_url:** https://india.diplo.de/in-en/service/visa-einreise
- **is_verified:** false

### Step 3
- **title:** Book Travel and Plan Your Arrival Timing
- **explanation:** Plan arrival around your enrolment and any orientation, within your
  visa's validity. Keep your admission letter, blocked-account/financial proof, and
  insurance documents accessible for travel and any border questions. Verify current entry
  guidance on the official site (subject to change).
- **official_source_name:** Make it in Germany (German Government) — Entry and visa
- **official_source_url:** https://www.make-it-in-germany.com/en/studying-training/studying/visa-for-studies
- **is_verified:** false

### Step 4
- **title:** Organise the Documents to Carry in Your Hand Luggage
- **explanation:** Carry your passport (with visa), admission letter, proof of financial
  resources, health insurance, and accommodation confirmation in your hand luggage. German/
  EU border officers may ask to see supporting documents on entry.
- **official_source_name:** German Federal Foreign Office — Entering Germany
- **official_source_url:** https://www.auswaertiges-amt.de/en/visa-service
- **is_verified:** false

---

## Phase: after_arrival

### Step 1
- **title:** Register Your Address (Anmeldung)
- **explanation:** Soon after arriving and moving into accommodation, you must register your
  address at the local residents' registration office (Bürgeramt) — the Anmeldung. You
  receive a registration confirmation (Meldebescheinigung) needed for later steps such as
  the residence permit and bank account. Verify the local deadline and required documents
  with your city (subject to change).
- **official_source_name:** Make it in Germany (German Government) — Registering your address
- **official_source_url:** https://www.make-it-in-germany.com/en/living-in-germany/first-steps/registration
- **is_verified:** false

### Step 2
- **title:** Apply for Your Residence Permit (Aufenthaltstitel)
- **explanation:** Before your entry visa expires, apply for a student residence permit at
  the local foreigners' authority (Ausländerbehörde). You typically need your passport,
  Anmeldung confirmation, enrolment certificate, proof of financial resources, and health
  insurance. Confirm the current document list and appointment process with your local
  authority.
- **official_source_name:** Make it in Germany (German Government) — Residence permit
- **official_source_url:** https://www.make-it-in-germany.com/en/visa-residence/types/residence-permit
- **is_verified:** false

### Step 3
- **title:** Enrol at Your University and Set Up Health Insurance
- **explanation:** Complete enrolment (Immatrikulation) with the required documents and
  finalise your statutory or recognised health insurance, which the university usually needs
  to confirm. The international office advises on registration, insurance, and student
  services.
- **official_source_name:** Make it in Germany (German Government) — Health insurance
- **official_source_url:** https://www.make-it-in-germany.com/en/living-in-germany/insurance/health-insurance
- **is_verified:** false

### Step 4
- **title:** Open a German Bank Account
- **explanation:** A German account is needed for rent, daily spending, and to access funds
  from a blocked account. Banks typically ask for your passport, residence registration
  (Anmeldung), and enrolment certificate; some app-based banks can be opened earlier. Check
  each provider's current requirements.
- **official_source_name:** Make it in Germany (German Government) — Opening a bank account
- **official_source_url:** https://www.make-it-in-germany.com/en/living-in-germany/first-steps/bank-account
- **is_verified:** false

### Step 5
- **title:** Get a German SIM Card
- **explanation:** A local number is useful for banking, university systems, and daily life.
  Prepaid SIMs from major networks and sub-brands are available at shops and supermarkets;
  identity verification is required for activation. Compare coverage and price for your city.
- **official_source_name:** Federal Network Agency (Bundesnetzagentur) — Telecommunications
- **official_source_url:** https://www.bundesnetzagentur.de/EN/Areas/Telecommunications/start.html
- **is_verified:** false

---

*DRAFT — UNVERIFIED. All links and requirements must be human-checked before use.*
