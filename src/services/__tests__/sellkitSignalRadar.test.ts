import { describe, expect, it } from "vitest";
import { buildRadarItemInsert, mapRadarItemRow } from "@/services/sellkitSignalRadar";
import type { BdSignalRadarItem } from "@/lib/bd-sourcing/signal-radar";

const item: BdSignalRadarItem = {
  id: "local-radar-1",
  companyName: "Confluent",
  companyDomain: "confluent.io",
  signalType: "senior_hiring_spike",
  signalTitle: "Platform hiring + AI observability language",
  signalSummary: "Hiring spike with AI observability language.",
  sourceUrl: "https://confluent.io/careers",
  provider: "parallel",
  detectedAt: "2026-06-05T12:00:00Z",
  confidence: 79.6,
  suggestedPersona: "cto",
  status: "new",
  metadata: { demo: true },
};

describe("SellKit Signal Radar persistence mapping", () => {
  it("builds an insert row scoped to the user with clamped confidence", () => {
    const insert = buildRadarItemInsert("user-1", item);

    expect(insert).toMatchObject({
      user_id: "user-1",
      company_name: "Confluent",
      company_domain: "confluent.io",
      signal_type: "senior_hiring_spike",
      signal_title: "Platform hiring + AI observability language",
      provider: "parallel",
      detected_at: "2026-06-05T12:00:00Z",
      confidence: 80,
      suggested_persona: "cto",
      status: "new",
    });
    expect(insert.metadata).toMatchObject({ demo: true, localItemId: "local-radar-1" });
  });

  it("clamps out-of-range confidence into 0-100", () => {
    expect(buildRadarItemInsert("user-1", { ...item, confidence: 140 }).confidence).toBe(100);
    expect(buildRadarItemInsert("user-1", { ...item, confidence: -5 }).confidence).toBe(0);
  });

  it("maps a database row back to the domain shape", () => {
    const mapped = mapRadarItemRow({
      id: "row-1",
      user_id: "user-1",
      company_name: "Confluent",
      company_domain: "confluent.io",
      signal_type: "senior_hiring_spike",
      signal_title: "Platform hiring + AI observability language",
      signal_summary: "Hiring spike with AI observability language.",
      source_url: "https://confluent.io/careers",
      provider: "parallel",
      detected_at: "2026-06-05T12:00:00Z",
      confidence: 79,
      suggested_persona: "cto",
      status: "queued",
      metadata: { demo: true },
      created_at: "2026-06-05T12:00:00Z",
      updated_at: "2026-06-06T12:00:00Z",
    });

    expect(mapped).toMatchObject({
      id: "row-1",
      companyName: "Confluent",
      signalType: "senior_hiring_spike",
      provider: "parallel",
      confidence: 79,
      suggestedPersona: "cto",
      status: "queued",
    });
  });
});
