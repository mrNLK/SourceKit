/**
 * AI Fund Type Definitions (canonical, camelCase)
 *
 * Maps to the 11 aifund_* tables in Supabase.
 * All IDs are UUIDs. Timestamps are ISO strings from Postgres.
 */

// ---------------------------------------------------------------------------
// Enums / Literal Unions
// ---------------------------------------------------------------------------

export type ConceptStage =
  | "ideation"
  | "validation"
  | "prototyping"
  | "recruiting"
  | "residency"
  | "investment_review"
  | "funded"
  | "archived";

export type ProcessStage =
  | "identified"
  | "researched"
  | "contacted"
  | "engaged"
  | "applied"
  | "interviewing"
  | "offered"
  | "accepted"
  | "declined"
  | "residency"
  | "graduated"
  | "archived";

export type PersonType = "fir" | "ve" | "both";

export type AssignmentRole = "fir" | "ve";

export type EngagementChannel =
  | "email"
  | "linkedin"
  | "twitter"
  | "referral"
  | "event"
  | "inbound"
  | "other";

export type ResidencyStatus =
  | "active"
  | "completed"
  | "extended"
  | "terminated"
  | "paused";

export type DecisionOutcome =
  | "invest"
  | "pass"
  | "defer"
  | "conditional";

export type EvidenceType =
  | "publication"
  | "patent"
  | "github_repo"
  | "conference_talk"
  | "blog_post"
  | "product_launch"
  | "award"
  | "media_mention"
  | "huggingface_space"
  | "arxiv_paper"
  | "other";

export type IntelligenceRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type IntelligenceProvider = "exa" | "parallel" | "github" | "harmonic" | "manual";

// ---------------------------------------------------------------------------
// Harmonic Person Enrichment (stored in AiFundPerson.metadata.harmonic)
// ---------------------------------------------------------------------------

export interface HarmonicPersonMetadata {
  entityUrn: string;
  profilePictureUrl?: string;
  headline?: string;
  education: { school: string; degree?: string; field?: string }[];
  experience: {
    title: string;
    company: string;
    companyUrn?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  }[];
  highlights: string[];
  awards: { title: string; description?: string }[];
  languages?: string[];
  enrichedAt: string;
}

// ---------------------------------------------------------------------------
// Harmonic Intelligence Run Summary (stored in AiFundIntelligenceRun.resultsSummary)
// ---------------------------------------------------------------------------

export interface HarmonicRunSummary {
  companies: {
    name: string;
    domain?: string;
    fundingStage?: string;
    headcount?: number;
    fundingTotal?: number;
    location?: string;
    poachabilityScore?: number;
    harmonicId?: string;
  }[];
}

// ---------------------------------------------------------------------------
// Core Entities
// ---------------------------------------------------------------------------

