import { describe, expect, it } from "vitest";
import {
  buildIcpPreviewRequest,
  buildStubIcpPreviewMatches,
  icpPreviewMatchLimit,
  normalizeIcpPreviewMatches,
} from "@/lib/bd-sourcing/icp-preview";

describe("ICP preview payload mapping", () => {
  it("maps fast lookup mode to Parallel Entity Search", () => {
    const request = buildIcpPreviewRequest({
      icpText: "  1,000+ employee B2B software companies in the US  ",
      mode: "fast_lookup",
    });

    expect(request).toEqual({
      action: "parallel_entity_search",
      payload: {
        entityType: "companies",
        objective: "1,000+ employee B2B software companies in the US",
        matchLimit: icpPreviewMatchLimit,
      },
    });
  });

  it("maps preview run mode to Parallel FindAll Preview with a 10 match cap", () => {
    const request = buildIcpPreviewRequest({
      icpText: "VP Data buyers at growth-stage data platforms",
      mode: "preview_run",
      entityType: "people",
    });

    expect(request.action).toBe("parallel_findall_preview");
    expect(request.payload.entityType).toBe("people");
    expect(request.payload.matchLimit).toBe(10);
  });

  it("normalizes Parallel entity results defensively", () => {
    const matches = normalizeIcpPreviewMatches({
      entities: [
        { name: "Datadog", url: "https://datadoghq.com", description: "Observability platform", match_score: 0.91 },
        { title: "Snowflake", domain: "snowflake.com", reason: "Data cloud ICP fit", confidence: 78 },
        "garbage",
        null,
      ],
    });

    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      name: "Datadog",
      provider: "parallel",
      status: "provider_match",
      confidence: 91,
      sourceUrl: "https://datadoghq.com",
    });
    expect(matches[1]).toMatchObject({ name: "Snowflake", detail: "snowflake.com", confidence: 78 });
  });

  it("returns no matches for empty or unrecognized provider data", () => {
    expect(normalizeIcpPreviewMatches(undefined)).toEqual([]);
    expect(normalizeIcpPreviewMatches({ run_id: "fr_123", status: "queued" })).toEqual([]);
  });

  it("caps normalized matches at the preview limit", () => {
    const entities = Array.from({ length: 25 }, (_, index) => ({ name: `Company ${index}` }));
    expect(normalizeIcpPreviewMatches({ entities })).toHaveLength(icpPreviewMatchLimit);
  });

  it("builds a deterministic 10-row stub preview when providers are unavailable", () => {
    const stub = buildStubIcpPreviewMatches("enterprise platform teams", "fast_lookup");
    expect(stub).toHaveLength(10);
    stub.forEach((match) => {
      expect(match.provider).toBe("stub");
      expect(match.status).toBe("stub_preview");
      expect(match.matchReason).toContain("enterprise platform teams");
    });
    expect(buildStubIcpPreviewMatches("enterprise platform teams", "fast_lookup")).toEqual(stub);
  });
});
