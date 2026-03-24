// SourceKit Recruiter OS — Constants

import type { CandidateTier, PipelineStage, ContactStatus, AgentRunType, AgentRunStatus, ScoreDimension, ReportType } from './types';

// --- Tier Configuration ---

export const TIER_CONFIG: Record<CandidateTier, { label: string; color: string; bgColor: string; borderColor: string; order: number }> = {
  tier_1: { label: 'Tier 1', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30', order: 0 },
  tier_2: { label: 'Tier 2', color: 'text-indigo-400', bgColor: 'bg-indigo-500/15', borderColor: 'border-indigo-500/30', order: 1 },
  borderline: { label: 'Borderline', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15', borderColor: 'border-yellow-500/30', order: 2 },
  below_bar: { label: 'Below Bar', color: 'text-red-400', bgColor: 'bg-red-500/15', borderColor: 'border-red-500/30', order: 3 },
  false_positive: { label: 'False Positive', color: 'text-zinc-400', bgColor: 'bg-zinc-500/15', borderColor: 'border-zinc-500/30', order: 4 },
  nurture: { label: 'Nurture', color: 'text-violet-400', bgColor: 'bg-violet-500/15', borderColor: 'border-violet-500/30', order: 5 },
  ats_synced: { label: 'ATS Synced', color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/30', order: 6 },
  unclassified: { label: 'Unclassified', color: 'text-zinc-500', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', order: 7 },
};

export const PIPELINE_TIERS: CandidateTier[] = ['tier_1', 'tier_2', 'borderline', 'below_bar'];

// --- Pipeline Stages ---

export const STAGE_CONFIG: Record<PipelineStage, { label: string; color: string; bgColor: string; borderColor: string; order: number }> = {
  new: { label: 'New', color: 'text-sky-400', bgColor: 'bg-sky-500/15', borderColor: 'border-sky-500/30', order: 0 },
  under_review: { label: 'Under Review', color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30', order: 1 },
  outreach_sent: { label: 'Outreach Sent', color: 'text-indigo-400', bgColor: 'bg-indigo-500/15', borderColor: 'border-indigo-500/30', order: 2 },
  replied: { label: 'Replied', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30', order: 3 },
  screening: { label: 'Screening', color: 'text-purple-400', bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/30', order: 4 },
  moved_to_ats: { label: 'Moved to ATS', color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/30', order: 5 },
  hold: { label: 'On Hold', color: 'text-zinc-400', bgColor: 'bg-zinc-500/15', borderColor: 'border-zinc-500/30', order: 6 },
  suppressed: { label: 'Suppressed', color: 'text-red-400', bgColor: 'bg-red-500/15', borderColor: 'border-red-500/30', order: 7 },
};

// --- Contact Status ---

export const CONTACT_STATUS_CONFIG: Record<ContactStatus, { label: string; color: string; icon: string }> = {
  not_contacted: { label: 'Not Contacted', color: 'text-zinc-500', icon: 'circle' },
  contacted: { label: 'Contacted', color: 'text-amber-400', icon: 'send' },
  replied: { label: 'Replied', color: 'text-emerald-400', icon: 'message-circle' },
  not_interested: { label: 'Not Interested', color: 'text-red-400', icon: 'x-circle' },
  scheduled: { label: 'Scheduled', color: 'text-blue-400', icon: 'calendar' },
};

// --- Score Dimensions ---

export const SCORE_DIMENSIONS: Record<ScoreDimension, { label: string; description: string; icon: string }> = {
  eea: { label: 'EEA Score', description: 'Evidence of Exceptional Ability across USCIS criteria', icon: 'award' },
  builder: { label: 'Builder Score', description: 'Shipping velocity, ownership signals, project completion', icon: 'hammer' },
  ai_recency: { label: 'AI Recency', description: 'Recent work with frontier AI tools, models, and frameworks', icon: 'sparkles' },
  systems_depth: { label: 'Systems Depth', description: 'Infrastructure, architecture, and low-level engineering', icon: 'layers' },
  product_instinct: { label: 'Product Instinct', description: 'User-facing craft, design sense, product thinking', icon: 'lightbulb' },
  hidden_gem: { label: 'Hidden Gem', description: 'High proof-to-visibility ratio, underrecognized talent', icon: 'gem' },
};

// --- Score Thresholds ---

export const SCORE_THRESHOLDS = {
  high: 80,
  medium: 50,
  low: 0,
} as const;

// --- Agent Run Types ---

export const AGENT_RUN_TYPE_CONFIG: Record<AgentRunType, { label: string; icon: string }> = {
  search: { label: 'Search', icon: 'search' },
  enrichment: { label: 'Enrichment', icon: 'database' },
  scoring: { label: 'Scoring', icon: 'bar-chart-2' },
  outreach_generation: { label: 'Outreach Generation', icon: 'mail' },
  company_mapping: { label: 'Company Mapping', icon: 'building-2' },
  monitor: { label: 'Monitor', icon: 'eye' },
  dedup_ats_sync: { label: 'Dedup / ATS Sync', icon: 'git-merge' },
};

export const AGENT_RUN_STATUS_CONFIG: Record<AgentRunStatus, { label: string; color: string; bgColor: string }> = {
  running: { label: 'Running', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  complete: { label: 'Complete', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/15' },
  partial: { label: 'Partial', color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
};

// --- Report Types ---

export const REPORT_CONFIG: Record<ReportType, { label: string; description: string; icon: string }> = {
  candidate_volume_by_tier: { label: 'Candidate Volume by Tier', description: 'Tier distribution over time', icon: 'bar-chart-2' },
  source_quality: { label: 'Source Quality', description: 'Which surfaces produce top-tier candidates', icon: 'target' },
  artifact_recency: { label: 'Artifact Recency', description: 'Evidence freshness across the pipeline', icon: 'clock' },
  response_rates: { label: 'Response Rates', description: 'Reply rates by sequence and tone', icon: 'mail-check' },
  hidden_gem_yield: { label: 'Hidden Gem Yield', description: 'Hidden gem conversion vs. standard candidates', icon: 'gem' },
  recruiter_throughput: { label: 'Recruiter Throughput', description: 'Candidates processed per week', icon: 'trending-up' },
  ats_export_volume: { label: 'ATS Export Volume', description: 'Candidates pushed to ATS by role', icon: 'upload' },
  stale_candidates: { label: 'Stale Candidates', description: 'Candidates with no activity in 14+ days', icon: 'alert-triangle' },
};

// --- Default Scoring Weights ---

export const DEFAULT_SCORING_WEIGHTS = {
  eea: 25,
  builder: 20,
  ai_recency: 20,
  systems_depth: 15,
  product_instinct: 10,
  hidden_gem: 10,
} as const;

// --- Default Search Config ---

export const DEFAULT_SEARCH_SOURCES = {
  github: true,
  linkedin: false,
  web_blog: false,
  huggingface: false,
  conference_talks: false,
  company_mapping: false,
  exa_websets: false,
} as const;

export const DEFAULT_SEARCH_MODES = {
  standard: true,
  hidden_gem: false,
  company_mapping: false,
  artifact_led: false,
} as const;

// --- Artifact Types ---

export const ARTIFACT_TYPE_CONFIG = {
  repo: { label: 'Repository', icon: 'git-branch', color: 'text-emerald-400' },
  paper: { label: 'Paper', icon: 'file-text', color: 'text-blue-400' },
  blog_post: { label: 'Blog Post', icon: 'pen-tool', color: 'text-purple-400' },
  talk: { label: 'Talk', icon: 'mic', color: 'text-amber-400' },
  demo: { label: 'Demo', icon: 'play-circle', color: 'text-pink-400' },
  model: { label: 'Model', icon: 'cpu', color: 'text-indigo-400' },
  package: { label: 'Package', icon: 'package', color: 'text-teal-400' },
  other: { label: 'Other', icon: 'link', color: 'text-zinc-400' },
} as const;

// --- Outreach Tones ---

export const OUTREACH_TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'warm', label: 'Warm' },
  { id: 'direct', label: 'Direct' },
  { id: 'technical', label: 'Technical' },
] as const;

export const SEQUENCE_STEPS = [
  { id: 'initial', label: 'Initial Outreach' },
  { id: 'follow_up_1', label: 'Follow-up 1' },
  { id: 'follow_up_2', label: 'Follow-up 2' },
  { id: 'breakup', label: 'Breakup' },
] as const;

// --- Archetype Suggestions ---

export const SUGGESTED_ARCHETYPES = [
  'ML infra builder',
  'Full-stack AI founder',
  'Systems generalist with AI pivot',
  'Applied ML engineer',
  'LLM fine-tuning specialist',
  'AI product engineer',
  'Data platform architect',
  'Robotics / embodied AI',
  'Research engineer (NLP)',
  'Multimodal ML engineer',
  'MLOps / ML platform',
  'Compiler / runtime engineer',
] as const;
