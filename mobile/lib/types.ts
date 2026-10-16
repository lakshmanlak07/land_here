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
  /**
   * Phases the server withheld because this account is not Pro. Names only —
   * the steps themselves are never sent, so this is what the UI has to render
   * a locked row from.
   */
  locked_phases?: string[];
  pro_required?: boolean;
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
  stage: string | null;
  wants_to_work: boolean | null;
  wants_scholarships: boolean | null;
  concerns: string[] | null;
  first_month_priority: string | null;
  first_timer: boolean | null;
  confidence: number | null;
  primary_goal: string | null;
  university_id?: string | null;
  university_name?: string | null;
}

export interface TokenOut {
  access_token: string;
  /** Long-lived token stored securely and exchanged at POST /auth/refresh. */
  refresh_token: string;
  token_type: string;
}

// ── University rankings ──────────────────────────────────────────────
//
// These field names mirror the backend response shape exactly:
//   GET /universities       → UniversityListItem[]  (a plain array)
//   GET /universities/{id}  → UniversityDetail
// The list is already sorted by landhere_score (desc); there is no `rank`
// field — rank is the 1-based position in the list.

/** A single row in the ranked list (GET /universities). */
export interface UniversityListItem {
  id: string;
  name: string;
  state: string | null;
  /** The LandHere Score (0–100). */
  landhere_score: number | null;
  /** Annual out-of-state (international) tuition, in USD. */
  tuition_out_of_state: number | null;
  /** Average net price after aid, in USD. */
  avg_net_price: number | null;
  /** Median earnings of graduates 10 years out, in USD. */
  median_earnings_10yr: number | null;
}

/** Full detail for one university (GET /universities/{id}). */
export interface UniversityDetail extends UniversityListItem {
  /** Country the university is in, e.g. "US". */
  country_code: string;
  /** Link to the university's official website. */
  official_url: string | null;
  /** Research sub-score (0–100). */
  research_score: number | null;
  /** Outcomes sub-score (0–100). */
  outcomes_score: number | null;
  /** Completion rate — fraction (0–1) or percent (0–100). */
  completion_rate: number | null;
  /** Total citations across published works (OpenAlex). */
  citations_total: number | null;
  /** Number of published works (OpenAlex). */
  works_count: number | null;
  /**
   * Share of undergrads who are non-resident aliens (Scorecard UGDS_NRA),
   * a fraction 0–1 — used as an international-student proxy. Null when missing.
   */
  intl_student_pct: number | null;
}

/** Possible envelope shapes for the paginated list response. */
export interface UniversityListPage {
  items: UniversityListItem[];
  /** True when another page is available. */
  has_more: boolean;
  /** The page index that produced `items`. */
  page: number;
}
