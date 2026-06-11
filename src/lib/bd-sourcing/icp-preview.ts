export type IcpPreviewMode = "fast_lookup" | "preview_run";
export type IcpPreviewEntityType = "people" | "companies";

export interface IcpPreviewRequest {
  action: "parallel_entity_search" | "parallel_findall_preview";
  payload: {
    entityType: IcpPreviewEntityType;
    objective: string;
    matchLimit: number;
  };
}

export interface IcpPreviewMatch {
  id: string;
  name: string;
  detail: string | null;
  matchReason: string;
  provider: "parallel" | "stub";
  confidence: number;
  status: "provider_match" | "stub_preview";
  sourceUrl: string | null;
}

export const icpPreviewMatchLimit = 10;

export function buildIcpPreviewRequest(input: {
  icpText: string;
  mode: IcpPreviewMode;
  entityType?: IcpPreviewEntityType;
}): IcpPreviewRequest {
  return {
    action: input.mode === "fast_lookup" ? "parallel_entity_search" : "parallel_findall_preview",
    payload: {
      entityType: input.entityType ?? "companies",
      objective: input.icpText.trim(),
      matchLimit: icpPreviewMatchLimit,
    },
  };
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> =>
    Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function normalizeConfidence(value: number | null): number {
  if (value === null) return 60;
  const scaled = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, Math.round(scaled)));
}

export function normalizeIcpPreviewMatches(data: Record<string, unknown> | undefined): IcpPreviewMatch[] {
  if (!data) return [];

  const candidates = [data.entities, data.candidates, data.matches, data.results]
    .map(readRecordArray)
    .find((records) => records.length > 0) ?? [];

  return candidates.slice(0, icpPreviewMatchLimit).map((record, index) => {
    const name = firstString(record.name, record.title, record.company_name, record.url) ?? `Match ${index + 1}`;
    return {
      id: firstString(record.id, record.url) ?? `parallel-${index}`,
      name,
      detail: firstString(record.domain, record.company_domain, record.job_title, record.url),
      matchReason:
        firstString(record.match_reason, record.reason, record.description, record.snippet, record.summary) ??
        "Matched the ICP objective in Parallel's index.",
      provider: "parallel",
      confidence: normalizeConfidence(firstNumber(record.confidence, record.match_score, record.score)),
      status: "provider_match",
      sourceUrl: firstString(record.url, record.source_url),
    };
  });
}

const stubCompanies = [
  { name: "Northwind Cloud", domain: "northwindcloud.example", angle: "platform team scaling" },
  { name: "Lakeshore Systems", domain: "lakeshore.example", angle: "new data leadership" },
  { name: "Helio Analytics", domain: "helioanalytics.example", angle: "AI observability hiring" },
  { name: "Bluepine Software", domain: "bluepine.example", angle: "cloud cost initiative" },
  { name: "Cobalt Works", domain: "cobaltworks.example", angle: "enterprise modernization" },
  { name: "Summit Data Co", domain: "summitdata.example", angle: "platform reliability push" },
  { name: "Harborline", domain: "harborline.example", angle: "security leadership change" },
  { name: "Quartz Labs", domain: "quartzlabs.example", angle: "growth-stage expansion" },
  { name: "Fernwood Tech", domain: "fernwood.example", angle: "transformation program" },
  { name: "Atlas Grid", domain: "atlasgrid.example", angle: "senior hiring spike" },
] as const;

export function buildStubIcpPreviewMatches(icpText: string, mode: IcpPreviewMode): IcpPreviewMatch[] {
  const objective = icpText.trim() || "your ICP";
  const modeLabel = mode === "fast_lookup" ? "fast lookup" : "FindAll preview";

  return stubCompanies.map((company, index) => ({
    id: `stub-${mode}-${index}`,
    name: company.name,
    detail: company.domain,
    matchReason: `Stubbed ${modeLabel} sample: ${company.angle} pattern-matched against "${objective.slice(0, 120)}".`,
    provider: "stub",
    confidence: 70 - index * 2,
    status: "stub_preview",
    sourceUrl: null,
  }));
}
