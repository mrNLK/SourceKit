import { describe, it, expect, beforeEach } from "vitest";
import {
  legacyToWebsetSignal,
  legacyToWebsetSignals,
  buildWebsetPayload,
  buildMonitorPayload,
  parseWebsetItemEEA,
  computeEEAScore,
  buildSearchQuery,
} from "../eea-webset";
import type { WebsetEEASignal, LegacyEEASignal, EEAWebsetConfig } from "@/types/eea";
import type { WebsetItem } from "@/services/websets";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeLegacySignal = (overrides?: Partial<LegacyEEASignal>): LegacyEEASignal => ({
  signal: "Open-source contributor",
  strength: "strong",
  criterion: "Has 5+ merged PRs to popular repos",
  ...overrides,
});

const makeWebsetSignal = (overrides?: Partial<WebsetEEASignal>): WebsetEEASignal => ({
  id: "sig_1",
  signal: "Open-source contributor",
  verification_method: "Verify via public web data: Has 5+ merged PRs",
  webset_criterion: "Has 5+ merged PRs to popular repos",
  enrichment_description: "Evidence for: Open-source contributor",
  enrichment_format: "text",
  enabled: true,
  ...overrides,
});

const makeConfig = (overrides?: Partial<EEAWebsetConfig>): EEAWebsetConfig => ({
  role: "Senior Engineer",
  searchQuery: "senior engineer open source",
  signals: [makeWebsetSignal()],
  searchCount: 25,
  monitorCron: "0 0 * * 1",
  monitorBehavior: "append",
  ...overrides,
});

const makeWebsetItem = (overrides?: Partial<WebsetItem>): WebsetItem => ({
  id: "item_1",
  url: "https://github.com/jdoe",
  title: "Jane Doe",
  description: "Software engineer",
  properties: {},
  ...overrides,
});

// ---------------------------------------------------------------------------
// legacyToWebsetSignal
// ---------------------------------------------------------------------------

describe("legacyToWebsetSignal", () => {
  it("converts a legacy signal to webset format", () => {
    const result = legacyToWebsetSignal(makeLegacySignal());
    expect(result.signal).toBe("Open-source contributor");
    expect(result.webset_criterion).toBe("Has 5+ merged PRs to popular repos");
    expect(result.verification_method).toContain("Verify via public web data");
    expect(result.enrichment_description).toBe("Evidence for: Open-source contributor");
    expect(result.enrichment_format).toBe("text");
    expect(result.enabled).toBe(true);
  });

  it("generates unique IDs", () => {
    const a = legacyToWebsetSignal(makeLegacySignal());
    const b = legacyToWebsetSignal(makeLegacySignal());
    expect(a.id).not.toBe(b.id);
  });
});

describe("legacyToWebsetSignals", () => {
  it("converts an array of legacy signals", () => {
    const result = legacyToWebsetSignals([makeLegacySignal(), makeLegacySignal({ signal: "Speaker" })]);
    expect(result).toHaveLength(2);
    expect(result[1].signal).toBe("Speaker");
  });
});

// ---------------------------------------------------------------------------
// buildWebsetPayload
// ---------------------------------------------------------------------------

