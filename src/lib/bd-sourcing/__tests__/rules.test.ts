import { describe, expect, it } from "vitest";
import { evaluateSalesforceExclusion } from "@/lib/bd-sourcing/dedup";
import { runDemoBdSourcingFlow } from "@/lib/bd-sourcing/demo-data";
import { scoreTarget } from "@/lib/bd-sourcing/scoring";
import { canTransition } from "@/lib/bd-sourcing/state-machine";
import { buildFirstTouchEmail } from "@/lib/bd-sourcing/templates";
import { evaluateLocalSuppression } from "@/lib/bd-sourcing/dedup";

describe("BD sourcing deterministic rules", () => {
  it("uses an unweighted mean and assigns reach_now at 75 or above", () => {
    const result = scoreTarget({
      company: {
        employeeCount: 800,
        fundingStage: "Series C",
        industry: "Software",
      },
      contact: {
        title: "VP Data",
        emailVerificationStatus: "verified",
      },
      signal: {
        signalType: "exec_change",
        sourceDate: "2026-06-01",
      },
      now: new Date("2026-06-08T00:00:00Z"),
    });

    expect(result.composite).toBe(98);
    expect(result.bucket).toBe("reach_now");
  });

  it("excludes active uploaded CRM records owned by another rep", () => {
    const result = evaluateSalesforceExclusion({
      leadStatus: "Working",
      contactStatus: null,
      opportunityStage: null,
      ownerEmail: "other@example.com",
      operatorEmail: "operator@example.com",
    });

    expect(result.excluded).toBe(true);
    expect(result.reason).toContain("active Lead");
    expect(result.reason).toContain("owned by another rep");
  });

  it("blocks permanent unsubscribe suppression and recent outreach", () => {
    const result = evaluateLocalSuppression({
      email: "ALEX@EXAMPLE.COM",
      companyDomain: "example.com",
      now: new Date("2026-06-08T00:00:00Z"),
      suppressions: [
        {
          scope: "email",
          value: "alex@example.com",
          reason: "unsubscribe",
          permanent: true,
        },
      ],
      priorTouches: [
        {
          email: "alex@example.com",
          companyDomain: "example.com",
          sentAt: "2026-05-15T00:00:00Z",
        },
      ],
    });

    expect(result.blocked).toBe(true);
    expect(result.reasons).toContain("permanent email suppression");
    expect(result.reasons).toContain("inside re-contact window");
  });

  it("requires queued before approval and blocks terminal transitions", () => {
    expect(canTransition("queued", "approved")).toBe(true);
    expect(canTransition("discovered", "approved")).toBe(false);
    expect(canTransition("suppressed", "queued")).toBe(false);
  });

  it("does not draft email without verified email and signal evidence", () => {
    const result = buildFirstTouchEmail({
      firstName: "Alex",
      company: "ExampleCo",
      workEmail: null,
      emailVerificationStatus: "unknown",
      signalReference: "",
      ctaBookingLink: "https://bookings.example.com/operator",
      operatorName: "Operator",
      operatorEmail: "operator@example.com",
      physicalAddress: "123 Market St, San Francisco, CA",
      unsubscribeUrl: "https://example.com/unsubscribe",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_data");
  });

  it("does not duplicate punctuation after signal references", () => {
    const result = buildFirstTouchEmail({
      firstName: "Jordan",
      company: "AtlasGrid",
      workEmail: "jordan@example.com",
      emailVerificationStatus: "verified",
      signalReference: "AtlasGrid opened three senior digital roles.",
      ctaBookingLink: "",
      operatorName: "Operator",
      operatorEmail: "",
      physicalAddress: "123 Market St, San Francisco, CA",
      unsubscribeUrl: "https://example.com/unsubscribe",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.textBody).not.toContain("roles..");
      expect(result.textBody).toContain("Would it be useful to grab 20 minutes next week?");
      expect(result.textBody).not.toContain("bookings.example.com");
    }
  });

  it("runs discover to approve to draft without real send or CRM write", () => {
    const flow = runDemoBdSourcingFlow();

    expect(flow.target.lifecycleState).toBe("approved");
    expect(flow.emailDraft.status).toBe("draft");
    expect(flow.externalWrites).toEqual([]);
    expect(flow.auditLog.map((entry) => entry.action)).toEqual([
      "discovered",
      "sfdc_checked",
      "enriched",
      "scored",
      "queued",
      "approved",
      "email_drafted",
    ]);
  });
});
