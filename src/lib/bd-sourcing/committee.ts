export type BdCommitteeSeatName =
  | "Primary buyer"
  | "Champion"
  | "Blocker"
  | "Budget holder"
  | "Technical evaluator";

export interface BdCommitteeSeat {
  seat: BdCommitteeSeatName;
  role: string;
  reason: string;
  initiative: string;
  sourceUrl: string;
  confidence: "High" | "Medium";
  outreachAngle: string;
  provider: "Exa Agent" | "Parallel Task" | "Demo";
}

export const committeeSeatNames: BdCommitteeSeatName[] = [
  "Primary buyer",
  "Champion",
  "Blocker",
  "Budget holder",
  "Technical evaluator",
];

const maxFieldLength = 300;

export interface CommitteeAccountInput {
  fullName: string;
  title: string;
  company: string;
  domain: string;
  signalTitle: string;
  signalSummary: string;
}

export function buildCommitteeAgentQuery(input: Pick<CommitteeAccountInput, "company" | "domain" | "signalTitle">): string {
  return [
    `Map the buying committee at ${input.company} (${input.domain}) for an expert-services conversation tied to: ${input.signalTitle}.`,
    "Return up to 5 people or likely titles covering: primary buyer, champion, blocker, budget holder, technical evaluator.",
    "For each, include name, job_title, company, linkedin_url, signal_evidence (their current initiative and why they would care), and source_url.",
    "Use only public sources. Do not draft outreach, do not contact anyone, and do not include personal contact details.",
  ].join(" ");
}

export function buildDemoCommittee(input: CommitteeAccountInput): BdCommitteeSeat[] {
  const newsUrl = `https://${input.domain}/news`;
  const careersUrl = `https://${input.domain}/careers`;
  const homeUrl = `https://${input.domain}`;

  return [
    {
      seat: "Primary buyer",
      role: `${input.fullName}, ${input.title}`,
      reason: `Closest owner of the active ${input.company} initiative and the most likely first approval path.`,
      initiative: input.signalTitle,
      sourceUrl: newsUrl,
      confidence: "High",
      outreachAngle: "Open with the signal and offer operators who have run the same initiative at peer companies.",
      provider: "Demo",
    },
    {
      seat: "Champion",
      role: "Director, Platform Engineering",
      reason: "Feels the delivery pressure day to day and can socialize outside expert help internally.",
      initiative: "Platform scale and reliability work surfaced in recent hiring and technical updates.",
      sourceUrl: careersUrl,
      confidence: "Medium",
      outreachAngle: "Lead with a practical de-risking story from a similar platform team, not a sales pitch.",
      provider: "Demo",
    },
    {
      seat: "Blocker",
      role: "VP, Procurement / Vendor Management",
      reason: "Owns vendor consolidation and will challenge a new services line item mid-initiative.",
      initiative: "Vendor and spend review cycles that typically follow this kind of investment.",
      sourceUrl: homeUrl,
      confidence: "Medium",
      outreachAngle: "Prepare the buyer with a small scoped pilot framing so procurement sees a contained spend.",
      provider: "Demo",
    },
    {
      seat: "Budget holder",
      role: "Head of Transformation / IT Operations",
      reason: "Connects the project to business impact, vendor approval, and operational urgency.",
      initiative: input.signalSummary,
      sourceUrl: homeUrl,
      confidence: "Medium",
      outreachAngle: "Frame expert help as accelerating an initiative the budget already exists for.",
      provider: "Demo",
    },
    {
      seat: "Technical evaluator",
      role: "Staff / Principal Engineer, Platform",
      reason: "Will pressure-test any outside expert before the team agrees to work with them.",
      initiative: "Hands-on evaluation of architecture and tooling choices tied to the signal.",
      sourceUrl: careersUrl,
      confidence: "Medium",
      outreachAngle: "Offer a senior practitioner conversation, peer to peer, before any commercial discussion.",
      provider: "Demo",
    },
  ];
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> =>
    Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxFieldLength);
}

function cleanHttpUrl(value: unknown): string | null {
  const text = cleanText(value);
  if (!text || !/^https?:\/\//i.test(text)) return null;
  return text;
}

function extractAgentTargets(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== "object") return [];
  const record = raw as Record<string, unknown>;

  const direct = readRecordArray(record.targets);
  if (direct.length > 0) return direct;

  for (const key of ["output", "result", "data"]) {
    const nested = record[key];
    if (typeof nested === "string") {
      try {
        return extractAgentTargets(JSON.parse(nested));
      } catch {
        continue;
      }
    }
    const fromNested = extractAgentTargets(nested);
    if (fromNested.length > 0) return fromNested;
  }

  return [];
}

export function normalizeCommitteeOutput(raw: unknown, fallback: BdCommitteeSeat[]): BdCommitteeSeat[] {
  const targets = extractAgentTargets(raw);

  return committeeSeatNames.map((seatName, index) => {
    const fallbackSeat = fallback[index] ?? fallback[fallback.length - 1];
    const target = targets[index];
    if (!target) return fallbackSeat;

    const name = cleanText(target.name);
    const jobTitle = cleanText(target.job_title);
    const evidence = cleanText(target.signal_evidence);
    const sourceUrl = cleanHttpUrl(target.source_url) ?? cleanHttpUrl(target.linkedin_url);

    if (!name && !jobTitle) return fallbackSeat;

    return {
      seat: seatName,
      role: [name, jobTitle].filter(Boolean).join(", "),
      reason: evidence ?? fallbackSeat.reason,
      initiative: cleanText(target.why_now) ?? evidence ?? fallbackSeat.initiative,
      sourceUrl: sourceUrl ?? fallbackSeat.sourceUrl,
      confidence: sourceUrl ? "High" : "Medium",
      outreachAngle: fallbackSeat.outreachAngle,
      provider: "Exa Agent",
    };
  });
}