describe("buildWebsetPayload", () => {
  it("includes only enabled signals as criteria and enrichments", () => {
    const config = makeConfig({
      signals: [
        makeWebsetSignal({ id: "a", enabled: true }),
        makeWebsetSignal({ id: "b", enabled: false }),
      ],
    });
    const payload = buildWebsetPayload(config);
    // 1 signal enrichment + 2 default (email + EEA strength)
    expect(payload.enrichments).toHaveLength(3);
    expect(payload.criteria).toHaveLength(1);
  });

  it("always appends default email and EEA strength enrichments", () => {
    const payload = buildWebsetPayload(makeConfig());
    const descriptions = payload.enrichments.map(e => e.description);
    expect(descriptions).toContain("Contact email");
    expect(descriptions.some(d => d.includes("EEA strength"))).toBe(true);
  });

  it("uses options format with labels for options-type signals", () => {
    const config = makeConfig({
      signals: [
        makeWebsetSignal({
          enrichment_format: "options",
          enrichment_options: ["Yes", "No"],
        }),
      ],
    });
    const payload = buildWebsetPayload(config);
    const optionsEnrichment = payload.enrichments[0];
    expect(optionsEnrichment.format).toBe("options");
    expect(optionsEnrichment.options).toEqual([{ label: "Yes" }, { label: "No" }]);
  });

  it("sets query and count from config", () => {
    const payload = buildWebsetPayload(makeConfig({ searchQuery: "test query", searchCount: 50 }));
    expect(payload.query).toBe("test query");
    expect(payload.count).toBe(50);
  });

  it("returns empty criteria/enrichments (besides defaults) when no signals enabled", () => {
    const config = makeConfig({ signals: [makeWebsetSignal({ enabled: false })] });
    const payload = buildWebsetPayload(config);
    expect(payload.criteria).toHaveLength(0);
    // only default enrichments
    expect(payload.enrichments).toHaveLength(2);
  });

  it("caps criteria and signal enrichments to Exa limit (5)", () => {
    const signals = Array.from({ length: 8 }, (_, i) =>
      makeWebsetSignal({
        id: `sig_${i}`,
        signal: `Signal ${i + 1}`,
        webset_criterion: `Criterion ${i + 1}`,
        enrichment_description: `Enrichment ${i + 1}`,
      })
    );
    const payload = buildWebsetPayload(makeConfig({ signals }));
    expect(payload.criteria).toHaveLength(5);
    expect(payload.enrichments).toHaveLength(7); // 5 signal enrichments + 2 default enrichments
  });
});

// ---------------------------------------------------------------------------
// buildMonitorPayload
// ---------------------------------------------------------------------------

