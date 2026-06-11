export const EXA_AGENT_BETA_HEADER = "agent-2026-05-07";

export type ExaSearchType = "auto" | "deep" | "deep-reasoning";
export type ExaAgentEffort = "low" | "medium" | "high" | "xhigh" | "auto";
export type ParallelFindAllEntityType = "people" | "companies";

export interface ExaPeopleSearchPayload {
  query: string;
  category: "people";
  type: ExaSearchType;
  numResults: number;
  contents: {
    highlights: true;
  };
}

export interface ExaCompanySearchPayload {
  query: string;
  category: "company";
  type: ExaSearchType;
  numResults: number;
  contents: {
    highlights: true;
  };
}

export interface ParallelFindAllMatchCondition {
  name: string;
  description: string;
}

export interface ParallelFindAllPreviewPayload {
  objective: string;
  entity_type: ParallelFindAllEntityType;
  match_conditions: ParallelFindAllMatchCondition[];
  generator: "preview";
  match_limit: number;
}

export interface ExaAgentRunPayload {
  query: string;
  effort: ExaAgentEffort;
  outputSchema: {
    type: "object";
    properties: {
      targets: {
        type: "array";
        maxItems: number;
        items: {
          type: "object";
          properties: Record<string, Record<string, string>>;
          required: string[];
        };
      };
    };
    required: ["targets"];
  };
}

function normalizeMatchConditionName(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function uniqueTrimmed(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
    if (output.length >= max) break;
  }

  return output;
}

export function buildExaCompanySearchPayload(input: {
  query: string;
  numResults?: number;
  type?: ExaSearchType;
}): ExaCompanySearchPayload {
  return {
    query: input.query.trim(),
    category: "company",
    type: input.type ?? "auto",
    numResults: clamp(input.numResults ?? 10, 1, 100),
    contents: {
      highlights: true,
    },
  };
}

export function buildExaCompanySearchQueries(input: {
  query: string;
  additionalQueries?: string[];
  maxQueries?: number;
}): string[] {
  return uniqueTrimmed([input.query, ...(input.additionalQueries ?? [])], clamp(input.maxQueries ?? 3, 1, 3));
}

export function buildExaPeopleSearchPayload(input: {
  query: string;
  numResults?: number;
  type?: ExaSearchType;
}): ExaPeopleSearchPayload {
  return {
    query: input.query.trim(),
    category: "people",
    type: input.type ?? "auto",
    numResults: clamp(input.numResults ?? 10, 1, 100),
    contents: {
      highlights: true,
    },
  };
}

export function buildExaPeopleSearchQueries(input: {
  query: string;
  additionalQueries?: string[];
  maxQueries?: number;
}): string[] {
  return uniqueTrimmed([input.query, ...(input.additionalQueries ?? [])], clamp(input.maxQueries ?? 3, 1, 3));
}

export function buildParallelFindAllPreviewPayload(input: {
  objective: string;
  entityType?: ParallelFindAllEntityType;
  matchConditions?: Array<Partial<ParallelFindAllMatchCondition>>;
  matchLimit?: number;
}): ParallelFindAllPreviewPayload {
  const objective = input.objective.trim();
  const matchConditions = (input.matchConditions ?? [])
    .map((condition, index) => {
      const description = condition.description?.trim() ?? "";
      if (!description) return null;

      return {
        name: normalizeMatchConditionName(condition.name ?? "", `condition_${index + 1}`),
        description,
      };
    })
    .filter((condition): condition is ParallelFindAllMatchCondition => Boolean(condition));

  return {
    objective,
    entity_type: input.entityType ?? "companies",
    match_conditions:
      matchConditions.length > 0
        ? matchConditions
        : [
            {
              name: "icp_match",
              description: `Entity must match this ICP: ${objective}`,
            },
          ],
    generator: "preview",
    match_limit: clamp(input.matchLimit ?? 10, 1, 10),
  };
}

export function buildExaAgentRunPayload(input: {
  query: string;
  maxItems?: number;
  effort?: ExaAgentEffort;
}): ExaAgentRunPayload {
  return {
    query: input.query.trim(),
    effort: input.effort ?? "auto",
    outputSchema: {
      type: "object",
      properties: {
        targets: {
          type: "array",
          maxItems: clamp(input.maxItems ?? 10, 1, 50),
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              job_title: { type: "string" },
              company: { type: "string" },
              linkedin_url: { type: "string", format: "uri" },
              signal_evidence: { type: "string" },
              source_url: { type: "string", format: "uri" },
              work_email: { type: "string", format: "email" },
              why_now: { type: "string" },
            },
            required: [
              "name",
              "job_title",
              "company",
              "linkedin_url",
              "signal_evidence",
              "source_url",
            ],
          },
        },
      },
      required: ["targets"],
    },
  };
}
