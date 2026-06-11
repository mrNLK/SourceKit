import { describe, expect, it } from "vitest";
import { summarizeConversionEvents, type BdConversionEvent } from "@/lib/bd-sourcing/conversions";
import { buyerPersonaLabel, inferBuyerPersona } from "@/lib/bd-sourcing/personas";
import type { BdTargetView } from "@/types/bd-sourcing";

function target(
  id: string,
  title: string,
  signalType: BdTargetView["signal"]["signalType"],
  signalTitle: string,
): Pick<BdTargetView, "id" | "signal" | "contact"> {
  return {
    id,
    contact: { fullName: `${id} Buyer`, title, emailVerificationStatus: "verified" },
    signal: {
      signalType,
      title: signalTitle,
      summary: `${signalTitle} summary`,
      sourceUrl: `https://${id}.example/news`,
      sourceDate: "2026-06-01",
    },
  };
}

function event(
  id: string,
  targetId: string,
  eventType: BdConversionEvent["eventType"],
  signalType: BdConversionEvent["signalType"],
  signalTitle: string,
): BdConversionEvent {
  return {
    id,
    targetId,
    companyName: `${targetId} Co`,
    contactName: `${targetId} Buyer`,
    signalType,
    signalTitle,
    eventType,
    conversionArea: "both",
    channel: eventType === "target_approved" ? null : "manual_email",
    occurredAt: "2026-06-10T12:00:00Z",
    source: "manual",
    notes: "",
    externalWrites: [],
  };
}

describe("Conversion dashboard persona and signal aggregation", () => {
  it("infers the five tracked personas from titles", () => {
    expect(inferBuyerPersona("CTO")).toBe("cto");
    expect(inferBuyerPersona("Chief Technology Officer")).toBe("cto");
    expect(inferBuyerPersona("VP, Engineering")).toBe("vp_eng");
    expect(inferBuyerPersona("Head of Infrastructure")).toBe("vp_eng");
    expect(inferBuyerPersona("VP, Data Platform")).toBe("vp_data");
    expect(inferBuyerPersona("Head of Transformation")).toBe("head_transformation");
    expect(inferBuyerPersona("CISO")).toBe("security_ciso");
    expect(inferBuyerPersona("Head of Security")).toBe("security_ciso");
    expect(inferBuyerPersona("VP, Marketing")).toBe("other");
    expect(buyerPersonaLabel("security_ciso")).toBe("Security / CISO");
  });

  it("groups conversion outcomes by persona", () => {
    const targets = [
      target("t1", "CTO", "exec_change", "New data leader"),
      target("t2", "CTO", "funding", "Funding"),
      target("t3", "VP, Data Platform", "funding", "Funding"),
    ];
    const events = [
      event("e1", "t1", "target_approved", "exec_change", "New data leader"),
      event("e2", "t1", "manual_email_sent", "exec_change", "New data leader"),
      event("e3", "t1", "positive_reply", "exec_change", "New data leader"),
      event("e4", "t1", "meeting_booked", "exec_change", "New data leader"),
      event("e5", "t2", "manual_email_sent", "funding", "Funding"),
      event("e6", "t3", "manual_email_sent", "funding", "Funding"),
      event("e7", "t3", "reply_received", "funding", "Funding"),
    ];

    const summary = summarizeConversionEvents(targets, events);
    const cto = summary.personaStats.find((stat) => stat.persona === "cto");
    const vpData = summary.personaStats.find((stat) => stat.persona === "vp_data");

    expect(cto).toMatchObject({
      personaLabel: "CTO",
      sourced: 2,
      approved: 1,
      outreachSent: 2,
      replies: 1,
      positiveReplies: 1,
      meetings: 1,
      approvalRate: 50,
      replyRate: 50,
      positiveReplyRate: 50,
      meetingRate: 50,
    });
    expect(vpData).toMatchObject({ sourced: 1, outreachSent: 1, replies: 1, positiveReplies: 0, meetings: 0 });
  });

  it("computes signal-level positive reply and meeting rates", () => {
    const targets = [
      target("t1", "CTO", "open_web", "Cloud cost pressure"),
      target("t2", "VP, Engineering", "open_web", "Cloud cost pressure"),
      target("t3", "VP, Engineering", "senior_hiring_spike", "Hiring spike"),
    ];
    const events = [
      event("e1", "t1", "target_approved", "open_web", "Cloud cost pressure"),
      event("e2", "t1", "manual_email_sent", "open_web", "Cloud cost pressure"),
      event("e3", "t2", "manual_email_sent", "open_web", "Cloud cost pressure"),
      event("e4", "t1", "positive_reply", "open_web", "Cloud cost pressure"),
      event("e5", "t3", "manual_email_sent", "senior_hiring_spike", "Hiring spike"),
      event("e6", "t3", "meeting_booked", "senior_hiring_spike", "Hiring spike"),
    ];

    const summary = summarizeConversionEvents(targets, events);
    const cloudCost = summary.signalStats.find((stat) => stat.signalTitle === "Cloud cost pressure");
    const hiring = summary.signalStats.find((stat) => stat.signalTitle === "Hiring spike");

    expect(cloudCost).toMatchObject({
      approvalRate: 50,
      positiveReplies: 1,
      positiveReplyRate: 50,
      meetingRate: 0,
    });
    expect(hiring).toMatchObject({ meetings: 1, meetingRate: 100, positiveReplyRate: 0 });
  });

  it("returns zero rates instead of dividing by zero", () => {
    const summary = summarizeConversionEvents([], []);
    expect(summary.totals).toMatchObject({
      signalMeetingRate: 0,
      outreachReplyRate: 0,
      outreachMeetingRate: 0,
    });
    expect(summary.personaStats).toEqual([]);
    expect(summary.signalStats).toEqual([]);

    const noOutreach = summarizeConversionEvents(
      [target("t1", "CTO", "funding", "Funding")],
      [event("e1", "t1", "target_approved", "funding", "Funding")],
    );
    const funding = noOutreach.signalStats.find((stat) => stat.signalTitle === "Funding");
    expect(funding?.replyRate).toBe(0);
    expect(funding?.positiveReplyRate).toBe(0);
    const cto = noOutreach.personaStats.find((stat) => stat.persona === "cto");
    expect(cto?.replyRate).toBe(0);
  });
});
