/**
 * Structured "Necessities" content, derived from the drafted markdown in
 * mobile/content/ (mandatories_us.md, necessities_us.md) per the structure in
 * necessities_structure.md.
 *
 * Prose was condensed into plain-English explanations rather than parsed at
 * runtime — the drafts are narrative, not machine-readable, and this keeps the
 * screen simple. Country-scoped: add a new entry to NECESSITIES_BY_COUNTRY to
 * support UK, Canada, etc. without changing the screen.
 *
 * Official-source links point at stable canonical domains; users should
 * confirm specifics with their own school and the official source.
 */

export interface NecessityItem {
  id: string;
  title: string;
  /** 1–3 sentence "what it is / why it matters" in plain English. */
  explanation: string;
  /** Official source link, where one is relevant (journey-step pattern). */
  source?: { name: string; url: string };
  /** Optional caveat shown above the explanation (e.g. "if eligible"). */
  note?: string;
}

export interface NecessitySection {
  key: 'mandatories' | 'necessities';
  title: string;
  tagline: string;
  /** Mandatories are sequence-sensitive and rendered with order numbers. */
  ordered: boolean;
  items: NecessityItem[];
}

const STUDY_IN_THE_STATES = {
  name: 'Study in the States (DHS)',
  url: 'https://studyinthestates.dhs.gov',
};

