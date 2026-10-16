import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: vi.fn() }, from: vi.fn() } }));
import { criteriaFromHistoryMeta } from "@/lib/api";

describe("criteriaFromHistoryMeta (history replay criteria)", () => {
  it("restores skills, location, seniority and repos from saved metadata", () => {
    const r = criteriaFromHistoryMeta({ skills: ["CUDA", "Ray"], location: "Bay Area", seniority: "senior", repos_searched: ["ray-project/ray"] });
    expect(r.parsedCriteria.skills).toEqual(["CUDA", "Ray"]);
    expect(r.parsedCriteria.location).toBe("Bay Area");
    expect(r.parsedCriteria.seniority).toBe("senior");
    expect(r.reposSearched).toEqual(["ray-project/ray"]);
    expect(r.parsedCriteria.repos).toEqual([{ owner: "ray-project", name: "ray" }]);
  });
  it("returns empty, blank-free criteria for missing metadata", () => {
    const r = criteriaFromHistoryMeta(null);
    expect(r.parsedCriteria).toEqual({ repos: [], skills: [], location: null, seniority: null });
    expect(criteriaFromHistoryMeta({ skills: ["", "  "], seniority: "" }).parsedCriteria.skills).toEqual([]);
  });
});
