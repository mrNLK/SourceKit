import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Filter,
  Layers3,
  Link2,
  Mail,
  MapPin,
  MoreVertical,
  Radar,
  Reply,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SourceKitMark } from "@/components/brand/SourceKitMark";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import EnrichmentGateCard from "@/components/bd-sourcing/EnrichmentGateCard";
import IcpPreviewLab from "@/components/bd-sourcing/IcpPreviewLab";
import SignalDiscoverySection from "@/components/bd-sourcing/SignalDiscoverySection";
import SignalRadarSection from "@/components/bd-sourcing/SignalRadarSection";
import { buildManualCrmCsv, buildManualEmailHandoff } from "@/lib/bd-sourcing/manual-handoff";
import {
  buildCommitteeAgentQuery,
  buildDemoCommittee,
  normalizeCommitteeOutput,
  type BdCommitteeSeat,
} from "@/lib/bd-sourcing/committee";
import { evaluateEnrichmentGate } from "@/lib/bd-sourcing/enrichment-gate";
import type { IcpPreviewMatch } from "@/lib/bd-sourcing/icp-preview";
import { buyerPersonaLabel, buyerPersonas, type BdBuyerPersona } from "@/lib/bd-sourcing/personas";
import {
  applyRadarAction,
  buildDemoRadarItems,
  type BdRadarAction,
  type BdSignalRadarItem,
} from "@/lib/bd-sourcing/signal-radar";
import {
  buildSignalDiscoveryRecommendations,
  type BdSignalDiscoveryRecommendation,
} from "@/lib/bd-sourcing/signal-discovery";
import { bdSourcingApi } from "@/services/bdSourcing";
import {
  loadSellKitRadarItems,
  saveSellKitRadarItem,
  updateSellKitRadarItemStatus,
} from "@/services/sellkitSignalRadar";
import {
  buildManualConversionEvent,
  conversionEventLabel,
  summarizeConversionEvents,
  type BdConversionEvent,
  type BdConversionEventType,
  type BdPersonaConversionStat,
} from "@/lib/bd-sourcing/conversions";
import {
  buildOperatorContextBlock,
  buildOperatorContextVersion,
  operatorContextMaxLength,
} from "@/lib/bd-sourcing/operator-context";
import { buildFirstTouchEmail } from "@/lib/bd-sourcing/templates";
import { loadSellKitConversionEvents, saveSellKitConversionEvent } from "@/services/sellkitConversions";
import {
  countSellKitOnboardingAnswers,
  emptySellKitOnboardingAnswers,
  loadSellKitOnboardingProfile,
  normalizeSellKitOnboardingAnswers,
  saveSellKitOnboardingProfile,
  type SellKitOnboardingAnswers,
  type SellKitOnboardingField,
} from "@/services/sellkitOnboarding";
import type { BdScoreBucket, BdScoreResult, BdTargetLifecycleState, BdTargetView } from "@/types/bd-sourcing";

type QueueStatus = "New" | "Reviewed" | "In Review" | "Rejected";
type ScoreFilter = "all" | "90-plus" | "80-89" | "70-79" | "under-70";
type StatusFilter = "all" | QueueStatus;
type SortMode = "newest" | "score-desc" | "score-asc";

type VisualTarget = BdTargetView & {
  added: string;
  statusLabel: QueueStatus;
  companyMark: string;
  companyMarkClass: string;
  companySize: string;
  revenue: string;
  technologies: string;
  location: string;
  tenure: string;
  buyingCommittee: BdCommitteeSeat[];
};

type ScoreEvidenceItem = {
  label: string;
  points: number;
  max: number;
  scoreValue: number;
  evidence: string;
  sourceLabel: string;
  sourceDate: string;
  sourceUrl: string;
  confidence: "High" | "Medium";
};

type ReviewChecklistItem = {
  label: string;
  status: "ready" | "review" | "blocked";
  detail: string;
  sourceLabel: string;
  sourceUrl: string;
};

const onboardingStorageKey = "sellkit:onboarding:v1";
const conversionStoragePrefix = "sellkit:conversions:v1";

const approvedOrLaterStates = new Set<BdTargetLifecycleState>([
  "approved",
  "emailed",
  "opened",
  "replied",
  "li_sent",
  "connected",
  "meeting",
  "won",
  "lost",
]);

const onboardingFields: Array<{
  id: SellKitOnboardingField;
  label: string;
  prompt: string;
  placeholder: string;
  rows: number;
}> = [
  {
    id: "idealCompany",
    label: "1. Ideal target company",
    prompt: "Size, funding stage, industries in or out, and US-only or global.",
    placeholder: "Example: 1,000+ employee B2B software companies, US first, growth to public, avoid agencies.",
    rows: 4,
  },
  {
    id: "buyerTitles",
    label: "2. Buyer titles",
    prompt: "Strong yes titles and close-but-no titles.",
    placeholder: "Example: yes to VP Data, CTO, Head of Platform; no to recruiters or junior ops.",
    rows: 4,
  },
  {
    id: "offerLine",
    label: "3. One-line offer",
    prompt: "What SellKit should say she is selling.",
    placeholder: "Example: access to expert operators and fractional consultants for strategic projects.",
    rows: 2,
  },
  {
    id: "buyingSignals",
    label: "4. Buying signals",
    prompt: "Rank the strongest triggers and define what a good signal looks like.",
    placeholder: "Example: strongest is a new Head of Data in the last 90 days, then hiring spike, then expansion.",
    rows: 4,
  },
  {
    id: "emailVoice",
    label: "5. Email voice",
    prompt: "Paste one or two real emails, subject style, length, and whether to mention the signal.",
    placeholder: "Paste examples or write: short, plain, direct, mention the specific signal in sentence one.",
    rows: 5,
  },
];

const workflowSteps = [
  { label: "1. Discovery", count: "1,842", state: "done" },
  { label: "2. Enrichment", count: "1,103", state: "done" },
  { label: "3. Scoring", count: "542", state: "done" },
  { label: "4. Review", count: "68", state: "current" },
  { label: "5. Approved", count: "23", state: "idle" },
] as const;

const signalEvents = [
  { label: "Funding", age: "2d ago", title: "Expansion funding tied to AI observability", source: "Press release" },
  { label: "Hiring", age: "3d ago", title: "23 roles opened for platform and data leadership", source: "Careers page" },
  { label: "Financial", age: "6d ago", title: "Earnings call highlights cloud growth and margin expansion", source: "Investor call" },
  { label: "Tech Initiative", age: "7d ago", title: "Engineering blog details Kubernetes scale work", source: "Engineering blog" },
  { label: "Product", age: "9d ago", title: "Product update adds OpenTelemetry native support", source: "Product update" },
];

const scoreFactors = [
  ["Seniority: VP+", "Strong"],
  ["Data / Product function", "Strong"],
  ["Company size fit", "Strong"],
  ["Recent buying signals", "Strong"],
  ["Technographic fit", "Good"],
] as const;

const scoreFilterOptions: Array<{ value: ScoreFilter; label: string }> = [
  { value: "all", label: "All Scores" },
  { value: "90-plus", label: "90+" },
  { value: "80-89", label: "80-89" },
  { value: "70-79", label: "70-79" },
  { value: "under-70", label: "Under 70" },
];

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All Status" },
  { value: "New", label: "New" },
  { value: "In Review", label: "In Review" },
  { value: "Reviewed", label: "Reviewed" },
  { value: "Rejected", label: "Rejected" },
];

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: "newest", label: "Newest First" },
  { value: "score-desc", label: "Highest Score" },
  { value: "score-asc", label: "Lowest Score" },
];

const providerArchitecture = [
  {
    provider: "Exa Company Search",
    stage: "Account discovery",
    description: "Build ICP-matched company lists with safe query variations across industry, headcount, stage, and stack.",
    output: "bd_companies",
  },
  {
    provider: "Exa People Search",
    stage: "Buyer discovery",
    description: "Find buyer titles and likely decision makers using deduped people-category profile searches.",
    output: "bd_contacts",
  },
  {
    provider: "Parallel Entity Search",
    stage: "Fast lookup",
    description: "Use for interactive people or company searches when Mariah needs a quick candidate set.",
    output: "ranked matches",
  },
  {
    provider: "Parallel FindAll / Exa Websets",
    stage: "Serious list-building",
    description: "Verify ICP criteria, collect cited matches, and enrich only the records that pass.",
    output: "verified lists",
  },
  {
    provider: "Exa Agent",
    stage: "Account dossier",
    description: "Research committee, why-now, recent initiatives, and source-backed talking points.",
    output: "dossiers",
  },
  {
    provider: "Apollo + Clay",
    stage: "Selective enrichment",
    description: "Apollo verifies emails after scoring; Clay handles ambiguous rows and manual review fallbacks.",
    output: "review-ready rows",
  },
] as const;

const providerArchitectureIcons = [Database, Users, Radar, Layers3, FileSearch, ShieldCheck] as const;

const operatorProfile = {
  fullName: import.meta.env.VITE_SELLKIT_OPERATOR_NAME?.trim() || "Mariah Rubino",
  email: import.meta.env.VITE_SELLKIT_OPERATOR_EMAIL?.trim() || "",
  bookingUrl: import.meta.env.VITE_SELLKIT_BOOKING_URL?.trim() || "",
  physicalAddress: import.meta.env.VITE_SELLKIT_PHYSICAL_ADDRESS?.trim() || "",
  unsubscribeUrl: import.meta.env.VITE_SELLKIT_UNSUBSCRIBE_URL?.trim() || "",
};

const senderFooterReady = Boolean(operatorProfile.physicalAddress && operatorProfile.unsubscribeUrl);

const operatorFirstName = operatorProfile.fullName.split(" ")[0] || operatorProfile.fullName;
const operatorInitials = operatorProfile.fullName
  .split(" ")
  .map((part) => part[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

function loadSellKitOnboardingAnswers(): SellKitOnboardingAnswers {
  if (typeof window === "undefined") return emptySellKitOnboardingAnswers;

  try {
    const stored = window.localStorage.getItem(onboardingStorageKey);
    if (!stored) return emptySellKitOnboardingAnswers;
    const parsed = JSON.parse(stored) as Partial<SellKitOnboardingAnswers>;

    return normalizeSellKitOnboardingAnswers({
      idealCompany: parsed.idealCompany ?? "",
      buyerTitles: parsed.buyerTitles ?? "",
      offerLine: parsed.offerLine ?? "",
      buyingSignals: parsed.buyingSignals ?? "",
      emailVoice: parsed.emailVoice ?? "",
      additionalContext: parsed.additionalContext ?? "",
    });
  } catch {
    return emptySellKitOnboardingAnswers;
  }
}

function saveSellKitOnboardingAnswersLocally(answers: SellKitOnboardingAnswers) {
  window.localStorage.setItem(onboardingStorageKey, JSON.stringify(answers));
}

function conversionStorageKeyFor(userId?: string): string {
  return `${conversionStoragePrefix}:${userId ?? "local"}`;
}

function loadConversionEventsLocally(storageKey: string): BdConversionEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as BdConversionEvent[]) : [];
  } catch {
    return [];
  }
}