const US_SECTIONS: NecessitySection[] = [
  {
    key: 'mandatories',
    title: 'Mandatories',
    tagline:
      'Must-do legal and institutional steps. Skip these and your visa status is at risk — work through them roughly in order.',
    ordered: true,
    items: [
      {
        id: 'us-mand-sevis',
        title: 'SEVIS Check-In',
        explanation:
          "SEVIS is the US government database that tracks international students. After you arrive, your school must mark you 'active' in it — usually via an online arrival form or an in-person visit before the deadline tied to your I-20 (F-1) or DS-2019 (J-1). Miss the window and you can fall out of legal status even if you've done nothing else wrong.",
        source: STUDY_IN_THE_STATES,
      },
      {
        id: 'us-mand-iso',
        title: 'Report to Your International Office',
        explanation:
          'Your international student office (ISO/ISSO/OIA) manages your I-20 or DS-2019 and keeps your SEVIS record valid. Register with them at the start of every semester and whenever your address, program, or funding changes — and attend any mandatory new-student orientation. They are also your first call if anything goes wrong.',
        source: STUDY_IN_THE_STATES,
      },
      {
        id: 'us-mand-fulltime',
        title: 'Register for Classes (Full-Time)',
        explanation:
          "F-1 students must keep full-time enrollment every semester — typically 12 credits for undergrads, 9 for grad students. Dropping below full-time without prior approval from your international office violates your status, so get written approval first; never just drop a class.",
        source: STUDY_IN_THE_STATES,
      },
      {
        id: 'us-mand-insurance',
        title: 'Enroll in Health Insurance',
        explanation:
          "Most universities require students to carry health insurance, and many auto-enroll you in a Student Health Insurance Plan (SHIP) charged to your account. US healthcare is extremely expensive without coverage, and international students generally can't use programs like Medicaid. If you have comparable coverage, there's usually a waiver — but you must apply by a deadline.",
        source: { name: 'HealthCare.gov', url: 'https://www.healthcare.gov' },
      },
      {
        id: 'us-mand-bank',
        title: 'Open a US Bank Account',
        explanation:
          'A US account lets you receive stipends and wire transfers, pay rent, and avoid foreign-transaction fees on everyday spending. Visit a branch in person with your passport, visa, I-20/DS-2019, proof of US address, and school ID — most major banks and credit unions have branches near campus.',
        source: {
          name: 'Consumer Financial Protection Bureau',
          url: 'https://www.consumerfinance.gov',
        },
      },
      {
        id: 'us-mand-ssn',
        title: 'Apply for an SSN (If Eligible)',
        note:
          'Only if you have authorized employment (e.g. an on-campus job or assistantship). If you are not working yet, you may not be eligible — and do not need to apply right away.',
        explanation:
          "A Social Security Number is a 9-digit ID used for paid work, taxes, and many financial services. If you have authorized employment, get an authorization letter from your international office, then visit a Social Security Administration office in person with your passport, visa, and I-20/DS-2019. Wait at least 10 days after entering the US so your entry records appear in the system.",
        source: { name: 'Social Security Administration', url: 'https://www.ssa.gov/ssnumber' },
      },
    ],
  },
  {
    key: 'necessities',
    title: 'Necessities',
    tagline:
      "Practical setup for daily life. Not legally required, but you'll want these sorted in your first week or two — in any order.",
    ordered: false,
    items: [
      {
        id: 'us-nec-phone',
        title: 'Get a US Phone Plan',
        explanation:
          'Your home SIM either will not work or will rack up heavy roaming charges, and almost everything here — two-factor codes, deliveries, rideshares, apartment and job forms — assumes a reachable US number. Prepaid no-contract plans (T-Mobile, AT&T, Verizon, or budget carriers like Mint, Visible, Cricket) are easy to set up without US credit history. Bring an unlocked phone if you can.',
      },
      {
        id: 'us-nec-transit',
        title: 'Get a Transit Card',
        explanation:
          'Most US transit systems use a reloadable card or linked account (CharlieCard in Boston, OMNY/MetroCard in NYC, Clipper in the Bay Area, Ventra in Chicago, ORCA in Seattle). Cash often is not accepted on rail, and the card is cheaper per ride with auto-reload. Check whether your university bundles or discounts a transit pass — many do.',
      },
      {
        id: 'us-nec-furniture',
        title: 'Sort Basic Furniture',
        explanation:
          "University housing is usually furnished only at a basic level and off-campus apartments come empty, so you'll need at least a bed, bedding, towels, and basic cookware. Facebook Marketplace, campus 'free & for sale' groups, and thrift stores are far cheaper than buying new. Whatever else waits, have bedding and a towel ready for your first night.",
      },
      {
        id: 'us-nec-groceries',
        title: 'Find Groceries',
        explanation:
          'Eating out every meal adds up fast, so find your nearest store and stock a basic pantry. Large chains (Walmart, Target, Kroger, Safeway) have the widest selection; discount chains like Aldi and Lidl and local ethnic grocers are often cheaper still. Start with staples — rice or pasta, oil, eggs, bread, and a few vegetables.',
      },
      {
        id: 'us-nec-clothing',
        title: 'Get Weather-Appropriate Clothing',
        explanation:
          'US climates vary enormously — a wardrobe for Minnesota in winter is nothing like one for Miami, and summers bring aggressive indoor air conditioning. If your city has cold winters, buy a proper coat, boots, and thermal layers before the season hits, as they are hard to find cheaply mid-winter. Thrift stores are great for coats and cold-weather gear.',
        source: { name: 'National Weather Service', url: 'https://www.weather.gov' },
      },
    ],
  },
];

