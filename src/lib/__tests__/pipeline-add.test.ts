import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { buildPipelineRow, NEW_CANDIDATE_STAGE } from "@/lib/pipeline-add";
import { PIPELINE_STAGES, DEFAULT_STAGE } from "@/lib/constants";
import { summarizeEmailResults } from "@/components/PeopleSearchTab";

describe("pipeline add", () => {
  it("lands new candidates in the first Sourced stage", () => {
    expect(NEW_CANDIDATE_STAGE).toBe("sourced");
    expect(PIPELINE_STAGES[0].id).toBe("sourced");
    expect(DEFAULT_STAGE).toBe("sourced");
    expect(buildPipelineRow({ username: "a" }).stage).toBe("sourced");
  });
  it("carries the AI score into the pipeline row", () => {
    expect(buildPipelineRow({ username: "a", score: 94.6 })).toMatchObject({ score: 95 });
    expect(buildPipelineRow({ username: "a", score: 0 })).not.toHaveProperty("score");
  });
});

describe("summarizeEmailResults", () => {
  it("summarizes found, existing and missing", () => {
    const s = summarizeEmailResults([
      { status: "success", email: "x@y.com" },
      { status: "already_has_email", email: "z@y.com" },
      { status: "not_found" },
    ], 3);
    expect(s.title).toBe("Found 1 new email");
    expect(s.description).toContain("1 already had one");
    expect(s.description).toContain("1 not found");
  });
});
