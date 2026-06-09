import { describe, expect, it } from "vitest";
import {
  EXA_AGENT_BETA_HEADER,
  buildExaAgentRunPayload,
  buildExaCompanySearchPayload,
} from "@/lib/bd-sourcing/provider-payloads";

describe("BD sourcing provider payloads", () => {
  it("builds Exa Company Search payload with company category and safe supported parameters", () => {
    const payload = buildExaCompanySearchPayload({
      query: "Series B AI infrastructure companies in North America with 200+ employees",
      numResults: 25,
    });

    expect(payload).toEqual({
      query: "Series B AI infrastructure companies in North America with 200+ employees",
      category: "company",
      type: "auto",
      numResults: 25,
      contents: {
        highlights: true,
      },
    });
    expect(payload).not.toHaveProperty("excludeDomains");
    expect(payload).not.toHaveProperty("startPublishedDate");
    expect(payload).not.toHaveProperty("endPublishedDate");
  });

  it("clamps Exa Company Search result count to the documented 1 to 100 range", () => {
    expect(buildExaCompanySearchPayload({ query: "AI companies", numResults: 0 }).numResults).toBe(1);
    expect(buildExaCompanySearchPayload({ query: "AI companies", numResults: 250 }).numResults).toBe(100);
  });

  it("builds Exa Agent run payload with bounded structured BD target output", () => {
    const payload = buildExaAgentRunPayload({
      query: "Find decision makers at AI infrastructure companies with fresh buying signals",
      maxItems: 12,
      effort: "auto",
    });

    expect(EXA_AGENT_BETA_HEADER).toBe("agent-2026-05-07");
    expect(payload.query).toContain("Find decision makers");
    expect(payload.effort).toBe("auto");
    expect(payload.outputSchema.properties.targets.maxItems).toBe(12);
    expect(payload.outputSchema.properties.targets.items.required).toEqual([
      "name",
      "job_title",
      "company",
      "linkedin_url",
      "signal_evidence",
      "source_url",
    ]);
  });
});
