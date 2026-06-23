/**
 * Student work-hour rules per destination country.
 *
 * Plain-English summaries of how many hours an international student may work
 * on a study visa, on-campus vs off-campus, during term vs breaks. Each entry
 * links to the country's official immigration source so users can verify.
 *
 * These rules change often (several below changed within the last couple of
 * years). Anything we are not fully certain is current carries a `note`. The
 * country detail screen always shows a "verify on the official source"
 * disclaimer alongside this content — never present it as legal advice.
 */

export interface WorkRule {
  /** What a student may work while classes are in session, plain English. */
  termTime: string;
  /** What a student may work during scheduled breaks / holidays. */
  breaks: string;
  /** On-campus employment rules, plain English. */
  onCampus: string;
  /** Off-campus employment rules, plain English. */
  offCampus: string;
  /** Official immigration source to verify against. */
  source: { name: string; url: string };
  /**
   * Caveat shown prominently — e.g. when a limit changed recently or varies by
   * course/visa subclass and we want the user to double-check.
   */
  note?: string;
}

/** Work rules keyed by destination country code (ISO-3166 alpha-2). */
export const WORK_RULES_BY_COUNTRY: Record<string, WorkRule> = {
  US: {
    termTime: 'Up to 20 hours/week of on-campus work while school is in session.',
    breaks: 'Full-time on-campus work allowed during official breaks and holidays.',
    onCampus:
      'On-campus work is allowed from day one on an F-1 visa, capped at 20 hrs/week during term.',
    offCampus:
      'Off-campus work is generally not permitted in your first academic year. After that it requires authorization tied to your studies (CPT or OPT) approved by your school and USCIS.',
    source: {
      name: 'Study in the States (DHS)',
      url: 'https://studyinthestates.dhs.gov/students/work',
    },
  },

  GB: {
    termTime: 'Up to 20 hours/week during term for degree-level students at a university.',
    breaks: 'Full-time work allowed during official holidays/vacation periods.',
    onCampus: 'On- and off-campus work count toward the same weekly limit.',
    offCampus:
      'The 20 hrs/week limit covers all paid work combined. You cannot be self-employed, work as a professional sportsperson, or be an entertainer. Your exact allowance is printed on your visa (BRP).',
    source: {
      name: 'GOV.UK — Student visa: Work',
      url: 'https://www.gov.uk/student-visa/work',
    },
    note:
      'Hours depend on your course level and sponsor. Below-degree-level study usually allows only 10 hrs/week — check the conditions on your own visa.',
  },

  CA: {
    termTime: 'Up to 24 hours/week off-campus while classes are in session.',
    breaks: 'Full-time work allowed during scheduled breaks (e.g. summer, winter holidays).',
    onCampus: 'On-campus work has no weekly hour cap if you meet the eligibility conditions.',
    offCampus:
      'Eligible study-permit holders can work off-campus up to 24 hrs/week during term. You must be a full-time student in an eligible program at a designated learning institution.',
    source: {
      name: 'Government of Canada — Work off campus',
      url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html',
    },
    note:
      'The off-campus limit was raised from 20 to 24 hrs/week in late 2024 — confirm the current figure on the official site.',
  },

  AU: {
    termTime: 'Up to 48 hours per fortnight (two weeks) while your course is in session.',
    breaks: 'Unlimited hours during scheduled course breaks.',
    onCampus: 'On- and off-campus work both count toward the 48-hours-per-fortnight limit.',
    offCampus:
      'Student visa (subclass 500) holders can work up to 48 hours per fortnight during study periods. A fortnight is any 14-day period starting on a Monday.',
    source: {
      name: 'Department of Home Affairs — Subclass 500 work conditions',
      url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
    },
    note:
      'The cap changed to 48 hours/fortnight in mid-2023 — verify the current limit on the official site.',
  },

  DE: {
    termTime: 'Limited annual allowance rather than a weekly cap (see below).',
    breaks: 'Counts against the same annual day allowance.',
    onCampus:
      'Working as a student/research assistant at your university is often treated separately — check with your international office.',
    offCampus:
      'Non-EU students can work 140 full days or 280 half-days per year without separate work-permit approval. Self-employment/freelance work needs explicit permission from the immigration office.',
    source: {
      name: 'Make it in Germany (Federal Government)',
      url: 'https://www.make-it-in-germany.com/en/studying-training/studying/work',
    },
    note:
      'The allowance was raised to 140 full days/year recently — confirm the current figure and how on-campus assistant jobs are counted.',
  },

  IE: {
    termTime: 'Up to 20 hours/week during term on an eligible course.',
    breaks:
      'Up to 40 hours/week during holiday periods (June–September and 15 December–15 January).',
    onCampus: 'On- and off-campus work count toward the same weekly limit.',
    offCampus:
      'Only students on an eligible full-time course on the Interim List of Eligible Programmes (with a valid IRP/Stamp 2) may work. Other study stamps carry no work rights.',
    source: {
      name: 'Irish Immigration Service',
      url: 'https://www.irishimmigration.ie/coming-to-study-in-ireland/what-are-my-rights-and-conditions-as-a-student/working-in-ireland/',
    },
  },

  NL: {
    termTime:
      'Up to 16 hours/week of paid work while your course is in session — or full-time, but only in June, July and August (you cannot combine the two).',
    breaks:
      'Full-time paid work is allowed only during June, July and August. There is no separate allowance for shorter breaks.',
    onCampus:
      'The Netherlands does not distinguish on- from off-campus work — all paid employment counts toward the 16 hrs/week limit and your employer must hold a work permit (TWV).',
    offCampus:
      'For any paid job your employer must first apply to the UWV (Dutch labour authority) for a work permit (TWV). Self-employment / freelance work is allowed and is not subject to the 16 hrs/week limit.',
    source: {
      name: 'IND — Student residence permit',
      url: 'https://ind.nl/en/residence-permits/study/student-residence-permit-for-university-or-higher-professional-education',
    },
  },

  NZ: {
    termTime: 'Up to 25 hours/week during the semester for eligible full-time tertiary students.',
    breaks: 'Full-time work is allowed during scheduled study breaks (e.g. the summer holidays) if your visa conditions permit.',
    onCampus:
      'New Zealand does not distinguish on- from off-campus work. PhD and Research Masters students at NZ tertiary institutions have no weekly hour limit.',
    offCampus:
      'The same 25 hrs/week in-study limit applies to all work. Eligibility depends on your course and provider; your exact conditions are stated on your visa.',
    source: {
      name: 'Immigration New Zealand — Working on a student visa',
      url: 'https://www.immigration.govt.nz/study/once-you-have-a-student-visa/working-on-a-student-visa/',
    },
    note:
      'The in-study limit rose from 20 to 25 hrs/week on 3 November 2025 — confirm the current figure on the official site.',
  },

  FR: {
    termTime:
      'Up to 964 hours per year (about 60% of full-time, roughly 20 hrs/week). France uses an annual cap, not a weekly one.',
    breaks: 'There is no separate break allowance — holiday work counts toward the same 964-hour annual limit.',
    onCampus: 'No separate on-campus regime; campus jobs count toward the same 964-hour annual cap.',
    offCampus:
      'Non-EU students on a student residence permit (VLS-TS) no longer need a separate work permit, provided they stay within 964 hours/year. Different rules apply to Algerian nationals.',
    source: {
      name: 'Campus France — Working while studying',
      url: 'https://www.campusfrance.org/en/working-student',
    },
    note:
      'France uses an annual cap (964 hrs/year ≈ 20 hrs/week), not a weekly limit — pace your hours across the year and confirm the figure on the official site.',
  },

  SG: {
    termTime: 'Up to 16 hours/week during term, and only if you study at an institution on MOM’s approved list.',
    breaks: 'No hour limit during scheduled vacation for eligible full-time matriculated/registered students aged 14 and above.',
    onCampus: 'No on- vs off-campus distinction — the rules apply wherever you work.',
    offCampus:
      'Only Student’s Pass holders at MOM-approved institutions are exempt from needing a separate work pass. Exchange students may not work at all.',
    source: {
      name: 'Ministry of Manpower — Work pass exemption for foreign students',
      url: 'https://www.mom.gov.sg/passes-and-permits/work-pass-exemption-for-foreign-students',
    },
    note:
      'You may only work if your institution is on MOM’s approved list, and exchange students cannot work at all — check your eligibility first.',
  },
};

