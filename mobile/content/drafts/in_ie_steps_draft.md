# India → Ireland — Corridor Steps (DRAFT)

> **DRAFT — UNVERIFIED**
>
> Drafts the IN→IE student journey to match the field structure of `IN_US_STEPS`
> in `app/core/seed.py` (`phase`, `step_number`, `title`, `explanation`,
> `official_source_name`, `official_source_url`, `is_verified`).
>
> **Every step has `is_verified: false`.** No fees, currency amounts, exact deadlines,
> or processing times are asserted as fact. Irish study-visa and registration rules
> (financial thresholds, medical-insurance rules, registration/IRP procedures) change —
> every requirement must be human-checked against Irish Immigration Service Delivery
> before wiring in. Not legal or immigration advice.
>
> Suggested wiring values: `origin_code="IN"`, `destination_code="IE"`.

---

## Phase: after_acceptance

### Step 1
- **title:** Receive Your Letter of Acceptance and Pay Required Fees
- **explanation:** Your study visa application is based on a letter of acceptance from a
  programme on the Interim List of Eligible Programmes (ILEP) for non-EEA students. NEEDS
  VERIFICATION: confirm your course is on the current ILEP and check whether tuition fees
  (or a required portion) must be paid before you apply — verify the current rule on the
  official guidance.
- **official_source_name:** Irish Immigration Service Delivery — Coming to study in Ireland
- **official_source_url:** https://www.irishimmigration.ie/coming-to-study-in-ireland/
- **is_verified:** false

### Step 2
- **title:** Confirm Whether You Need a Visa Before Travelling
- **explanation:** Indian nationals generally require a visa to enter Ireland, so you apply
  for a long-stay (D) study visa before travelling. Confirm your specific requirement and
  the correct visa type on the official guidance before starting the application.
- **official_source_name:** Irish Immigration Service Delivery — Do I need a visa?
- **official_source_url:** https://www.irishimmigration.ie/coming-to-visit-ireland/visas-for-ireland/
- **is_verified:** false

---

## Phase: visa_process

### Step 1
- **title:** Prepare Proof of Finances and Medical Insurance
- **explanation:** You must show you can support yourself during your studies and hold
  private medical insurance. NEEDS VERIFICATION: the required amount of available funds and
  the accepted forms of proof and insurance are set by the authorities and revised — do not
  rely on any figure quoted elsewhere; verify the current financial and insurance
  requirements on the official site (subject to change).
- **official_source_name:** Irish Immigration Service Delivery — Applying for a long stay study visa
- **official_source_url:** https://www.irishimmigration.ie/coming-to-study-in-ireland/what-are-the-options-for-coming-to-study-in-ireland/applying-for-a-long-stay-study-visa/
- **is_verified:** false

### Step 2
- **title:** Complete the Online Visa Application (AVATS)
- **explanation:** Apply for the long-stay (D) study visa through the official online
  application system (AVATS). You complete the form online, then print and sign the summary
  application form to submit with your documents. Follow the official application steps
  exactly.
- **official_source_name:** Irish Immigration Service Delivery — Online visa application (AVATS)
- **official_source_url:** https://www.visas.inis.gov.ie/avats/OnlineHome.aspx
- **is_verified:** false

### Step 3
- **title:** Submit Documents and Biometrics to the Visa Office / VFS
- **explanation:** Submit your signed application, passport, and supporting documents (letter
  of acceptance, proof of fees paid, financial evidence, medical insurance, academic
  records) as instructed, and provide biometrics where required. In India this is generally
  handled through the appointed visa application centre; confirm the current submission
  centre and process on the official guidance.
- **official_source_name:** Irish Immigration Service Delivery — How to apply for a long stay visa
- **official_source_url:** https://www.irishimmigration.ie/how-to-apply-for-a-long-stay-visa/
- **is_verified:** false

### Step 4
- **title:** Pay the Visa Fee and Await a Decision
- **explanation:** A visa application fee applies and is set by the authorities — do not
  state a figure; verify the current fee (subject to change). Keep your receipt and
  application reference, and watch for the decision and any requests for further documents.
- **official_source_name:** Irish Immigration Service Delivery — Visa fees
- **official_source_url:** https://www.irishimmigration.ie/coming-to-visit-ireland/visas-for-ireland/
- **is_verified:** false

---

## Phase: before_departure