describe("buildMonitorPayload", () => {
  it("builds monitor payload from config", () => {
    const payload = buildMonitorPayload(makeConfig());
    expect(payload.cron).toBe("0 0 * * 1");
    expect(payload.entity).toEqual({ type: "person" });
    expect(payload.behavior).toBe("append");
    expect(payload.count).toBe(10);
    expect(payload.criteria).toHaveLength(1);
  });

  it("excludes disabled signals from criteria", () => {
    const config = makeConfig({
      signals: [
        makeWebsetSignal({ enabled: true }),
        makeWebsetSignal({ id: "b", enabled: false }),
      ],
    });
    const payload = buildMonitorPayload(config);
    expect(payload.criteria).toHaveLength(1);
  });

  it("caps monitor criteria to Exa limit (5)", () => {
    const signals = Array.from({ length: 8 }, (_, i) =>
      makeWebsetSignal({
        id: `sig_${i}`,
        webset_criterion: `Criterion ${i + 1}`,
        enabled: true,
      })
    );
    const payload = buildMonitorPayload(makeConfig({ signals }));
    expect(payload.criteria).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// parseWebsetItemEEA
// ---------------------------------------------------------------------------

describe("parseWebsetItemEEA", () => {
  it("extracts email from properties", () => {
    const item = makeWebsetItem({
      properties: {
        "Contact email": { value: "jane@example.com", state: "completed" },
      },
    });
    const result = parseWebsetItemEEA(item, []);
    expect(result.email).toBe("jane@example.com");
  });

  it("extracts email from key containing 'email'", () => {
    const item = makeWebsetItem({
      properties: {
        "Primary email address": { value: "jane@co.com", state: "completed" },
      },
    });
    const result = parseWebsetItemEEA(item, []);
    expect(result.email).toBe("jane@co.com");
  });

  it("extracts EEA strength rating", () => {
    const item = makeWebsetItem({
      properties: {
        "EEA strength: how many criteria": { value: "Strong", state: "completed" },
      },
    });
    const result = parseWebsetItemEEA(item, []);
    expect(result.eea_strength).toBe("Strong");
  });

  it("ignores invalid EEA strength values", () => {
    const item = makeWebsetItem({
      properties: {
        "EEA strength": { value: "Unknown", state: "completed" },
      },
    });
    const result = parseWebsetItemEEA(item, []);
    expect(result.eea_strength).toBeUndefined();
  });

  it("skips properties that are not completed", () => {
    const item = makeWebsetItem({
      properties: {
        "Contact email": { value: "jane@example.com", state: "pending" },
      },
    });
    const result = parseWebsetItemEEA(item, []);
    expect(result.email).toBeUndefined();
  });

  it("matches enrichment properties to signals via 30-char prefix", () => {
    const signal = makeWebsetSignal({
      id: "sig_oss",
      signal: "OSS contributor",
      enrichment_description: "Evidence for: Open-source contributor activity",
    });
    const item = makeWebsetItem({
      properties: {
        "Evidence for: Open-source contributor activity and projects": {
          value: "Contributed to React, Vue",
          state: "completed",
        },
      },
    });
    const result = parseWebsetItemEEA(item, [signal]);
    expect(result.enrichments).toHaveLength(1);
    expect(result.enrichments[0].signal_id).toBe("sig_oss");
    expect(result.enrichments[0].signal_name).toBe("OSS contributor");
    expect(result.enrichments[0].value).toBe("Contributed to React, Vue");
  });

  it("marks enrichments as verified when non-empty and non-N/A", () => {
    const item = makeWebsetItem({
      properties: {
        "Some enrichment": { value: "Has data", state: "completed" },
      },
    });
    const result = parseWebsetItemEEA(item, []);
    expect(result.enrichments[0].verified).toBe(true);
  });

  it("marks enrichments as not verified for empty or N/A values", () => {
    const item = makeWebsetItem({
      properties: {
        "Enrichment A": { value: "", state: "completed" },
        "Enrichment B": { value: "N/A", state: "completed" },
      },
    });
    const result = parseWebsetItemEEA(item, []);
    expect(result.enrichments[0].verified).toBe(false);
    expect(result.enrichments[1].verified).toBe(false);
  });

  it("handles items with no properties", () => {
    const item = makeWebsetItem({ properties: undefined });
    const result = parseWebsetItemEEA(item, [makeWebsetSignal()]);
    expect(result.enrichments).toHaveLength(0);
    expect(result.email).toBeUndefined();
    expect(result.eea_strength).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// computeEEAScore
// ---------------------------------------------------------------------------

describe("computeEEAScore", () => {
  it("returns 0 for weak rating with no verified enrichments", () => {
    const item = {
      id: "1", url: "", title: "", enrichments: [],
      eea_strength: "Weak" as const,
    };
    expect(computeEEAScore(item, 3)).toBe(0);
  });

  it("returns 100 for strong rating with all enrichments verified", () => {
    const item = {
      id: "1", url: "", title: "",
      eea_strength: "Strong" as const,
      enrichments: [
        { signal_id: "a", signal_name: "A", value: "x", format: "text", verified: true },
        { signal_id: "b", signal_name: "B", value: "y", format: "text", verified: true },
      ],
    };
    expect(computeEEAScore(item, 2)).toBe(100);
  });

  it("returns 15 for moderate rating with no verified enrichments", () => {
    const item = {
      id: "1", url: "", title: "",
      eea_strength: "Moderate" as const,
      enrichments: [],
    };
    expect(computeEEAScore(item, 3)).toBe(15);
  });

  it("handles zero total signals without division error", () => {
    const item = {
      id: "1", url: "", title: "",
      eea_strength: "Strong" as const,
      enrichments: [],
    };
    expect(computeEEAScore(item, 0)).toBe(30);
  });

  it("handles missing eea_strength", () => {
    const item = {
      id: "1", url: "", title: "",
      enrichments: [
        { signal_id: "a", signal_name: "A", value: "x", format: "text", verified: true },
      ],
    };
    expect(computeEEAScore(item, 2)).toBe(35);
  });
});

// ---------------------------------------------------------------------------
// buildSearchQuery
// ---------------------------------------------------------------------------

describe("buildSearchQuery", () => {
  it("returns role only when no extras", () => {
    expect(buildSearchQuery("Engineer")).toBe("Engineer");
  });

  it("includes company", () => {
    expect(buildSearchQuery("Engineer", "Acme")).toBe("Engineer at companies like Acme");
  });

  it("includes skills", () => {
    expect(buildSearchQuery("Engineer", undefined, ["React", "Go"])).toBe(
      "Engineer with expertise in React, Go"
    );
  });

  it("includes both company and skills", () => {
    expect(buildSearchQuery("Engineer", "Acme", ["React"])).toBe(
      "Engineer at companies like Acme with expertise in React"
    );
  });

  it("limits skills to 5", () => {
    const skills = ["a", "b", "c", "d", "e", "f", "g"];
    const result = buildSearchQuery("Eng", undefined, skills);
    expect(result).toBe("Eng with expertise in a, b, c, d, e");
  });
});
