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
      {
        name: 'Aga Khan Foundation — International Scholarship Programme',
        description:
          'The Aga Khan Foundation’s official postgraduate scholarship programme for students from selected developing countries.',
        url: 'https://www.akdn.org/our-agencies/aga-khan-foundation/international-scholarship-programme',
      },
      {
        name: 'Joint Japan/World Bank Graduate Scholarship Program',
        description:
          'The World Bank’s official graduate scholarship program for students from developing countries.',
        url: 'https://www.worldbank.org/en/programs/scholarships',
      },
      {
        name: 'Mastercard Foundation Scholars Program',
        description:
          'The Mastercard Foundation’s official scholarship program portal.',
        url: 'https://mastercardfdn.org/en/what-we-do/our-programs/mastercard-foundation-scholars-program/',
      },
      {
        name: 'Rotary Peace Fellowships',
        description:
          'Rotary International’s official fellowship program based at its peace centers.',
        url: 'https://www.rotary.org/en/our-programs/peace-fellowships',
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
      {
        name: 'Hubert H. Humphrey Fellowship Program',
        description:
          'A U.S. State Department exchange program bringing experienced professionals to U.S. universities for non-degree study.',
        url: 'https://www.humphreyfellowship.org/',
      },
      {
        name: 'AAUW International Fellowships',
        description:
          'A nonprofit fellowship program supporting women from outside the U.S. in graduate and postgraduate study.',
        url: 'https://www.aauw.org/resources/programs/fellowships-grants/international-fellowships/',
      },
      {
        name: 'P.E.O. International Peace Scholarship',
        description:
          'A nonprofit scholarship for international women pursuing graduate study in the U.S. or Canada.',
        url: 'https://www.peointernational.org/about-peo-international-peace-scholarship-ips',
      },
      {
        name: 'Margaret McNamara Education Grants',
        description:
          'The MMEG nonprofit’s official education-grants program.',
        url: 'https://www.mmeg.org/',
      },
      {
        name: 'East-West Center Student Programs',
        description:
          'The East-West Center’s official student-programs and scholarships portal.',
        url: 'https://www.eastwestcenter.org/education/student-programs',
      },
    ],
  },
  {
    code: 'UK',
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
      {
        name: 'GREAT Scholarships',
        description:
          'The British Council’s official scholarships with UK universities for students from selected countries.',
        url: 'https://study-uk.britishcouncil.org/scholarships/great-scholarships',
      },
      {
        name: 'Marshall Scholarships',
        description:
          'The UK government’s official scholarship funding U.S. citizens for graduate study in the UK.',
        url: 'https://www.marshallscholarship.org/',
      },
      {
        name: 'Clarendon Fund Scholarships',
        description:
          'The University of Oxford’s official graduate scholarship fund, open to students worldwide.',
        url: 'https://www.ox.ac.uk/clarendon',
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
      {
        name: 'Deutschlandstipendium',
        description:
          'Germany’s official national merit scholarship, awarded through participating German universities.',
        url: 'https://www.deutschlandstipendium.de/',
      },
      {
        name: 'Konrad-Adenauer-Stiftung Scholarships',
        description:
          'The Konrad Adenauer Foundation’s official scholarship program.',
        url: 'https://www.kas.de/en/scholarships',
      },
      {
        name: 'Heinrich Böll Foundation Scholarships',
        description:
          'The Heinrich Böll Foundation’s official scholarship program.',
        url: 'https://www.boell.de/en/scholarships',
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
      {
        name: 'Eiffel Excellence Scholarship Programme',
        description:
          'France’s official Campus France page for the Eiffel Excellence Scholarship.',
        url: 'https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence',
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
      {
        name: 'Banting Postdoctoral Fellowships',
        description:
          'The Government of Canada’s official postdoctoral fellowship program.',
        url: 'https://banting.fellowships-bourses.gc.ca/',
      },
      {
        name: 'Pierre Elliott Trudeau Foundation Doctoral Scholarships',
        description:
          'The Trudeau Foundation’s official doctoral scholarship program.',
        url: 'https://www.trudeaufoundation.ca/',
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
      {
        name: 'Destination Australia',
        description:
          'The Australian government’s official program funding study at regional Australian campuses.',
        url: 'https://www.education.gov.au/destination-australia',
      },
      {
        name: 'Research Training Program (RTP)',
        description:
          'The Australian government’s official program supporting higher-degree research study.',
        url: 'https://www.education.gov.au/research-block-grants/research-training-program',
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
      {
        name: 'Orange Tulip Scholarship',
        description:
          'The official Nuffic (Neso) scholarship programme for students from selected countries studying in the Netherlands.',
        url: 'https://www.studyinnl.org/finances/orange-tulip-scholarship',
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
      {
        name: 'JASSO Scholarships for International Students',
        description:
          'Japan’s official student-services organisation and its scholarships for international students in Japan.',
        url: 'https://www.jasso.go.jp/en/study_j/scholarships/index.html',
      },
      {
        name: 'ADB–Japan Scholarship Program',
        description:
          'The Asian Development Bank’s official Japan-funded scholarship program.',
        url: 'https://www.adb.org/work-with-us/careers/japan-scholarship-program',
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
      {
        name: 'ETH Zurich Excellence Scholarship (ESOP)',
        description:
          'ETH Zurich’s official merit scholarship programme for master’s students, open to applicants worldwide.',
        url: 'https://ethz.ch/en/studies/financial/scholarships/excellencescholarship.html',
      },
      {
        name: 'EPFL Excellence Fellowships',
        description:
          'EPFL’s official excellence fellowship program for master’s study.',
        url: 'https://www.epfl.ch/education/master/master-excellence-fellowships/',
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
      {
        name: 'Chinese Government Scholarship (Campus China)',
        description:
          'China’s official China Scholarship Council study portal.',
        url: 'https://www.campuschina.org/',
      },
      {
        name: 'Yenching Academy of Peking University',
        description:
          'Peking University’s official Yenching Academy master’s program.',
        url: 'https://yenchingacademy.pku.edu.cn/',
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
  {
    code: 'SE',
    title: 'Sweden',
    sources: [
      {
        name: 'Swedish Institute Scholarships for Global Professionals',
        description:
          'The Swedish Institute’s official government scholarship for master’s study in Sweden.',
        url: 'https://si.se/en/apply/scholarships/',
      },
    ],
  },
  {
    code: 'SG',
    title: 'Singapore',
    sources: [
      {
        name: 'Singapore International Graduate Award (SINGA)',
        description:
          'Singapore’s official A*STAR graduate award portal.',
        url: 'https://www.a-star.edu.sg/Scholarships/for-graduate-studies/singapore-international-graduate-award-singa',
      },
    ],
  },
  {
    code: 'BE',
    title: 'Belgium',
    sources: [
      {
        name: 'VLIR-UOS Scholarships',
        description:
          'The official Flemish (VLIR-UOS) scholarship program for study in Belgium.',
        url: 'https://www.vliruos.be/en',
      },
      {
        name: 'Master Mind Scholarships (Flanders)',
        description:
          'The official Study in Flanders portal for the Master Mind Scholarships.',
        url: 'https://www.studyinflanders.be/scholarships/master-mind-scholarships',
      },
    ],
  },
  {
    code: 'AT',
    title: 'Austria',
    sources: [
      {
        name: 'OeAD Scholarship Database (grants.at)',
        description:
          'Austria’s official OeAD scholarship and grants database.',
        url: 'https://grants.at/en/',
      },
    ],
  },
  {
    code: 'IT',
    title: 'Italy',
    sources: [
      {
        name: 'Italian Government Scholarships (Study in Italy)',
        description:
          'Italy’s official Ministry of Foreign Affairs Study in Italy scholarships portal.',
        url: 'https://studyinitaly.esteri.it/',
      },
    ],
  },
  {
    code: 'HU',
    title: 'Hungary',
    sources: [
      {
        name: 'Stipendium Hungaricum',
        description:
          'Hungary’s official government scholarship program portal.',
        url: 'https://stipendiumhungaricum.hu/',
      },
    ],
  },
  {
    code: 'TR',
    title: 'Turkey',
    sources: [
      {
        name: 'Türkiye Scholarships',
        description:
          'Turkey’s official government scholarship program.',
        url: 'https://www.turkiyeburslari.gov.tr/en',
      },
    ],
  },
  {
    code: 'TW',
    title: 'Taiwan',
    sources: [
      {
        name: 'Taiwan Scholarship (Study in Taiwan)',
        description:
          'Taiwan’s official Study in Taiwan portal and scholarship information.',
        url: 'https://www.studyintaiwan.org/',
      },
    ],
  },
  {
    code: 'IN',
    title: 'India',
    sources: [
      {
        name: 'ICCR Scholarships',
        description:
          'The Indian government’s official ICCR scholarship application portal.',
        url: 'https://a2ascholarships.iccr.gov.in/',
      },
    ],
  },
  {
    code: 'ES',
    title: 'Spain',
    sources: [
      {
        name: 'Fundación Carolina Scholarships',
        description:
          'The Fundación Carolina’s official scholarship program for study in Spain.',
        url: 'https://www.fundacioncarolina.es/',
      },
    ],
  },
];

export const SCHOLARSHIP_DISCLAIMER =
  'These are official starting points. Scholarship details, amounts, and ' +
  'deadlines change — always verify directly on the official source.';
