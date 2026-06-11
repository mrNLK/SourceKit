import type { BdSignalProvider, BdSignalType } from "@/types/bd-sourcing";
import type { BdBuyerPersona } from "@/lib/bd-sourcing/personas";

export type BdRadarItemStatus = "new" | "reviewed" | "queued" | "ignored";
export type BdRadarAction = "review" | "add_to_queue" | "ignore";
export type BdRadarConfidenceTier = "High" | "Medium" | "Low";

export interface BdSignalRadarItem {
  id: string;
  companyName: string;
  companyDomain: string;
  signalType: BdSignalType;
  signalTitle: string;
  signalSummary: string;
  sourceUrl: string;
  provider: BdSignalProvider;
  detectedAt: string;
  confidence: number;
  suggestedPersona: BdBuyerPersona;
  status: BdRadarItemStatus;
  metadata: Record<string, unknown>;
}

export type BdRadarTransitionResult =
  | { ok: true; item: BdSignalRadarItem }
  | { ok: false; reason: string };

const allowedTransitions: Record<BdRadarItemStatus, BdRadarItemStatus[]> = {
  new: ["reviewed", "queued", "ignored"],
  reviewed: ["queued", "ignored"],
  queued: ["ignored"],
  ignored: ["reviewed"],
};

const actionTargets: Record<BdRadarAction, BdRadarItemStatus> = {
  review: "reviewed",
  add_to_queue: "queued",
  ignore: "ignored",
};

export function radarStatusForAction(action: BdRadarAction): BdRadarItemStatus {
  return actionTargets[action];
}

export function canTransitionRadarStatus(from: BdRadarItemStatus, to: BdRadarItemStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function applyRadarAction(item: BdSignalRadarItem, action: BdRadarAction): BdRadarTransitionResult {
  const nextStatus = radarStatusForAction(action);
  if (!canTransitionRadarStatus(item.status, nextStatus)) {
    return {
      ok: false,
      reason: `Cannot move a ${item.status} radar item to ${nextStatus}.`,
    };
  }

  return { ok: true, item: { ...item, status: nextStatus } };
}

export function radarConfidenceTier(confidence: number): BdRadarConfidenceTier {
  if (confidence >= 80) return "High";
  if (confidence >= 60) return "Medium";
  return "Low";
}

export function radarStatusLabel(status: BdRadarItemStatus): string {
  const labels: Record<BdRadarItemStatus, string> = {
    new: "New",
    reviewed: "Reviewed",
    queued: "Queued",
    ignored: "Ignored",
  };
  return labels[status];
}

export function buildDemoRadarItems(): BdSignalRadarItem[] {
  return [
    {
      id: "radar-vercel-exec",
      companyName: "Vercel",
      companyDomain: "vercel.com",
      signalType: "exec_change",
      signalTitle: "New Head of AI at enterprise software company",
      signalSummary: "A new Head of AI started in the last 60 days and is staffing an applied AI platform group.",
      sourceUrl: "https://vercel.com/news",
      provider: "exa",
      detectedAt: "2026-06-09T14:00:00Z",
      confidence: 88,
      suggestedPersona: "vp_data",
      status: "new",
      metadata: { demo: true },
    },
    {
      id: "radar-hashicorp-hiring",
      companyName: "HashiCorp",
      companyDomain: "hashicorp.com",
      signalType: "senior_hiring_spike",
      signalTitle: "20+ platform roles opened this week",
      signalSummary: "Careers page added 20+ senior platform and infrastructure roles within seven days.",
      sourceUrl: "https://hashicorp.com/careers",
      provider: "parallel",
      detectedAt: "2026-06-08T16:30:00Z",
      confidence: 82,
      suggestedPersona: "vp_eng",
      status: "new",
      metadata: { demo: true },
    },
    {
      id: "radar-twilio-cloud-cost",
      companyName: "Twilio",
      companyDomain: "twilio.com",
      signalType: "open_web",
      signalTitle: "Cloud cost pressure mentioned in earnings call",
      signalSummary: "Leadership flagged cloud spend efficiency as a priority on the latest earnings call.",
      sourceUrl: "https://investors.twilio.com",
      provider: "exa",
      detectedAt: "2026-06-06T18:00:00Z",
      confidence: 71,
      suggestedPersona: "head_transformation",
      status: "new",
      metadata: { demo: true },
    },
    {
      id: "radar-confluent-combo",
      companyName: "Confluent",
      companyDomain: "confluent.io",
      signalType: "senior_hiring_spike",
      signalTitle: "Platform hiring + AI observability language",
      signalSummary: "Hiring spike for platform engineering combined with AI observability language in job posts and the engineering blog.",
      sourceUrl: "https://confluent.io/careers",
      provider: "parallel",
      detectedAt: "2026-06-05T12:00:00Z",
      confidence: 79,
      suggestedPersona: "cto",
      status: "reviewed",
      metadata: { demo: true },
    },
  ];
}