### Step 1
- **title:** Arrange Initial Accommodation Before You Travel
- **explanation:** Secure at least initial accommodation before leaving India; a confirmed
  address helps with arrival and immigration registration. University and private options
  exist — confirm in writing before travelling.
- **official_source_name:** Irish Immigration Service Delivery — Coming to study in Ireland
- **official_source_url:** https://www.irishimmigration.ie/coming-to-study-in-ireland/
- **is_verified:** false

### Step 2
- **title:** Collect Your Passport and Check the Visa
- **explanation:** Once approved, collect your passport with the entry visa and check that
  your name, validity, and entry conditions are correct. Note that the visa permits travel
  to Ireland; your permission to remain is registered after arrival (see the After Arrival
  steps).
- **official_source_name:** Irish Immigration Service Delivery — Coming to study in Ireland
- **official_source_url:** https://www.irishimmigration.ie/coming-to-study-in-ireland/
- **is_verified:** false

### Step 3
- **title:** Book Travel and Plan Your Arrival Timing
- **explanation:** Plan arrival around your course start and orientation, within your visa's
  validity. Keep your letter of acceptance, financial proof, and insurance accessible for
  travel and the immigration officer at the port of entry. Verify current entry guidance on
  the official site (subject to change).
- **official_source_name:** Irish Immigration Service Delivery — Coming to study in Ireland
- **official_source_url:** https://www.irishimmigration.ie/coming-to-study-in-ireland/
- **is_verified:** false

### Step 4
- **title:** Organise the Documents to Carry in Your Hand Luggage
- **explanation:** Carry your passport (with visa), letter of acceptance, proof of fees paid,
  financial evidence, and medical insurance in your hand luggage. An immigration officer at
  the port of entry decides your admission and the period of leave granted, and may ask to
  see these documents.
- **official_source_name:** Irish Immigration Service Delivery — Coming to study in Ireland
- **official_source_url:** https://www.irishimmigration.ie/coming-to-study-in-ireland/
- **is_verified:** false

---

## Phase: after_arrival

### Step 1
- **title:** Clear Immigration at the Port of Entry
- **explanation:** At the airport, an immigration officer reviews your documents and stamps
  your passport with the permission and period granted. Keep your documents ready and note
  the stamp/date, as registration must be completed within the permitted time.
- **official_source_name:** Irish Immigration Service Delivery — Coming to study in Ireland
- **official_source_url:** https://www.irishimmigration.ie/coming-to-study-in-ireland/
- **is_verified:** false

### Step 2
- **title:** Register Your Immigration Permission and Get Your IRP
- **explanation:** Non-EEA students must register their immigration permission after arrival
  and receive an Irish Residence Permit (IRP) card. NEEDS VERIFICATION: registration is done
  through the official registration service (in the Dublin area via the online/appointment
  system, and at regional offices elsewhere) and a registration fee applies — confirm the
  current process, location, and fee on the official site (subject to change).
- **official_source_name:** Irish Immigration Service Delivery — Registering your immigration permission
- **official_source_url:** https://www.irishimmigration.ie/registering-your-immigration-permission/
- **is_verified:** false

### Step 3
- **title:** Enrol at Your Institution and Confirm Insurance
- **explanation:** Complete enrolment and check in with your institution's international
  office, which advises on maintaining your permission, working, and student services, and
  confirms your private medical insurance where needed.
- **official_source_name:** Irish Immigration Service Delivery — Coming to study in Ireland
- **official_source_url:** https://www.irishimmigration.ie/coming-to-study-in-ireland/
- **is_verified:** false

### Step 4
- **title:** Open an Irish Bank Account
- **explanation:** A local account helps with rent, daily spending, and (where applicable)
  meeting financial-proof rules. Banks typically ask for your passport, proof of an Irish
  address, and proof of student status; check each provider's current requirements.
- **official_source_name:** Competition and Consumer Protection Commission — Bank accounts
- **official_source_url:** https://www.ccpc.ie/consumers/money/bank-accounts/
- **is_verified:** false

### Step 5
- **title:** Get an Irish SIM Card
- **explanation:** A local number is useful for banking, your institution's systems, and
  daily life. Prepaid SIMs from major networks and sub-brands are available at shops; bring
  identification as required. Compare coverage and price for your area.
- **official_source_name:** Commission for Communications Regulation (ComReg) — Mobile
- **official_source_url:** https://www.comreg.ie/consumer-information/mobile-phone/
- **is_verified:** false

---

*DRAFT — UNVERIFIED. All links and requirements must be human-checked before use.*