function saveConversionEventsLocally(storageKey: string, events: BdConversionEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(events.slice(0, 250)));
}

const radarStoragePrefix = "sellkit:radar:v1";

function radarStorageKeyFor(userId?: string): string {
  return `${radarStoragePrefix}:${userId ?? "local"}`;
}

function loadRadarItemsLocally(storageKey: string): BdSignalRadarItem[] | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as BdSignalRadarItem[]) : null;
  } catch {
    return null;
  }
}

function saveRadarItemsLocally(storageKey: string, items: BdSignalRadarItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(items.slice(0, 200)));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function looksLikeDomain(value: string | null): boolean {
  return Boolean(value && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value));
}

function emptyPersonaStat(persona: BdBuyerPersona, personaLabel: string): BdPersonaConversionStat {
  return {
    persona,
    personaLabel,
    sourced: 0,
    approved: 0,
    outreachSent: 0,
    replies: 0,
    positiveReplies: 0,
    meetings: 0,
    wins: 0,
    approvalRate: 0,
    replyRate: 0,
    positiveReplyRate: 0,
    meetingRate: 0,
    winRate: 0,
  };
}

function eventAlreadyTracked(events: BdConversionEvent[], event: BdConversionEvent): boolean {
  return events.some(
    (existing) =>
      existing.targetId === event.targetId &&
      existing.eventType === event.eventType &&
      (existing.channel ?? null) === (event.channel ?? null),
  );
}

function scoreFor(composite: number, bucket: BdScoreBucket = "reach_now"): BdScoreResult {
  return {
    companyFit: Math.min(100, composite + 4),
    personFit: Math.min(100, composite + 3),
    signalStrength: composite,
    signalFreshness: Math.max(65, composite - 4),
    reachability: 100,
    composite,
    bucket,
    reasons: ["company matches ICP filters", "contact title matches senior function filters", "verified work email"],
  };
}


