export const EXA_AGENT_BETA_HEADER = "agent-2026-05-07";

export type ExaSearchType = "auto" | "deep" | "deep-reasoning";
export type ExaAgentEffort = "low" | "medium" | "high" | "xhigh" | "auto";

export interface ExaCompanySearchPayload {
  query: string;
  category: "company";
  type: ExaSearchType;
  numResults: number;
  contents: {
    highlights: true;
  };
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

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
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
