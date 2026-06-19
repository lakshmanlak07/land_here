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

/** Necessities content keyed by destination country code. */
export const NECESSITIES_BY_COUNTRY: Record<string, NecessitySection[]> = {
  US: US_SECTIONS,
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