const GB_SECTIONS: NecessitySection[] = [
  {
    key: 'mandatories',
    title: 'Mandatories',
    tagline:
      'Must-do legal and institutional steps. Skip these and your UK immigration status can be at risk — work through them roughly in order.',
    ordered: true,
    items: [
      {
        id: 'gb-mand-status',
        title: 'Confirm Your Immigration Status (eVisa / BRP)',
        explanation:
          'Your Student visa is your legal permission to live, study, and work in the UK, and you must be able to prove it — increasingly through a digital eVisa linked to a UKVI account rather than a physical Biometric Residence Permit (BRP). Read your visa decision letter to see which applies to you and set up access early.',
        source: { name: 'GOV.UK — eVisa', url: 'https://www.gov.uk/evisa' },
      },
      {
        id: 'gb-mand-enrol',
        title: 'Enrol With Your University',
        explanation:
          'Your university is your visa sponsor and must confirm to UK Visas and Immigration that you have arrived and are studying. Complete enrolment and any international check-in, or your sponsorship — and visa — can be at risk.',
      },
      {
        id: 'gb-mand-gp',
        title: 'Register With a GP (NHS Doctor)',
        explanation:
          'A GP surgery is your gateway to most NHS healthcare. Register with one near your address as soon as you arrive — you do not need to be ill to register, and registration is free.',
        source: {
          name: 'NHS — How to register with a GP surgery',
          url: 'https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/',
        },
      },
      {
        id: 'gb-mand-bank',
        title: 'Open a UK Bank Account',
        explanation:
          'A UK current account lets you receive money, pay rent by bank transfer (very common in the UK), and avoid foreign-transaction fees. Banks typically ask for your passport, immigration document, and proof of a UK address plus a university letter.',
        source: { name: 'MoneyHelper (UK government-backed)', url: 'https://www.moneyhelper.org.uk' },
      },
      {
        id: 'gb-mand-ni',
        title: 'Apply for a National Insurance Number (If You Will Work)',
        note:
          'Only if you take paid work. A Student visa permits limited work — confirm your own visa conditions before taking a job.',
        explanation:
          'A National Insurance (NI) number records your tax and social-security contributions when you work. You can usually only apply after arriving in the UK, and you may be able to start an authorised job before the number arrives.',
        source: {
          name: 'GOV.UK — Apply for a National Insurance number',
          url: 'https://www.gov.uk/apply-national-insurance-number',
        },
      },
      {
        id: 'gb-mand-police',
        title: 'Police Registration — Almost Certainly No Longer Required',
        explanation:
          'Police registration for students was abolished by the UK government in 2022. It is listed here only because older guidance still mentions it; in almost all current cases you do not need to do anything.',
        source: { name: 'GOV.UK', url: 'https://www.gov.uk' },
      },
    ],
  },
  {
    key: 'necessities',
    title: 'Necessities',
    tagline:
      "Practical setup for daily life. Not legally required, but you'll want these sorted in your first week or two — in any order.",
    ordered: false,
    items: [
      {
        id: 'gb-nec-sim',
        title: 'Get a UK SIM / Phone Plan',
        explanation:
          'A UK number is assumed by bank verification, university systems, two-factor logins, and NHS bookings. Pay-as-you-go SIMs from the main networks or their cheaper sub-brands need no contract or credit history — bring an unlocked phone if you can.',
        source: { name: 'Ofcom (UK communications regulator)', url: 'https://www.ofcom.org.uk' },
      },
      {
        id: 'gb-nec-transit',
        title: 'Set Up Travel (Contactless / Local Transit Card)',
        explanation:
          'In London, a contactless bank card or Oyster card applies automatic daily and weekly fare caps; other cities have their own systems and passes. A national Railcard can cut rail fares if you are eligible.',
        source: { name: 'Transport for London (London)', url: 'https://tfl.gov.uk' },
      },
      {
        id: 'gb-nec-furniture',
        title: 'Sort Basic Furniture and Household Essentials',
        explanation:
          'University halls are often part-furnished but rarely include bedding or kitchen items, and private rentals vary. Facebook Marketplace, Gumtree, campus buy/sell groups, and charity shops are far cheaper than buying new — have a duvet, pillow, and towel ready for your first night.',
      },
      {
        id: 'gb-nec-groceries',
        title: 'Find Groceries',
        explanation:
          'Cooking even simple meals saves a lot over a term. Budget supermarkets are cheapest for staples; mainstream chains have wider selection and loyalty cards; many towns also have international grocers with familiar ingredients.',
      },
      {
        id: 'gb-nec-clothing',
        title: 'Get Weather-Appropriate Clothing',
        explanation:
          'UK weather is mild but frequently wet and windy. The single most useful item is a genuinely waterproof, windproof jacket plus warm layers, rather than one heavy coat.',
        source: { name: 'Met Office', url: 'https://www.metoffice.gov.uk' },
      },
    ],
  },
];

