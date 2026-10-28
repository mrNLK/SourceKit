import { describe, expect, it } from "vitest";
import {
  buildManualConversionEvent,
  deriveLifecycleFromConversionEvents,
  lifecycleForConversionEvent,
  summarizeConversionEvents,
  type BdConversionEvent,
} from "@/lib/bd-sourcing/conversions";
import type { BdTargetView } from "@/types/bd-sourcing";

function target(id: string, signalType: BdTargetView["signal"]["signalType"], signalTitle: string): BdTargetView {
  return {
    id,
    company: { name: `${id} Co`, domain: `${id}.example` },
    contact: {
      fullName: `${id} Buyer`,
      title: "VP Engineering",
      emailVerificationStatus: "verified",
    },
    signal: {
      signalType,
      title: signalTitle,
      summary: `${signalTitle} summary`,
      sourceUrl: `https://${id}.example/news`,
      sourceDate: "2026-06-01",
    },
    lifecycleState: "queued",
    salesforceGate: { excluded: false, reason: null, reasons: [] },
    score: {
      companyFit: 90,
      personFit: 90,
      signalStrength: 90,
      signalFreshness: 90,
      reachability: 100,
      composite: 92,
      bucket: "reach_now",
      reasons: [],
    },
    linkedinNote: "Manual note",
  };
}

function event(
  id: string,
  targetId: string,
  eventType: BdConversionEvent["eventType"],
  overrides: Partial<BdConversionEvent> = {},
): BdConversionEvent {
  return {
    id,
    targetId,
    companyName: `${targetId} Co`,
    contactName: `${targetId} Buyer`,
    signalType: overrides.signalType ?? "funding",
    signalTitle: overrides.signalTitle ?? "Expansion funding",
    eventType,
    conversionArea: overrides.conversionArea ?? "both",
    channel: overrides.channel ?? "manual_email",
    occurredAt: "2026-06-10T12:00:00Z",
    source: "manual",
    notes: "",
    externalWrites: [],
    ...overrides,
  };
}

describe("SellKit conversion tracking", () => {
  it("summarizes signal conversion separately from outreach conversion", () => {
    const targets = [
      target("t1", "funding", "Expansion funding"),
      target("t2", "funding", "Expansion funding"),
      target("t3", "senior_hiring_spike", "20 platform roles opened"),
    ];
    const events: BdConversionEvent[] = [
      event("e1", "t1", "target_approved", { signalType: "funding", signalTitle: "Expansion funding", channel: null }),
      event("e2", "t2", "target_approved", { signalType: "funding", signalTitle: "Expansion funding", channel: null }),
      event("e3", "t1", "manual_email_sent", { signalType: "funding", signalTitle: "Expansion funding" }),
      event("e4", "t2", "manual_email_sent", { signalType: "funding", signalTitle: "Expansion funding" }),
      event("e5", "t3", "manual_email_sent", {
        signalType: "senior_hiring_spike",
        signalTitle: "20 platform roles opened",
      }),
      event("e6", "t1", "reply_received", { signalType: "funding", signalTitle: "Expansion funding" }),
      event("e7", "t2", "reply_received", { signalType: "funding", signalTitle: "Expansion funding" }),
      event("e8", "t1", "meeting_booked", { signalType: "funding", signalTitle: "Expansion funding" }),
    ];

    const summary = summarizeConversionEvents(targets, events);

    expect(summary.totals.targets).toBe(3);
    expect(summary.totals.outreachSent).toBe(3);
    expect(summary.totals.replies).toBe(2);
    expect(summary.totals.meetings).toBe(1);
    expect(summary.totals.outreachReplyRate).toBe(67);

    expect(summary.bestSignal?.signalTitle).toBe("Expansion funding");
    expect(summary.bestSignal?.meetingRate).toBe(50);

    const email = summary.outreachStats.find((stat) => stat.channel === "manual_email");
    expect(email).toMatchObject({
      sent: 3,
      replies: 2,
      meetings: 1,
      replyRate: 67,
      meetingRate: 33,
    });
  });

  it("builds manual tracking events without triggering external sends", () => {
    const selected = target("t1", "exec_change", "New Head of AI");

    const conversionEvent = buildManualConversionEvent(selected, "manual_email_sent", {
      occurredAt: "2026-06-10T15:30:00Z",
      channel: "manual_email",
      notes: "Sent from Outlook after approval.",
    });

    expect(conversionEvent).toMatchObject({
      targetId: "t1",
      eventType: "manual_email_sent",
      conversionArea: "outreach",
      channel: "manual_email",
      source: "manual",
      externalWrites: [],
    });
    expect(conversionEvent.signalTitle).toBe("New Head of AI");
  });

  it("hydrates target lifecycle from persisted conversion history after reload", () => {
    const events: BdConversionEvent[] = [
      event("e3", "t1", "reply_received", { occurredAt: "2026-06-10T12:20:00Z" }),
      event("e1", "t1", "target_approved", {
        channel: null,
        conversionArea: "signal",
        occurredAt: "2026-06-10T12:00:00Z",
      }),
      event("e2", "t1", "manual_email_sent", { occurredAt: "2026-06-10T12:10:00Z" }),
    ];

    expect(deriveLifecycleFromConversionEvents(events, "queued")).toBe("replied");
  });

  it("does not move an advanced lifecycle backwards when approval events arrive later", () => {
    expect(lifecycleForConversionEvent("target_approved", "replied")).toBe("replied");
    expect(lifecycleForConversionEvent("manual_email_sent", "meeting")).toBe("meeting");
  });
});
