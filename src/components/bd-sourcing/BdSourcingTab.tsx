import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Filter,
  Link2,
  Mail,
  MapPin,
  MoreVertical,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceKitMark } from "@/components/brand/SourceKitMark";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { buildManualCrmCsv, buildManualEmailHandoff } from "@/lib/bd-sourcing/manual-handoff";
import { buildFirstTouchEmail } from "@/lib/bd-sourcing/templates";
import type { BdScoreBucket, BdScoreResult, BdTargetLifecycleState, BdTargetView } from "@/types/bd-sourcing";

type QueueStatus = "New" | "Reviewed" | "In Review";

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
};

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
      companyMarkClass: "bg-violet-600 text-white",
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
      companyMarkClass: "bg-blue-600 text-white",
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
      companyMarkClass: "bg-orange-600 text-white",
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
      companyMarkClass: "bg-sky-500 text-white",
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
      companyMarkClass: "bg-emerald-600 text-white",
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
      companyMarkClass: "bg-slate-900 text-white",
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
      companyMarkClass: "bg-blue-500 text-white",
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
      companyMarkClass: "bg-yellow-500 text-slate-900",
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
      companyMarkClass: "bg-teal-700 text-white",
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
      companyMarkClass: "bg-orange-500 text-white",
      signalTitle: "UiPath refreshes automation platform positioning",
      signalSummary: "UiPath announced a platform refresh focused on enterprise automation.",
    }),
  ];
}

function statusClass(status: QueueStatus): string {
  if (status === "New") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "Reviewed") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-violet-200 bg-violet-50 text-violet-700";
}

function scoreClass(score: number): string {
  if (score >= 75) return "border-emerald-500 text-emerald-700";
  if (score >= 68) return "border-amber-500 text-amber-700";
  return "border-violet-500 text-violet-700";
}

function factorValue(value: number, max: number): string {
  return `${value} / ${max}`;
}

