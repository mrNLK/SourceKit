// Shared pipeline stage definitions — single source of truth.
// Import this everywhere instead of duplicating stage arrays.

export const PIPELINE_STAGES = [
  { id: "contacted", label: "Contacted", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", tip: "Message sent. Waiting for response." },
  { id: "not_interested", label: "Not Interested", color: "bg-red-500/15 text-red-400 border-red-500/30", tip: "Candidate declined or not interested." },
  { id: "recruiter_screen", label: "Recruiter Screen", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", tip: "Recruiter screen scheduled or completed." },
  { id: "rejected", label: "Rejected", color: "bg-rose-500/15 text-rose-400 border-rose-500/30", tip: "Candidate did not pass screening." },
  { id: "moved_to_ats", label: "Moved to ATS", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", tip: "Candidate moved to your ATS for further processing." },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];

export const STAGE_IDS = PIPELINE_STAGES.map((s) => s.id);

export const STAGE_COLORS: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.id, s.color])
);

export const DEFAULT_STAGE: PipelineStageId = "contacted";
