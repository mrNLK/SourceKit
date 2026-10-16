import { describe, it, expect } from "vitest";
import { assessMatch, nameSimilarity, slugName } from "../linkedin-match";

describe("linkedin matching", () => {
  it("rejects the zou3519 -> richard-zhou mismatch", () => {
    const a = assessMatch(
      { url: "https://ca.linkedin.com/in/richard-zhou-2259b81", title: "Richard Zhou - Software Engineer | LinkedIn" },
      { username: "zou3519", name: "Richard Zou", company: "Meta" },
    );
    expect(a.confidence).toBe("low");
  });
  it("accepts a name + company match", () => {
    const a = assessMatch(
      { url: "https://www.linkedin.com/in/richard-zou-123", title: "Richard Zou - Software Engineer - Meta | LinkedIn" },
      { username: "zou3519", name: "Richard Zou", company: "@meta" },
    );
    expect(a.confidence).not.toBe("low");
  });
  it("name-only match stays below high", () => {
    const a = assessMatch({ url: "https://linkedin.com/in/jane-doe", title: "Jane Doe | LinkedIn" }, { username: "jd", name: "Jane Doe" });
    expect(a.confidence).toBe("medium");
  });
  it("handles names", () => {
    expect(nameSimilarity("Richard Zou", "Richard Zhou")).toBe(0);
    expect(nameSimilarity("Rich Zou", "Richard Zou")).toBe(1);
    expect(slugName("https://linkedin.com/in/richard-zhou-2259b81")).toBe("richard zhou");
  });
});
