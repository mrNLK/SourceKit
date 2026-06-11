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

  const exportTarget = (overrides: Partial<Parameters<typeof buildManualCrmCsv>[0][number]>) => ({
    fullName: "Maya Chen",
    firstName: "Maya",
    lastName: "Chen",
    title: "VP Data Strategy",
    company: "Northstar Cloud",
    domain: "northstarcloud.example",
    workEmail: "maya.chen@northstarcloud.example",
    linkedinUrl: null,
    signal: "New CIO joined",
    sourceUrl: "https://northstarcloud.example/news",
    score: 98,
    ...overrides,
  });

  it.each([
    ["formula", '=HYPERLINK("https://evil.example","Northstar")'],
    ["plus", "+1+2"],
    ["minus", "-2+3"],
    ["at", "@SUM(A1:A9)"],
  ])("neutralizes provider-supplied company names starting with a %s trigger", (_kind, company) => {
    const csv = buildManualCrmCsv([exportTarget({ company })]);
    const sanitized = `'${company}`;
    const encoded = /[",\n\r]/.test(sanitized)
      ? `"${sanitized.replace(/"/g, '""')}"`
      : sanitized;
    expect(csv).toContain(encoded);
    expect(csv).not.toContain(`,${company},`);
  });

  it("neutralizes whitespace-shifted formula triggers in contact names", () => {
    const csv = buildManualCrmCsv([
      exportTarget({ fullName: "\t=cmd|' /C calc'!A0", firstName: "\r=2+5", lastName: "\n@evil" }),
    ]);
    const dataRow = csv.slice(csv.indexOf("\n") + 1);
    expect(dataRow.startsWith(`'\t=`)).toBe(true);
    expect(dataRow).toContain(`"'\r=2+5"`);
    expect(dataRow).toContain(`"'\n@evil"`);
  });

  it("preserves normal text and existing quoting behavior", () => {
    const csv = buildManualCrmCsv([
      exportTarget({ company: 'Acme "Insights", Inc', title: "VP, Data" }),
    ]);
    const dataRow = csv.split("\n").slice(1).join("\n");
    expect(dataRow).toContain('"Acme ""Insights"", Inc"');
    expect(dataRow).toContain('"VP, Data"');
    expect(dataRow).toContain("Maya Chen");
    expect(dataRow).not.toContain("'Maya Chen");
    expect(dataRow).toContain(",98");
  });
});
