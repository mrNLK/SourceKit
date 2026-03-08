import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import {
  enrichPersonByLinkedIn,
  getCompaniesByUrns,
  getCompanyCacheTtlMs,
  normalizeHarmonicCompany,
  normalizeHarmonicPerson,
  normalizeLinkedInUrl,
} from "../_shared/harmonic.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface HarmonicPersonRequest {
  personId: string;
  linkedinUrl?: string | null;
  personContext?: {
    fullName?: string | null;
    currentRole?: string | null;
    currentCompany?: string | null;
    location?: string | null;
  };
}

interface FunctionErrorBody {
  error: {
    message: string;
    code: string;
  };
}

interface PersonRow {
  id: string;
  user_id: string;
  full_name: string | null;
  linkedin_url: string | null;
  current_role: string | null;
  current_company: string | null;
  location: string | null;
  bio: string | null;
  metadata: Record<string, unknown> | null;
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

function buildSupabaseClients(request: Request): {
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

async function getOwnedPerson(
  userClient: SupabaseClient,
  personId: string,
): Promise<{ userId: string; person: PersonRow }> {
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await userClient
    .from("aifund_people")
    .select("id, user_id, full_name, linkedin_url, current_role, current_company, location, bio, metadata")
    .eq("id", personId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw new Error("Person not found");
  }

  return {
    userId: user.id,
    person: data as PersonRow,
  };
}

async function getFreshCompanyCache(
  serviceClient: SupabaseClient,
  userId: string,
  harmonicCompanyId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await serviceClient
    .from("aifund_harmonic_companies")
    .select("*")
    .eq("user_id", userId)
    .eq("harmonic_company_id", harmonicCompanyId)
    .single();

  if (error || !data || !data.fetched_at) {
    return null;
  }

  const ageMs = Date.now() - new Date(data.fetched_at as string).getTime();
  return ageMs <= getCompanyCacheTtlMs() ? data as Record<string, unknown> : null;
}

function buildPersonUpdate(person: PersonRow, normalized: ReturnType<typeof normalizeHarmonicPerson>): Record<string, unknown> {
  const update: Record<string, unknown> = {
    harmonic_person_id: normalized.harmonicPersonId,
    harmonic_enriched_at: new Date().toISOString(),
  };

  if (normalized.linkedinUrl) {
    update.linkedin_url = normalized.linkedinUrl;
  }

  if (!person.full_name && normalized.fullName) {
    update.full_name = normalized.fullName;
  }
  if (!person.current_role && normalized.currentRole) {
    update.current_role = normalized.currentRole;
  }
  if (!person.current_company && normalized.currentCompany) {
    update.current_company = normalized.currentCompany;
  }
  if (!person.location && normalized.location) {
    update.location = normalized.location;
  }
  if (!person.bio && normalized.bio) {
    update.bio = normalized.bio;
  }

  const metadata = {
    ...(person.metadata || {}),
    harmonic_profile: {
      source: "harmonic",
      education: normalized.education,
      experience: normalized.experience,
      skills: normalized.skills,
      social_links: normalized.socialLinks,
      last_enriched_at: new Date().toISOString(),
    },
  };
  update.metadata = metadata;

  return update;
}

Deno.serve(async (request: Request): Promise<Response> => {
  _corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: _corsHeaders });
  }

  if (request.method !== "POST") {
    return errorJson("Method not allowed", "method_not_allowed", 405);
  }

  try {
    const body = await request.json() as HarmonicPersonRequest;
    if (!body.personId) {
      return errorJson("Missing personId", "missing_person_id", 400);
    }

    const { userClient, serviceClient } = buildSupabaseClients(request);
    const { userId, person } = await getOwnedPerson(userClient, body.personId);
    const linkedinUrl = normalizeLinkedInUrl(body.linkedinUrl || person.linkedin_url);

    if (!linkedinUrl) {
      return errorJson("Missing LinkedIn URL", "missing_linkedin_url", 400);
    }

    let personRaw: Record<string, unknown>;
    try {
      personRaw = await enrichPersonByLinkedIn(linkedinUrl);
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status === 404) {
        return json({
          notFound: true,
          personId: body.personId,
          person: null,
          externalProfile: null,
          companyCacheRow: null,
        }, { status: 200 });
      }
      throw error;
    }

    const normalizedPerson = normalizeHarmonicPerson(personRaw);
    const personUpdate = buildPersonUpdate(person, normalizedPerson);

