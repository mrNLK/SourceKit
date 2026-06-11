import { describe, expect, it } from "vitest";
import {
  EXA_AGENT_BETA_HEADER,
  buildExaAgentRunPayload,
  buildExaCompanySearchQueries,
  buildExaCompanySearchPayload,
  buildExaPeopleSearchQueries,
  buildExaPeopleSearchPayload,
  buildParallelFindAllPreviewPayload,
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

  it("dedupes and caps Exa Company Search query variations", () => {
    expect(buildExaCompanySearchQueries({
      query: "AI infrastructure startups San Francisco",
      additionalQueries: [
        "AI infrastructure startups San Francisco",
        "Bay Area AI infra companies",
        "LLM infrastructure companies SF",
        "extra query beyond cap",
      ],
    })).toEqual([
      "AI infrastructure startups San Francisco",
      "Bay Area AI infra companies",
      "LLM infrastructure companies SF",
    ]);
  });

  it("builds Exa People Search payload as a sibling to Company Search", () => {
    const payload = buildExaPeopleSearchPayload({
      query: "VP Engineering at enterprise devtools companies",
      numResults: 20,
    });

    expect(payload).toEqual({
      query: "VP Engineering at enterprise devtools companies",
      category: "people",
      type: "auto",
      numResults: 20,
      contents: {
        highlights: true,
      },
    });
    expect(payload).not.toHaveProperty("excludeDomains");
    expect(payload).not.toHaveProperty("includeDomains");
    expect(payload).not.toHaveProperty("startPublishedDate");
    expect(payload).not.toHaveProperty("endPublishedDate");
    expect(payload).not.toHaveProperty("additionalQueries");
  });

  it("dedupes and caps Exa People Search query variations", () => {
    expect(buildExaPeopleSearchQueries({
      query: "VP Engineering AI infrastructure",
      additionalQueries: [
        "ML platform engineering leader",
        "VP Engineering AI infrastructure",
        "Head of AI platform engineering",
      ],
    })).toEqual([
      "VP Engineering AI infrastructure",
      "ML platform engineering leader",
      "Head of AI platform engineering",
    ]);
  });

  it("builds Parallel FindAll Preview payload with capped candidate count", () => {
    const payload = buildParallelFindAllPreviewPayload({
      objective: "Enterprise SaaS companies with 1,000+ employees hiring platform teams",
      entityType: "companies",
      matchConditions: [
        {
          name: "Enterprise company fit",
          description: "Company must be a B2B software company with at least 1,000 employees.",
        },
        {
          name: "Hiring signal",
          description: "Company must show recent senior platform, data, or infrastructure hiring.",
        },
      ],
      matchLimit: 25,
    });

    expect(payload).toEqual({
      objective: "Enterprise SaaS companies with 1,000+ employees hiring platform teams",
      entity_type: "companies",
      generator: "preview",
      match_limit: 10,
      match_conditions: [
        {
          name: "enterprise_company_fit",
          description: "Company must be a B2B software company with at least 1,000 employees.",
        },
        {
          name: "hiring_signal",
          description: "Company must show recent senior platform, data, or infrastructure hiring.",
        },
      ],
    });
  });

  it("builds a default Parallel FindAll Preview condition from the ICP objective", () => {
    const payload = buildParallelFindAllPreviewPayload({
      objective: "Series B fintech companies in Switzerland",
      matchLimit: 0,
    });

    expect(payload.entity_type).toBe("companies");
    expect(payload.match_limit).toBe(1);
    expect(payload.match_conditions).toEqual([
      {
        name: "icp_match",
        description: "Entity must match this ICP: Series B fintech companies in Switzerland",
      },
    ]);
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
