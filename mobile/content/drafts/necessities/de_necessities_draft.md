DRAFT — UNVERIFIED

# Necessities Draft — Germany (DE)

is_verified: false
status: DRAFT — UNVERIFIED. NOT wired into the app. Do not surface until every
        item and source below is checked against the official link.
structure: Mirrors `NecessitySection[]` in `mobile/constants/necessities.ts`.
           To wire in later, add a `DE` entry to `NECESSITIES_BY_COUNTRY` built
           from the two sections below. Strip `is_verified` / `flags` (or extend
           the type) at wire-in.
sources:   Official German federal / municipal links only. Several steps depend
           on each other (order matters). City-level and insurer-level pages are
           flagged NEEDS VERIFICATION rather than stated as fact.

---

## Section: Mandatories

key: mandatories
title: Mandatories
tagline: Must-do legal and institutional steps. Several depend on each other, so order matters — work through them roughly in sequence.
ordered: true

### Item
id: de-mand-anmeldung
title: Register Your Address (Anmeldung)
explanation: The Anmeldung registers your address at the local Bürgeramt and produces a confirmation (Meldebescheinigung) that you need for a bank account, residence permit, and many contracts. Appointments can take weeks, so book one as soon as you have an address and get several copies of the confirmation.
source: { name: 'Your city’s Bürgeramt / Einwohnermeldeamt website', url: '' }
is_verified: false
flags: NEEDS VERIFICATION — the deadline (often within ~14 days), documents, and booking process vary by municipality. No single national URL.

### Item
id: de-mand-immatrikulation
title: Enrol at Your University (Immatrikulation)
explanation: Formal enrolment makes you an official student, unlocks your student ID and Semesterticket, and is usually required for your study residence permit. It typically requires proof of health insurance and payment of the semester contribution.
source: { name: 'Your university’s International Office (Akademisches Auslandsamt)', url: '' }
is_verified: false
flags: NEEDS VERIFICATION — exact documents and deadlines vary by institution.

### Item
id: de-mand-insurance
title: Get German Health Insurance (Krankenversicherung)
explanation: Health insurance is mandatory and is a prerequisite for enrolment. Students are often eligible for public (statutory) insurance, while some take private cover — confirm which applies to you and do not rely on travel insurance for enrolment.
source: { name: 'A German statutory health insurer (e.g. TK, AOK, Barmer)', url: '' }
is_verified: false
flags: NEEDS VERIFICATION — eligibility for public vs private cover depends on age/funding; confirm accepted insurers with your university. No single official URL.

### Item
id: de-mand-bank
title: Open a German Bank Account (Girokonto)
explanation: A current account with a German IBAN is needed for rent, the broadcasting fee, and many bills paid by SEPA transfer or direct debit. If your visa required a blocked account (Sperrkonto), set up access to it early to draw your monthly living allowance.
source: { name: 'German Federal Foreign Office (blocked account / Sperrkonto)', url: 'https://www.auswaertiges-amt.de' }
is_verified: false
flags: NEEDS VERIFICATION — confirm documentation with each bank and Sperrkonto rules for your visa.

### Item
id: de-mand-permit
title: Apply for Your Residence Permit (Aufenthaltstitel)
explanation: If your nationality requires it, you must apply for a residence permit at the local Foreigners’ Office (Ausländerbehörde) after arriving, even if you entered on a national visa. Appointments can take a long time, so apply well before your entry visa expires.
source: { name: 'German Federal Foreign Office + your city’s Ausländerbehörde', url: 'https://www.auswaertiges-amt.de' }
is_verified: false
flags: NEEDS VERIFICATION — required documents, fees, and whether a permit is needed vary by city and nationality.

### Item
id: de-mand-rundfunk
title: Register for the Broadcasting Fee (Rundfunkbeitrag)
explanation: The Rundfunkbeitrag is a mandatory public-broadcasting fee charged per household, regardless of whether you own a TV. In a shared flat usually only one registration is needed, so coordinate with flatmates; ignoring the letters that arrive after your Anmeldung can lead to enforced collection.
source: { name: 'Rundfunkbeitrag (official)', url: 'https://www.rundfunkbeitrag.de' }
is_verified: false
flags: NEEDS VERIFICATION — confirm current fee, who pays, and any exemptions.

---

## Section: Necessities

key: necessities
title: Necessities
tagline: Practical setup for daily life. Not legally required, but you'll want these sorted in your first week or two — in any order.
ordered: false

### Item
id: de-nec-sim
title: Get a German SIM / Phone Plan
explanation: A German number is assumed by bank logins, two-factor codes, appointment bookings (Termine), and university portals. Prepaid SIMs are easiest without local credit history, but German law requires ID (passport) to register a SIM when you activate it.
source: { name: '', url: '' }
is_verified: false
flags: NEEDS VERIFICATION — compare each network’s coverage map for your city. No single official source.

### Item
id: de-nec-transit
title: Set Up Public Transport (Semesterticket / Deutschlandticket)
explanation: Germany has extensive public transport, and most students travel on a monthly pass rather than single tickets — the nationwide Deutschlandticket is a flat monthly subscription. Many universities already include a Semesterticket in enrolment fees, so check before buying anything separately.
source: { name: 'Your student union (AStA/Studierendenwerk) + regional transit operator', url: '' }
is_verified: false
flags: NEEDS VERIFICATION — riding without a valid/activated ticket can be fined; confirm what your Semesterticket covers.

### Item
id: de-nec-furniture
title: Sort Basic Furniture and Household Essentials
explanation: German rentals are often completely unfurnished — sometimes without a fitted kitchen or light fixtures — while dorm rooms are usually furnished. Kleinanzeigen (second-hand marketplace), student groups, charity furniture shops, and IKEA/discounters are the cheapest sources.
source: { name: '', url: '' }
is_verified: false
flags: No official source — practical community knowledge.

### Item
id: de-nec-groceries
title: Find Groceries
explanation: Cooking at home is much cheaper than eating out, especially at discounters (Aldi, Lidl, Netto, Penny). Note that many bottles and cans carry a small Pfand (deposit) you reclaim at machines, and most supermarkets are closed on Sundays — shop ahead.
source: { name: '', url: '' }
is_verified: false
flags: No official source — practical community knowledge.

### Item
id: de-nec-clothing
title: Get Weather-Appropriate Clothing
explanation: German winters are cold, dark, and often wet (roughly November–March) with short daylight, while summers are mild to warm. Buy a genuinely warm, waterproof coat plus a hat, gloves, and waterproof shoes before winter sets in, and layer for the swingy shoulder seasons.
source: { name: 'German Weather Service (DWD)', url: 'https://www.dwd.de' }
is_verified: false
flags: NEEDS VERIFICATION — check your city’s seasonal averages before packing.

---

DRAFT — UNVERIFIED
