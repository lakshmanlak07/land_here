DRAFT — UNVERIFIED

# Necessities Draft — Canada (CA)

is_verified: false
status: DRAFT — UNVERIFIED. NOT wired into the app. Do not surface until every
        item and source below is checked against the official link.
structure: Mirrors `NecessitySection[]` in `mobile/constants/necessities.ts`.
           To wire in later, add a `CA` entry to `NECESSITIES_BY_COUNTRY` built
           from the two sections below. Strip `is_verified` / `flags` (or extend
           the type) at wire-in.
sources:   Official Government of Canada / provincial / regulator links only.
           Healthcare and transit are province/city-specific and are flagged
           NEEDS VERIFICATION rather than stated as fact.

---

## Section: Mandatories

key: mandatories
title: Mandatories
tagline: Must-do legal and institutional steps tied to your Study Permit. Skip these and your status can be at risk — work through them roughly in order.
ordered: true

### Item
id: ca-mand-permit
title: Check the Conditions on Your Study Permit
explanation: A border officer issues your physical Study Permit when you land; it lists your permit expiry, the requirement to study at a Designated Learning Institution (DLI), and any work conditions. Read it on the spot and tell the officer immediately if anything is wrong.
source: { name: 'IRCC — Study in Canada', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html' }
is_verified: false
flags: NEEDS VERIFICATION — enrolment and work-hour conditions change; confirm what applies to your permit.

### Item
id: ca-mand-enrol
title: Confirm Enrolment at Your DLI
explanation: Your Study Permit requires you to be enrolled and making progress at a Designated Learning Institution, and institutions report international enrolment to IRCC. Complete registration and any international check-in your university requires.
source: { name: 'Your university’s international student office', url: '' }
is_verified: false
flags: NEEDS VERIFICATION — steps and deadlines are set by your institution, not a single government page.

### Item
id: ca-mand-sin
title: Apply for a Social Insurance Number (If You Will Work)
note: Only if your Study Permit authorises work. If it does not, you may not be eligible yet.
explanation: A Social Insurance Number (SIN) is required to be paid legally and to file taxes in Canada. Apply at a Service Canada Centre with your passport and Study Permit — the SIN is free, so never pay a third party for it.
source: { name: 'Service Canada — Social Insurance Number', url: 'https://www.canada.ca/en/employment-social-development/services/sin.html' }
is_verified: false
flags: NEEDS VERIFICATION — confirm your permit authorises work before applying.

### Item
id: ca-mand-health
title: Sort Health Coverage (Province + University Plan)
explanation: Healthcare is run by each province and territory, so your eligibility for public coverage — and any waiting period before it starts — depends on where you study. Many universities auto-enrol international students in a mandatory plan to cover the gap; make sure you are never uninsured.
source: { name: 'Your province/territory health ministry + your university health plan', url: '' }
is_verified: false
flags: NEEDS VERIFICATION — rules differ by province; do not assume coverage starts on arrival. No single national URL.

### Item
id: ca-mand-bank
title: Open a Canadian Bank Account
explanation: A Canadian chequing account lets you receive funds, pay rent, and avoid foreign-card fees, and is the basis for building Canadian credit history. Major banks offer student accounts; you will typically need your Study Permit, passport, and a Canadian address.
source: { name: 'Financial Consumer Agency of Canada', url: 'https://www.canada.ca/en/financial-consumer-agency.html' }
is_verified: false
flags: NEEDS VERIFICATION — confirm document requirements directly with the bank.

---

## Section: Necessities

key: necessities
title: Necessities
tagline: Practical setup for daily life. Not legally required, but you'll want these sorted in your first week or two — in any order.
ordered: false

### Item
id: ca-nec-sim
title: Get a Canadian SIM / Phone Plan
explanation: A Canadian number is assumed by bank setup, university portals, two-factor logins, and most apps. Prepaid or month-to-month plans from the big carriers or their cheaper sub-brands need no credit check or SIN — bring an unlocked phone.
source: { name: 'CRTC (Canadian telecom regulator)', url: 'https://crtc.gc.ca' }
is_verified: false
flags: NEEDS VERIFICATION — rural coverage varies a lot by carrier; check coverage maps for your city.

### Item
id: ca-nec-transit
title: Get a Transit Card / Fare Account
explanation: Most cities use a reloadable transit card or app (e.g. Presto in much of Ontario, OPUS in Montreal, Compass in Metro Vancouver). Many universities bundle a discounted U-Pass into student fees — check before buying separately.
source: { name: 'Your city’s transit authority', url: '' }
is_verified: false
flags: NEEDS VERIFICATION — fare systems and U-Pass details differ by city and university.

### Item
id: ca-nec-winter
title: Get Winter-Ready Clothing (Do Not Underestimate This)
explanation: Outside the mild BC south coast, Canadian winters are long and seriously cold, and inadequate clothing is unsafe. A proper insulated parka, waterproof insulated boots, a warm hat, gloves, and thermal layers are the most important practical purchase for most students.
source: { name: 'Environment and Climate Change Canada (weather)', url: 'https://weather.gc.ca' }
is_verified: false
flags: NEEDS VERIFICATION — check your specific city’s winter climate before packing.

### Item
id: ca-nec-furniture
title: Sort Basic Furniture and Household Essentials
explanation: Residences are often partly furnished, but off-campus apartments are usually empty, and warm bedding matters here. Facebook Marketplace, Kijiji, campus buy/sell groups, and thrift stores are far cheaper than buying new.
source: { name: '', url: '' }
is_verified: false
flags: No official source — practical community knowledge.

### Item
id: ca-nec-groceries
title: Find Groceries
explanation: Cooking simple meals saves significantly over a term. Discount chains are cheapest for staples; mainstream chains have wider selection and loyalty programs; most cities also have international grocers with familiar ingredients.
source: { name: '', url: '' }
is_verified: false
flags: No official source — practical community knowledge.

---

DRAFT — UNVERIFIED
