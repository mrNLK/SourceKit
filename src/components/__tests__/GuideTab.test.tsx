import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import GuideTab, { GUIDE_URL, GUIDE_PDF_URL } from "@/components/GuideTab";

describe("GuideTab", () => {
  it("embeds the in-app pilot guide with a PDF download, no external docs host", () => {
    render(<GuideTab />);
    expect(screen.getByTitle("SourceKit Pilot Guide").getAttribute("src")).toBe(GUIDE_URL);
    expect(screen.getByText("Download PDF").closest("a")?.getAttribute("href")).toBe(GUIDE_PDF_URL);
    expect(document.body.innerHTML).not.toContain("netlify");
  });
  it("ships the guide page and PDF in public/", () => {
    expect(existsSync(`public${GUIDE_URL}`)).toBe(true);
    expect(existsSync(`public${GUIDE_PDF_URL}`)).toBe(true);
    expect(readFileSync(`public${GUIDE_URL}`, "utf8")).not.toMatch(/\u2014/);
  });
});
