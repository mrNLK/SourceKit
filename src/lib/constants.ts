// Shared pipeline stage definitions — single source of truth.
// Import this everywhere instead of duplicating stage arrays.

export const PIPELINE_STAGES = [
  { id: "sourced", label: "Sourced", color: "bg-craft-wash text-craft-section border-craft-line", tip: "Added from search. Not yet contacted." },
  { id: "contacted", label: "Contacted", color: "bg-craft-wash text-craft-title border-craft-section/30", tip: "Message sent. Waiting for response." },
  { id: "not_interested", label: "Not Interested", color: "bg-slate-100 text-craft-muted border-craft-line", tip: "Candidate declined or not interested." },
  { id: "recruiter_screen", label: "Recruiter Screen", color: "bg-craft-wash text-craft-section border-craft-section/30", tip: "Recruiter screen scheduled or completed." },
  { id: "rejected", label: "Rejected", color: "bg-slate-100 text-craft-muted border-craft-line", tip: "Candidate did not pass screening." },
  { id: "moved_to_ats", label: "Moved to ATS", color: "bg-craft-section/10 text-craft-section border-craft-section/40", tip: "Candidate moved to your ATS for further processing." },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];

export const STAGE_IDS = PIPELINE_STAGES.map((s) => s.id);

export const STAGE_COLORS: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.id, s.color])
);

export const DEFAULT_STAGE: PipelineStageId = "sourced";

/** AI Fund Craft blue series for language bars/dots (replaces GitHub language colors). */
export const CRAFT_SERIES = ["#1F4E79", "#163B63", "#667085", "#8FA9C4", "#C2D3E5"] as const;
export const craftSeries = (i: number) => CRAFT_SERIES[((i % CRAFT_SERIES.length) + CRAFT_SERIES.length) % CRAFT_SERIES.length];