    const { data: updatedPerson, error: updateError } = await serviceClient
      .from("aifund_people")
      .update(personUpdate)
      .eq("id", body.personId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    let companyCacheRow: Record<string, unknown> | null = null;
    const companyUrn = normalizedPerson.companyUrns[0];
    if (companyUrn) {
      const cached = await getFreshCompanyCache(serviceClient, userId, companyUrn);
      if (cached) {
        companyCacheRow = cached;
      } else {
        try {
          const companies = await getCompaniesByUrns(
            [companyUrn],
            ["id", "entity_urn", "name", "website", "website_domain_aliases", "headcount", "funding", "socials", "location", "people", "tags"],
          );
          const rawCompany = companies[0];
          if (rawCompany) {
            const normalizedCompany = normalizeHarmonicCompany(rawCompany);
            const { data } = await serviceClient
              .from("aifund_harmonic_companies")
              .upsert({
                user_id: userId,
                harmonic_company_id: normalizedCompany.harmonicCompanyId,
                name: normalizedCompany.name,
                domain: normalizedCompany.domain,
                linkedin_url: normalizedCompany.linkedinUrl,
                website_url: normalizedCompany.websiteUrl,
                location: normalizedCompany.location,
                funding_stage: normalizedCompany.fundingStage,
                funding_total: normalizedCompany.fundingTotal,
                last_funding_date: normalizedCompany.lastFundingDate,
                last_funding_total: normalizedCompany.lastFundingTotal,
                headcount: normalizedCompany.headcount,
                headcount_growth_30d: normalizedCompany.headcountGrowth30d,
                headcount_growth_90d: normalizedCompany.headcountGrowth90d,
                tags: normalizedCompany.tags,
                founders: normalizedCompany.founders,
                raw_payload: normalizedCompany.rawPayload,
                fetched_at: normalizedCompany.fetchedAt,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: "user_id,harmonic_company_id",
              })
              .select("*")
              .single();
            companyCacheRow = (data as Record<string, unknown> | null) ?? null;
          }
        } catch (error) {
          console.error("Failed to cache Harmonic company:", error);
        }
      }
    }

    const normalizedLinkedInUrl = normalizedPerson.linkedinUrl || linkedinUrl;
    const externalProfilePayload = {
      person_id: body.personId,
      provider: "harmonic",
      platform: "harmonic",
      profile_type: "linkedin",
      profile_url: normalizedLinkedInUrl,
      profile_data: {
        harmonicPersonId: normalizedPerson.harmonicPersonId,
        fullName: normalizedPerson.fullName,
        linkedinUrl: normalizedLinkedInUrl,
        currentRole: normalizedPerson.currentRole,
        currentCompany: normalizedPerson.currentCompany,
        location: normalizedPerson.location,
        bio: normalizedPerson.bio,
        education: normalizedPerson.education,
        experience: normalizedPerson.experience,
        skills: normalizedPerson.skills,
        socialLinks: normalizedPerson.socialLinks,
        rawPayload: normalizedPerson.rawPayload,
      },
      fetched_at: new Date().toISOString(),
    };

    const { data: existingProfile } = await serviceClient
      .from("aifund_external_profiles")
      .select("*")
      .eq("person_id", body.personId)
      .eq("platform", "harmonic")
      .eq("profile_url", normalizedLinkedInUrl)
      .limit(1)
      .maybeSingle();

    const profileMutation = existingProfile
      ? serviceClient
        .from("aifund_external_profiles")
        .update(externalProfilePayload)
        .eq("id", existingProfile.id)
      : serviceClient
        .from("aifund_external_profiles")
        .insert(externalProfilePayload);

    const { data: externalProfile, error: profileError } = await profileMutation
      .select("*")
      .single();

    if (profileError) {
      throw profileError;
    }

    return json({
      person: updatedPerson,
      externalProfile,
      companyCacheRow,
    });
  } catch (error) {
    console.error("harmonic-person failed:", error);
    console.error("harmonic-person error type:", typeof error);
    console.error("harmonic-person error JSON:", JSON.stringify(error));
    const message = error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as Record<string, unknown>).message)
        : typeof error === "string"
          ? error
          : JSON.stringify(error);
    const status = message === "Unauthorized" ? 401 : message === "Person not found" ? 404 : 500;
    const code = message === "Unauthorized"
      ? "unauthorized"
      : message === "Person not found"
        ? "person_not_found"
        : message.includes("HARMONIC_API_KEY")
          ? "missing_harmonic_configuration"
          : "harmonic_person_failed";
    return errorJson(message, code, status);
  }
});