function makeTarget(input: {
  id: string;
  fullName: string;
  title: string;
  company: string;
  domain: string;
  score: number;
  added: string;
  statusLabel: QueueStatus;
  lifecycleState: BdTargetLifecycleState;
  companyMark: string;
  companyMarkClass: string;
  signalTitle: string;
  signalSummary: string;
  signalType?: "exec_change" | "senior_hiring_spike" | "funding" | "open_web" | "manual";
}): VisualTarget {
  const [firstName = "", ...lastParts] = input.fullName.split(" ");
  const lastName = lastParts.join(" ");

  return {
    id: input.id,
    added: input.added,
    statusLabel: input.statusLabel,
    companyMark: input.companyMark,
    companyMarkClass: input.companyMarkClass,
    companySize: "1,001-5,000",
    revenue: "$1.3B",
    technologies: "AWS, Kubernetes, GCP",
    location: "New York, NY, USA",
    tenure: "12+ yrs in role",
    buyingCommittee: buildDemoCommittee(input),
    company: {
      name: input.company,
      domain: input.domain,
      employeeCount: 1800,
      fundingStage: "Growth",
      industry: "Software",
      websiteUrl: `https://${input.domain}`,
      linkedinUrl: `https://www.linkedin.com/company/${input.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    },
    contact: {
      firstName,
      lastName,
      fullName: input.fullName,
      title: input.title,
      workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${input.domain}`.replace(/\s+/g, ""),
      emailVerificationStatus: "verified",
      linkedinUrl: `https://www.linkedin.com/in/${input.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      salesNavUrl: `https://www.linkedin.com/sales/lead/${input.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    },
    signal: {
      provider: "exa",
      signalType: input.signalType ?? "funding",
      title: input.signalTitle,
      summary: input.signalSummary,
      sourceUrl: `https://${input.domain}/news`,
      sourceDate: "2026-06-01",
    },
    lifecycleState: input.lifecycleState,
    salesforceGate: {
      excluded: false,
      reason: null,
      reasons: [],
    },
    score: scoreFor(input.score, input.score >= 75 ? "reach_now" : "warm_later"),
    linkedinNote: `Hi ${firstName}, noticed ${input.signalSummary.replace(/\.$/, "")} and thought it would be useful to compare notes.`,
  };
}

function buildScoreEvidence(target: VisualTarget): ScoreEvidenceItem[] {
  return [
    {
      label: "Signal Strength",
      points: 25,
      max: 30,
      scoreValue: target.score.signalStrength,
      evidence: target.signal.title,
      sourceLabel: "Signal source",
      sourceDate: target.signal.sourceDate,
      sourceUrl: target.signal.sourceUrl,
      confidence: "High",
    },
    {
      label: "Title Fit",
      points: 24,
      max: 25,
      scoreValue: target.score.personFit,
      evidence: `${target.contact.title} matches Mariah's senior buyer filter.`,
      sourceLabel: "Profile evidence",
      sourceDate: "Current",
      sourceUrl: target.contact.linkedinUrl ?? target.contact.salesNavUrl ?? target.company.websiteUrl ?? "#",
      confidence: "High",
    },
    {
      label: "Company Fit",
      points: 22,
      max: 25,
      scoreValue: target.score.companyFit,
      evidence: `${target.companySize} ${target.company.industry ?? "software"} account with ${target.technologies}.`,
      sourceLabel: "Company evidence",
      sourceDate: "Current",
      sourceUrl: target.company.websiteUrl ?? `https://${target.company.domain}`,
      confidence: "High",
    },
    {
      label: "Signal Freshness",
      points: 17,
      max: 20,
      scoreValue: target.score.signalFreshness,
      evidence: `Detected from ${target.signal.provider ?? "provider"} on ${target.signal.sourceDate}.`,
      sourceLabel: "Freshness evidence",
      sourceDate: target.signal.sourceDate,
      sourceUrl: target.signal.sourceUrl,
      confidence: "High",
    },
    {
      label: "Email Confidence",
      points: 18,
      max: 20,
      scoreValue: target.score.reachability,
      evidence: `${target.contact.workEmail ?? "Work email"} is marked ${target.contact.emailVerificationStatus}.`,
      sourceLabel: "Enrichment evidence",
      sourceDate: "Today",
      sourceUrl: target.contact.linkedinUrl ?? target.company.websiteUrl ?? "#",
      confidence: "Medium",
    },
  ];
}

function expertServicesAngle(target: VisualTarget): string {
  const signalText = `${target.signal.title} ${target.signal.summary}`.toLowerCase();
  const titleText = target.contact.title.toLowerCase();

  if (signalText.includes("ai") || signalText.includes("data")) {
    return "AI, data, and product operators who have shipped enterprise adoption programs";
  }

  if (signalText.includes("cloud") || signalText.includes("kubernetes") || signalText.includes("platform") || titleText.includes("platform")) {
    return "platform and engineering leaders who can de-risk modernization work";
  }

  if (signalText.includes("security") || titleText.includes("security") || titleText.includes("ciso")) {
    return "security and change-management experts who have led enterprise rollout programs";
  }

  if (signalText.includes("automation") || signalText.includes("workflow")) {
    return "domain experts and transformation operators who can help teams turn automation strategy into adoption";
  }

  return "former product, engineering, and change leaders who can help turn a priority initiative into execution";
}

function buildTargetRationale(target: VisualTarget): string {
  const firstName = target.contact.firstName ?? target.contact.fullName.split(" ")[0];
  return `${target.company.name} has a timely ${target.signal.signalType.replace(/_/g, " ")} signal, and ${firstName} is close enough to the initiative to evaluate outside expert help. The strongest angle is ${expertServicesAngle(target)}.`;
}

function buildReviewChecklist(target: VisualTarget, draftReady: boolean): ReviewChecklistItem[] {
  const angle = expertServicesAngle(target);

  return [
    {
      label: "Account fit",
      status: target.score.companyFit >= 80 ? "ready" : "review",
      detail: `${target.company.name} matches the enterprise software ICP: ${target.companySize}, ${target.company.industry ?? "software"}, ${target.technologies}.`,
      sourceLabel: "Company source",
      sourceUrl: target.company.websiteUrl ?? `https://${target.company.domain}`,
    },
    {
      label: "Buyer fit",
      status: target.score.personFit >= 80 ? "ready" : "review",
      detail: `${target.contact.title} is a plausible sponsor or evaluator for expert services tied to product, engineering, IT, or transformation work.`,
      sourceLabel: "Profile source",
      sourceUrl: target.contact.linkedinUrl ?? target.contact.salesNavUrl ?? "#",
    },
    {
      label: "Timely signal",
      status: target.score.signalStrength >= 75 ? "ready" : "review",
      detail: target.signal.summary,
      sourceLabel: "Signal source",
      sourceUrl: target.signal.sourceUrl,
    },
    {
      label: "Expert angle",
      status: "ready",
      detail: `Lead with ${angle}.`,
      sourceLabel: "Committee map",
      sourceUrl: target.buyingCommittee[0]?.sourceUrl ?? target.signal.sourceUrl,
    },
    {
      label: "Draft readiness",
      status: draftReady && target.contact.emailVerificationStatus === "verified"
        ? senderFooterReady
          ? "ready"
          : "review"
        : "blocked",
      detail: draftReady
        ? senderFooterReady
          ? "Verified work email, signal-backed copy, and sender footer are ready for manual approval."
          : "Verified work email and signal-backed copy are ready. Add the approved sender footer before copy or .eml download."
        : "Verified email, signal evidence, and sender details are required before approval.",
      sourceLabel: "Email evidence",
      sourceUrl: target.contact.linkedinUrl ?? target.company.websiteUrl ?? "#",
    },
  ];
}

function buildVisualTargets(): VisualTarget[] {
  return [
    makeTarget({
      id: "sarah-chen",
      fullName: "Sarah Chen",
      title: "VP, IT",
      company: "Datadog",
      domain: "datadoghq.com",
      score: 92,
      added: "28m ago",
      statusLabel: "New",
      lifecycleState: "queued",
      companyMark: "D",
      companyMarkClass: "bg-[#0E7490] text-[#ECFEFF]",
      signalTitle: "Datadog expands AI observability investment",
      signalSummary: "Datadog is scaling Kubernetes and expanding AI observability.",
    }),
    makeTarget({
      id: "michael-torres",
      fullName: "Michael Torres",
      title: "Head of Security",
      company: "Atlassian",
      domain: "atlassian.com",
      score: 88,
      added: "1h ago",
      statusLabel: "New",
      lifecycleState: "queued",
      companyMark: "A",
      companyMarkClass: "bg-[#164E63] text-[#ECFEFF]",
      signalTitle: "Atlassian adds senior platform security roles",
      signalSummary: "Atlassian opened senior platform security roles after product expansion.",
    }),
    makeTarget({
      id: "priya-nair",
      fullName: "Priya Nair",
      title: "CTO",
      company: "GitLab",
      domain: "gitlab.com",
      score: 85,
      added: "2h ago",
      statusLabel: "New",
      lifecycleState: "queued",
      companyMark: "G",
      companyMarkClass: "bg-[#0F766E] text-[#ECFDF5]",
      signalTitle: "GitLab launches enterprise AI workflow update",
      signalSummary: "GitLab announced an AI workflow release for enterprise engineering teams.",
    }),
    makeTarget({
      id: "james-lee",
      fullName: "James Lee",
      title: "VP, Engineering",
      company: "Snowflake",
      domain: "snowflake.com",
      score: 82,
      added: "3h ago",
      statusLabel: "New",
      lifecycleState: "queued",
      companyMark: "S",
      companyMarkClass: "bg-[#1D4ED8] text-[#EFF6FF]",
      signalTitle: "Snowflake expands data application platform",
      signalSummary: "Snowflake is expanding data application initiatives with senior hiring.",
    }),
    makeTarget({
      id: "melissa-harper",
      fullName: "Melissa Harper",
      title: "Director, DevOps",
      company: "MongoDB",
      domain: "mongodb.com",
      score: 78,
      added: "4h ago",
      statusLabel: "New",
      lifecycleState: "queued",
      companyMark: "M",
      companyMarkClass: "bg-[#047857] text-[#ECFDF5]",
      signalTitle: "MongoDB hiring for enterprise platform work",
      signalSummary: "MongoDB posted senior platform roles tied to enterprise expansion.",
    }),
    makeTarget({
      id: "david-okafor",
      fullName: "David Okafor",
      title: "CISO",
      company: "Okta",
      domain: "okta.com",
      score: 75,
      added: "5h ago",
      statusLabel: "Reviewed",
      lifecycleState: "queued",
      companyMark: "O",
      companyMarkClass: "bg-[#0B1220] text-[#E5EEF5]",
      signalTitle: "Okta updates enterprise security posture",
      signalSummary: "Okta signaled renewed enterprise identity investment.",
    }),
    makeTarget({
      id: "amanda-foster",
      fullName: "Amanda Foster",
      title: "VP, Data Platform",
      company: "Salesforce",
      domain: "salesforce.com",
      score: 72,
      added: "6h ago",
      statusLabel: "Reviewed",
      lifecycleState: "queued",
      companyMark: "S",
      companyMarkClass: "bg-[#2563EB] text-[#EFF6FF]",
      signalTitle: "Salesforce grows data platform group",
      signalSummary: "Salesforce posted leadership roles for data platform growth.",
    }),
    makeTarget({
      id: "kevin-wu",
      fullName: "Kevin Wu",
      title: "Head of Infrastructure",
      company: "Elastic",
      domain: "elastic.co",
      score: 70,
      added: "7h ago",
      statusLabel: "Reviewed",
      lifecycleState: "queued",
      companyMark: "E",
      companyMarkClass: "bg-[#67E8F9] text-[#062D38]",
      signalTitle: "Elastic launches search observability package",
      signalSummary: "Elastic announced an observability package for AI search workloads.",
    }),
    makeTarget({
      id: "rachel-kim",
      fullName: "Rachel Kim",
      title: "VP, Product Ops",
      company: "Zendesk",
      domain: "zendesk.com",
      score: 68,
      added: "8h ago",
      statusLabel: "Reviewed",
      lifecycleState: "queued",
      companyMark: "Z",
      companyMarkClass: "bg-[#475569] text-[#F8FAFC]",
      signalTitle: "Zendesk expands enterprise automation team",
      signalSummary: "Zendesk is hiring senior automation leaders for enterprise support.",
    }),
    makeTarget({
      id: "brian-alvarez",
      fullName: "Brian Alvarez",
      title: "CTO",
      company: "UiPath",
      domain: "uipath.com",
      score: 65,
      added: "9h ago",
      statusLabel: "In Review",
      lifecycleState: "queued",
      companyMark: "U",
      companyMarkClass: "bg-[#B45309] text-[#FFF7ED]",
      signalTitle: "UiPath refreshes automation platform positioning",
      signalSummary: "UiPath announced a platform refresh focused on enterprise automation.",
    }),
  ];
}

function buildDemoConversionEvents(targets: VisualTarget[]): BdConversionEvent[] {
  const byId = new Map(targets.map((target) => [target.id, target]));
  const plan: Array<{ targetId: string; eventType: BdConversionEventType; occurredAt: string; notes?: string }> = [
    { targetId: "david-okafor", eventType: "target_approved", occurredAt: "2026-06-07T16:00:00Z" },
    { targetId: "david-okafor", eventType: "manual_email_sent", occurredAt: "2026-06-07T16:15:00Z" },
    { targetId: "david-okafor", eventType: "reply_received", occurredAt: "2026-06-08T11:30:00Z" },
    {
      targetId: "david-okafor",
      eventType: "meeting_booked",
      occurredAt: "2026-06-09T18:30:00Z",
      notes: "Security rollout conversation booked.",
    },
    { targetId: "amanda-foster", eventType: "target_approved", occurredAt: "2026-06-07T17:00:00Z" },
    { targetId: "amanda-foster", eventType: "manual_email_sent", occurredAt: "2026-06-07T17:10:00Z" },
    { targetId: "kevin-wu", eventType: "target_approved", occurredAt: "2026-06-08T14:00:00Z" },
    { targetId: "kevin-wu", eventType: "manual_email_sent", occurredAt: "2026-06-08T14:20:00Z" },
    { targetId: "kevin-wu", eventType: "positive_reply", occurredAt: "2026-06-09T15:45:00Z" },
  ];

  return plan.flatMap((item) => {
    const target = byId.get(item.targetId);
    if (!target) return [];
    return [
      {
        ...buildManualConversionEvent(target, item.eventType, {
          occurredAt: item.occurredAt,
          notes: item.notes ?? "Seeded demo outcome for conversion reporting.",
        }),
        id: `demo:${item.targetId}:${item.eventType}`,
        source: "demo" as const,
      },
    ];
  });
}

function isApprovedOrLater(state: BdTargetLifecycleState): boolean {
  return approvedOrLaterStates.has(state);
}

function lifecycleForConversion(
  eventType: BdConversionEventType,
  current: BdTargetLifecycleState,
): BdTargetLifecycleState {
  if (eventType === "target_approved") return "approved";
  if (eventType === "manual_email_sent") return "emailed";
  if (eventType === "linkedin_note_sent") return current === "queued" ? "li_sent" : current;
  if (eventType === "reply_received" || eventType === "positive_reply") return "replied";
  if (eventType === "meeting_booked" || eventType === "opportunity_created") return "meeting";
  if (eventType === "won") return "won";
  if (eventType === "lost") return "lost";
  if (eventType === "disqualified") return "suppressed";
  return current;
}

function statusClass(status: QueueStatus): string {
  if (status === "New") return "border-[#5EEAD4] bg-[#ECFDF5] text-[#0F766E]";
  if (status === "Reviewed") return "border-[#FED7AA] bg-[#FFF7ED] text-[#B45309]";
  if (status === "Rejected") return "border-red-200 bg-red-50 text-red-600";
  return "border-[#CBD5E1] bg-[#F8FAFC] text-[#334155]";
}

function scoreClass(score: number): string {
  if (score >= 75) return "border-[#0F766E] text-[#0F766E]";
  if (score >= 68) return "border-[#1D4ED8] text-[#1D4ED8]";
  return "border-[#B45309] text-[#B45309]";
}

function checklistStatusClass(status: ReviewChecklistItem["status"]): string {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "blocked") return "border-red-200 bg-red-50 text-red-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function checklistStatusLabel(status: ReviewChecklistItem["status"]): string {
  if (status === "ready") return "Ready";
  if (status === "blocked") return "Blocked";
  return "Review";
}

function scoreMatchesFilter(score: number, filter: ScoreFilter): boolean {
  if (filter === "90-plus") return score >= 90;
  if (filter === "80-89") return score >= 80 && score < 90;
  if (filter === "70-79") return score >= 70 && score < 80;
  if (filter === "under-70") return score < 70;
  return true;
}

function factorValue(value: number, max: number): string {
  return `${value} / ${max}`;
}

type BdSourcingTabProps = {
  userId?: string;
};

