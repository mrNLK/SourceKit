import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

type BdSourcingAction =
  | "discover"
  | "parallel_entity_search"
  | "parallel_findall_preview"
  | "exa_company_search"
  | "exa_people_search"
  | "exa_agent_run"
  | "exa_agent_get_run"
  | "dedup"
  | "enrich"
  | "score"
  | "draft_email"
  | "approve"
  | "manual_email_handoff"
  | "manual_crm_export"
  | "create_outlook_draft"
  | "send_email"
  | "sync_salesforce"
  | "draft_linkedin_note";

type EntityType = "people" | "companies";
type ExaSearchCategory = "company" | "people";

interface ExaSearchOutcome {
  query: string;
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
  message?: string;
}

interface BdSourcingRequest {
  action?: BdSourcingAction;
  payload?: Record<string, unknown>;
}

const PARALLEL_ENTITY_SEARCH_URL = "https://api.parallel.ai/v1beta/findall/entity-search";
const PARALLEL_FINDALL_RUNS_URL = "https://api.parallel.ai/v1beta/findall/runs";
const EXA_SEARCH_URL = "https://api.exa.ai/search";
const EXA_AGENT_RUNS_URL = "https://api.exa.ai/agent/runs";
const EXA_AGENT_BETA_HEADER = "agent-2026-05-07";

