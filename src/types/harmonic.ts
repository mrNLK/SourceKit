/**
 * Harmonic.ai API types for company and person enrichment.
 *
 * Based on: https://console.harmonic.ai/docs/api-reference/introduction
 * Covers: Enrich, Fetch, Search, and Network Mapping endpoints.
 */

// ---------------------------------------------------------------------------
// Raw Harmonic API response types (as returned by Harmonic directly)
// ---------------------------------------------------------------------------

export interface HarmonicCompany {
  entity_urn: string;
  id: number;
  initialized_date: string;
  name: string;
  legal_name?: string;
  description?: string;
  external_description?: string;
  short_description?: string;
  logo_url?: string;
  customer_type?: 'B2B' | 'B2C' | 'B2B2C' | 'B2G';
  ownership_status?: 'PRIVATE' | 'PUBLIC';
  company_type?: string;
  stage?: HarmonicFundingStage;
  headcount?: number;
  founding_date?: { date: string };
  location?: HarmonicLocation;
  contact?: { emails?: string[]; phone_numbers?: string[] };
  socials?: HarmonicCompanySocials;
  website?: { url?: string; domain?: string; is_broken?: boolean };
  funding?: HarmonicFunding;
  funding_rounds?: HarmonicFundingRound[];
  people?: HarmonicPersonSummary[];
  tags?: string[];
  tags_v2?: { displayValue: string; type?: string }[];
  highlights?: { text: string; category?: string }[];
  employee_highlights?: { text: string }[];
  traction_metrics?: HarmonicTractionMetrics;
  snapshots?: HarmonicSnapshot[];
  related_companies?: { similar?: string[]; competitors?: string[] };
  investor_urn?: string;
  website_domain_aliases?: string[];
  name_aliases?: string[];
  funding_attribute_null_status?: string;
}

export type HarmonicFundingStage =
  | 'PRE_SEED' | 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C'
  | 'SERIES_D' | 'SERIES_E' | 'SERIES_F' | 'SERIES_G' | 'SERIES_H'
  | 'GROWTH' | 'IPO' | 'ACQUIRED' | 'UNKNOWN';

export interface HarmonicLocation {
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
}

export interface HarmonicCompanySocials {
  linkedin?: { url?: string };
  twitter?: { url?: string };
  crunchbase?: { url?: string };
  pitchbook?: { url?: string };
  facebook?: { url?: string };
  instagram?: { url?: string };
}

export interface HarmonicFunding {
  fundingTotal?: number;
  lastFundingDate?: string;
  lastFundingAmount?: number;
  lastFundingType?: string;
  numFundingRounds?: number;
}

export interface HarmonicFundingRound {
  fundingAmount?: number;
  fundingRoundType?: string;
  announcedDate?: string;
  investors?: { investorName: string; isLead: boolean; investorUrn?: string }[];
}

export interface HarmonicTractionMetrics {
  webTraffic?: { ago30d?: { percentChange?: number }; ago90d?: { percentChange?: number } };
  headcount?: { ago30d?: { percentChange?: number }; ago90d?: { percentChange?: number } };
  headcountEngineering?: { ago30d?: { percentChange?: number }; ago90d?: { percentChange?: number } };
}

export interface HarmonicSnapshot {
  date: string;
  headcount?: number;
  funding_total?: number;
}

export interface HarmonicPersonSummary {
  full_name: string;
  entity_urn: string;
  title?: string;
  linkedin_url?: string;
}

// ---------------------------------------------------------------------------
// Person
// ---------------------------------------------------------------------------

export interface HarmonicPerson {
  entity_urn: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  linkedin_headline?: string;
  contact?: { emails?: string[]; phone_numbers?: string[] };
  location?: HarmonicLocation;
  education?: HarmonicEducation[];
  socials?: { linkedin?: { url?: string }; twitter?: { url?: string }; github?: { url?: string } };
  experience?: HarmonicExperience[];
  highlights?: { text: string }[];
  awards__beta?: { title: string; description?: string }[];
  recommendations__beta?: { text: string }[];
  current_company_urns?: string[];
  languages?: string[];
  last_refreshed_at?: string;
}

