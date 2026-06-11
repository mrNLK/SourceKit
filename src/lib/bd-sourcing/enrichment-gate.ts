import type { BdTargetLifecycleState } from "@/types/bd-sourcing";
import { bdSourcingConfig } from "@/lib/bd-sourcing/config";

export type EnrichmentGateStatus = "Blocked" | "Ready" | "Enriched";

export const enrichmentScoreThreshold = bdSourcingConfig.scoring.reachNowThreshold;
export const enrichmentBatchCap = 10;
export const enrichmentFields = ["work_email"] as const;

export interface EnrichmentGateInput {
  score: number;
  lifecycleState: BdTargetLifecycleState;
  alreadyEnriched: boolean;
  batchUsed: number;
  threshold?: number;
  batchCap?: number;
}

export interface EnrichmentGateResult {
  status: EnrichmentGateStatus;
  canEnrich: boolean;
  threshold: number;
  batchCap: number;
  batchUsed: number;
  reasons: string[];
}

const blockedLifecycleStates = new Set<BdTargetLifecycleState>(["suppressed", "lost"]);

export function evaluateEnrichmentGate(input: EnrichmentGateInput): EnrichmentGateResult {
  const threshold = input.threshold ?? enrichmentScoreThreshold;
  const batchCap = input.batchCap ?? enrichmentBatchCap;
  const reasons: string[] = [];

  if (input.alreadyEnriched) {
    return {
      status: "Enriched",
      canEnrich: false,
      threshold,
      batchCap,
      batchUsed: input.batchUsed,
      reasons: ["Work email enrichment already ran for this target."],
    };
  }

  if (input.score < threshold) {
    reasons.push(`Score ${input.score} is below the ${threshold} threshold. No Apollo spend below threshold.`);
  }
  if (blockedLifecycleStates.has(input.lifecycleState)) {
    reasons.push("Target is rejected or suppressed, so enrichment stays blocked.");
  }
  if (input.batchUsed >= batchCap) {
    reasons.push(`Batch cap reached (${input.batchUsed}/${batchCap} enrichments used).`);
  }

  if (reasons.length > 0) {
    return {
      status: "Blocked",
      canEnrich: false,
      threshold,
      batchCap,
      batchUsed: input.batchUsed,
      reasons,
    };
  }

  return {
    status: "Ready",
    canEnrich: true,
    threshold,
    batchCap,
    batchUsed: input.batchUsed,
    reasons: [`Score ${input.score} clears the ${threshold} threshold. Work email only - no phone or personal email.`],
  };
}