const CA_SECTIONS: NecessitySection[] = [
  {
    key: 'mandatories',
    title: 'Mandatories',
    tagline:
      'Must-do legal and institutional steps tied to your Study Permit. Skip these and your status can be at risk — work through them roughly in order.',
    ordered: true,
    items: [
      {
        id: 'ca-mand-permit',
        title: 'Check the Conditions on Your Study Permit',
        explanation:
          'A border officer issues your physical Study Permit when you land; it lists your permit expiry, the requirement to study at a Designated Learning Institution (DLI), and any work conditions. Read it on the spot and tell the officer immediately if anything is wrong.',
        source: {
          name: 'IRCC — Study in Canada',
          url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html',
        },
      },
      {
        id: 'ca-mand-enrol',
        title: 'Confirm Enrolment at Your DLI',
        explanation:
          'Your Study Permit requires you to be enrolled and making progress at a Designated Learning Institution, and institutions report international enrolment to IRCC. Complete registration and any international check-in your university requires.',
      },
      {
        id: 'ca-mand-sin',
        title: 'Apply for a Social Insurance Number (If You Will Work)',
        note:
          'Only if your Study Permit authorises work. If it does not, you may not be eligible yet.',
        explanation:
          'A Social Insurance Number (SIN) is required to be paid legally and to file taxes in Canada. Apply at a Service Canada Centre with your passport and Study Permit — the SIN is free, so never pay a third party for it.',
        source: {
          name: 'Service Canada — Social Insurance Number',
          url: 'https://www.canada.ca/en/employment-social-development/services/sin.html',
        },
      },
      {
        id: 'ca-mand-health',
        title: 'Sort Health Coverage (Province + University Plan)',
        explanation:
          'Healthcare is run by each province and territory, so your eligibility for public coverage — and any waiting period before it starts — depends on where you study. Many universities auto-enrol international students in a mandatory plan to cover the gap; make sure you are never uninsured.',
      },
      {
        id: 'ca-mand-bank',
        title: 'Open a Canadian Bank Account',
        explanation:
          'A Canadian chequing account lets you receive funds, pay rent, and avoid foreign-card fees, and is the basis for building Canadian credit history. Major banks offer student accounts; you will typically need your Study Permit, passport, and a Canadian address.',
        source: {
          name: 'Financial Consumer Agency of Canada',
          url: 'https://www.canada.ca/en/financial-consumer-agency.html',
        },
      },
    ],
  },
  {
    key: 'necessities',
    title: 'Necessities',
    tagline:
      "Practical setup for daily life. Not legally required, but you'll want these sorted in your first week or two — in any order.",
    ordered: false,
    items: [
      {
        id: 'ca-nec-sim',
        title: 'Get a Canadian SIM / Phone Plan',
        explanation:
          'A Canadian number is assumed by bank setup, university portals, two-factor logins, and most apps. Prepaid or month-to-month plans from the big carriers or their cheaper sub-brands need no credit check or SIN — bring an unlocked phone.',
        source: { name: 'CRTC (Canadian telecom regulator)', url: 'https://crtc.gc.ca' },
      },
      {
        id: 'ca-nec-transit',
        title: 'Get a Transit Card / Fare Account',
        explanation:
          'Most cities use a reloadable transit card or app (e.g. Presto in much of Ontario, OPUS in Montreal, Compass in Metro Vancouver). Many universities bundle a discounted U-Pass into student fees — check before buying separately.',
      },
      {
        id: 'ca-nec-winter',
        title: 'Get Winter-Ready Clothing (Do Not Underestimate This)',
        explanation:
          'Outside the mild BC south coast, Canadian winters are long and seriously cold, and inadequate clothing is unsafe. A proper insulated parka, waterproof insulated boots, a warm hat, gloves, and thermal layers are the most important practical purchase for most students.',
        source: {
          name: 'Environment and Climate Change Canada (weather)',
          url: 'https://weather.gc.ca',
        },
      },
      {
        id: 'ca-nec-furniture',
        title: 'Sort Basic Furniture and Household Essentials',
        explanation:
          'Residences are often partly furnished, but off-campus apartments are usually empty, and warm bedding matters here. Facebook Marketplace, Kijiji, campus buy/sell groups, and thrift stores are far cheaper than buying new.',
      },
      {
        id: 'ca-nec-groceries',
        title: 'Find Groceries',
        explanation:
          'Cooking simple meals saves significantly over a term. Discount chains are cheapest for staples; mainstream chains have wider selection and loyalty programs; most cities also have international grocers with familiar ingredients.',
      },
    ],
  },
];

