export interface InfoStep {
  id: string;
  origin_code: string | null;
  destination_code: string;
  phase: string;
  step_number: number;
  title: string;
  explanation: string;
  official_source_name: string;
  official_source_url: string;
  is_verified: boolean;
}

export interface PhaseGroup {
  phase: string;
  steps: InfoStep[];
}

export interface JourneyOut {
  origin: string | null;
  destination: string;
  phases: PhaseGroup[];
}

export interface CountryOut {
  id: string;
  code: string;
  name: string;
  student_visa_name: string | null;
  official_immigration_url: string | null;
  currency_code: string | null;
  is_destination: boolean;
  is_origin: boolean;
}

export interface UserOut {
  id: string;
  email: string;
  full_name: string | null;
  origin_country_code: string | null;
  destination_country_code: string | null;
  created_at: string;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
}

// ── University rankings ──────────────────────────────────────────────
//
// NOTE: these field names are the mobile app's assumption of the backend
// response shape for GET /universities and GET /universities/{id}.
// If the API uses different names, adjust them here only — the screens
// read everything through these types.

/** A single row in the ranked list (GET /universities). */
export interface UniversityListItem {
  id: string;
  rank: number;
  name: string;
  /** The LandHere Score (assumed 0–100). */
  landhere_score: number;
  state: string | null;
  /** Annual international-student tuition, in USD. */
  international_tuition: number | null;
}

/** One weighted factor in the LandHere Score breakdown. */
export interface ScoreComponent {
  key: string;
  label: string;
  /** Weight as a fraction (0–1) or percent — rendered defensively. */
  weight: number | null;
  /** Sub-score for this factor (assumed 0–100). */
  score: number | null;
}

/** Full detail for one university (GET /universities/{id}). */
export interface UniversityDetail extends UniversityListItem {
  city: string | null;
  /** Net price an in-state student actually pays after aid, in USD. */
  in_state_net_price: number | null;
  /** Median earnings of graduates, in USD. */
  median_earnings: number | null;
  /** Graduation rate — accepted as a fraction (0–1) or a percent (0–100). */
  graduation_rate: number | null;
  /** Research output metric (e.g. works/publications count). */
  research_output: number | null;
  /** Link to the university's official website. */
  official_url: string | null;
  /** Optional per-factor score breakdown. Rendered if present. */
  score_components: ScoreComponent[] | null;
}

/** Possible envelope shapes for the paginated list response. */
export interface UniversityListPage {
  items: UniversityListItem[];
  /** True when another page is available. */
  has_more: boolean;
  /** The page index that produced `items`. */
  page: number;
}
