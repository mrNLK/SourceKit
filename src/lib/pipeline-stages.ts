/** Canonical pipeline stage definitions. Import this everywhere instead of duplicating. */

export const STAGES = [
  { id: "contacted", label: "Contacted", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", tip: "Message sent. Waiting for response." },
  { id: "not_interested", label: "Not Interested", color: "bg-red-500/15 text-red-400 border-red-500/30", tip: "Candidate declined or not interested." },
  { id: "recruiter_screen", label: "Recruiter Screen", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", tip: "Recruiter screen scheduled or completed." },
  { id: "rejected", label: "Rejected", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", tip: "Candidate did not pass screening." },
  { id: "moved_to_ats", label: "Moved to ATS", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", tip: "Candidate moved to applicant tracking system." },
] as const;

export type StageId = (typeof STAGES)[number]["id"];
export type Stage = (typeof STAGES)[number];

/** Just the stage ID strings, useful for simple lookups. */
export const STAGE_IDS = STAGES.map((s) => s.id);
