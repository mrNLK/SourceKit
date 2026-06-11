import { evaluateSalesforceExclusion } from "@/lib/bd-sourcing/dedup";
import { scoreTarget } from "@/lib/bd-sourcing/scoring";
import { buildSalesNavigatorNote, buildFirstTouchEmail } from "@/lib/bd-sourcing/templates";
import type { BdAuditLogEntry, BdDemoFlow, BdTargetView } from "@/types/bd-sourcing";

function audit(action: string): BdAuditLogEntry {
  return {
    action,
    createdAt: "2026-06-08T00:00:00Z",
  };
}

export function buildDemoTarget(): BdTargetView {
  const salesforceGate = evaluateSalesforceExclusion({
    leadStatus: null,
    contactStatus: null,
    opportunityStage: null,
    ownerEmail: "operator@example.com",
    operatorEmail: "operator@example.com",
  });

  const score = scoreTarget({
    company: {
      name: "Northstar Cloud",
      domain: "northstarcloud.example",
      employeeCount: 900,
      fundingStage: "Series C",
      industry: "Software",
      websiteUrl: "https://northstarcloud.example",
      linkedinUrl: "https://www.linkedin.com/company/northstar-cloud",
    },
    contact: {
      firstName: "Maya",
      lastName: "Chen",
      fullName: "Maya Chen",
      title: "VP Data Strategy",
      workEmail: "maya.chen@northstarcloud.example",
      emailVerificationStatus: "verified",
      linkedinUrl: "https://www.linkedin.com/in/maya-chen-example",
      salesNavUrl: "https://www.linkedin.com/sales/lead/maya-chen-example",
    },
    signal: {
      provider: "exa",
      signalType: "exec_change",
      title: "New CIO joined after data platform expansion",
      summary: "Northstar Cloud announced a new CIO while hiring senior data platform leaders.",
      sourceUrl: "https://northstarcloud.example/news/cio-data-platform",
      sourceDate: "2026-06-01",
    },
    now: new Date("2026-06-08T00:00:00Z"),
  });

  return {
    id: "bd-target-demo-1",
    company: {
      name: "Northstar Cloud",
      domain: "northstarcloud.example",
      employeeCount: 900,
      fundingStage: "Series C",
      industry: "Software",
      websiteUrl: "https://northstarcloud.example",
      linkedinUrl: "https://www.linkedin.com/company/northstar-cloud",
    },
    contact: {
      firstName: "Maya",
      lastName: "Chen",
      fullName: "Maya Chen",
      title: "VP Data Strategy",
      workEmail: "maya.chen@northstarcloud.example",
      emailVerificationStatus: "verified",
      linkedinUrl: "https://www.linkedin.com/in/maya-chen-example",
      salesNavUrl: "https://www.linkedin.com/sales/lead/maya-chen-example",
    },
    signal: {
      provider: "exa",
      signalType: "exec_change",
      title: "New CIO joined after data platform expansion",
      summary: "Northstar Cloud announced a new CIO while hiring senior data platform leaders.",
      sourceUrl: "https://northstarcloud.example/news/cio-data-platform",
      sourceDate: "2026-06-01",
    },
    lifecycleState: "approved",
    salesforceGate,
    score,
    linkedinNote: buildSalesNavigatorNote(
      "Maya",
      "Northstar Cloud announced a CIO change tied to data platform expansion",
    ),
  };
}

export function buildDemoTargets(): BdTargetView[] {
  const approved = buildDemoTarget();
  const queuedScore = scoreTarget({
    company: { name: "AtlasGrid", domain: "atlasgrid.example", employeeCount: 420, fundingStage: "Series B", industry: "Cloud" },
    contact: { fullName: "Jordan Lee", title: "Head of Product Strategy", emailVerificationStatus: "verified" },
    signal: { signalType: "senior_hiring_spike", sourceDate: "2026-05-28" },
    now: new Date("2026-06-08T00:00:00Z"),
  });

  return [
    approved,
    {
      id: "bd-target-demo-2",
      company: {
        name: "AtlasGrid",
        domain: "atlasgrid.example",
        employeeCount: 420,
        fundingStage: "Series B",
        industry: "Cloud",
      },
      contact: {
        firstName: "Jordan",
        lastName: "Lee",
        fullName: "Jordan Lee",
        title: "Head of Product Strategy",
        workEmail: "jordan.lee@atlasgrid.example",
        emailVerificationStatus: "verified",
        salesNavUrl: "https://www.linkedin.com/sales/lead/jordan-lee-example",
      },
      signal: {
        provider: "findem",
        signalType: "senior_hiring_spike",
        title: "Three senior digital roles opened in 30 days",
        summary: "Findem signal shows new senior product, data, and digital roles posted in the last month.",
        sourceUrl: "https://atlasgrid.example/careers",
        sourceDate: "2026-05-28",
      },
      lifecycleState: "queued",
      salesforceGate: evaluateSalesforceExclusion({
        leadStatus: null,
        contactStatus: null,
        opportunityStage: null,
        ownerEmail: "operator@example.com",
        operatorEmail: "operator@example.com",
      }),
      score: queuedScore,
      linkedinNote: buildSalesNavigatorNote("Jordan", "AtlasGrid opened three senior digital roles in 30 days"),
    },
  ];
}

export function runDemoBdSourcingFlow(): BdDemoFlow {
  const target = buildDemoTarget();
  const emailDraft = buildFirstTouchEmail({
    firstName: target.contact.firstName ?? "Maya",
    company: target.company.name,
    workEmail: target.contact.workEmail,
    emailVerificationStatus: target.contact.emailVerificationStatus,
    signalReference: "Northstar Cloud announced a CIO change tied to data platform expansion",
    ctaBookingLink: "https://bookings.example.com/operator",
    operatorName: "Operator",
    operatorEmail: "operator@example.com",
    physicalAddress: "123 Market St, San Francisco, CA",
    unsubscribeUrl: "https://sourcekit.example/unsubscribe/demo",
  });

  if (!emailDraft.ok) {
    throw new Error("Demo target should be draft-ready");
  }

  return {
    target,
    emailDraft,
    externalWrites: [],
    auditLog: [
      audit("discovered"),
      audit("sfdc_checked"),
      audit("enriched"),
      audit("scored"),
      audit("queued"),
      audit("approved"),
      audit("email_drafted"),
    ],
  };
}
