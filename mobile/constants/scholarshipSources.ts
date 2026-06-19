/**
 * Curated list of OFFICIAL scholarship portals — link-only by design.
 *
 * RULES (do not break these):
 *   • Official sources ONLY: government bodies, official bilateral programs,
 *     and official advising services. No third-party aggregators.
 *   • NO specific dollar amounts, NO deadlines, NO eligibility claims.
 *     Those change constantly — the app only points students to the source.
 *   • Each entry is just: name, a one-line plain-English description, and the
 *     official URL.
 *
 * Grouped by destination where relevant; "Start here" holds cross-country
 * official starting points.
 */

export interface ScholarshipSource {
  name: string;
  /** One-line, plain-English summary of what the portal is. */
  description: string;
  /** The official source URL. */
  url: string;
}

export interface ScholarshipGroup {
  /** ISO destination code, or 'GLOBAL' for cross-country starting points. */
  code: string;
  /** Section heading shown in the UI. */
  title: string;
  sources: ScholarshipSource[];
}

export const SCHOLARSHIP_SOURCES: ScholarshipGroup[] = [
  {
    code: 'GLOBAL',
    title: 'Start here',
    sources: [
      {
        name: 'EducationUSA',
        description:
          'The U.S. State Department’s official advising network for students worldwide.',
        url: 'https://educationusa.state.gov/your-5-steps-us-study/finance-your-studies',
      },
      {
        name: 'Fulbright Foreign Student Program',
        description:
          'Official U.S. government exchange program for graduate study and research.',
        url: 'https://foreign.fulbrightonline.org/',
      },
      {
        name: 'Erasmus+ (European Union)',
        description:
          'The EU’s official program funding study and exchange across Europe.',
        url: 'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students',
      },
      {
        name: 'Erasmus Mundus Joint Masters',
        description:
          'The EU’s official scholarship for joint master’s degrees taught across several European universities.',
        url: 'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters-scholarships',
      },
    ],
  },
  {
    code: 'US',
    title: 'United States',
    sources: [
      {
        name: 'Federal Student Aid (studentaid.gov)',
        description:
          'The U.S. government’s official portal explaining aid and who qualifies.',
        url: 'https://studentaid.gov/understand-aid/types',
      },
      {
        name: 'Fulbright Foreign Student Program',
        description:
          'U.S. government grants for international graduate students and researchers.',
        url: 'https://foreign.fulbrightonline.org/',
      },
      {
        name: 'Knight-Hennessy Scholars',
        description:
          'Stanford University’s official graduate fellowship program open to students worldwide.',
        url: 'https://knight-hennessy.stanford.edu/',
      },
    ],
  },
  {
    code: 'GB',
    title: 'United Kingdom',
    sources: [
      {
        name: 'Chevening Scholarships',
        description:
          'The UK government’s official global scholarship program for master’s study.',
        url: 'https://www.chevening.org/',
      },
      {
        name: 'Commonwealth Scholarships',
        description:
          'UK government scholarships for students from Commonwealth countries.',
        url: 'https://cscuk.fcdo.gov.uk/scholarships/',
      },
      {
        name: 'British Council — Study UK',
        description:
          'The UK’s official body listing scholarships for international students.',
        url: 'https://study-uk.britishcouncil.org/scholarships',
      },
      {
        name: 'Gates Cambridge Scholarships',
        description:
          'The University of Cambridge’s official postgraduate scholarship for international students.',
        url: 'https://www.gatescambridge.org/',
      },
      {
        name: 'Rhodes Scholarships',
        description:
          'The Rhodes Trust’s official postgraduate scholarship for study at the University of Oxford.',
        url: 'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/',
      },
    ],
  },
  {
    code: 'DE',
    title: 'Germany',
    sources: [
      {
        name: 'DAAD Scholarship Database',
        description:
          'Germany’s official academic exchange service and its scholarship search.',
        url: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/',
      },
    ],
  },
  {
    code: 'FR',
    title: 'France',
    sources: [
      {
        name: 'Campus France — Eiffel & funding',
        description:
          'France’s official agency for international students and its funding tools.',
        url: 'https://www.campusfrance.org/en/financer-ses-etudes-en-France',
      },
    ],
  },
  {
    code: 'CA',
    title: 'Canada',
    sources: [
      {
        name: 'EduCanada Scholarships',
        description:
          'The Government of Canada’s official scholarship search for study in Canada.',
        url: 'https://www.educanada.ca/scholarships-bourses/index.aspx?lang=eng',
      },
      {
        name: 'Vanier Canada Graduate Scholarships',
        description:
          'Canada’s official scholarship for world-class doctoral students.',
        url: 'https://vanier.gc.ca/en/home-accueil.html',
      },
    ],
  },
  {
    code: 'AU',
    title: 'Australia',
    sources: [
      {
        name: 'Australia Awards',
        description:
          'The Australian government’s official international scholarships program.',
        url: 'https://www.dfat.gov.au/people-to-people/australia-awards',
      },
      {
        name: 'Study Australia — Scholarships',
        description:
          'Australia’s official study portal and its guide to finding scholarships.',
        url: 'https://www.studyaustralia.gov.au/en/plan-your-studies/scholarships-in-australia',
      },
    ],
  },
  {
    code: 'NL',
    title: 'Netherlands',
    sources: [
      {
        name: 'Study in NL — Grantfinder',
        description:
          'The official Dutch (Nuffic) portal for scholarships and study funding.',
        url: 'https://www.studyinnl.org/finances/scholarships',
      },
      {
        name: 'NL Scholarship (formerly Holland Scholarship)',
        description:
          'The official Dutch (Nuffic) scholarship for studying in the Netherlands.',
        url: 'https://www.studyinnl.org/finances/nl-scholarship',
      },
    ],
  },
  {
    code: 'IE',
    title: 'Ireland',
    sources: [
      {
        name: 'Government of Ireland — International Education Scholarships',
        description:
          'Ireland’s official higher-education authority scholarship program.',
        url: 'https://hea.ie/funding-governance-performance/funding/student-finance/government-of-ireland-international-education-scholarships/',
      },
    ],
  },
  {
    code: 'JP',
    title: 'Japan',
    sources: [
      {
        name: 'MEXT Scholarship (Study in Japan)',
        description:
          'The Japanese government’s official scholarship for international students.',
        url: 'https://www.studyinjapan.go.jp/en/planning/about-scholarship/',
      },
    ],
  },
  {
    code: 'CH',
    title: 'Switzerland',
    sources: [
      {
        name: 'Swiss Government Excellence Scholarships',
        description:
          'The Swiss government’s official scholarships for international researchers and postgraduate students.',
        url: 'https://www.sbfi.admin.ch/sbfi/en/home/education/scholarships-and-grants/swiss-government-excellence-scholarships.html',
      },
    ],
  },
  {
    code: 'CN',
    title: 'China',
    sources: [
      {
        name: 'Schwarzman Scholars',
        description:
          'Tsinghua University’s official master’s scholarship program in global affairs, based in Beijing.',
        url: 'https://www.schwarzmanscholars.org/',
      },
    ],
  },
  {
    code: 'NZ',
    title: 'New Zealand',
    sources: [
      {
        name: 'New Zealand Scholarships (Manaaki)',
        description:
          'New Zealand’s official government scholarships portal, run by Education New Zealand.',
        url: 'https://www.nzscholarships.govt.nz/',
      },
    ],
  },
  {
    code: 'KR',
    title: 'South Korea',
    sources: [
      {
        name: 'Global Korea Scholarship (GKS)',
        description:
          'The Korean government’s official Study in Korea portal and its GKS scholarship.',
        url: 'https://www.studyinkorea.go.kr/',
      },
    ],
  },
];

export const SCHOLARSHIP_DISCLAIMER =
  'These are official starting points. Scholarship details, amounts, and ' +
  'deadlines change — always verify directly on the official source.';