export interface HarmonicEducation {
  school?: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
}

export interface HarmonicExperience {
  title?: string;
  department?: string;
  description?: string;
  company_name?: string;
  company?: string; // URN
  start_date?: string;
  end_date?: string;
  is_current_position?: boolean;
  location?: string;
  role_type?: string;
  contact?: { emails?: string[]; phone_numbers?: string[] };
}

// ---------------------------------------------------------------------------
// Enrichment Status
// ---------------------------------------------------------------------------

export interface HarmonicEnrichmentStatus {
  entity_urn: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED' | 'NOT_FOUND';
  message: string;
  enriched_entity_urn: string | null;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface HarmonicSearchResult<T> {
  count: number;
  page_info?: { next?: string; current?: string | null; has_next?: boolean };
  results: T[];
}

export interface HarmonicSavedSearch {
  query?: Record<string, unknown>;
  type: 'COMPANIES_LIST' | 'PEOPLE_LIST';
  name: string;
  creator: string;
  is_private: boolean;
  entity_urn: string;
}

export interface HarmonicTypeaheadResult {
  entity_urn: string;
  type: string;
  source: string;
  text: string;
  alt_text?: string;
  ranking_score?: number;
}

// ---------------------------------------------------------------------------
// Network / Team Connections (gated — deferred until verified)
// ---------------------------------------------------------------------------

export interface HarmonicUserConnection {
  user_urn: string;
  user_name?: string;
  user_email?: string;
  connection_type?: string;
  connected_person_urn?: string;
  connected_person_name?: string;
}

/**
 * Placeholder for warm-intro / team connections feature.
 * Reserved for when account-level access is verified.
 */
export interface HarmonicConnectionSummary {
  company_id: string;
  company_name: string;
  has_connections: boolean;
  connection_count: number;
  connections: HarmonicUserConnection[];
}

// ---------------------------------------------------------------------------
// Normalized company_cache row (as stored in Supabase)
// ---------------------------------------------------------------------------

export interface CompanyContext {
  id?: string;
  harmonic_company_id?: string;
  name?: string;
  domain?: string;
  website_url?: string;
  linkedin_url?: string;
  location?: string;
  funding_stage?: string;
  funding_total?: number;
  last_funding_date?: string;
  last_funding_total?: number;
  headcount?: number;
  headcount_growth_30d?: number;
  headcount_growth_90d?: number;
  headcount_growth_180d?: number;
  web_traffic?: unknown; // JSONB
  investors?: unknown; // JSONB: { name: string; isLead: boolean }[]
  founders?: unknown; // JSONB: { name: string; title: string; urn: string }[]
  industry_tags?: string[];
  technology_tags?: string[];
  customer_tags?: string[];
  company_quality?: unknown; // JSONB: { highlights, employee_highlights, logo_url, short_description }
  raw_payload?: unknown; // JSONB: full Harmonic response
  fetched_at?: string;
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Poach company enrichment (from research-role)
// ---------------------------------------------------------------------------

export interface PoachCompanyEnrichment {
  name: string;
  domain?: string;
  category: 'direct_competitor' | 'adjacent' | 'talent_hub';
  reason: string;
  source: 'claude_seed' | 'harmonic_similar';
  funding_stage?: string;
  funding_total?: number;
  last_funding_date?: string;
  last_funding_total?: number;
  headcount?: number;
  headcount_growth_30d?: number;
  headcount_growth_90d?: number;
  top_investors?: string[];
  industry_tags?: string[];
  technology_tags?: string[];
  poachability_score?: number;
  poachability_rationale?: string[];
}

// ---------------------------------------------------------------------------
// Poachability score (computed client-side from CompanyContext)
// ---------------------------------------------------------------------------

export interface PoachabilityScore {
  domain: string;
  name: string;
  score: number; // 0-100, higher = easier to poach from
  signals: string[];
  funding_stage?: string;
  headcount?: number;
  headcount_growth_90d?: number;
  web_traffic_change_30d?: number;
  funding_total?: number;
  last_funding_date?: string;
  top_investors?: string[];
  logo_url?: string;
}
