DRAFT — UNVERIFIED

# Necessities Draft — United Kingdom (GB)

is_verified: false
status: DRAFT — UNVERIFIED. NOT wired into the app. Do not surface until every
        item and source below is checked against the official link.
structure: Mirrors `NecessitySection[]` in `mobile/constants/necessities.ts`
           (US is the reference implementation). To wire in later, add a `GB`
           entry to `NECESSITIES_BY_COUNTRY` built from the two sections below.
           Strip the `is_verified` / `flags` fields (or extend the type) at wire-in.
sources:   Official UK government / NHS / regulator links only. Where the exact
           requirement, timeframe, or page is uncertain it is marked
           NEEDS VERIFICATION rather than stated as fact.

---

## Section: Mandatories

key: mandatories
title: Mandatories
tagline: Must-do legal and institutional steps. Skip these and your UK immigration status can be at risk — work through them roughly in order.
ordered: true

### Item
id: gb-mand-status
title: Confirm Your Immigration Status (eVisa / BRP)
explanation: Your Student visa is your legal permission to live, study, and work in the UK, and you must be able to prove it — increasingly through a digital eVisa linked to a UKVI account rather than a physical Biometric Residence Permit (BRP). Read your visa decision letter to see which applies to you and set up access early.
source: { name: 'GOV.UK — eVisa', url: 'https://www.gov.uk/evisa' }
is_verified: false
flags: NEEDS VERIFICATION — whether you have a BRP to collect or a digital eVisa depends on your specific grant; confirm on your decision letter and GOV.UK.

### Item
id: gb-mand-enrol
title: Enrol With Your University
explanation: Your university is your visa sponsor and must confirm to UK Visas and Immigration that you have arrived and are studying. Complete enrolment and any international check-in, or your sponsorship — and visa — can be at risk.
source: { name: 'Your university’s international student office', url: '' }
is_verified: false
flags: NEEDS VERIFICATION — no single government page; exact steps, documents, and deadlines are set by your institution.

### Item
id: gb-mand-gp
title: Register With a GP (NHS Doctor)
explanation: A GP surgery is your gateway to most NHS healthcare. Register with one near your address as soon as you arrive — you do not need to be ill to register, and registration is free.
source: { name: 'NHS — How to register with a GP surgery', url: 'https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/' }
is_verified: false
flags: NEEDS VERIFICATION — documents and catchment rules vary by surgery.

### Item
id: gb-mand-bank
title: Open a UK Bank Account
explanation: A UK current account lets you receive money, pay rent by bank transfer (very common in the UK), and avoid foreign-transaction fees. Banks typically ask for your passport, immigration document, and proof of a UK address plus a university letter.
source: { name: 'MoneyHelper (UK government-backed)', url: 'https://www.moneyhelper.org.uk' }
is_verified: false
flags: NEEDS VERIFICATION — confirm current document requirements directly with each bank.

### Item
id: gb-mand-ni
title: Apply for a National Insurance Number (If You Will Work)
note: Only if you take paid work. A Student visa permits limited work — confirm your own visa conditions before taking a job.
explanation: A National Insurance (NI) number records your tax and social-security contributions when you work. You can usually only apply after arriving in the UK, and you may be able to start an authorised job before the number arrives.
source: { name: 'GOV.UK — Apply for a National Insurance number', url: 'https://www.gov.uk/apply-national-insurance-number' }
is_verified: false
flags: NEEDS VERIFICATION — work-hour limits and right-to-work conditions vary by visa; confirm on GOV.UK and your visa.

### Item
id: gb-mand-police
title: Police Registration — Almost Certainly No Longer Required
explanation: Police registration for students was abolished by the UK government in 2022. It is listed here only because older guidance still mentions it; in almost all current cases you do not need to do anything.
source: { name: 'GOV.UK', url: 'https://www.gov.uk' }
is_verified: false
flags: NEEDS VERIFICATION — confirm no police-registration condition appears on your specific visa decision letter; treat older third-party pages with caution.

---

## Section: Necessities

key: necessities
title: Necessities
tagline: Practical setup for daily life. Not legally required, but you'll want these sorted in your first week or two — in any order.
ordered: false

### Item
id: gb-nec-sim
title: Get a UK SIM / Phone Plan
explanation: A UK number is assumed by bank verification, university systems, two-factor logins, and NHS bookings. Pay-as-you-go SIMs from the main networks or their cheaper sub-brands need no contract or credit history — bring an unlocked phone if you can.
source: { name: 'Ofcom (UK communications regulator)', url: 'https://www.ofcom.org.uk' }
is_verified: false
flags: NEEDS VERIFICATION — check each network’s own coverage map for your city before buying.

### Item
id: gb-nec-transit
title: Set Up Travel (Contactless / Local Transit Card)
explanation: In London, a contactless bank card or Oyster card applies automatic daily and weekly fare caps; other cities have their own systems and passes. A national Railcard can cut rail fares if you are eligible.
source: { name: 'Transport for London (London)', url: 'https://tfl.gov.uk' }
is_verified: false
flags: NEEDS VERIFICATION — outside London, use your local transport operator; Railcard eligibility and student discounts vary.

### Item
id: gb-nec-furniture
title: Sort Basic Furniture and Household Essentials
explanation: University halls are often part-furnished but rarely include bedding or kitchen items, and private rentals vary. Facebook Marketplace, Gumtree, campus buy/sell groups, and charity shops are far cheaper than buying new — have a duvet, pillow, and towel ready for your first night.
source: { name: '', url: '' }
is_verified: false
flags: No official source — practical community knowledge. Your university’s accommodation office often publishes a “what to bring” list.

### Item
id: gb-nec-groceries
title: Find Groceries
explanation: Cooking even simple meals saves a lot over a term. Budget supermarkets are cheapest for staples; mainstream chains have wider selection and loyalty cards; many towns also have international grocers with familiar ingredients.
source: { name: '', url: '' }
is_verified: false
flags: No official source — practical community knowledge.

### Item
id: gb-nec-clothing
title: Get Weather-Appropriate Clothing
explanation: UK weather is mild but frequently wet and windy. The single most useful item is a genuinely waterproof, windproof jacket plus warm layers, rather than one heavy coat.
source: { name: 'Met Office', url: 'https://www.metoffice.gov.uk' }
is_verified: false
flags: NEEDS VERIFICATION — check your specific city’s typical climate before packing.

---

DRAFT — UNVERIFIED
