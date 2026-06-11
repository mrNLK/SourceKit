import { describe, expect, it } from "vitest";
import type { BdSignalConversionStat } from "@/lib/bd-sourcing/conversions";
import { buildDemoRadarItems } from "@/lib/bd-sourcing/signal-radar";
import { buildSignalDiscoveryRecommendations } from "@/lib/bd-sourcing/signal-discovery";

function stat(overrides: Partial<BdSignalConversionStat>): BdSignalConversionStat {
  return {
    signalType: "funding",
    signalTitle: "Funding",
    sourced: 10,
    approved: 5,
    outreachSent: 5,
    replies: 2,
    positiveReplies: 1,
    meetings: 1,
    wins: 0,
    approvalRate: 50,
    replyRate: 40,
    positiveReplyRate: 20,
    meetingRate: 10,
    winRate: 0,
    ...overrides,
  };
}

describe("Signal Discovery recommendations", () => {
  it("recommends the best converting signal with a lift estimate", () => {
    const recommendations = buildSignalDiscoveryRecommendations({
      signalStats: [
        stat({
          signalType: "senior_hiring_spike",
          signalTitle: "Platform hiring + AI observability language",
          meetingRate: 24,
          meetings: 3,
        }),
        stat({ signalType: "funding", signalTitle: "Funding only", meetingRate: 10 }),
        stat({ signalType: "exec_change", signalTitle: "New data leader", meetingRate: 10 }),
      ],
      radarItems: buildDemoRadarItems(),
    });

    const lift = recommendations.find((rec) => rec.id.startsWith("lift:"));
    expect(lift).toBeDefined();
    expect(lift?.recommendation).toContain("Platform hiring + AI observability language");
    expect(lift?.liftEstimate).toBe("2.4x");
    expect(lift?.evidence).toContain("24% meeting rate");
    expect(lift?.sampleAccounts.length).toBeGreaterThan(0);
  });

  it("surfaces untested radar signal types as experiments", () => {
    const recommendations = buildSignalDiscoveryRecommendations({
      signalStats: [stat({ signalType: "funding", signalTitle: "Funding", meetingRate: 10 })],
      radarItems: buildDemoRadarItems().map((item) => ({ ...item, signalType: "open_web" as const })),
    });

    const untested = recommendations.find((rec) => rec.id === "untested:open_web");
    expect(untested).toBeDefined();
    expect(untested?.liftEstimate).toBe("untested");
    expect(untested?.sampleAccounts.length).toBeGreaterThan(0);
  });

  it("never divides by zero and returns no lift claims without outreach data", () => {
    const recommendations = buildSignalDiscoveryRecommendations({
      signalStats: [
        stat({ signalTitle: "Untouched", outreachSent: 0, meetings: 0, meetingRate: 0, positiveReplies: 0 }),
      ],
      radarItems: [],
    });

    expect(recommendations.find((rec) => rec.id.startsWith("lift:"))).toBeUndefined();
    expect(recommendations).toEqual([]);
  });

  it("is deterministic for the same inputs and caps at three recommendations", () => {
    const input = {
      signalStats: [
        stat({ signalType: "senior_hiring_spike", signalTitle: "Hiring spike", meetingRate: 30, meetings: 3 }),
        stat({ signalType: "funding", signalTitle: "Funding", meetingRate: 10 }),
        stat({
          signalType: "exec_change",
          signalTitle: "New data leader",
          positiveReplies: 3,
          positiveReplyRate: 60,
        }),
      ],
      radarItems: buildDemoRadarItems(),
    };

    const first = buildSignalDiscoveryRecommendations(input);
    const second = buildSignalDiscoveryRecommendations(input);
    expect(first).toEqual(second);
    expect(first.length).toBeLessThanOrEqual(3);
  });
});
