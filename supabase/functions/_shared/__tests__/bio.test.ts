import { describe, it, expect } from "vitest";
import { chooseSummary, looksLikeCodeActivity } from "../providers/bio";
describe("chooseSummary", () => {
  it("uses the real GitHub bio for GitHub-only candidates", () =>
    expect(chooseSummary("LGTM, but can you rebase this PR?", "Compiler engineer at Acme", ["github"])).toBe("Compiler engineer at Acme"));
  it("replaces PR-comment text even for multi-source candidates", () =>
    expect(chooseSummary("@bob commented on this pull request", null, ["exa", "github"])).toBeNull());
  it("keeps a rich non-GitHub summary", () =>
    expect(chooseSummary("Staff ML engineer leading training infra.", "ml", ["exa", "github"])).toBe("Staff ML engineer leading training infra."));
  it("detects code activity", () => {
    expect(looksLikeCodeActivity("fix: handle null pointer")).toBe(true);
    expect(looksLikeCodeActivity("Building developer tools")).toBe(false);
  });
});
