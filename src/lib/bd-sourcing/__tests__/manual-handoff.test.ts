import { describe, expect, it } from "vitest";
import { buildManualCrmCsv, buildManualEmailHandoff } from "@/lib/bd-sourcing/manual-handoff";

describe("BD sourcing manual handoff", () => {
  it("builds a copyable email handoff and eml content without provider IDs", () => {
    const handoff = buildManualEmailHandoff({
      to: "maya@example.com",
      from: "operator@example.com",
      subject: "Quick thought for Northstar Cloud",
      textBody: "Hi Maya,\n\nUseful signal.\n\nBest,\nOperator",
    });

    expect(handoff.copyText).toContain("To: maya@example.com");
    expect(handoff.copyText).toContain("Subject: Quick thought for Northstar Cloud");
    expect(handoff.emlContent).toContain("To: maya@example.com");
    expect(handoff.emlContent).toContain("Content-Type: text/plain; charset=utf-8");
    expect(handoff.providerMessageId).toBeNull();
  });

  it("exports approved targets to a CRM-ready CSV without writing to Salesforce", () => {
    const csv = buildManualCrmCsv([
      {
        fullName: "Maya Chen",
        firstName: "Maya",
        lastName: "Chen",
        title: "VP Data Strategy",
        company: "Northstar Cloud",
        domain: "northstarcloud.example",
        workEmail: "maya.chen@northstarcloud.example",
        linkedinUrl: "https://www.linkedin.com/in/maya-chen-example",
        signal: "New CIO joined after data platform expansion",
        sourceUrl: "https://northstarcloud.example/news/cio-data-platform",
        score: 98,
      },
    ]);

    expect(csv.split("\n")[0]).toBe(
      "Full Name,First Name,Last Name,Title,Company,Domain,Email,LinkedIn URL,Signal,Source URL,Score",
    );
    expect(csv).toContain("Maya Chen");
    expect(csv).toContain("northstarcloud.example");
  });
});
