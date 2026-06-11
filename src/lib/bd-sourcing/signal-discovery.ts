import type { BdSignalConversionStat } from "@/lib/bd-sourcing/conversions";
import type { BdSignalRadarItem } from "@/lib/bd-sourcing/signal-radar";

export interface BdSignalDiscoveryRecommendation {
  id: string;
  recommendation: string;
  evidence: string;
  liftEstimate: string;
  sampleAccounts: string[];
  suggestedCriteria: string;
}

function liftMultiple(rateValue: number, baselineRate: number): number | null {
  if (baselineRate <= 0) return null;
  return Math.round((rateValue / baselineRate) * 10) / 10;
}

function sampleAccountsFor(radarItems: BdSignalRadarItem[], signalType: string, limit = 3): string[] {
  const names: string[] = [];
  for (const item of radarItems) {
    if (item.signalType !== signalType || item.status === "ignored") continue;
    if (!names.includes(item.companyName)) names.push(item.companyName);
    if (names.length >= limit) break;
  }
  return names;
}

export function buildSignalDiscoveryRecommendations(input: {
  signalStats: BdSignalConversionStat[];
  radarItems: BdSignalRadarItem[];
}): BdSignalDiscoveryRecommendation[] {
  const recommendations: BdSignalDiscoveryRecommendation[] = [];
  const tested = input.signalStats.filter((stat) => stat.outreachSent > 0);

  const byMeetingRate = [...tested].sort((a, b) => b.meetingRate - a.meetingRate || b.meetings - a.meetings);
  const best = byMeetingRate[0];
  const rest = byMeetingRate.slice(1).filter((stat) => stat.sourced > 0);

  if (best && best.meetingRate > 0 && rest.length > 0) {
    const baselineRate = Math.round(
      rest.reduce((total, stat) => total + stat.meetingRate, 0) / rest.length,
    );
    const lift = liftMultiple(best.meetingRate, baselineRate);
    recommendations.push({
      id: `lift:${best.signalType}:${best.signalTitle}`,
      recommendation: lift
        ? `Accounts with "${best.signalTitle}" converted ${lift}x better than other tracked signals. Source more accounts with this signal.`
        : `"${best.signalTitle}" is the only signal producing meetings so far. Source more accounts with this signal.`,
      evidence: `${best.meetings} meetings from ${best.sourced} sourced accounts (${best.meetingRate}% meeting rate) vs ${baselineRate}% average across ${rest.length} other tested signal${rest.length === 1 ? "" : "s"}.`,
      liftEstimate: lift ? `${lift}x` : "n/a",
      sampleAccounts: sampleAccountsFor(input.radarItems, best.signalType),
      suggestedCriteria: `Prioritize radar criteria matching: ${best.signalTitle}`,
    });
  }

  const byPositiveReply = [...tested]
    .filter((stat) => stat.positiveReplies > 0)
    .sort((a, b) => b.positiveReplyRate - a.positiveReplyRate);
  const warmest = byPositiveReply[0];
  if (warmest && (!best || warmest.signalTitle !== best.signalTitle)) {
    recommendations.push({
      id: `warm:${warmest.signalType}:${warmest.signalTitle}`,
      recommendation: `"${warmest.signalTitle}" drives the warmest replies (${warmest.positiveReplyRate}% positive). Test pairing it with a hiring or platform signal before scaling.`,
      evidence: `${warmest.positiveReplies} positive replies from ${warmest.outreachSent} manual sends.`,
      liftEstimate: `${warmest.positiveReplyRate}% positive reply`,
      sampleAccounts: sampleAccountsFor(input.radarItems, warmest.signalType),
      suggestedCriteria: `Add positive-reply criteria: ${warmest.signalTitle} + active platform initiative`,
    });
  }

  const testedTypes = new Set(tested.map((stat) => stat.signalType));
  const untestedTypes = new Map<string, BdSignalRadarItem[]>();
  for (const item of input.radarItems) {
    if (testedTypes.has(item.signalType) || item.status === "ignored") continue;
    const bucket = untestedTypes.get(item.signalType) ?? [];
    bucket.push(item);
    untestedTypes.set(item.signalType, bucket);
  }
  const [untestedType, untestedItems] = [...untestedTypes.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
  if (untestedType && untestedItems) {
    const exampleTitle = untestedItems[0].signalTitle;
    recommendations.push({
      id: `untested:${untestedType}`,
      recommendation: `Radar is surfacing "${exampleTitle}" accounts, but none have been worked yet. Queue a small manual batch to test this signal.`,
      evidence: `${untestedItems.length} radar item${untestedItems.length === 1 ? "" : "s"} of this type with zero outreach tracked.`,
      liftEstimate: "untested",
      sampleAccounts: untestedItems.slice(0, 3).map((item) => item.companyName),
      suggestedCriteria: `Test new radar criteria: ${exampleTitle}`,
    });
  }

  return recommendations.slice(0, 3);
}