const AU_SECTIONS: NecessitySection[] = [
  {
    key: 'mandatories',
    title: 'Mandatories',
    tagline:
      'Must-do legal and institutional steps tied to your Student visa (subclass 500). Skip these and your visa can be at risk — work through them roughly in order.',
    ordered: true,
    items: [
      {
        id: 'au-mand-enrol',
        title: 'Enrol and Confirm Your Course (CoE)',
        explanation:
          'Your subclass 500 visa is granted on the condition that you study the registered course on your Confirmation of Enrolment (CoE), and your provider reports your status to the government. Complete enrolment and make sure your CoE details match what you are actually studying.',
        source: { name: 'Department of Home Affairs (immi)', url: 'https://immi.homeaffairs.gov.au' },
      },
      {
        id: 'au-mand-oshc',
        title: 'Keep Your OSHC (Overseas Student Health Cover) Active',
        explanation:
          'Holding adequate health insurance (OSHC) for the whole of your stay is a condition of the subclass 500 visa, and international students generally cannot rely on Medicare. Confirm your policy is active and paid, and extend it if your course is extended.',
        source: { name: 'Australian Government Department of Health', url: 'https://www.health.gov.au' },
      },
      {
        id: 'au-mand-tfn',
        title: 'Get a Tax File Number (If You Will Work)',
        note:
          'Only if you take paid work. The Student visa generally allows limited work — confirm current conditions.',
        explanation:
          'A Tax File Number (TFN) keeps you from being taxed at the highest no-TFN rate and is used for superannuation. Apply free online through the Australian Taxation Office after you arrive — never pay a third party.',
        source: { name: 'Australian Taxation Office', url: 'https://www.ato.gov.au' },
      },
      {
        id: 'au-mand-bank',
        title: 'Open an Australian Bank Account',
        explanation:
          'Rent, wages, and bills mostly move by bank transfer (and PayID/Osko), which need a local account. Major banks let you open a student/everyday account — bring your passport, visa grant, a local address, and your TFN once you have it.',
        source: { name: 'Moneysmart (Australian Government)', url: 'https://moneysmart.gov.au' },
      },
      {
        id: 'au-mand-address',
        title: 'Keep Your Provider Updated With Your Address',
        explanation:
          'Student visa holders must give their education provider a current Australian residential address and update it promptly after moving. Your provider needs to be able to contact you, and keeping details current is part of staying compliant.',
        source: { name: 'Department of Home Affairs (immi)', url: 'https://immi.homeaffairs.gov.au' },
      },
      {
        id: 'au-mand-conditions',
        title: 'Understand and Comply With Your Visa Conditions',
        explanation:
          'Your visa grant notice lists conditions — maintaining enrolment and course progress, keeping OSHC, and staying within work-hour limits. Breaching them can lead to cancellation, so know your condition codes and ask before acting if unsure.',
        source: { name: 'Home Affairs — VEVO (check your conditions)', url: 'https://immi.homeaffairs.gov.au' },
      },
    ],
  },
  {
    key: 'necessities',
    title: 'Necessities',
    tagline:
      "Practical setup for daily life. Not legally required, but you'll want these sorted in your first week or two — in any order.",
    ordered: false,
    items: [
      {
        id: 'au-nec-sim',
        title: 'Get an Australian SIM / Phone Plan',
        explanation:
          'An Australian number is assumed by two-factor authentication, MyGov and bank logins, rideshare, and rental and job forms. Prepaid SIMs are easy to set up without local credit history; resellers run on the big networks for less.',
      },
      {
        id: 'au-nec-transit',
        title: 'Get a Public Transport Smartcard',
        explanation:
          'Each state uses its own reloadable card or contactless tap-on (e.g. Opal in NSW, Myki in Victoria, Go card in Queensland), and these cap your daily and weekly spend. Whether international students get a concession (student) fare varies a lot by state.',
      },
      {
        id: 'au-nec-furniture',
        title: 'Sort Basic Furniture and Household Essentials',
        explanation:
          'Student accommodation ranges from fully furnished to empty, and most private share-house rooms are unfurnished. Facebook Marketplace, Gumtree, student groups, and op shops (charity stores) are the cheapest sources.',
      },
      {
        id: 'au-nec-groceries',
        title: 'Find Groceries',
        explanation:
          'Eating out in Australia adds up fast, so cooking simple meals saves a lot over a semester. Coles and Woolworths are everywhere, Aldi is cheaper for staples, and most cities have international grocers with familiar ingredients.',
      },
      {
        id: 'au-nec-clothing',
        title: 'Get Weather-Appropriate Clothing',
        explanation:
          'Australia’s seasons are reversed from the Northern Hemisphere and climates vary enormously — tropical in the north, genuinely cold winters in the south. Sun protection (hat, sunglasses, high-SPF sunscreen) matters year-round because UV is strong even on cool days.',
        source: { name: 'Bureau of Meteorology', url: 'https://www.bom.gov.au' },
      },
    ],
  },
];