function jsonResponse(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function readEntityType(payload: Record<string, unknown>): EntityType | null {
  const value = payload.entityType ?? payload.entity_type;
  if (value === "people" || value === "companies") return value;
  return null;
}

function readMatchLimit(payload: Record<string, unknown>): number {
  const value = payload.matchLimit ?? payload.match_limit;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 25;
  return Math.min(1000, Math.max(5, Math.floor(parsed)));
}

function readPreviewMatchLimit(payload: Record<string, unknown>): number {
  const value = payload.matchLimit ?? payload.match_limit;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(10, Math.max(1, Math.floor(parsed)));
}

function normalizeConditionName(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function readMatchConditions(payload: Record<string, unknown>, objective: string) {
  const rawConditions = payload.matchConditions ?? payload.match_conditions;
  if (Array.isArray(rawConditions)) {
    const conditions = rawConditions.flatMap((condition, index) => {
      if (!condition || typeof condition !== "object") return [];
      const record = condition as Record<string, unknown>;
      const description = typeof record.description === "string" ? record.description.trim() : "";
      if (!description) return [];

      const rawName = typeof record.name === "string" ? record.name : "";
      return [{
        name: normalizeConditionName(rawName, `condition_${index + 1}`),
        description,
      }];
    });

    if (conditions.length > 0) return conditions;
  }

  return [{
    name: "icp_match",
    description: `Entity must match this ICP: ${objective}`,
  }];
}

async function parallelEntitySearch(req: Request, payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("PARALLEL_API_KEY");
  if (!apiKey) {
    return jsonResponse(req, 500, {
      ok: false,
      action: "parallel_entity_search",
      status: "blocked",
      message: "PARALLEL_API_KEY is not configured server-side.",
    });
  }

  const entityType = readEntityType(payload);
  const objective = readString(payload, "objective");
  const matchLimit = readMatchLimit(payload);

  if (!entityType) {
    return jsonResponse(req, 400, {
      ok: false,
      action: "parallel_entity_search",
      status: "blocked",
      message: "entityType must be people or companies.",
    });
  }

  if (!objective) {
    return jsonResponse(req, 400, {
      ok: false,
      action: "parallel_entity_search",
      status: "blocked",
      message: "objective is required.",
    });
  }

  const response = await fetch(PARALLEL_ENTITY_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      entity_type: entityType,
      objective,
      match_limit: matchLimit,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return jsonResponse(req, response.status, {
      ok: false,
      action: "parallel_entity_search",
      status: "blocked",
      message: data?.error?.message ?? data?.message ?? "Parallel entity search failed.",
      data,
    });
  }

  return jsonResponse(req, 200, {
    ok: true,
    action: "parallel_entity_search",
    status: "completed",
    message: `Parallel returned ${Array.isArray(data.entities) ? data.entities.length : 0} ${entityType}.`,
    data,
  });
}

async function parallelFindAllPreview(req: Request, payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("PARALLEL_API_KEY");
  if (!apiKey) {
    return jsonResponse(req, 500, {
      ok: false,
      action: "parallel_findall_preview",
      status: "blocked",
      message: "PARALLEL_API_KEY is not configured server-side.",
    });
  }

  const entityType = readEntityType(payload) ?? "companies";
  const objective = readString(payload, "objective");

  if (!objective) {
    return jsonResponse(req, 400, {
      ok: false,
      action: "parallel_findall_preview",
      status: "blocked",
      message: "objective is required.",
    });
  }

  const response = await fetch(PARALLEL_FINDALL_RUNS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      objective,
      entity_type: entityType,
      match_conditions: readMatchConditions(payload, objective),
      generator: "preview",
      match_limit: readPreviewMatchLimit(payload),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return jsonResponse(req, response.status, {
      ok: false,
      action: "parallel_findall_preview",
      status: "blocked",
      message: data?.error?.message ?? data?.message ?? "Parallel FindAll Preview failed.",
      data,
    });
  }

  return jsonResponse(req, 200, {
    ok: true,
    action: "parallel_findall_preview",
    status: "completed",
    message: "Parallel FindAll Preview run created. Use the returned run ID to inspect evaluated candidates.",
    data,
  });
}

function readCount(payload: Record<string, unknown>, key: string, fallback: number, min: number, max: number): number {
  const value = payload[key];
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function readStringArray(payload: Record<string, unknown>, key: string, max: number): string[] {
  const value = payload[key];
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    const dedupeKey = trimmed.toLowerCase();
    if (!trimmed || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    output.push(trimmed);
    if (output.length >= max) break;
  }

  return output;
}

function buildExaQuerySet(primaryQuery: string, payload: Record<string, unknown>): string[] {
  const queries = [primaryQuery, ...readStringArray(payload, "additionalQueries", 2), ...readStringArray(payload, "additional_queries", 2)];
  const seen = new Set<string>();
  const output: string[] = [];

  for (const query of queries) {
    const dedupeKey = query.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    output.push(query);
    if (output.length >= 3) break;
  }

  return output;
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> =>
    Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return null;
}

function firstEntityProperties(result: Record<string, unknown>, type: string): Record<string, unknown> {
  const entity = readRecordArray(result.entities).find((item) => item.type === type);
  return readRecord(entity?.properties);
}

function resultKey(result: Record<string, unknown>): string {
  return firstString(result.url, result.title)?.toLowerCase() ?? crypto.randomUUID();
}

function mergeExaResults(outcomes: ExaSearchOutcome[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];

  for (const outcome of outcomes) {
    if (!outcome.ok) continue;
    for (const result of readRecordArray(outcome.data.results)) {
      const key = resultKey(result);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ ...result, searchQuery: outcome.query });
    }
  }

  return merged;
}

function normalizeExaCompanyResult(result: Record<string, unknown>) {
  const properties = firstEntityProperties(result, "company");
  const headquarters = readRecord(properties.headquarters);
  const workforce = readRecord(properties.workforce);
  const financials = readRecord(properties.financials);

  return {
    name: firstString(properties.name, result.title),
    domain: firstString(properties.domain, result.url),
    websiteUrl: firstString(result.url, properties.websiteUrl),
    description: firstString(properties.description, result.text, result.summary),
    industry: firstString(properties.industry),
    headcount: firstString(workforce.total),
    location: [firstString(headquarters.city), firstString(headquarters.country)].filter(Boolean).join(", ") || null,
    fundingStage: firstString(readRecord(financials.fundingLatestRound).name),
    sourceUrl: firstString(result.url),
    searchQuery: firstString(result.searchQuery),
  };
}

function normalizeExaPersonResult(result: Record<string, unknown>) {
  const properties = firstEntityProperties(result, "person");
  const workHistory = readRecordArray(properties.workHistory);
  const latestWork = workHistory[0] ?? {};

  return {
    name: firstString(properties.name, result.title),
    title: firstString(properties.title, properties.jobTitle, latestWork.title),
    company: firstString(properties.companyName, latestWork.companyName, latestWork.company),
    location: firstString(properties.location),
    profileUrl: firstString(result.url, properties.linkedinUrl),
    sourceUrl: firstString(result.url),
    searchQuery: firstString(result.searchQuery),
    verificationStatus: "public_profile_match",
  };
}

async function runExaCategorySearch(apiKey: string, category: ExaSearchCategory, query: string, numResults: number): Promise<ExaSearchOutcome> {
  const response = await fetch(EXA_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      category,
      type: "auto",
      numResults,
      contents: {
        highlights: true,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  return {
    query,
    ok: response.ok,
    status: response.status,
    data,
    message: data?.error ?? data?.message,
  };
}

function exaApiKeyResponse(req: Request, action: string) {
  return jsonResponse(req, 500, {
    ok: false,
    action,
    status: "blocked",
    message: "EXA_API_KEY is not configured server-side.",
  });
}

async function exaCompanySearch(req: Request, payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("EXA_API_KEY");
  if (!apiKey) return exaApiKeyResponse(req, "exa_company_search");

  const query = readString(payload, "query");
  if (!query) {
    return jsonResponse(req, 400, {
      ok: false,
      action: "exa_company_search",
      status: "blocked",
      message: "query is required.",
    });
  }

  const queries = buildExaQuerySet(query, payload);
  const outcomes = await Promise.all(
    queries.map((searchQuery) => runExaCategorySearch(apiKey, "company", searchQuery, readCount(payload, "numResults", 10, 1, 100))),
  );
  const successfulOutcomes = outcomes.filter((outcome) => outcome.ok);

  if (successfulOutcomes.length === 0) {
    const firstFailure = outcomes[0];
    return jsonResponse(req, firstFailure?.status ?? 502, {
      ok: false,
      action: "exa_company_search",
      status: "blocked",
      message: firstFailure?.message ?? "Exa Company Search failed.",
      data: { searches: outcomes },
    });
  }

  const results = mergeExaResults(outcomes);
  return jsonResponse(req, 200, {
    ok: true,
    action: "exa_company_search",
    status: "completed",
    message: `Exa returned ${results.length} deduped companies across ${queries.length} query variant${queries.length === 1 ? "" : "s"}.`,
    data: {
      queries,
      results,
      companies: results.map(normalizeExaCompanyResult),
      searches: outcomes.map((outcome) => ({
        query: outcome.query,
        ok: outcome.ok,
        status: outcome.status,
        resultCount: readRecordArray(outcome.data.results).length,
        message: outcome.message,
      })),
    },
  });
}

async function exaPeopleSearch(req: Request, payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("EXA_API_KEY");
  if (!apiKey) return exaApiKeyResponse(req, "exa_people_search");

  const query = readString(payload, "query");
  if (!query) {
    return jsonResponse(req, 400, {
      ok: false,
      action: "exa_people_search",
      status: "blocked",
      message: "query is required.",
    });
  }

  const queries = buildExaQuerySet(query, payload);
  const outcomes = await Promise.all(
    queries.map((searchQuery) => runExaCategorySearch(apiKey, "people", searchQuery, readCount(payload, "numResults", 10, 1, 100))),
  );
  const successfulOutcomes = outcomes.filter((outcome) => outcome.ok);

  if (successfulOutcomes.length === 0) {
    const firstFailure = outcomes[0];
    return jsonResponse(req, firstFailure?.status ?? 502, {
      ok: false,
      action: "exa_people_search",
      status: "blocked",
      message: firstFailure?.message ?? "Exa People Search failed.",
      data: { searches: outcomes },
    });
  }

  const results = mergeExaResults(outcomes);
  return jsonResponse(req, 200, {
    ok: true,
    action: "exa_people_search",
    status: "completed",
    message: `Exa returned ${results.length} deduped people across ${queries.length} query variant${queries.length === 1 ? "" : "s"}.`,
    data: {
      queries,
      results,
      profiles: results.map(normalizeExaPersonResult),
      searches: outcomes.map((outcome) => ({
        query: outcome.query,
        ok: outcome.ok,
        status: outcome.status,
        resultCount: readRecordArray(outcome.data.results).length,
        message: outcome.message,
      })),
    },
  });
}

function buildExaAgentOutputSchema(maxItems: number) {
  return {
    type: "object",
    properties: {
      targets: {
        type: "array",
        maxItems,
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
          required: ["name", "job_title", "company", "linkedin_url", "signal_evidence", "source_url"],
        },
      },
    },
    required: ["targets"],
  };
}

async function exaAgentRun(req: Request, payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("EXA_API_KEY");
  if (!apiKey) return exaApiKeyResponse(req, "exa_agent_run");

  const query = readString(payload, "query");
  if (!query) {
    return jsonResponse(req, 400, {
      ok: false,
      action: "exa_agent_run",
      status: "blocked",
      message: "query is required.",
    });
  }

  const effort = readString(payload, "effort") || "auto";
  const allowedEfforts = new Set(["low", "medium", "high", "xhigh", "auto"]);
  const response = await fetch(EXA_AGENT_RUNS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "Exa-Beta": EXA_AGENT_BETA_HEADER,
    },
    body: JSON.stringify({
      query,
      effort: allowedEfforts.has(effort) ? effort : "auto",
      outputSchema: buildExaAgentOutputSchema(readCount(payload, "maxItems", 10, 1, 50)),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return jsonResponse(req, response.status, {
      ok: false,
      action: "exa_agent_run",
      status: "blocked",
      message: data?.error ?? data?.message ?? "Exa Agent run creation failed.",
      data,
    });
  }

  return jsonResponse(req, 200, {
    ok: true,
    action: "exa_agent_run",
    status: "completed",
    message: "Exa Agent run created. Poll the run ID for structured output and grounding.",
    data,
  });
}

async function exaAgentGetRun(req: Request, payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("EXA_API_KEY");
  if (!apiKey) return exaApiKeyResponse(req, "exa_agent_get_run");

  const runId = readString(payload, "runId");
  if (!runId) {
    return jsonResponse(req, 400, {
      ok: false,
      action: "exa_agent_get_run",
      status: "blocked",
      message: "runId is required.",
    });
  }

  const response = await fetch(`${EXA_AGENT_RUNS_URL}/${encodeURIComponent(runId)}`, {
    headers: {
      "x-api-key": apiKey,
      "Exa-Beta": EXA_AGENT_BETA_HEADER,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return jsonResponse(req, response.status, {
      ok: false,
      action: "exa_agent_get_run",
      status: "blocked",
      message: data?.error ?? data?.message ?? "Exa Agent run fetch failed.",
      data,
    });
  }

  return jsonResponse(req, 200, {
    ok: true,
    action: "exa_agent_get_run",
    status: "completed",
    message: `Exa Agent run status: ${data.status ?? "unknown"}.`,
    data,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { ok: false, status: "blocked", message: "POST required." });
  }

  try {
    const body = await req.json() as BdSourcingRequest;
    const action = body.action;
    const payload = body.payload ?? {};

    if (!action) {
      return jsonResponse(req, 400, { ok: false, status: "blocked", message: "action is required." });
    }

    if (action === "parallel_entity_search") {
      return await parallelEntitySearch(req, payload);
    }

    if (action === "parallel_findall_preview") {
      return await parallelFindAllPreview(req, payload);
    }

    if (action === "exa_company_search") {
      return await exaCompanySearch(req, payload);
    }

    if (action === "exa_people_search") {
      return await exaPeopleSearch(req, payload);
    }

    if (action === "exa_agent_run") {
      return await exaAgentRun(req, payload);
    }

    if (action === "exa_agent_get_run") {
      return await exaAgentGetRun(req, payload);
    }

    if (action === "send_email" || action === "sync_salesforce" || action === "create_outlook_draft") {
      return jsonResponse(req, 200, {
        ok: false,
        action,
        status: "blocked",
        message: "Microsoft/Salesforce writes are blocked in manual-first mode.",
      });
    }

    const stubMessages: Record<string, string> = {
      discover: "Discovery action registered. Exa Company Search, Exa People Search, Exa Agent, Exa Websets, Parallel Fast Entity Search, Parallel FindAll Preview, and Findem adapters are provider entry points.",
      dedup: "Salesforce and local dedup checks are modeled by deterministic rules; real Salesforce query adapter is pending setup.",
      enrich: "Apollo-first, Clay-fallback enrichment adapter is stubbed until credentials and field mappings are confirmed.",
      score: "Deterministic score calculation lives in the client/domain layer and database job plan.",
      draft_email: "Email drafting is template-bound and requires verified email plus signal evidence.",
      approve: "Approval must be persisted as a target state transition before any external action.",
      manual_email_handoff: "Manual email handoff returns copyable email text and .eml content for operator review.",
      manual_crm_export: "Manual CRM export returns approved target rows as CSV for operator import.",
      draft_linkedin_note: "Sales Navigator follow-up is manual only; this action prepares note text and profile URL.",
    };

    return jsonResponse(req, 200, {
      ok: true,
      action,
      status: "stubbed",
      message: stubMessages[action] ?? "Action stubbed.",
    });
  } catch (error) {
    return jsonResponse(req, 500, {
      ok: false,
      status: "blocked",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