/** Returns the work rule for a country code, or null if we have no data yet. */
export function getWorkRule(countryCode?: string | null): WorkRule | null {
  if (!countryCode) return null;
  return WORK_RULES_BY_COUNTRY[countryCode.toUpperCase()] ?? null;
}

/**
 * Concise display layer for the standalone "Work hours" guide screen.
 *
 * Each entry is a glanceable summary of the canonical rule in
 * `WORK_RULES_BY_COUNTRY` (same verified source) — short stat labels for the
 * term/break tiles, a flag-derived accent for the country tile, and the source
 * host for the "verify" pill. The full source URL/name is read from the
 * canonical rule via `getWorkRule(code)`; nothing here invents new content.
 */
export interface WorkHoursEntry {
  /** Key into `WORK_RULES_BY_COUNTRY` (the canonical rule + source). */
  code: string;
  /** Short text shown in the coloured country tile (e.g. "UK"). */
  badge: string;
  /** Display name. */
  name: string;
  /** Short visa label shown under the name, e.g. "F-1 visa". */
  visa: string;
  /** Glanceable term-time allowance for the stat tile, e.g. "20 hrs/wk". */
  term: string;
  /** Glanceable break allowance for the stat tile, e.g. "Full-time". */
  breaks: string;
  /** Official-source host shown on the verify pill, e.g. "dhs.gov". */
  sourceHost: string;
  /** Flag-derived accent hue for the country tile. */
  accent: string;
}