const DE_SECTIONS: NecessitySection[] = [
  {
    key: 'mandatories',
    title: 'Mandatories',
    tagline:
      'Must-do legal and institutional steps. Several depend on each other, so order matters — work through them roughly in sequence.',
    ordered: true,
    items: [
      {
        id: 'de-mand-anmeldung',
        title: 'Register Your Address (Anmeldung)',
        explanation:
          'The Anmeldung registers your address at the local Bürgeramt and produces a confirmation (Meldebescheinigung) that you need for a bank account, residence permit, and many contracts. Appointments can take weeks, so book one as soon as you have an address and get several copies of the confirmation.',
      },
      {
        id: 'de-mand-immatrikulation',
        title: 'Enrol at Your University (Immatrikulation)',
        explanation:
          'Formal enrolment makes you an official student, unlocks your student ID and Semesterticket, and is usually required for your study residence permit. It typically requires proof of health insurance and payment of the semester contribution.',
      },
      {
        id: 'de-mand-insurance',
        title: 'Get German Health Insurance (Krankenversicherung)',
        explanation:
          'Health insurance is mandatory and is a prerequisite for enrolment. Students are often eligible for public (statutory) insurance, while some take private cover — confirm which applies to you and do not rely on travel insurance for enrolment.',
      },
      {
        id: 'de-mand-bank',
        title: 'Open a German Bank Account (Girokonto)',
        explanation:
          'A current account with a German IBAN is needed for rent, the broadcasting fee, and many bills paid by SEPA transfer or direct debit. If your visa required a blocked account (Sperrkonto), set up access to it early to draw your monthly living allowance.',
        source: {
          name: 'German Federal Foreign Office (blocked account / Sperrkonto)',
          url: 'https://www.auswaertiges-amt.de',
        },
      },
      {
        id: 'de-mand-permit',
        title: 'Apply for Your Residence Permit (Aufenthaltstitel)',
        explanation:
          'If your nationality requires it, you must apply for a residence permit at the local Foreigners’ Office (Ausländerbehörde) after arriving, even if you entered on a national visa. Appointments can take a long time, so apply well before your entry visa expires.',
        source: {
          name: 'German Federal Foreign Office + your city’s Ausländerbehörde',
          url: 'https://www.auswaertiges-amt.de',
        },
      },
      {
        id: 'de-mand-rundfunk',
        title: 'Register for the Broadcasting Fee (Rundfunkbeitrag)',
        explanation:
          'The Rundfunkbeitrag is a mandatory public-broadcasting fee charged per household, regardless of whether you own a TV. In a shared flat usually only one registration is needed, so coordinate with flatmates; ignoring the letters that arrive after your Anmeldung can lead to enforced collection.',
        source: { name: 'Rundfunkbeitrag (official)', url: 'https://www.rundfunkbeitrag.de' },
      },
    ],
  },
  {
    key: 'necessities',
    title: 'Necessities',
    tagline:
      "Practical setup for daily life. Not legally required, but you'll want these sorted in your first week or two — in any order.",
    ordered: false,
    items: [
      {
        id: 'de-nec-sim',
        title: 'Get a German SIM / Phone Plan',
        explanation:
          'A German number is assumed by bank logins, two-factor codes, appointment bookings (Termine), and university portals. Prepaid SIMs are easiest without local credit history, but German law requires ID (passport) to register a SIM when you activate it.',
      },
      {
        id: 'de-nec-transit',
        title: 'Set Up Public Transport (Semesterticket / Deutschlandticket)',
        explanation:
          'Germany has extensive public transport, and most students travel on a monthly pass rather than single tickets — the nationwide Deutschlandticket is a flat monthly subscription. Many universities already include a Semesterticket in enrolment fees, so check before buying anything separately.',
      },
      {
        id: 'de-nec-furniture',
        title: 'Sort Basic Furniture and Household Essentials',
        explanation:
          'German rentals are often completely unfurnished — sometimes without a fitted kitchen or light fixtures — while dorm rooms are usually furnished. Kleinanzeigen (second-hand marketplace), student groups, charity furniture shops, and IKEA/discounters are the cheapest sources.',
      },
      {
        id: 'de-nec-groceries',
        title: 'Find Groceries',
        explanation:
          'Cooking at home is much cheaper than eating out, especially at discounters (Aldi, Lidl, Netto, Penny). Note that many bottles and cans carry a small Pfand (deposit) you reclaim at machines, and most supermarkets are closed on Sundays — shop ahead.',
      },
      {
        id: 'de-nec-clothing',
        title: 'Get Weather-Appropriate Clothing',
        explanation:
          'German winters are cold, dark, and often wet (roughly November–March) with short daylight, while summers are mild to warm. Buy a genuinely warm, waterproof coat plus a hat, gloves, and waterproof shoes before winter sets in, and layer for the swingy shoulder seasons.',
        source: { name: 'German Weather Service (DWD)', url: 'https://www.dwd.de' },
      },
    ],
  },
];

/** Necessities content keyed by destination country code. */
export const NECESSITIES_BY_COUNTRY: Record<string, NecessitySection[]> = {
  US: US_SECTIONS,
  GB: GB_SECTIONS,
  CA: CA_SECTIONS,
  AU: AU_SECTIONS,
  DE: DE_SECTIONS,
};

/**
 * Returns the necessities sections for a country, or an EMPTY list when no
 * country-specific content exists yet. Never falls back to another country's
 * data — showing the wrong country's setup steps would be misleading. Callers
 * must render an explicit "not available yet" state when `sections` is empty.
 */
export function getNecessities(countryCode?: string | null): {
  countryCode: string;
  sections: NecessitySection[];
} {
  const code = countryCode?.toUpperCase() ?? '';
  return { countryCode: code, sections: NECESSITIES_BY_COUNTRY[code] ?? [] };
}