export default function BdSourcingTab({ userId }: BdSourcingTabProps = {}) {
  const { toast } = useToast();
  const [targets, setTargets] = useState<VisualTarget[]>(() => buildVisualTargets());
  const [conversionEvents, setConversionEvents] = useState<BdConversionEvent[]>(() => {
    const localEvents = loadConversionEventsLocally(conversionStorageKeyFor());
    return localEvents.length > 0 ? localEvents : buildDemoConversionEvents(buildVisualTargets());
  });
  const [selectedId, setSelectedId] = useState("sarah-chen");
  const [emailCopied, setEmailCopied] = useState(false);
  const [crmCsvExported, setCrmCsvExported] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [showProviderArchitecture, setShowProviderArchitecture] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(Boolean(userId));
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingAnswers, setOnboardingAnswers] = useState<SellKitOnboardingAnswers>(() =>
    loadSellKitOnboardingAnswers(),
  );
  const [savedContextVersion, setSavedContextVersion] = useState(() =>
    buildOperatorContextVersion(onboardingAnswers.additionalContext),
  );
  const [scoreContextVersion, setScoreContextVersion] = useState(() =>
    buildOperatorContextVersion(onboardingAnswers.additionalContext),
  );
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    const savedAnswers = loadSellKitOnboardingAnswers();
    return countSellKitOnboardingAnswers(savedAnswers) < onboardingFields.length;
  });
  const [radarItems, setRadarItems] = useState<BdSignalRadarItem[]>(
    () => loadRadarItemsLocally(radarStorageKeyFor()) ?? buildDemoRadarItems(),
  );
  const [committeeByTarget, setCommitteeByTarget] = useState<Record<string, BdCommitteeSeat[]>>({});
  const [committeeRefreshing, setCommitteeRefreshing] = useState(false);
  const [enrichedTargetIds, setEnrichedTargetIds] = useState<Set<string>>(new Set());
  const [enrichmentBatchUsed, setEnrichmentBatchUsed] = useState(0);
  const [enriching, setEnriching] = useState(false);
  const [enrichmentResults, setEnrichmentResults] = useState<Record<string, string>>({});
  const [addedCriteriaIds, setAddedCriteriaIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "SellKit";
    return () => {
      document.title = previousTitle || "SourceKit";
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setOnboardingLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setOnboardingLoading(true);
    loadSellKitOnboardingProfile(userId)
      .then((remoteAnswers) => {
        if (cancelled || !remoteAnswers) return;
        setOnboardingAnswers(remoteAnswers);
        saveSellKitOnboardingAnswersLocally(remoteAnswers);
        const remoteContextVersion = buildOperatorContextVersion(remoteAnswers.additionalContext);
        setSavedContextVersion(remoteContextVersion);
        setScoreContextVersion(remoteContextVersion);
        setOnboardingOpen(countSellKitOnboardingAnswers(remoteAnswers) < onboardingFields.length);
      })
      .catch(() => {
        if (cancelled) return;
        toast({
          title: "Could not load onboarding",
          description: "Using the local draft for now. Try saving again after sign-in settles.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setOnboardingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toast, userId]);

  useEffect(() => {
    const storageKey = conversionStorageKeyFor(userId);
    const localEvents = loadConversionEventsLocally(storageKey);
    if (localEvents.length > 0) {
      setConversionEvents(localEvents);
    }

    if (!userId) return;

    let cancelled = false;
    loadSellKitConversionEvents(userId)
      .then((remoteEvents) => {
        if (cancelled || remoteEvents.length === 0) return;
        setConversionEvents(remoteEvents);
        saveConversionEventsLocally(storageKey, remoteEvents);
      })
      .catch(() => {
        if (cancelled) return;
        toast({
          title: "Conversion tracking is local for now",
          description: "The dashboard still works in this browser. Deploy the conversion migration to save it to Mariah's account.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [toast, userId]);

  useEffect(() => {
    saveConversionEventsLocally(conversionStorageKeyFor(userId), conversionEvents);
  }, [conversionEvents, userId]);

  useEffect(() => {
    const storageKey = radarStorageKeyFor(userId);
    const localItems = loadRadarItemsLocally(storageKey);
    if (localItems && localItems.length > 0) {
      setRadarItems(localItems);
    }

    if (!userId) return;

    let cancelled = false;
    loadSellKitRadarItems(userId)
      .then((remoteItems) => {
        if (cancelled || remoteItems.length === 0) return;
        setRadarItems(remoteItems);
        saveRadarItemsLocally(storageKey, remoteItems);
      })
      .catch(() => {
        if (cancelled) return;
        toast({
          title: "Signal Radar is local for now",
          description: "Radar items still work in this browser. Apply the bd_signal_radar_items migration to save them to Mariah's account.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [toast, userId]);

  useEffect(() => {
    saveRadarItemsLocally(radarStorageKeyFor(userId), radarItems);
  }, [radarItems, userId]);

  const filteredTargets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = targets.filter((target) => {
      const haystack = [
        target.contact.fullName,
        target.contact.title,
        target.company.name,
        target.company.domain,
        target.signal.title,
        target.signal.summary,
        target.technologies,
      ].join(" ").toLowerCase();

      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        scoreMatchesFilter(target.score.composite, scoreFilter) &&
        (statusFilter === "all" || target.statusLabel === statusFilter)
      );
    });

    if (sortMode === "score-desc") {
      return [...filtered].sort((a, b) => b.score.composite - a.score.composite);
    }
    if (sortMode === "score-asc") {
      return [...filtered].sort((a, b) => a.score.composite - b.score.composite);
    }
    return filtered;
  }, [scoreFilter, searchQuery, sortMode, statusFilter, targets]);

  useEffect(() => {
    if (filteredTargets.length === 0 || filteredTargets.some((target) => target.id === selectedId)) return;
    setSelectedId(filteredTargets[0].id);
    setEmailCopied(false);
    setCrmCsvExported(false);
  }, [filteredTargets, selectedId]);

  const selected = targets.find((target) => target.id === selectedId) ?? filteredTargets[0] ?? targets[0];
  const approvedCount = targets.filter((target) => isApprovedOrLater(target.lifecycleState)).length;
  const conversionSummary = useMemo(() => summarizeConversionEvents(targets, conversionEvents), [conversionEvents, targets]);
  const selectedConversionEvents = useMemo(
    () =>
      conversionEvents
        .filter((event) => event.targetId === selected.id)
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)),
    [conversionEvents, selected.id],
  );
  const selectedSignalStat = conversionSummary.signalStats.find(
    (stat) => stat.signalType === selected.signal.signalType && stat.signalTitle === selected.signal.title,
  );
  const selectedHasOutreachSent = selectedConversionEvents.some((event) =>
    event.eventType === "manual_email_sent" || event.eventType === "linkedin_note_sent",
  );
  const selectedHasManualEmailSent = selectedConversionEvents.some((event) => event.eventType === "manual_email_sent");
  const selectedHasReply = selectedConversionEvents.some((event) =>
    event.eventType === "reply_received" || event.eventType === "positive_reply",
  );
  const selectedHasMeeting = selectedConversionEvents.some((event) =>
    event.eventType === "meeting_booked" || event.eventType === "opportunity_created" || event.eventType === "won",
  );
  const onboardingAnsweredCount = countSellKitOnboardingAnswers(onboardingAnswers);
  const onboardingComplete = onboardingAnsweredCount === onboardingFields.length;
  const operatorContextBlock = useMemo(
    () => buildOperatorContextBlock(onboardingAnswers.additionalContext),
    [onboardingAnswers.additionalContext],
  );
  const scoresStaleFromContext = savedContextVersion !== scoreContextVersion;
  const selectedInitials = selected.contact.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const scoreEvidence = useMemo(() => buildScoreEvidence(selected), [selected]);
  const selectedCommittee = committeeByTarget[selected.id] ?? selected.buyingCommittee;
  const committeeFromProvider = selectedCommittee.some((seat) => seat.provider === "Exa Agent");
  const enrichmentGate = evaluateEnrichmentGate({
    score: selected.score.composite,
    lifecycleState: selected.lifecycleState,
    alreadyEnriched: enrichedTargetIds.has(selected.id),
    batchUsed: enrichmentBatchUsed,
  });
  const personaDisplayStats = useMemo(() => {
    const byPersona = new Map(conversionSummary.personaStats.map((stat) => [stat.persona, stat]));
    return buyerPersonas
      .filter((persona) => persona !== "other" || byPersona.has("other"))
      .map((persona) => byPersona.get(persona) ?? emptyPersonaStat(persona, buyerPersonaLabel(persona)));
  }, [conversionSummary.personaStats]);
  const discoveryRecommendations = useMemo(
    () => buildSignalDiscoveryRecommendations({ signalStats: conversionSummary.signalStats, radarItems }),
    [conversionSummary.signalStats, radarItems],
  );

  const emailDraft = useMemo(
    () =>
      buildFirstTouchEmail({
        firstName: selected.contact.firstName ?? selected.contact.fullName.split(" ")[0],
        company: selected.company.name,
        workEmail: selected.contact.workEmail,
        emailVerificationStatus: selected.contact.emailVerificationStatus,
        signalReference: selected.signal.summary,
        operatorContext: onboardingAnswers.additionalContext,
        ctaBookingLink: operatorProfile.bookingUrl,
        operatorName: operatorFirstName,
        operatorEmail: operatorProfile.email,
        physicalAddress: operatorProfile.physicalAddress,
        unsubscribeUrl: operatorProfile.unsubscribeUrl,
      }),
    [onboardingAnswers.additionalContext, selected],
  );

  const manualEmailHandoff = useMemo(
    () =>
      emailDraft.ok
        ? buildManualEmailHandoff({
            to: emailDraft.to,
            from: emailDraft.from,
            subject: emailDraft.subject,
            textBody: emailDraft.textBody,
          })
        : null,
    [emailDraft],
  );
  const targetRationale = useMemo(() => buildTargetRationale(selected), [selected]);
  const reviewChecklist = useMemo(() => buildReviewChecklist(selected, emailDraft.ok), [emailDraft.ok, selected]);
  const checklistReadyCount = reviewChecklist.filter((item) => item.status === "ready").length;
  const selectedApproved = isApprovedOrLater(selected.lifecycleState) && Boolean(manualEmailHandoff);
  const emailHandoffReady = selectedApproved && senderFooterReady;
  const packetStatusLabel = emailHandoffReady
    ? "Ready"
    : selectedApproved
      ? "Needs sender footer"
      : "Needs approval";

  const appendConversionEvent = (event: BdConversionEvent, options: { quiet?: boolean } = {}) => {
    if (eventAlreadyTracked(conversionEvents, event)) {
      if (!options.quiet) {
        toast({
          title: "Already tracked",
          description: `${conversionEventLabel(event.eventType)} is already in this target's history.`,
        });
      }
      return false;
    }

    setConversionEvents((current) => [event, ...current]);

    if (userId) {
      void saveSellKitConversionEvent(userId, event).catch(() => {
        toast({
          title: "Saved in this browser",
          description: "The conversion event was tracked locally. Apply the migration to persist it to Mariah's account.",
        });
      });
    }

    if (!options.quiet) {
      toast({
        title: "Conversion tracked",
        description: `${conversionEventLabel(event.eventType)} recorded for reporting only. No send, LinkedIn, or CRM action ran.`,
      });
    }
    return true;
  };

  const trackSelectedConversion = (eventType: BdConversionEventType, notes?: string) => {
    const event = buildManualConversionEvent(selected, eventType, {
      notes: notes ?? `${conversionEventLabel(eventType)} tracked manually in SellKit.`,
    });
    const added = appendConversionEvent(event);
    if (!added) return;

    const nextLifecycleState = lifecycleForConversion(eventType, selected.lifecycleState);
    if (nextLifecycleState !== selected.lifecycleState) {
      setTargets((current) =>
        current.map((target) =>
          target.id === selected.id
            ? {
                ...target,
                lifecycleState: nextLifecycleState,
                statusLabel: nextLifecycleState === "suppressed" || nextLifecycleState === "lost" ? "Rejected" : "Reviewed",
              }
            : target,
        ),
      );
    }
  };

  const approveSelected = () => {
    setTargets((current) =>
      current.map((target) =>
        target.id === selected.id
          ? { ...target, lifecycleState: "approved" as const, statusLabel: "Reviewed" as const }
          : target,
      ),
    );
    appendConversionEvent(buildManualConversionEvent(selected, "target_approved"), { quiet: true });
    toast({
      title: "Draft approved",
      description: senderFooterReady
        ? "Manual handoff is ready. No email or CRM write was executed."
        : "CRM export is ready. Add sender footer details before copying or downloading the email draft.",
    });
  };

  const rejectSelected = () => {
    setTargets((current) =>
      current.map((target) =>
        target.id === selected.id
          ? { ...target, lifecycleState: "suppressed" as const, statusLabel: "Rejected" as const }
          : target,
      ),
    );
    toast({ title: "Target rejected", description: "Marked rejected for audit. Approval and email handoff are disabled." });
  };

  const resetDemo = () => {
    const demoTargets = buildVisualTargets();
    setTargets(demoTargets);
    setConversionEvents(buildDemoConversionEvents(demoTargets));
    setRadarItems(buildDemoRadarItems());
    setCommitteeByTarget({});
    setEnrichedTargetIds(new Set());
    setEnrichmentBatchUsed(0);
    setEnrichmentResults({});
    setAddedCriteriaIds(new Set());
    setSelectedId("sarah-chen");
    setEmailCopied(false);
    setCrmCsvExported(false);
    setSearchQuery("");
    setScoreFilter("all");
    setStatusFilter("all");
    setSortMode("newest");
    setScoreContextVersion(savedContextVersion);
  };

  const handleRadarAction = (item: BdSignalRadarItem, action: BdRadarAction) => {
    const result = applyRadarAction(item, action);
    if (!result.ok) {
      toast({ title: "Action not allowed", description: result.reason, variant: "destructive" });
      return;
    }

    setRadarItems((current) => current.map((existing) => (existing.id === item.id ? result.item : existing)));

    if (userId && isUuid(item.id)) {
      void updateSellKitRadarItemStatus(userId, item.id, result.item.status).catch(() => {
        toast({
          title: "Saved in this browser",
          description: "The radar status changed locally. Apply the radar migration to persist it to Mariah's account.",
        });
      });
    }

    const descriptions: Record<BdRadarAction, string> = {
      review: `${item.companyName} marked reviewed. No outreach or enrichment ran.`,
      add_to_queue: `${item.companyName} queued for manual buyer discovery. Nothing was sent or enriched automatically.`,
      ignore: `${item.companyName} ignored. It stays available for conversion learning.`,
    };
    toast({ title: "Radar updated", description: descriptions[action] });
  };

  const addPreviewMatchToRadar = (match: IcpPreviewMatch, icpText: string) => {
    const localItem: BdSignalRadarItem = {
      id: `radar:${match.id}:${Date.now()}`,
      companyName: match.name,
      companyDomain: looksLikeDomain(match.detail) ? match.detail! : "",
      signalType: "open_web",
      signalTitle: `ICP preview match: ${icpText.slice(0, 80) || "manual ICP test"}`,
      signalSummary: match.matchReason,
      sourceUrl: match.sourceUrl ?? "",
      provider: match.provider === "parallel" ? "parallel" : "manual",
      detectedAt: new Date().toISOString(),
      confidence: match.confidence,
      suggestedPersona: "other",
      status: "new",
      metadata: { origin: "icp_preview_lab", previewStatus: match.status },
    };

    setRadarItems((current) => [localItem, ...current]);
    toast({
      title: "Added to Signal Radar",
      description: `${match.name} is waiting for manual review. No enrichment or outreach was triggered.`,
    });

    if (!userId) return;
    void saveSellKitRadarItem(userId, localItem)
      .then((savedItem) => {
        setRadarItems((current) => current.map((existing) => (existing.id === localItem.id ? savedItem : existing)));
      })
      .catch(() => {
        toast({
          title: "Saved in this browser",
          description: "The radar item is local. Apply the bd_signal_radar_items migration to persist it.",
        });
      });
  };

  const refreshCommitteeMap = async () => {
    if (committeeRefreshing) return;
    setCommitteeRefreshing(true);

    const fallback = buildDemoCommittee({
      fullName: selected.contact.fullName,
      title: selected.contact.title,
      company: selected.company.name,
      domain: selected.company.domain,
      signalTitle: selected.signal.title,
      signalSummary: selected.signal.summary,
    });

    try {
      const runResponse = await bdSourcingApi.createExaAgentRun({
        query: buildCommitteeAgentQuery({
          company: selected.company.name,
          domain: selected.company.domain,
          signalTitle: selected.signal.title,
        }),
        maxItems: 5,
        effort: "low",
      });

      const runData = (runResponse.data ?? {}) as Record<string, unknown>;
      const runId = typeof runData.id === "string" ? runData.id : typeof runData.runId === "string" ? runData.runId : "";
      let latest: unknown = runData;

      for (let attempt = 0; attempt < 5 && runId; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const poll = await bdSourcingApi.getExaAgentRun(runId);
        latest = poll.data;
        const status = ((poll.data ?? {}) as Record<string, unknown>).status;
        if (status === "completed" || status === "succeeded" || status === "failed" || status === "canceled") break;
      }

      const normalized = normalizeCommitteeOutput(latest, fallback);
      setCommitteeByTarget((current) => ({ ...current, [selected.id]: normalized }));
      const usedProvider = normalized.some((seat) => seat.provider === "Exa Agent");
      toast({
        title: usedProvider ? "Committee map refreshed" : "Showing demo committee",
        description: usedProvider
          ? "Exa Agent returned committee evidence. Review each seat before any manual outreach."
          : "Exa Agent did not return usable committee output, so the deterministic demo map is shown.",
      });
    } catch {
      setCommitteeByTarget((current) => ({ ...current, [selected.id]: fallback }));
      toast({
        title: "Showing demo committee",
        description: "Exa Agent is unavailable right now. The deterministic demo committee is shown instead.",
      });
    } finally {
      setCommitteeRefreshing(false);
    }
  };

  const enrichSelected = async () => {
    if (!enrichmentGate.canEnrich || enriching) return;
    setEnriching(true);

    let resultMessage: string;
    try {
      const response = await bdSourcingApi.enrichWorkEmail(selected.id);
      resultMessage =
        response.status === "completed"
          ? response.message
          : `Apollo adapter is stubbed server-side: ${response.message}`;
    } catch {
      resultMessage =
        "Apollo is not connected yet. This target is recorded as ready for Apollo work-email enrichment - no provider spend happened.";
    }

    setEnrichedTargetIds((current) => new Set(current).add(selected.id));
    setEnrichmentBatchUsed((count) => count + 1);
    setEnrichmentResults((current) => ({ ...current, [selected.id]: resultMessage }));
    setEnriching(false);
    toast({
      title: "Work email enrichment recorded",
      description: "Manual click only. Work email only - no phone or personal email fields were requested.",
    });
  };

  const addRadarCriteria = (recommendation: BdSignalDiscoveryRecommendation) => {
    setAddedCriteriaIds((current) => new Set(current).add(recommendation.id));
    toast({
      title: "Added to radar criteria",
      description: `${recommendation.suggestedCriteria}. It will be applied on the next manual radar sweep - nothing runs automatically.`,
    });
  };

  const markQueueRescoredWithContext = () => {
    setScoreContextVersion(savedContextVersion);
    toast({
      title: "Queue marked current",
      description: "Re-score is manual in V1. No provider run or external spend was started.",
    });
  };

  const selectTarget = (targetId: string) => {
    setSelectedId(targetId);
    setEmailCopied(false);
    setCrmCsvExported(false);

    window.setTimeout(() => {
      if (window.innerWidth < 768) {
        document.getElementById("sellkit-target-detail")?.scrollIntoView({ block: "start" });
      }
    }, 0);
  };

  const updateOnboardingAnswer = (field: SellKitOnboardingField, value: string) => {
    const nextValue = field === "additionalContext" ? value.slice(0, operatorContextMaxLength) : value;
    setOnboardingAnswers((current) => ({ ...current, [field]: nextValue }));
  };

  const saveOnboarding = async () => {
    const normalizedAnswers = normalizeSellKitOnboardingAnswers(onboardingAnswers);
    const nextContextVersion = buildOperatorContextVersion(normalizedAnswers.additionalContext);

    setOnboardingAnswers(normalizedAnswers);
    saveSellKitOnboardingAnswersLocally(normalizedAnswers);
    setSavedContextVersion(nextContextVersion);
    setOnboardingOpen(false);

    if (!userId) {
      toast({
        title: onboardingComplete ? "Onboarding complete" : "Onboarding progress saved",
        description: "Saved in this browser. Sign in to save it to Mariah's account.",
      });
      return;
    }

    setOnboardingSaving(true);
    try {
      await saveSellKitOnboardingProfile(userId, normalizedAnswers);
      toast({
        title: onboardingComplete ? "Onboarding complete" : "Onboarding progress saved",
        description: "Saved to Mariah's SellKit account.",
      });
    } catch {
      toast({
        title: "Saved locally only",
        description: "Supabase did not accept the update. The browser draft is still preserved.",
        variant: "destructive",
      });
    } finally {
      setOnboardingSaving(false);
    }
  };

  const copyEmailDraft = async () => {
    if (!manualEmailHandoff) return;
    if (!senderFooterReady) {
      toast({ title: "Sender footer needed", description: "Add the approved sender address and unsubscribe link before copying.", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(manualEmailHandoff.copyText);
      setEmailCopied(true);
      toast({ title: "Email copied", description: "Paste it into Outlook or the approved sending tool." });
    } catch {
      toast({ title: "Copy blocked", description: "Select the draft text and copy it manually.", variant: "destructive" });
    }
  };

  const downloadEmlDraft = () => {
    if (!manualEmailHandoff) return;
    if (!senderFooterReady) {
      toast({ title: "Sender footer needed", description: "Add the approved sender address and unsubscribe link before downloading.", variant: "destructive" });
      return;
    }
    const blob = new Blob([manualEmailHandoff.emlContent], { type: "message/rfc822;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected.company.name}-${selected.contact.fullName}-draft.eml`.replace(/[^a-z0-9.-]+/gi, "-");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast({ title: ".eml downloaded", description: "Open it locally and review before sending." });
  };

  const exportCrmCsv = () => {
    const approvedTargets = targets.filter((target) => target.lifecycleState === "approved");
    const csv = buildManualCrmCsv(approvedTargets.map((target) => ({
      fullName: target.contact.fullName,
      firstName: target.contact.firstName ?? target.contact.fullName.split(" ")[0] ?? "",
      lastName: target.contact.lastName ?? "",
      title: target.contact.title,
      company: target.company.name,
      domain: target.company.domain,
      workEmail: target.contact.workEmail ?? "",
      linkedinUrl: target.contact.linkedinUrl ?? target.contact.salesNavUrl,
      signal: target.signal.title,
      sourceUrl: target.signal.sourceUrl,
      score: target.score.composite,
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bd-sourcing-approved-targets.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setCrmCsvExported(true);
    toast({ title: "CRM CSV exported", description: "Import this manually after policy review." });
  };

  return (
    <div className="sellkit-v2 min-h-screen text-[#1C251F]">
      <header className="sk-topbar flex h-[72px] items-center justify-between px-6">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex items-center gap-2.5">
            <SourceKitMark className="sk-logo-mark h-8 w-8 shrink-0" title="SellKit" />
            <h1 className="sk-wordmark text-2xl font-semibold">SellKit</h1>
          </div>
          <button className="sk-workstream hidden h-10 items-center gap-4 rounded-md px-4 text-left text-xs md:flex">
            <span>
              <span className="block text-[#667085]">Workstream</span>
              <span className="block font-medium text-[#172A3A]">Enterprise Software</span>
            </span>
            <ChevronDown className="h-4 w-4 text-[#667085]" />
          </button>
        </div>
        <div className="hidden flex-1 items-center justify-end gap-5 xl:flex">
          <label className="sk-search flex h-10 w-[360px] items-center gap-2 rounded-md px-3 text-sm">
            <Search className="h-4 w-4" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search targets, accounts, or signals..."
              className="h-8 border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-[#B9CBD2] focus-visible:ring-0"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-[#B9CBD2] hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="ml-auto rounded border border-[#3D5963] bg-[#122B35] px-1.5 text-[10px] text-[#D6E7EA]">K</span>
          </label>
          <Bell className="h-5 w-5 text-[#667085]" />
          <div className="flex items-center gap-3">
            <div className="sk-operator-avatar grid h-9 w-9 place-items-center rounded-full text-xs font-semibold">{operatorInitials}</div>
            <span className="text-sm font-medium">{operatorProfile.fullName}</span>
            <ChevronDown className="h-4 w-4 text-[#667085]" />
          </div>
        </div>
      </header>

      <main className="sk-page-main px-2 pb-7 pt-4 sm:px-4">
        <section className="sk-panel mb-3 rounded-md">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">Mariah onboarding</h2>
                <Badge
                  variant="outline"
                  className={
                    onboardingComplete
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }
                >
                  {onboardingAnsweredCount}/5 answered
                </Badge>
                <Badge variant="outline" className="border-[#5EEAD4] bg-[#ECFDF5] text-[#0F766E]">
                  Human approval before send
                </Badge>
                {userId && (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    Saved to account
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {onboardingLoading
                  ? "Loading saved answers for this signed-in account."
                  : "Captures target profile, buyers, offer, signals, and email voice for the draft queue."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOnboardingOpen((open) => !open)}
              disabled={onboardingLoading}
            >
              {onboardingOpen ? "Hide" : "Edit Onboarding"}
            </Button>
          </div>

          {onboardingOpen && (
            <div className="border-t border-slate-200 px-4 py-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid gap-4 md:grid-cols-2">
                  {onboardingFields.map((field) => (
                    <div key={field.id} className={field.id === "emailVoice" ? "md:col-span-2" : undefined}>
                      <Label htmlFor={`sellkit-${field.id}`} className="text-sm font-semibold text-slate-900">
                        {field.label}
                      </Label>
                      <p className="mt-1 min-h-8 text-xs leading-5 text-slate-500">{field.prompt}</p>
                      <Textarea
                        id={`sellkit-${field.id}`}
                        value={onboardingAnswers[field.id]}
                        onChange={(event) => updateOnboardingAnswer(field.id, event.target.value)}
                        placeholder={field.placeholder}
                        rows={field.rows}
                        className="mt-2 resize-y bg-white"
                      />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label htmlFor="sellkit-additionalContext" className="text-sm font-semibold text-slate-900">
                        Additional context (optional)
                      </Label>
                      <span className="text-xs text-slate-500">
                        {onboardingAnswers.additionalContext.length}/{operatorContextMaxLength}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Constraints, niches, deal sizes, regions, exclusions - anything the five questions miss.
                    </p>
                    <Textarea
                      id="sellkit-additionalContext"
                      value={onboardingAnswers.additionalContext}
                      onChange={(event) => updateOnboardingAnswer("additionalContext", event.target.value)}
                      placeholder="Example: prioritize Fortune 500 platform teams, avoid public sector, mention change management only when the signal suggests a rollout."
                      rows={5}
                      maxLength={operatorContextMaxLength}
                      className="mt-2 resize-y bg-white"
                    />
                    {operatorContextBlock && (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Saved context is treated as data for fit and tone calibration. It cannot override manual approval or provider guardrails.
                      </p>
                    )}
                  </div>
                </div>
                <aside className="sk-inset-panel rounded-md p-4">
                  <h3 className="text-sm font-semibold text-slate-900">V1 operating mode</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <p className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      Provider keys stay server-side in Supabase.
                    </p>
                    <p className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      Onboarding saves to this signed-in account.
                    </p>
                    <p className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      No Microsoft, Salesforce, or LinkedIn write access is required for V1.
                    </p>
                  </div>
                  <Button
                    className="sk-primary-action mt-5 w-full"
                    onClick={saveOnboarding}
                    disabled={onboardingLoading || onboardingSaving}
                  >
                    {onboardingSaving ? "Saving..." : "Save Progress"}
                  </Button>
                </aside>
              </div>
            </div>
          )}
        </section>

        <section className="sk-panel sk-provider-stack mb-3 rounded-md px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Provider architecture</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Use providers as stages, not substitutes</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-[#5EEAD4] bg-[#ECFDF5] text-[#0F766E]">
                Manual-first workflow
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setShowProviderArchitecture((visible) => !visible)}>
                {showProviderArchitecture ? "Hide providers" : "Show providers"}
              </Button>
            </div>
          </div>
          {showProviderArchitecture && (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {providerArchitecture.map((stage, index) => {
                const ProviderIcon = providerArchitectureIcons[index] ?? Database;

                return (
                  <article key={stage.provider} className="sk-provider-card rounded-md p-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="sk-provider-icon grid h-9 w-9 shrink-0 place-items-center rounded-md">
                        <ProviderIcon className="h-4 w-4" />
                      </span>
                      <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {stage.output}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{stage.stage}</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{stage.provider}</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{stage.description}</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="sk-panel sk-workflow mb-3 grid grid-cols-1 gap-3 rounded-md px-4 py-3 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-2 md:grid-cols-5">
            {workflowSteps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                  step.state === "done"
                    ? "border-emerald-500 text-emerald-600"
                    : step.state === "current"
                      ? "border-blue-600 text-blue-600"
                      : "border-slate-300 text-slate-400"
                }`}>
                  {step.state === "done" ? <Check className="h-4 w-4" /> : step.state === "current" ? <span className="h-4 w-4 rounded-full border-2 border-current" /> : <X className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${step.state === "current" ? "text-blue-600" : "text-slate-900"}`}>{step.label}</p>
                  <p className="text-xs text-slate-500">{step.count}</p>
                </div>
                {index < workflowSteps.length - 1 && <div className="hidden h-px flex-1 bg-slate-200 xl:block" />}
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-10 justify-self-start lg:justify-self-end"
            onClick={() => document.getElementById("sellkit-queue-controls")?.scrollIntoView({ block: "center" })}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </section>

        <SignalRadarSection items={radarItems} onAction={handleRadarAction} />

        <IcpPreviewLab onAddToRadar={addPreviewMatchToRadar} />

        <section className="sk-panel mb-3 rounded-md px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Conversion learning</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Track which signals and outreach steps create meetings</h2>
            </div>
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
              Manual tracking only
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Signal to meeting",
                value: `${conversionSummary.totals.signalMeetingRate}%`,
                detail: `${conversionSummary.totals.meetings} meetings from ${conversionSummary.totals.targets} targets`,
                icon: TrendingUp,
              },
              {
                label: "Outreach reply rate",
                value: `${conversionSummary.totals.outreachReplyRate}%`,
                detail: `${conversionSummary.totals.replies} replies from ${conversionSummary.totals.outreachSent} manual sends`,
                icon: Reply,
              },
              {
                label: "Best signal",
                value: conversionSummary.bestSignal ? `${conversionSummary.bestSignal.meetingRate}%` : "0%",
                detail: conversionSummary.bestSignal?.signalTitle ?? "No signal outcomes yet",
                icon: Radar,
              },
              {
                label: "Closed wins",
                value: String(conversionSummary.totals.wins),
                detail: "Won outcomes tracked manually",
                icon: Trophy,
              },
            ].map((metric) => {
              const MetricIcon = metric.icon;
              return (
                <article key={metric.label} className="sk-mini-card rounded-md p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p>
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-blue-600">
                      <MetricIcon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{metric.detail}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="sk-inset-panel rounded-md p-4">
              <div className="mb-3 flex items-center gap-2">
                <Radar className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">Signal conversion</h3>
              </div>
              <div className="space-y-2">
                {conversionSummary.signalStats.slice(0, 3).map((stat) => (
                  <div key={`${stat.signalType}-${stat.signalTitle}`} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{stat.signalTitle}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{stat.sourced} sourced · {stat.approved} approved · {stat.meetings} meetings</p>
                      </div>
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        {stat.meetingRate}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="sk-inset-panel rounded-md p-4">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">Outreach conversion</h3>
              </div>
              <div className="space-y-2">
                {conversionSummary.outreachStats.length > 0 ? (
                  conversionSummary.outreachStats.map((stat) => (
                    <div key={stat.channel} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium capitalize text-slate-900">{stat.channel.replace(/_/g, " ")}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{stat.sent} sent · {stat.replies} replies · {stat.meetings} meetings</p>
                        </div>
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                          {stat.replyRate}% reply
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Track a manual send to start outreach reporting.</p>
                )}
              </div>
            </div>
          </div>

          <div className="sk-inset-panel mt-4 rounded-md p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">Signal-level conversion</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2 pr-2 text-left font-medium">Signal</th>
                    <th className="px-2 py-2 text-right font-medium">Approval</th>
                    <th className="px-2 py-2 text-right font-medium">Reply</th>
                    <th className="px-2 py-2 text-right font-medium">Positive reply</th>
                    <th className="px-2 py-2 text-right font-medium">Meeting</th>
                    <th className="py-2 pl-2 text-right font-medium">Win</th>
                  </tr>
                </thead>
                <tbody>
                  {conversionSummary.signalStats.map((stat) => (
                    <tr key={`${stat.signalType}-${stat.signalTitle}`} className="border-b border-slate-100">
                      <td className="max-w-[260px] py-2 pr-2">
                        <p className="truncate font-medium text-slate-900">{stat.signalTitle}</p>
                        <p className="text-xs text-slate-500">{stat.sourced} sourced · {stat.outreachSent} sent</p>
                      </td>
                      <td className="px-2 py-2 text-right text-slate-700">{stat.approvalRate}%</td>
                      <td className="px-2 py-2 text-right text-slate-700">{stat.replyRate}%</td>
                      <td className="px-2 py-2 text-right text-slate-700">{stat.positiveReplyRate}%</td>
                      <td className="px-2 py-2 text-right text-slate-700">{stat.meetingRate}%</td>
                      <td className="py-2 pl-2 text-right text-slate-700">{stat.winRate}%</td>
                    </tr>
                  ))}
                  {conversionSummary.signalStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-sm text-slate-500">
                        No signal outcomes tracked yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="sk-inset-panel mt-4 rounded-md p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">Persona performance</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {personaDisplayStats.map((stat) => (
                <div key={stat.persona} className="rounded-md border border-slate-200 bg-white px-3 py-3">
                  <p className="text-sm font-semibold text-slate-900">{stat.personaLabel}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{stat.sourced} sourced · {stat.outreachSent} sent</p>
                  <dl className="mt-2 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center justify-between"><dt>Reply</dt><dd className="font-medium text-slate-900">{stat.replyRate}%</dd></div>
                    <div className="flex items-center justify-between"><dt>Positive reply</dt><dd className="font-medium text-slate-900">{stat.positiveReplyRate}%</dd></div>
                    <div className="flex items-center justify-between"><dt>Meeting</dt><dd className="font-medium text-slate-900">{stat.meetingRate}%</dd></div>
                    <div className="flex items-center justify-between"><dt>Win</dt><dd className="font-medium text-slate-900">{stat.winRate}%</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SignalDiscoverySection
          recommendations={discoveryRecommendations}
          addedCriteriaIds={addedCriteriaIds}
          onAddCriteria={addRadarCriteria}
        />

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(390px,500px)_minmax(0,1fr)] 2xl:grid-cols-[540px_minmax(580px,1fr)_430px]">
          <section className="sk-panel min-w-0 overflow-hidden rounded-md">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Review Queue</h2>
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">{filteredTargets.length}</span>
                </div>
              </div>
              <MoreVertical className="h-5 w-5 text-slate-500" />
            </div>
            {scoresStaleFromContext && (
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Onboarding context changed - re-score queue?</p>
                    <p className="mt-0.5 text-xs leading-5 text-amber-700">
                      Current scores were prepared before the latest Additional Context save. Re-score remains manual.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                    onClick={markQueueRescoredWithContext}
                  >
                    Re-score queue
                  </Button>
                </div>
              </div>
            )}
            <div id="sellkit-queue-controls" className="grid gap-3 border-b border-slate-200 px-5 py-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className="sk-queue-search flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-600 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                <Search className="h-4 w-4 shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search queue"
                  className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery("")}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>
              <select
                aria-label="Score filter"
                value={scoreFilter}
                onChange={(event) => setScoreFilter(event.target.value as ScoreFilter)}
                className="sk-control-select h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-600"
              >
                {scoreFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                aria-label="Status filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="sk-control-select h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-600"
              >
                {statusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                aria-label="Sort queue"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="sk-control-select h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-600 sm:col-span-2 xl:col-span-1 2xl:col-span-2"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="w-10 px-4 py-3 text-left"><span className="block h-4 w-4 rounded border border-slate-300" /></th>
                    <th className="px-2 py-3 text-left font-medium">Target</th>
                    <th className="px-2 py-3 text-left font-medium">Company</th>
                    <th className="px-2 py-3 text-left font-medium">Score</th>
                    <th className="px-2 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTargets.map((target) => {
                    const active = target.id === selected.id;
                    return (
                      <tr
                        key={target.id}
                        onClick={() => selectTarget(target.id)}
                        className={`cursor-pointer border-b border-slate-100 transition-colors ${active ? "sk-queue-row-active" : "sk-queue-row"}`}
                      >
                        <td className="px-4 py-3">
                          <span className={`grid h-4 w-4 place-items-center rounded border ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>
                            {active && <Check className="h-3 w-3" />}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <p className="font-medium text-slate-900">{target.contact.fullName}</p>
                          <p className="text-xs text-slate-500">{target.contact.title}</p>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded text-xs font-semibold ${target.companyMarkClass}`}>{target.companyMark}</span>
                            <span className="truncate text-slate-700">{target.company.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold ${scoreClass(target.score.composite)}`}>
                            {target.score.composite}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusClass(target.statusLabel)}`}>{target.statusLabel}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{target.added}</td>
                      </tr>
                    );
                  })}
                  {filteredTargets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                        No targets match this queue view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-200 md:hidden">
              {filteredTargets.map((target) => {
                const active = target.id === selected.id;
                return (
                  <button
                    key={target.id}
                    onClick={() => selectTarget(target.id)}
                    className={`w-full px-5 py-4 text-left transition-colors ${active ? "sk-queue-row-active" : "sk-queue-row"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{target.contact.fullName}</p>
                        <p className="text-xs text-slate-500">{target.contact.title}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded text-xs font-semibold ${target.companyMarkClass}`}>{target.companyMark}</span>
                          <span className="truncate">{target.company.name}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className={`grid h-9 w-9 place-items-center rounded-full border text-xs font-semibold ${scoreClass(target.score.composite)}`}>
                          {target.score.composite}
                        </span>
                        <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusClass(target.statusLabel)}`}>{target.statusLabel}</span>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">{target.signal.summary}</p>
                    <p className="mt-2 text-xs text-slate-500">{target.added}</p>
                  </button>
                );
              })}
              {filteredTargets.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-slate-500">No targets match this queue view.</div>
              )}
            </div>

            <div className="flex items-center justify-between px-5 py-4 text-sm text-slate-600">
              <span>{filteredTargets.length === 0 ? "0" : `1-${filteredTargets.length}`} of {filteredTargets.length}</span>
              <div className="hidden items-center gap-3 sm:flex">
                <button className="text-slate-400">{"<"}</button>
                <button className="grid h-7 w-7 place-items-center rounded bg-[#0F766E] text-white">1</button>
                <button>2</button>
                <button>3</button>
                <button>4</button>
                <span>...</span>
                <button>7</button>
                <button>{">"}</button>
              </div>
            </div>
          </section>

          <section id="sellkit-target-detail" className="min-w-0 space-y-3">
            <div className="sk-panel rounded-md p-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="sk-person-avatar grid h-20 w-20 shrink-0 place-items-center rounded-full text-xl font-semibold">{selectedInitials}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold">{selected.contact.fullName}</h2>
                      <p className="mt-1 text-sm text-slate-600">{selected.contact.title} · {selected.company.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`grid h-12 w-12 place-items-center rounded-full border text-lg font-semibold ${scoreClass(selected.score.composite)}`}>{selected.score.composite}</span>
                      <Badge variant="outline" className={selected.statusLabel === "New" ? statusClass("New") : statusClass(selected.statusLabel)}>{selected.statusLabel}</Badge>
                      <MoreVertical className="h-5 w-5 text-slate-500" />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {selected.location}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {selected.tenure}</span>
                    <a className="flex items-center gap-1.5 text-blue-600" href={selected.contact.linkedinUrl ?? "#"} target="_blank" rel="noreferrer">
                      LinkedIn <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="sk-insight-strip mt-5 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <span className="sk-insight-icon grid h-9 w-9 shrink-0 place-items-center rounded-md">
                    <FileSearch className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Why this target</p>
                    <p className="mt-1 text-sm leading-6 text-slate-900">{targetRationale}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid rounded-md border border-slate-200 md:grid-cols-4">
                {[
                  ["Company Size", selected.companySize],
                  ["Industry", selected.company.industry ?? "Software"],
                  ["Revenue", selected.revenue],
                  ["Technologies", selected.technologies],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-slate-200 px-4 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="sk-mini-card rounded-md p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white"><CheckCircle2 className="h-5 w-5" /></span>
                  <div>
                    <p className="text-sm font-semibold">Review Gate</p>
                    <p className="text-sm text-slate-600">Human approval required</p>
                    <p className="text-xs text-slate-500">No email or CRM write before approval</p>
                  </div>
                </div>
              </div>
              <div className="sk-mini-card rounded-md p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white"><CheckCircle2 className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Verified Email</p>
                    <p className="truncate text-sm text-slate-600">{selected.contact.workEmail}</p>
                    <p className="text-xs text-emerald-600">Verified · Confidence: High</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sk-panel rounded-md p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Review Checklist</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {checklistReadyCount} of {reviewChecklist.length} checks are ready before approval.
                  </p>
                </div>
                <Badge variant="outline" className={emailHandoffReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                  {emailHandoffReady ? "Packet unlocked" : selectedApproved ? "Footer needed" : "Approval pending"}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {reviewChecklist.map((item) => (
                  <article key={item.label} className="sk-check-card rounded-md p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${checklistStatusClass(item.status)}`}>
                          {item.status === "blocked" ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{item.label}</h4>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${checklistStatusClass(item.status)} self-start`}>
                        {checklistStatusLabel(item.status)}
                      </Badge>
                    </div>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                      {item.sourceLabel} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </article>
                ))}
              </div>
            </div>

            <div className="sk-panel rounded-md p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Signal Evidence</h3>
                <ChevronDown className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {signalEvents.map((event, index) => (
                  <div key={`${event.title}-${index}`} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-3 sm:grid-cols-[28px_minmax(0,1fr)_auto]">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-600"><BriefcaseBusiness className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-5 text-slate-900 sm:truncate">{index === 0 ? selected.signal.title : event.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{event.source} · {selected.company.domain}</p>
                    </div>
                    <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto sm:gap-3">
                      <span className={`hidden rounded-md border px-2 py-1 text-xs md:inline ${
                        event.label === "Funding" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                          event.label === "Hiring" ? "border-blue-200 bg-blue-50 text-blue-700" :
                            event.label === "Financial" ? "border-violet-200 bg-violet-50 text-violet-700" :
                              "border-amber-200 bg-amber-50 text-amber-700"
                      }`}>{event.label}</span>
                      <span className="text-xs text-slate-500">{event.age}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sk-panel rounded-md p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Buying Committee Map</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Likely buyer, champion, blocker, budget holder, and technical evaluator for {selected.company.name}.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={committeeFromProvider ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#5EEAD4] bg-[#ECFDF5] text-[#0F766E]"}
                  >
                    {committeeFromProvider ? "Exa Agent evidence" : "Deterministic demo"}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refreshCommitteeMap()}
                    disabled={committeeRefreshing}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {committeeRefreshing ? "Refreshing..." : "Refresh committee map"}
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Refresh is manual and calls Exa Agent only on click. Provider output is normalized into these seats and
                never changes approval or send guardrails.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {selectedCommittee.map((member) => (
                  <article key={`${member.seat}-${member.role}`} className="sk-committee-card rounded-md p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{member.seat}</p>
                        <h4 className="mt-1 text-sm font-semibold text-slate-900">{member.role}</h4>
                      </div>
                      <Badge
                        variant="outline"
                        className={member.confidence === "High" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700"}
                      >
                        {member.confidence}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-700">Current initiative</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{member.initiative}</p>
                    <p className="mt-3 text-xs font-semibold text-slate-700">Why this seat</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{member.reason}</p>
                    <p className="mt-3 text-xs font-semibold text-slate-700">Suggested outreach angle</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{member.outreachAngle}</p>
                    <a href={member.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                      {member.provider} evidence <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="sk-panel rounded-md p-4">
                <h3 className="text-sm font-semibold">Evidence-First Scoring</h3>
                <div className="mt-4 space-y-3">
                  {scoreEvidence.map((item) => (
                    <div key={item.label} className="sk-evidence-row rounded-md p-3">
                      <div className="grid grid-cols-[132px_minmax(0,1fr)_54px] items-center gap-3">
                        <span className="text-xs font-medium text-slate-700">{item.label}</span>
                        <Progress value={item.scoreValue} className="h-2 bg-slate-100" />
                        <span className="text-right text-xs text-slate-500">{factorValue(item.points, item.max)}</span>
                      </div>
                      <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <span className="min-w-0 leading-5">{item.evidence}</span>
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-blue-600">
                          {item.sourceLabel} · {item.sourceDate} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sk-panel rounded-md p-4">
                <h3 className="text-sm font-semibold">Score Factors</h3>
                <div className="mt-4 space-y-3">
                  {scoreFactors.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-700"><Check className="h-4 w-4 text-emerald-600" /> {label}</span>
                      <span className={value === "Good" ? "text-slate-500" : "text-emerald-600"}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="min-w-0 space-y-3 xl:col-span-2 2xl:col-span-1">
            <section className="grid grid-cols-2 gap-3">
              <Button
                disabled={selected.lifecycleState !== "queued" || !emailDraft.ok}
                onClick={approveSelected}
                className="sk-primary-action h-12"
              >
                <FileCheck2 className="h-4 w-4" />
                Approve Draft
              </Button>
              <Button variant="outline" className="sk-secondary-action h-12" onClick={rejectSelected}>
                <X className="h-4 w-4" />
                Reject
              </Button>
            </section>

            <EnrichmentGateCard
              gate={enrichmentGate}
              score={selected.score.composite}
              enriching={enriching}
              resultMessage={enrichmentResults[selected.id] ?? null}
              onEnrich={() => void enrichSelected()}
            />

            <section className="sk-panel overflow-hidden rounded-md">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">Conversion Tracker</h3>
                      <p className="text-xs text-slate-500">Record what happened after manual outreach.</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                    Tracking only
                  </Badge>
                </div>
              </div>
              <div className="space-y-4 p-4">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected signal</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{selected.signal.title}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-white px-2 py-2">
                      <span className="block text-base font-semibold text-slate-900">{selectedSignalStat?.approved ?? 0}</span>
                      <span className="text-slate-500">approved</span>
                    </div>
                    <div className="rounded-md bg-white px-2 py-2">
                      <span className="block text-base font-semibold text-slate-900">{selectedSignalStat?.replies ?? 0}</span>
                      <span className="text-slate-500">replies</span>
                    </div>
                    <div className="rounded-md bg-white px-2 py-2">
                      <span className="block text-base font-semibold text-slate-900">{selectedSignalStat?.meetings ?? 0}</span>
                      <span className="text-slate-500">meetings</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="sk-packet-action justify-start"
                    disabled={!selectedApproved || selectedHasManualEmailSent}
                    onClick={() => trackSelectedConversion("manual_email_sent", "Mariah sent the approved email manually.")}
                  >
                    <Send className="h-4 w-4" />
                    Track sent
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="sk-packet-action justify-start"
                    disabled={!selectedHasOutreachSent || selectedHasReply}
                    onClick={() => trackSelectedConversion("reply_received", "Reply received after manual outreach.")}
                  >
                    <Reply className="h-4 w-4" />
                    Track reply
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="sk-packet-action justify-start"
                    disabled={!selectedHasOutreachSent || selectedHasMeeting}
                    onClick={() => trackSelectedConversion("meeting_booked", "Meeting booked from the outreach thread.")}
                  >
                    <Calendar className="h-4 w-4" />
                    Track meeting
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="sk-packet-action justify-start"
                    disabled={!selectedHasMeeting}
                    onClick={() => trackSelectedConversion("won", "Opportunity won after SellKit-sourced outreach.")}
                  >
                    <Trophy className="h-4 w-4" />
                    Track won
                  </Button>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">Outcome history</h4>
                    <span className="text-xs text-slate-500">{selectedConversionEvents.length} events</span>
                  </div>
                  <div className="max-h-44 space-y-2 overflow-auto pr-1">
                    {selectedConversionEvents.length > 0 ? (
                      selectedConversionEvents.map((event) => (
                        <div key={event.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{conversionEventLabel(event.eventType)}</p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {event.channel ? event.channel.replace(/_/g, " ") : "signal"} · {new Date(event.occurredAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                              {event.source === "demo" ? "Demo" : "Manual"}
                            </Badge>
                          </div>
                          {event.notes && <p className="mt-2 text-xs leading-5 text-slate-600">{event.notes}</p>}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm leading-6 text-slate-500">
                        No outcomes tracked for this target yet. Approve the draft, send manually, then record the result here.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="sk-panel overflow-hidden rounded-md">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">Outreach Packet</h3>
                      <p className="text-xs text-slate-500">Email, LinkedIn note, CRM row, and evidence in one handoff.</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={emailHandoffReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                    {packetStatusLabel}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  {[
                    ["Draft", emailDraft.ok && senderFooterReady],
                    ["Approval", selected.lifecycleState === "approved"],
                    ["Export", approvedCount > 0],
                  ].map(([label, ready]) => (
                    <div key={String(label)} className={`rounded-md border px-2 py-2 ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      <span className="flex items-center gap-1.5 font-medium">
                        {ready ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-current" />}
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                {selectedApproved && !senderFooterReady && (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                    Add the approved sender address and unsubscribe link before copying or downloading email drafts. CRM export can still be prepared manually.
                  </div>
                )}
              </div>

              {emailDraft.ok ? (
                <div className="space-y-4 p-4">
                  <div className="sk-packet-section rounded-md p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <h4 className="text-sm font-semibold">1. Manual email</h4>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="sk-packet-action"
                        onClick={copyEmailDraft}
                        disabled={!emailHandoffReady || !manualEmailHandoff}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2 text-sm">
                      <span className="text-slate-500">To</span>
                      <span className="truncate">{emailDraft.to}</span>
                      <span className="text-slate-500">Subject</span>
                      <span>{emailDraft.subject}</span>
                    </div>
                    <pre className="sk-draft-body mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md p-3 text-sm leading-6">
                      {emailDraft.textBody}
                    </pre>
                    <Button
                      variant="outline"
                      className="sk-packet-action mt-3 w-full"
                      onClick={downloadEmlDraft}
                      disabled={!emailHandoffReady || !manualEmailHandoff}
                    >
                      <Download className="h-4 w-4" />
                      Download .eml Draft
                    </Button>
                    {emailCopied && <Badge variant="outline" className="mt-3 border-blue-200 bg-blue-50 text-blue-700">Copied for manual send</Badge>}
                  </div>

                  <div className="sk-packet-section rounded-md p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-blue-600" />
                      <h4 className="text-sm font-semibold">2. LinkedIn note</h4>
                    </div>
                    <p className="sk-draft-body rounded-md p-3 text-sm leading-6">{selected.linkedinNote}</p>
                    <a href={selected.contact.salesNavUrl ?? selected.contact.linkedinUrl ?? "#"} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                      Open profile manually <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="sk-packet-section rounded-md p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-blue-600" />
                        <h4 className="text-sm font-semibold">3. CRM CSV row</h4>
                      </div>
                      <span className={approvedCount > 0 ? "text-xs font-medium text-emerald-600" : "text-xs font-medium text-red-500"}>{approvedCount > 0 ? "Ready" : "Not ready"}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Approved targets</span>
                        <span>{approvedCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Import method</span>
                        <span>Manual CSV</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">LinkedIn</span>
                        <span>Manual only</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="sk-packet-action mt-3 w-full"
                      disabled={approvedCount === 0}
                      onClick={exportCrmCsv}
                    >
                      <Download className="h-4 w-4" />
                      Export CRM CSV
                    </Button>
                    <p className="mt-2 text-center text-xs text-slate-500">
                      {crmCsvExported
                        ? "CSV exported for manual import."
                        : approvedCount > 0
                          ? "Ready for manual import."
                          : "Approve a draft to enable export."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-sm text-destructive">Verified email and signal evidence are required before drafting.</div>
              )}
            </section>
          </aside>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={resetDemo}>
            <RotateCcw className="h-4 w-4" />
            Reset Demo
          </Button>
        </div>
      </main>
    </div>
  );
}
