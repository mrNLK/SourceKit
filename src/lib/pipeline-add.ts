import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** First stage for newly added candidates. */
export const NEW_CANDIDATE_STAGE = "sourced" as const;

export interface PipelineAddInput {
  username: string;
  name?: string | null;
  avatarUrl?: string | null;
  score?: number | null;
  notes?: string;
  source?: string;
  sourceQuery?: string;
}

/** Build the row inserted into `pipeline` for a newly added candidate. */
export function buildPipelineRow(input: PipelineAddInput) {
  return {
    github_username: input.username,
    name: input.name ?? input.username,
    avatar_url: input.avatarUrl ?? "",
    stage: NEW_CANDIDATE_STAGE,
    ...(typeof input.score === "number" && input.score > 0 ? { score: Math.round(input.score) } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.source ? { source: input.source } : {}),
    ...(input.sourceQuery ? { source_query: input.sourceQuery } : {}),
  };
}

export async function upsertPipelineCandidate(input: PipelineAddInput) {
  const { error } = await supabase
    .from("pipeline")
    .upsert(buildPipelineRow(input) as never, { onConflict: "user_id,github_username" });
  if (error) throw error;
}

/** Visible confirmation toast for pipeline additions. */
export function notifyPipelineAdded(added: number, failed = 0, label?: string) {
  if (added === 0 && failed === 0) {
    sonnerToast.info("Already in your pipeline", { description: "No new candidates were added." });
  } else if (failed === 0) {
    sonnerToast.success(
      label && added === 1 ? `${label} added to pipeline` : `Added ${added} candidate${added !== 1 ? "s" : ""} to pipeline`,
      { description: "Placed in the Sourced stage." },
    );
  } else if (added > 0) {
    sonnerToast.warning(`Added ${added} of ${added + failed} candidates`, { description: `${failed} failed. Please retry.` });
  } else {
    sonnerToast.error("Failed to add to pipeline", { description: "Please try again." });
  }
}
