// SourceKit Recruiter OS — Core Type Definitions

// --- Scoring ---

export interface ScoreEvidence {
  source: string; // e.g. "github", "linkedin", "blog", "huggingface"
  artifact: string;
  url?: string;
  detail: string;
}

export interface DimensionScore {
  score: number; // 0-100
  evidence: ScoreEvidence[];
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface RecruiterScores {
  eea: DimensionScore;
  builder: DimensionScore;
  ai_recency: DimensionScore;
  systems_depth: DimensionScore;
  product_instinct: DimensionScore;
  hidden_gem: DimensionScore;
}

export type ScoreDimension = keyof RecruiterScores;

// --- Tiering ---

export type CandidateTier =
  | 'tier_1'
  | 'tier_2'
  | 'borderline'
  | 'below_bar'
  | 'false_positive'
  | 'nurture'
  | 'ats_synced'
  | 'unclassified';

export type PipelineStage =
  | 'new'
  | 'under_review'
  | 'outreach_sent'
  | 'replied'
  | 'screening'
  | 'moved_to_ats'
  | 'hold'
  | 'suppressed';

export type ContactStatus =
  | 'not_contacted'
  | 'contacted'
  | 'replied'
  | 'not_interested'
  | 'scheduled';

export type ATSSyncStatus = 'not_synced' | 'synced' | 'sync_failed';

export type OutreachPriority = 'high' | 'medium' | 'low';

// --- Candidate ---

export interface RecruiterCandidate {
  id: string;
  user_id: string;

  // Identity
  name: string | null;
  avatar_url: string | null;
  current_title: string | null;
  current_company: string | null;
  location: string | null;
  bio: string | null;

  // Links
  github_username: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  huggingface_url: string | null;
  blog_url: string | null;
  personal_site_url: string | null;
  email: string | null;

  // Scores
  eea_score: DimensionScore | null;
  builder_score: DimensionScore | null;
  ai_recency_score: DimensionScore | null;
  systems_depth_score: DimensionScore | null;
  product_instinct_score: DimensionScore | null;
  hidden_gem_score: DimensionScore | null;
  composite_score: number | null;
  outreach_priority: OutreachPriority;

  // Classification
  tier: CandidateTier;
  pipeline_stage: PipelineStage;

  // Artifacts & evidence
  artifacts: CandidateArtifact[];
  sourcing_rationale: string | null;
  hidden_gem_reasons: string[];

  // Contact
  contact_status: ContactStatus;

  // Meta
  tags: string[];
  needs_review: boolean;
  search_ids: string[];
  scorecard_id: string | null;
  ats_sync_status: ATSSyncStatus;
  ats_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateArtifact {
  id: string;
  type: 'repo' | 'paper' | 'blog_post' | 'talk' | 'demo' | 'model' | 'package' | 'other';
  title: string;
  url: string;
  source: string;
  date: string | null;
  relevance: string;
  description: string;
}

// --- Scorecard ---

export interface ScorecardSignal {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-100
  evidence_type: string; // github, linkedin, publication, etc.
}

export interface ScoringWeights {
  eea: number;
  builder: number;
  ai_recency: number;
  systems_depth: number;
  product_instinct: number;
  hidden_gem: number;
}

export interface EvaluationQuestion {
  id: string;
  text: string;
  dimension: string;
  good_answer: string;
  bad_answer: string;
}

export type ScorecardStatus = 'draft' | 'active' | 'archived';

export interface RoleScorecard {
  id: string;
  user_id: string;
  name: string;
  status: ScorecardStatus;
  talent_thesis: string | null;
  must_have_signals: ScorecardSignal[];
  nice_to_have_signals: ScorecardSignal[];
  suppressions: string[];
  scoring_weights: ScoringWeights;
  outreach_tone: string;
  evaluation_questions: EvaluationQuestion[];
  created_at: string;
  updated_at: string;
}

// --- Outreach ---

export type OutreachStatus = 'draft' | 'ready' | 'personalize' | 'hold' | 'sent' | 'replied';
export type OutreachChannel = 'email' | 'linkedin' | 'other';
export type SequenceStep = 'initial' | 'follow_up_1' | 'follow_up_2' | 'breakup';

export interface OutreachMessage {
  id: string;
  user_id: string;
  candidate_id: string;
  scorecard_id: string | null;
  message: string;
  grounding_artifacts: ScoreEvidence[];
  tone: string;
  sequence_step: SequenceStep;
  channel: OutreachChannel;
  status: OutreachStatus;
  sent_at: string | null;
  created_at: string;
}

// --- Agent Runs ---

export type AgentRunType =
  | 'search'
  | 'enrichment'
  | 'scoring'
  | 'outreach_generation'
  | 'company_mapping'
  | 'monitor'
  | 'dedup_ats_sync';

export type AgentRunStatus = 'running' | 'complete' | 'failed' | 'partial';

export interface AgentRun {
  id: string;
  user_id: string;
  type: AgentRunType;
  status: AgentRunStatus;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  errors: Array<{ message: string; timestamp: string; context?: string }>;
  candidate_ids: string[];
  scorecard_id: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

// --- Saved Search ---

export interface SearchMode {
  standard: boolean;
  hidden_gem: boolean;
  company_mapping: boolean;
  artifact_led: boolean;
}

export interface SearchSource {
  github: boolean;
  linkedin: boolean;
  web_blog: boolean;
  huggingface: boolean;
  conference_talks: boolean;
  company_mapping: boolean;
  exa_websets: boolean;
}

export interface RecruiterSearchConfig {
  role_name: string;
  role_brief: string;
  scorecard_id: string | null;
  archetypes: string[];
  must_have_signals: ScorecardSignal[];
  nice_to_have_signals: ScorecardSignal[];
  sources: SearchSource;
  recency_months: number;
  location_preference: string;
  seniority_band: string;
  suppressions: string[];
  score_floor: number;
  modes: SearchMode;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  scorecard_id: string | null;
  config: RecruiterSearchConfig;
  result_count: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Sequence Templates ---

export interface SequenceTemplateStep {
  step: SequenceStep;
  tone: string;
  template: string;
}

export interface SequenceTemplate {
  id: string;
  user_id: string;
  scorecard_id: string | null;
  name: string;
  steps: SequenceTemplateStep[];
  created_at: string;
  updated_at: string;
}

// --- Notes ---

export interface CandidateNote {
  id: string;
  user_id: string;
  candidate_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// --- Reports ---

export type ReportType =
  | 'candidate_volume_by_tier'
  | 'source_quality'
  | 'artifact_recency'
  | 'response_rates'
  | 'hidden_gem_yield'
  | 'recruiter_throughput'
  | 'ats_export_volume'
  | 'stale_candidates';