/** Curated, ordered list of countries shown on the Work hours screen. */
export const WORK_HOURS_COUNTRIES: WorkHoursEntry[] = [
  { code: 'US', badge: 'US', name: 'United States', visa: 'F-1 visa', term: '20 hrs/wk', breaks: 'Full-time', sourceHost: 'dhs.gov', accent: '#3B5BA5' },
  { code: 'GB', badge: 'UK', name: 'United Kingdom', visa: 'Student visa · degree level', term: '20 hrs/wk', breaks: 'Full-time', sourceHost: 'gov.uk', accent: '#8A1538' },
  { code: 'CA', badge: 'CA', name: 'Canada', visa: 'Study permit · off-campus', term: '24 hrs/wk', breaks: 'Full-time', sourceHost: 'canada.ca', accent: '#C0392B' },
  { code: 'AU', badge: 'AU', name: 'Australia', visa: 'Student visa (500)', term: '48 hrs/fortnight', breaks: 'Unlimited', sourceHost: 'homeaffairs.gov.au', accent: '#1E6F8A' },
  { code: 'IE', badge: 'IE', name: 'Ireland', visa: 'Stamp 2', term: '20 hrs/wk', breaks: '40 hrs/wk', sourceHost: 'irishimmigration.ie', accent: '#1E8A5A' },
  { code: 'NL', badge: 'NL', name: 'Netherlands', visa: 'Study residence permit', term: '16 hrs/wk', breaks: 'Jun–Aug only', sourceHost: 'ind.nl', accent: '#21468B' },
  { code: 'NZ', badge: 'NZ', name: 'New Zealand', visa: 'Student visa', term: '25 hrs/wk', breaks: 'Full-time', sourceHost: 'immigration.govt.nz', accent: '#00247D' },
  { code: 'FR', badge: 'FR', name: 'France', visa: 'VLS-TS étudiant', term: '964 hrs/yr', breaks: 'Same annual cap', sourceHost: 'campusfrance.org', accent: '#0055A4' },
  { code: 'SG', badge: 'SG', name: 'Singapore', visa: 'Student’s Pass', term: '16 hrs/wk', breaks: 'Unlimited', sourceHost: 'mom.gov.sg', accent: '#EF3340' },
];

/** Footer caption for the Work hours screen. */
export const WORK_HOURS_FOOTER =
  'Immigration rules change often. Always confirm current limits on the ' +
  'official source before you work.';