export default function BdSourcingTab() {
  const { toast } = useToast();
  const [targets, setTargets] = useState<VisualTarget[]>(() => buildVisualTargets());
  const [selectedId, setSelectedId] = useState("sarah-chen");
  const [emailCopied, setEmailCopied] = useState(false);
  const [crmCsvExported, setCrmCsvExported] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "SellKit";
    return () => {
      document.title = previousTitle || "SourceKit";
    };
  }, []);

  const selected = targets.find((target) => target.id === selectedId) ?? targets[0];
  const approvedCount = targets.filter((target) => target.lifecycleState === "approved").length;
  const selectedInitials = selected.contact.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  const emailDraft = useMemo(
    () =>
      buildFirstTouchEmail({
        firstName: selected.contact.firstName ?? selected.contact.fullName.split(" ")[0],
        company: selected.company.name,
        workEmail: selected.contact.workEmail,
        emailVerificationStatus: selected.contact.emailVerificationStatus,
        signalReference: selected.signal.summary,
        ctaBookingLink: "https://bookings.example.com/operator",
        operatorName: "Alex",
        operatorEmail: "operator@example.com",
        physicalAddress: "123 Market St, San Francisco, CA",
        unsubscribeUrl: `https://sourcekit.example/unsubscribe/${selected.id}`,
      }),
    [selected],
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

  const approveSelected = () => {
    setTargets((current) =>
      current.map((target) =>
        target.id === selected.id
          ? { ...target, lifecycleState: "approved" as const, statusLabel: "Reviewed" as const }
          : target,
      ),
    );
    toast({ title: "Draft approved", description: "Manual handoff is ready. No email or CRM write was executed." });
  };

  const rejectSelected = () => {
    setTargets((current) =>
      current.map((target) =>
        target.id === selected.id
          ? { ...target, lifecycleState: "suppressed" as const, statusLabel: "Reviewed" as const }
          : target,
      ),
    );
    toast({ title: "Target rejected", description: "The target moved out of the active review queue." });
  };

  const resetDemo = () => {
    setTargets(buildVisualTargets());
    setSelectedId("sarah-chen");
    setEmailCopied(false);
    setCrmCsvExported(false);
  };

  const copyEmailDraft = async () => {
    if (!manualEmailHandoff) return;
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

  const scoreBreakdown = [
    ["Signal Strength", 25, 30, selected.score.signalStrength],
    ["Role Fit", 24, 25, selected.score.personFit],
    ["Company Fit", 22, 25, selected.score.companyFit],
    ["Engagement Likelihood", 21, 20, selected.score.reachability],
  ] as const;

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#172A3A]">
      <header className="flex h-[72px] items-center justify-between border-b border-[#D8DEE8] bg-[#F6F7F9]/95 px-6">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex items-center gap-2.5">
            <SourceKitMark className="h-8 w-8 shrink-0 text-[#163B63]" title="SourceKit" />
            <h1 className="text-2xl font-semibold text-[#163B63]">SellKit</h1>
          </div>
          <button className="hidden h-10 items-center gap-4 rounded-md border border-[#D8DEE8] bg-white px-4 text-left text-xs text-[#667085] shadow-sm md:flex">
            <span>
              <span className="block text-[#667085]">Workstream</span>
              <span className="block font-medium text-[#172A3A]">Enterprise Software</span>
            </span>
            <ChevronDown className="h-4 w-4 text-[#667085]" />
          </button>
        </div>
        <div className="hidden flex-1 items-center justify-end gap-5 xl:flex">
          <div className="flex h-10 w-[360px] items-center gap-2 rounded-md border border-[#D8DEE8] bg-white px-3 text-sm text-[#667085] shadow-sm">
            <Search className="h-4 w-4" />
            <span className="truncate">Search targets, accounts, or signals...</span>
            <span className="ml-auto rounded border border-[#D8DEE8] px-1.5 text-[10px]">K</span>
          </div>
          <Bell className="h-5 w-5 text-[#667085]" />
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#163B63] text-xs font-semibold text-white">AJ</div>
            <span className="text-sm font-medium">Alex Johnson</span>
            <ChevronDown className="h-4 w-4 text-[#667085]" />
          </div>
        </div>
      </header>

      <main className="px-2 pb-7 pt-4 sm:px-4">
        <section className="mb-3 grid grid-cols-1 gap-3 rounded-none bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 lg:grid-cols-[1fr_auto]">
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
          <Button variant="outline" size="sm" className="h-10 justify-self-start lg:justify-self-end">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </section>

        <div className="grid gap-3 2xl:grid-cols-[540px_minmax(580px,1fr)_430px]">
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Review Queue</h2>
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">68</span>
                </div>
              </div>
              <MoreVertical className="h-5 w-5 text-slate-500" />
            </div>
            <div className="flex flex-wrap gap-3 border-b border-slate-200 px-5 py-3">
              <button className="flex h-9 min-w-[132px] items-center justify-between rounded-md border border-slate-200 px-3 text-sm text-slate-600">
                All Scores <ChevronDown className="h-4 w-4" />
              </button>
              <button className="flex h-9 min-w-[132px] items-center justify-between rounded-md border border-slate-200 px-3 text-sm text-slate-600">
                All Status <ChevronDown className="h-4 w-4" />
              </button>
              <button className="flex h-9 min-w-[150px] items-center justify-between rounded-md border border-slate-200 px-3 text-sm text-slate-600">
                Newest First <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
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
                  {targets.map((target) => {
                    const active = target.id === selected.id;
                    return (
                      <tr
                        key={target.id}
                        onClick={() => {
                          setSelectedId(target.id);
                          setEmailCopied(false);
                          setCrmCsvExported(false);
                        }}
                        className={`cursor-pointer border-b border-slate-100 transition-colors ${active ? "bg-blue-50 ring-1 ring-inset ring-blue-300" : "hover:bg-slate-50"}`}
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
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-4 text-sm text-slate-600">
              <span>1-10 of 68</span>
              <div className="flex items-center gap-3">
                <button className="text-slate-400">{"<"}</button>
                <button className="grid h-7 w-7 place-items-center rounded bg-blue-600 text-white">1</button>
                <button>2</button>
                <button>3</button>
                <button>4</button>
                <span>...</span>
                <button>7</button>
                <button>{">"}</button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-slate-900 text-xl font-semibold text-white">{selectedInitials}</div>
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
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white"><CheckCircle2 className="h-5 w-5" /></span>
                  <div>
                    <p className="text-sm font-semibold">CRM Gate</p>
                    <p className="text-sm text-slate-600">Clear in uploaded CRM data</p>
                    <p className="text-xs text-slate-500">No active suppression or owner conflict</p>
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
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

            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Signal Evidence</h3>
                <ChevronDown className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {signalEvents.map((event, index) => (
                  <div key={`${event.title}-${index}`} className="grid grid-cols-[28px_minmax(0,1fr)_auto] gap-3 py-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-600"><BriefcaseBusiness className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{index === 0 ? selected.signal.title : event.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{event.source} · {selected.company.domain}</p>
                    </div>
                    <div className="flex items-center gap-3">
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

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold">Score Breakdown</h3>
                <div className="mt-4 space-y-4">
                  {scoreBreakdown.map(([label, value, max, sourceValue]) => (
                    <div key={label} className="grid grid-cols-[130px_minmax(0,1fr)_52px] items-center gap-3">
                      <span className="text-xs text-slate-500">{label}</span>
                      <Progress value={(sourceValue / 100) * 100} className="h-2 bg-slate-100" />
                      <span className="text-right text-xs text-slate-500">{factorValue(value, max)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
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

          <aside className="space-y-3">
            <section className="grid grid-cols-2 gap-3">
              <Button
                disabled={selected.lifecycleState !== "queued" || !emailDraft.ok}
                onClick={approveSelected}
                className="h-12 bg-blue-600 text-white hover:bg-blue-700"
              >
                <FileCheck2 className="h-4 w-4" />
                Approve Draft
              </Button>
              <Button variant="outline" className="h-12" onClick={rejectSelected}>
                <X className="h-4 w-4" />
                Reject
              </Button>
            </section>

            <section className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Manual Email Draft</h3>
                </div>
                <Button variant="outline" size="sm" onClick={copyEmailDraft} disabled={selected.lifecycleState !== "approved" || !manualEmailHandoff}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              {emailDraft.ok ? (
                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2 text-sm">
                    <span className="text-slate-500">To</span>
                    <span className="truncate">{emailDraft.to}</span>
                    <span className="text-slate-500">Subject</span>
                    <span>{emailDraft.subject}</span>
                  </div>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    {emailDraft.textBody}
                  </pre>
                  <Button variant="outline" className="w-full" onClick={downloadEmlDraft} disabled={selected.lifecycleState !== "approved" || !manualEmailHandoff}>
                    <Download className="h-4 w-4" />
                    Download .eml Draft
                  </Button>
                  {emailCopied && <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Copied for manual send</Badge>}
                </div>
              ) : (
                <div className="p-4 text-sm text-destructive">Verified email and signal evidence are required before drafting.</div>
              )}
            </section>

            <section className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Sales Nav Note</h3>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <p className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">{selected.linkedinNote}</p>
                <a href={selected.contact.salesNavUrl ?? selected.contact.linkedinUrl ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                  Open profile manually <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">CRM CSV Export</h3>
                </div>
                <span className={approvedCount > 0 ? "text-sm text-emerald-600" : "text-sm text-red-500"}>{approvedCount > 0 ? "Ready" : "Not Ready"}</span>
              </div>
              <div className="space-y-3 p-4 text-sm">
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
                <Button variant="outline" className="w-full" disabled={approvedCount === 0} onClick={exportCrmCsv}>
                  <Download className="h-4 w-4" />
                  Export CRM CSV
                </Button>
                <p className="text-center text-xs text-slate-500">{crmCsvExported ? "CSV exported for manual import." : "Approve a draft to enable export."}</p>
              </div>
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
