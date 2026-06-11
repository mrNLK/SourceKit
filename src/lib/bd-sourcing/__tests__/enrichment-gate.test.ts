import { describe, expect, it } from "vitest";
import {
  enrichmentBatchCap,
  enrichmentFields,
  enrichmentScoreThreshold,
  evaluateEnrichmentGate,
} from "@/lib/bd-sourcing/enrichment-gate";

describe("Apollo enrichment gating", () => {
  it("defaults to a 75 score threshold and work email only", () => {
    expect(enrichmentScoreThreshold).toBe(75);
    expect([...enrichmentFields]).toEqual(["work_email"]);
  });

  it("blocks enrichment below the score threshold", () => {
    const gate = evaluateEnrichmentGate({
      score: 74,
      lifecycleState: "queued",
      alreadyEnriched: false,
      batchUsed: 0,
    });

    expect(gate.status).toBe("Blocked");
    expect(gate.canEnrich).toBe(false);
    expect(gate.reasons[0]).toContain("below the 75 threshold");
  });

  it("is ready exactly at the threshold for an active target", () => {
    const gate = evaluateEnrichmentGate({
      score: 75,
      lifecycleState: "queued",
      alreadyEnriched: false,
      batchUsed: 3,
    });

    expect(gate.status).toBe("Ready");
    expect(gate.canEnrich).toBe(true);
    expect(gate.reasons[0]).toContain("Work email only");
  });

  it("blocks rejected or suppressed targets even with a high score", () => {
    const gate = evaluateEnrichmentGate({
      score: 95,
      lifecycleState: "suppressed",
      alreadyEnriched: false,
      batchUsed: 0,
    });

    expect(gate.status).toBe("Blocked");
    expect(gate.reasons.join(" ")).toContain("rejected or suppressed");
  });

  it("enforces the visible batch cap", () => {
    const gate = evaluateEnrichmentGate({
      score: 90,
      lifecycleState: "queued",
      alreadyEnriched: false,
      batchUsed: enrichmentBatchCap,
    });

    expect(gate.status).toBe("Blocked");
    expect(gate.reasons.join(" ")).toContain(`${enrichmentBatchCap}/${enrichmentBatchCap}`);
  });

  it("reports already-enriched targets as Enriched and not clickable", () => {
    const gate = evaluateEnrichmentGate({
      score: 90,
      lifecycleState: "queued",
      alreadyEnriched: true,
      batchUsed: 1,
    });

    expect(gate.status).toBe("Enriched");
    expect(gate.canEnrich).toBe(false);
  });
});