export interface AiFundConcept {
  id: string;
  userId: string;
  name: string;
  thesis: string | null;
  sector: string | null;
  stage: ConceptStage;
  lpSource: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiFundPerson {
  id: string;
  userId: string;
  fullName: string;
  email: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  currentRole: string | null;
  currentCompany: string | null;
  location: string | null;
  bio: string | null;
  personType: PersonType;
  processStage: ProcessStage;
  sourceChannel: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiFundEvaluationScore {
  id: string;
  personId: string;
  evaluatorId: string | null;
  aiExcellence: number | null;
  technicalAbility: number | null;
  productInstinct: number | null;
  leadershipPotential: number | null;
  compositeScore: number | null;
  notes: string | null;
  scoredAt: string;
}

export interface AiFundExternalProfile {
  id: string;
  personId: string;
  platform: string;
  profileUrl: string;
  profileData: Record<string, unknown> | null;
  fetchedAt: string;
}

export interface AiFundEvidence {
  id: string;
  personId: string;
  evidenceType: EvidenceType;
  title: string;
  url: string | null;
  description: string | null;
  signalStrength: number | null;
  verifiedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AiFundAssignment {
  id: string;
  conceptId: string;
  personId: string;
  role: AssignmentRole;
  status: string;
  assignedAt: string;
  notes: string | null;
}

export interface AiFundEngagement {
  id: string;
  personId: string;
  channel: EngagementChannel;
  direction: "inbound" | "outbound";
  subject: string | null;
  body: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AiFundResidency {
  id: string;
  assignmentId: string;
  startDate: string;
  endDate: string | null;
  stipendMonthly: number;
  status: ResidencyStatus;
  weeklyCheckIns: Record<string, unknown>[];
  milestones: Record<string, unknown>[];
  createdAt: string;
}

export interface AiFundDecisionMemo {
  id: string;
  conceptId: string;
  authorId: string | null;
  outcome: DecisionOutcome;
  investmentAmount: number | null;
  valuation: number | null;
  rationale: string | null;
  conditions: string | null;
  decidedAt: string;
  createdAt: string;
}

export interface AiFundActivityEvent {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface AiFundIntelligenceRun {
  id: string;
  userId: string;
  provider: IntelligenceProvider;
  queryParams: Record<string, unknown>;
  status: IntelligenceRunStatus;
  resultsCount: number;
  resultsSummary: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Scoring Weights
// ---------------------------------------------------------------------------

export const SCORING_WEIGHTS = {
  aiExcellence: 0.4,
  technicalAbility: 0.25,
  productInstinct: 0.2,
  leadershipPotential: 0.15,
} as const;

export type ScoringDimension = keyof typeof SCORING_WEIGHTS;

// ---------------------------------------------------------------------------
// Composite / View Types
// ---------------------------------------------------------------------------

export interface PersonWithScores extends AiFundPerson {
  latestScore: AiFundEvaluationScore | null;
  evidenceCount: number;
  assignments: AiFundAssignment[];
}

export interface ConceptWithAssignments extends AiFundConcept {
  assignments: (AiFundAssignment & { person: AiFundPerson })[];
  decisionMemos: AiFundDecisionMemo[];
}

export interface AiFundDashboardStats {
  totalConcepts: number;
  activeConcepts: number;
  totalPeople: number;
  activePipeline: number;
  activeResidencies: number;
  pendingDecisions: number;
  recentActivity: AiFundActivityEvent[];
}

// ---------------------------------------------------------------------------
// Workspace (consumed by all tabs)
// ---------------------------------------------------------------------------

export interface AiFundWorkspace {
  concepts: AiFundConcept[];
  people: AiFundPerson[];
  assignments: AiFundAssignment[];
  stats: AiFundDashboardStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addConcept: (concept: Partial<AiFundConcept>) => Promise<AiFundConcept | null>;
  updateConcept: (id: string, updates: Partial<AiFundConcept>) => Promise<void>;
  addPerson: (person: Partial<AiFundPerson>) => Promise<AiFundPerson | null>;
  updatePerson: (id: string, updates: Partial<AiFundPerson>) => Promise<void>;
  addAssignment: (assignment: Partial<AiFundAssignment>) => Promise<void>;
  scoreCandidate: (score: Partial<AiFundEvaluationScore>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// DB row shapes (snake_case, for Supabase .select() returns)
// ---------------------------------------------------------------------------

export interface AiFundConceptRow {
  id: string;
  user_id: string;
  name: string;
  thesis: string | null;
  sector: string | null;
  stage: ConceptStage;
  lp_source: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AiFundPersonRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  current_role: string | null;
  current_company: string | null;
  location: string | null;
  bio: string | null;
  person_type: PersonType;
  process_stage: ProcessStage;
  source_channel: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AiFundEvaluationScoreRow {
  id: string;
  person_id: string;
  evaluator_id: string | null;
  ai_excellence: number | null;
  technical_ability: number | null;
  product_instinct: number | null;
  leadership_potential: number | null;
  composite_score: number | null;
  notes: string | null;
  scored_at: string;
}

export interface AiFundAssignmentRow {
  id: string;
  concept_id: string;
  person_id: string;
  role: AssignmentRole;
  status: string;
  assigned_at: string;
  notes: string | null;
}

export interface AiFundEngagementRow {
  id: string;
  person_id: string;
  channel: EngagementChannel;
  direction: "inbound" | "outbound";
  subject: string | null;
  body: string | null;
  sent_at: string | null;
  responded_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AiFundResidencyRow {
  id: string;
  assignment_id: string;
  start_date: string;
  end_date: string | null;
  stipend_monthly: number;
  status: ResidencyStatus;
  weekly_check_ins: Record<string, unknown>[];
  milestones: Record<string, unknown>[];
  created_at: string;
}

export interface AiFundDecisionMemoRow {
  id: string;
  concept_id: string;
  author_id: string | null;
  outcome: DecisionOutcome;
  investment_amount: number | null;
  valuation: number | null;
  rationale: string | null;
  conditions: string | null;
  decided_at: string;
  created_at: string;
}

export interface AiFundActivityEventRow {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AiFundIntelligenceRunRow {
  id: string;
  user_id: string;
  provider: IntelligenceProvider;
  query_params: Record<string, unknown>;
  status: IntelligenceRunStatus;
  results_count: number;
  results_summary: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface AiFundEvidenceRow {
  id: string;
  person_id: string;
  evidence_type: EvidenceType;
  title: string;
  url: string | null;
  description: string | null;
  signal_strength: number | null;
  verified_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AiFundExternalProfileRow {
  id: string;
  person_id: string;
  platform: string;
  profile_url: string;
  profile_data: Record<string, unknown> | null;
  fetched_at: string;
}

// ---------------------------------------------------------------------------
// Row-to-Model Converters
// ---------------------------------------------------------------------------

export function conceptFromRow(row: AiFundConceptRow): AiFundConcept {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    thesis: row.thesis,
    sector: row.sector,
    stage: row.stage,
    lpSource: row.lp_source,
    notes: row.notes,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function personFromRow(row: AiFundPersonRow): AiFundPerson {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    linkedinUrl: row.linkedin_url,
    githubUrl: row.github_url,
    twitterUrl: row.twitter_url,
    websiteUrl: row.website_url,
    currentRole: row.current_role,
    currentCompany: row.current_company,
    location: row.location,
    bio: row.bio,
    personType: row.person_type,
    processStage: row.process_stage,
    sourceChannel: row.source_channel,
    tags: row.tags,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function scoreFromRow(row: AiFundEvaluationScoreRow): AiFundEvaluationScore {
  return {
    id: row.id,
    personId: row.person_id,
    evaluatorId: row.evaluator_id,
    aiExcellence: row.ai_excellence,
    technicalAbility: row.technical_ability,
    productInstinct: row.product_instinct,
    leadershipPotential: row.leadership_potential,
    compositeScore: row.composite_score,
    notes: row.notes,
    scoredAt: row.scored_at,
  };
}

export function assignmentFromRow(row: AiFundAssignmentRow): AiFundAssignment {
  return {
    id: row.id,
    conceptId: row.concept_id,
    personId: row.person_id,
    role: row.role,
    status: row.status,
    assignedAt: row.assigned_at,
    notes: row.notes,
  };
}

export function engagementFromRow(row: AiFundEngagementRow): AiFundEngagement {
  return {
    id: row.id,
    personId: row.person_id,
    channel: row.channel,
    direction: row.direction,
    subject: row.subject,
    body: row.body,
    sentAt: row.sent_at,
    respondedAt: row.responded_at,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export function residencyFromRow(row: AiFundResidencyRow): AiFundResidency {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    startDate: row.start_date,
    endDate: row.end_date,
    stipendMonthly: row.stipend_monthly,
    status: row.status,
    weeklyCheckIns: row.weekly_check_ins,
    milestones: row.milestones,
    createdAt: row.created_at,
  };
}

export function decisionMemoFromRow(row: AiFundDecisionMemoRow): AiFundDecisionMemo {
  return {
    id: row.id,
    conceptId: row.concept_id,
    authorId: row.author_id,
    outcome: row.outcome,
    investmentAmount: row.investment_amount,
    valuation: row.valuation,
    rationale: row.rationale,
    conditions: row.conditions,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

export function activityEventFromRow(row: AiFundActivityEventRow): AiFundActivityEvent {
  return {
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    details: row.details,
    createdAt: row.created_at,
  };
}

export function intelligenceRunFromRow(row: AiFundIntelligenceRunRow): AiFundIntelligenceRun {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    queryParams: row.query_params,
    status: row.status,
    resultsCount: row.results_count,
    resultsSummary: row.results_summary,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export function evidenceFromRow(row: AiFundEvidenceRow): AiFundEvidence {
  return {
    id: row.id,
    personId: row.person_id,
    evidenceType: row.evidence_type,
    title: row.title,
    url: row.url,
    description: row.description,
    signalStrength: row.signal_strength,
    verifiedAt: row.verified_at,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}
