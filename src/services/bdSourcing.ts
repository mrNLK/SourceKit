import { supabase } from "@/integrations/supabase/client";
import type { BdTargetView } from "@/types/bd-sourcing";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type BdSourcingAction =
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

export interface BdSourcingActionResponse {
  ok: boolean;
  action: BdSourcingAction;
  status: "completed" | "blocked" | "stubbed";
  message: string;
  data?: Record<string, unknown>;
}

type WorkEmailEnrichmentTarget = Pick<BdTargetView, "id" | "company" | "contact">;

function toHeaderValue(value: string): string {
  return value.trim().replace(/[^\x20-\x7E]/g, "");
}

function validateHeaderValue(name: string, value: string): string {
  try {
    new Headers({ [name]: value });
  } catch {
    throw new Error(`Invalid ${name} header value for Supabase function request.`);
  }

  return value;
}

export async function invokeBdSourcingAction(
  action: BdSourcingAction,
  payload: Record<string, unknown> = {},
): Promise<BdSourcingActionResponse> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase not configured");
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Authentication required");
  }

  const supabaseUrl = SUPABASE_URL.trim();
  const supabaseKey = validateHeaderValue("apikey", toHeaderValue(SUPABASE_KEY));
  const accessToken = validateHeaderValue("Authorization", `Bearer ${toHeaderValue(session.access_token)}`);

  const res = await fetch(`${supabaseUrl}/functions/v1/bd-sourcing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: accessToken,
    },
    body: JSON.stringify({ action, payload }),
  });

  const data = await res.json().catch(() => ({ error: "Request failed" }));
  if (!res.ok || data.error) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }

  return data as BdSourcingActionResponse;
}

export const bdSourcingApi = {
  discoverTargets: (payload: Record<string, unknown>) => invokeBdSourcingAction("discover", payload),
  searchParallelEntities: (payload: { entityType: "people" | "companies"; objective: string; matchLimit?: number }) =>
    invokeBdSourcingAction("parallel_entity_search", payload),
  previewParallelFindAll: (payload: {
    entityType?: "people" | "companies";
    objective: string;
    matchConditions?: Array<{ name?: string; description: string }>;
    matchLimit?: number;
  }) => invokeBdSourcingAction("parallel_findall_preview", payload),
  searchExaCompanies: (payload: { query: string; additionalQueries?: string[]; numResults?: number }) =>
    invokeBdSourcingAction("exa_company_search", payload),
  searchExaPeople: (payload: { query: string; additionalQueries?: string[]; numResults?: number }) =>
    invokeBdSourcingAction("exa_people_search", payload),
  createExaAgentRun: (payload: { query: string; maxItems?: number; effort?: "low" | "medium" | "high" | "xhigh" | "auto" }) =>
    invokeBdSourcingAction("exa_agent_run", payload),
  getExaAgentRun: (runId: string) => invokeBdSourcingAction("exa_agent_get_run", { runId }),
  runDedup: (targetId: string) => invokeBdSourcingAction("dedup", { targetId }),
  runEnrichment: (targetId: string) => invokeBdSourcingAction("enrich", { targetId }),
  enrichWorkEmail: (target: WorkEmailEnrichmentTarget | string) => {
    const payload = typeof target === "string"
      ? { targetId: target }
      : {
          targetId: target.id,
          fullName: target.contact.fullName,
          firstName: target.contact.firstName,
          lastName: target.contact.lastName,
          title: target.contact.title,
          companyName: target.company.name,
          companyDomain: target.company.domain,
          websiteUrl: target.company.websiteUrl,
          linkedinUrl: target.contact.linkedinUrl,
        };

    return invokeBdSourcingAction("enrich", { ...payload, provider: "apollo", fields: ["work_email"] });
  },
  scoreTarget: (targetId: string) => invokeBdSourcingAction("score", { targetId }),
  draftEmail: (targetId: string) => invokeBdSourcingAction("draft_email", { targetId }),
  approveTarget: (targetId: string) => invokeBdSourcingAction("approve", { targetId }),
  buildManualEmailHandoff: (targetId: string) => invokeBdSourcingAction("manual_email_handoff", { targetId }),
  exportManualCrmCsv: (targetIds: string[]) => invokeBdSourcingAction("manual_crm_export", { targetIds }),
  createOutlookDraft: (targetId: string) => invokeBdSourcingAction("create_outlook_draft", { targetId }),
  sendApprovedEmail: (targetId: string) => invokeBdSourcingAction("send_email", { targetId }),
  syncSalesforce: (targetId: string) => invokeBdSourcingAction("sync_salesforce", { targetId }),
  draftLinkedInNote: (targetId: string) => invokeBdSourcingAction("draft_linkedin_note", { targetId }),
};
