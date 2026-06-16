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
};

/** Returns the work rule for a country code, or null if we have no data yet. */
export function getWorkRule(countryCode?: string | null): WorkRule | null {
  if (!countryCode) return null;
  return WORK_RULES_BY_COUNTRY[countryCode.toUpperCase()] ?? null;
}
