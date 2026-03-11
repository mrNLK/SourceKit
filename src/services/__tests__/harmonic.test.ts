import { describe, it, expect, vi, beforeAll } from "vitest";
import type { CompanyContext } from "@/types/harmonic";

// Mock supabase client before importing harmonic module
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

let computePoachability: typeof import("../harmonic").computePoachability;
let companyNameToDomain: typeof import("../harmonic").companyNameToDomain;

beforeAll(async () => {
  const mod = await import("../harmonic");
  computePoachability = mod.computePoachability;
  companyNameToDomain = mod.companyNameToDomain;
});

// ---------------------------------------------------------------------------
// computePoachability
// ---------------------------------------------------------------------------

function makeCompany(overrides: Partial<CompanyContext> = {}): CompanyContext {
  return {
    name: "Acme Inc",
    domain: "acme.com",
    funding_stage: "SERIES_B",
    headcount: 100,
    headcount_growth_90d: 0,
    ...overrides,
  };
}

describe("computePoachability", () => {
  it("returns baseline score of 50 for a neutral company", () => {
    const result = computePoachability(makeCompany());
    expect(result.score).toBe(50);
    expect(result.domain).toBe("acme.com");
    expect(result.name).toBe("Acme Inc");
    expect(result.signals).toEqual([]);
  });

  it("boosts score when engineering team is shrinking", () => {
    const result = computePoachability(makeCompany({ headcount_growth_90d: -10 }));
    expect(result.score).toBe(70); // +20
    expect(result.signals).toContain("Engineering team shrinking (-10% in 90d)");
  });

  it("lowers score when engineering team is growing fast", () => {
    const result = computePoachability(makeCompany({ headcount_growth_90d: 30 }));
    expect(result.score).toBe(35); // -15
    expect(result.signals).toContain("Engineering team growing fast (+30% in 90d)");
  });

  it("boosts score for declining web traffic", () => {
    const result = computePoachability(
      makeCompany({ web_traffic: { ago30d: { percentChange: -20 } } })
    );
    expect(result.score).toBe(65); // +15
    expect(result.signals).toContain("Web traffic declining (-20% in 30d)");
  });

  it("lowers score for surging web traffic", () => {
    const result = computePoachability(
      makeCompany({ web_traffic: { ago30d: { percentChange: 50 } } })
    );
    expect(result.score).toBe(40); // -10
    expect(result.signals).toContain("Web traffic surging (+50% in 30d)");
  });

  it("boosts score for early-stage companies", () => {
    const result = computePoachability(makeCompany({ funding_stage: "SEED" }));
    expect(result.score).toBe(60); // +10
  });

  it("lowers score for late-stage companies", () => {
    const result = computePoachability(makeCompany({ funding_stage: "SERIES_D" }));
    expect(result.score).toBe(45); // -5
  });

  it("boosts score for stale funding (>24 months ago)", () => {
    const twoYearsAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 * 30).toISOString();
    const result = computePoachability(makeCompany({ last_funding_date: twoYearsAgo }));
    expect(result.score).toBe(65); // +15
  });

  it("lowers score for recent funding (<6 months ago)", () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const result = computePoachability(makeCompany({ last_funding_date: twoMonthsAgo }));
    expect(result.score).toBe(40); // -10
  });

  it("boosts score for small team (<20)", () => {
    const result = computePoachability(makeCompany({ headcount: 10 }));
    expect(result.score).toBe(55); // +5
  });

  it("boosts score for layoff signals in highlights", () => {
    const result = computePoachability(
      makeCompany({
        company_quality: {
          highlights: ["Announced layoffs of 20% of staff"],
        },
      })
    );
    expect(result.score).toBe(70); // +20
    expect(result.signals).toContain("Recent layoff/restructuring signals");
  });

  it("clamps score to 0-100 range", () => {
    // Stack multiple negative signals
    const high = computePoachability(
      makeCompany({
        headcount_growth_90d: -20,
        web_traffic: { ago30d: { percentChange: -30 } },
        funding_stage: "SEED",
        headcount: 5,
        company_quality: { highlights: ["layoff announced"] },
        last_funding_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 * 40).toISOString(),
      })
    );
    expect(high.score).toBeLessThanOrEqual(100);
    expect(high.score).toBeGreaterThanOrEqual(0);
  });

  it("extracts top lead investors", () => {
    const result = computePoachability(
      makeCompany({
        investors: [
          { name: "Sequoia", isLead: true },
          { name: "a16z", isLead: true },
          { name: "Y Combinator", isLead: false },
        ],
      })
    );
    expect(result.top_investors).toEqual(["Sequoia", "a16z"]);
  });

  it("handles null/undefined fields gracefully", () => {
    const result = computePoachability({});
    expect(result.score).toBe(50);
    expect(result.domain).toBe("");
    expect(result.name).toBe("");
    expect(result.signals).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// companyNameToDomain
// ---------------------------------------------------------------------------

describe("companyNameToDomain", () => {
  it("converts simple company name to domain", () => {
    expect(companyNameToDomain("Stripe")).toBe("stripe.com");
  });

  it("strips spaces and special characters", () => {
    expect(companyNameToDomain("Open AI")).toBe("openai.com");
    expect(companyNameToDomain("Palo Alto Networks")).toBe("paloaltonetworks.com");
  });

  it("handles mixed case", () => {
    expect(companyNameToDomain("DeepMind")).toBe("deepmind.com");
  });

  it("strips non-alphanumeric characters", () => {
    expect(companyNameToDomain("Y Combinator (YC)")).toBe("ycombinatoryc.com");
  });
});
