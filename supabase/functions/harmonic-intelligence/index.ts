import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import {
  getCompaniesByUrns,
  normalizeHarmonicCompany,
  searchCompaniesByNaturalLanguage,
} from "../_shared/harmonic.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface HarmonicIntelligenceRequest {
  runId: string;
  query: string;
  conceptId?: string | null;
  limit?: number;
}

interface IntelligenceRunRow {
  id: string;
  user_id: string;
  provider: string;
}

interface FunctionErrorBody {
  error: {
    message: string;
    code: string;
  };
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

let _corsHeaders: Record<string, string> = {};

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ..._corsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

function errorJson(message: string, code: string, status: number): Response {
  return json(
    {
      error: {
        message,
        code,
      },
    } satisfies FunctionErrorBody,
    { status },
  );
}

function buildClients(request: Request): {
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
} {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = request.headers.get("Authorization") || "";

  return {
    userClient: createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }),
    serviceClient: createClient(supabaseUrl, serviceRoleKey),
  };
}

async function getOwnedRun(
  userClient: SupabaseClient,
  runId: string,
): Promise<{ userId: string; run: IntelligenceRunRow }> {
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await userClient
    .from("aifund_intelligence_runs")
    .select("id, user_id, provider")
    .eq("id", runId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw new Error("Run not found");
  }

  return {
    userId: user.id,
    run: data as IntelligenceRunRow,
  };
}

async function verifyOwnedConcept(
  userClient: SupabaseClient,
  userId: string,
  conceptId: string,
): Promise<void> {
  const { data, error } = await userClient
    .from("aifund_concepts")
    .select("id")
    .eq("id", conceptId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Concept not found");
  }
}

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((byte: number) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request): Promise<Response> => {
  _corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: _corsHeaders });
  }

  if (request.method !== "POST") {
    return errorJson("Method not allowed", "method_not_allowed", 405);
  }

  const { userClient, serviceClient } = buildClients(request);
  let runId = "";

  try {
    const body = await request.json() as HarmonicIntelligenceRequest;
    runId = body.runId;

    if (!body.runId || !body.query?.trim()) {
      return errorJson("Missing runId or query", "missing_run_id_or_query", 400);
    }

    const { userId, run } = await getOwnedRun(userClient, body.runId);
    if (run.provider !== "harmonic") {
      return errorJson("Run provider must be harmonic", "invalid_run_provider", 400);
    }

    if (body.conceptId) {
      await verifyOwnedConcept(userClient, userId, body.conceptId);
    }

    await serviceClient
      .from("aifund_intelligence_runs")
      .update({ status: "running" })
      .eq("id", body.runId)
      .eq("user_id", userId);

    const searchResults = await searchCompaniesByNaturalLanguage(body.query.trim(), body.limit ?? 10);
    const urns = searchResults.map((result: { companyUrn: string }) => result.companyUrn);
    const companyPayloads = await getCompaniesByUrns(
      urns,
      ["id", "entity_urn", "name", "website", "website_domain_aliases", "headcount", "funding", "socials", "location", "people", "tags"],
    );
    const companies = companyPayloads.map((raw: Record<string, unknown>) => normalizeHarmonicCompany(raw));
    const fetchedAt = new Date().toISOString();

    for (const company of companies) {
      await serviceClient
        .from("aifund_harmonic_companies")
        .upsert({
          user_id: userId,
          harmonic_company_id: company.harmonicCompanyId,
          name: company.name,
          domain: company.domain,
          linkedin_url: company.linkedinUrl,
          website_url: company.websiteUrl,
          location: company.location,
          funding_stage: company.fundingStage,
          funding_total: company.fundingTotal,
          last_funding_date: company.lastFundingDate,
          last_funding_total: company.lastFundingTotal,
          headcount: company.headcount,
          headcount_growth_30d: company.headcountGrowth30d,
          headcount_growth_90d: company.headcountGrowth90d,
          tags: company.tags,
          founders: company.founders,
          raw_payload: company.rawPayload,
          fetched_at: fetchedAt,
          updated_at: fetchedAt,
        }, {
          onConflict: "user_id,harmonic_company_id",
        });
    }

    const resultsSummary = {
      source: "harmonic",
      query: body.query.trim(),
      conceptId: body.conceptId ?? null,
      fetchedAt,
      companies,
    };

    const { data: updatedRun, error: runError } = await serviceClient
      .from("aifund_intelligence_runs")
      .update({
        status: "completed",
        results_count: companies.length,
        completed_at: fetchedAt,
        results_summary: resultsSummary,
      })
      .eq("id", body.runId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (runError) {
      throw runError;
    }

    if (body.conceptId) {
      const queryHash = await sha256(body.query.trim());
      const payload = {
        user_id: userId,
        concept_id: body.conceptId,
        query_text: body.query.trim(),
        query_hash: queryHash,
        status: "draft",
        last_run_id: body.runId,
        result_count: companies.length,
        metadata: {
          source: "harmonic",
          last_results_fetched_at: fetchedAt,
        },
        updated_at: fetchedAt,
      };

      const { data: existingSavedSearch } = await serviceClient
        .from("aifund_harmonic_saved_searches")
        .select("id")
        .eq("user_id", userId)
        .eq("concept_id", body.conceptId)
        .eq("query_hash", queryHash)
        .is("harmonic_saved_search_id", null)
        .limit(1)
        .maybeSingle();

      if (existingSavedSearch) {
        await serviceClient
          .from("aifund_harmonic_saved_searches")
          .update(payload)
          .eq("id", existingSavedSearch.id);
      } else {
        await serviceClient
          .from("aifund_harmonic_saved_searches")
          .insert(payload);
      }
    }

    return json({
      run: updatedRun,
      companies,
    });
  } catch (error) {
    console.error("harmonic-intelligence failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    if (runId) {
      try {
        await serviceClient
          .from("aifund_intelligence_runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            results_summary: {
              source: "harmonic",
              query: "",
              conceptId: null,
              fetchedAt: new Date().toISOString(),
              companies: [],
              error: message,
            },
          })
          .eq("id", runId);
      } catch (updateError) {
        console.error("Failed to update run status:", updateError);
      }
    }

    const status =
      message === "Unauthorized"
        ? 401
        : message === "Run not found" || message === "Concept not found"
          ? 404
          : 500;
    const code = message === "Unauthorized"
      ? "unauthorized"
      : message === "Run not found"
        ? "run_not_found"
        : message === "Concept not found"
          ? "concept_not_found"
        : message.includes("HARMONIC_API_KEY")
          ? "missing_harmonic_configuration"
          : "harmonic_intelligence_failed";
    return errorJson(message, code, status);
  }
});
