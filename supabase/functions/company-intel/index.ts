import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanyIntel {
  company: string;
  estimated_eng_headcount: number | null;
  tech_stack_signals: string[];
  recent_hiring_signal: string;
  attrition_signal: string;
  why_source_from: string;
  linkedin_search_url: string;
}

interface ParallelTaskCreateResponse {
  id: string;
  status: string;
}

interface ParallelTaskPollResponse {
  id: string;
  status: string; // "pending" | "running" | "completed" | "failed"
  output?: {
    estimated_eng_headcount?: number | null;
    tech_stack_signals?: string[];
    recent_hiring_signal?: string;
    attrition_signal?: string;
    why_source_from?: string;
    linkedin_search_url?: string;
  };
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARALLEL_API_BASE = 'https://api.parallel.ai/v1beta';
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 20; // 80s max per task

// ---------------------------------------------------------------------------
// Build the research prompt for a single company
// ---------------------------------------------------------------------------

function buildCompanyPrompt(company: string, role: string): string {
  return `You are a technical recruiting intelligence analyst. Research the company "${company}" to provide sourcing intelligence for recruiting engineers for the role: "${role}".

Use live web data — search LinkedIn, company engineering blogs, Glassdoor, Blind, Layoffs.fyi, Crunchbase, and any available public signals. Be specific and factual.

Provide the following structured intelligence:

1. estimated_eng_headcount: Estimate the current total engineering headcount (engineers, data scientists, ML engineers, infra/DevOps). Return a number. If truly unknowable, return null.

2. tech_stack_signals: List 5–10 technologies, frameworks, or tools this company is known to use. Pull from job postings, engineering blogs, GitHub repos, and StackShare. Return as an array of strings (e.g. ["TypeScript", "Kubernetes", "Kafka"]).

3. recent_hiring_signal: Describe in 1–2 sentences any recent hiring patterns — is the company growing engineering headcount? Have they posted many open roles recently? Did they go through a hiring freeze or layoff and are now backfilling? Be specific with timing if possible.

4. attrition_signal: Describe in 1–2 sentences any signs of attrition, churn, or dissatisfaction — Glassdoor trends, Blind posts, layoffs, leadership departures, or slow promotion cycles that might make engineers open to leaving.

5. why_source_from: Write 2–3 sentences explaining why engineers from "${company}" would be particularly strong candidates for the "${role}" role. What skills or experiences do they gain there that transfer well?

6. linkedin_search_url: Construct a LinkedIn People search URL pre-filtered to engineers currently at "${company}". Format: https://www.linkedin.com/search/results/people/?keywords=engineer&currentCompany=["<COMPANY_ID_OR_NAME>"]&origin=FACETED_SEARCH — use the actual company name encoded in the URL. If you cannot determine the exact LinkedIn company ID, use the name-based filter format: https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(role)}&currentCompany=${encodeURIComponent(company)}&origin=FACETED_SEARCH

Return ONLY valid JSON matching this exact schema:
{
  "estimated_eng_headcount": <number or null>,
  "tech_stack_signals": ["string", ...],
  "recent_hiring_signal": "string",
  "attrition_signal": "string",
  "why_source_from": "string",
  "linkedin_search_url": "string"
}`;
}

// ---------------------------------------------------------------------------
// Create a Parallel task for one company
// ---------------------------------------------------------------------------

async function createParallelTask(
  company: string,
  role: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(`${PARALLEL_API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: 'extract',
      prompt: buildCompanyPrompt(company, role),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Parallel API task creation failed for "${company}": ${res.status} ${errText}`);
  }

  const data: ParallelTaskCreateResponse = await res.json();

  if (!data.id) {
    throw new Error(`Parallel API returned no task ID for "${company}"`);
  }

  return data.id;
}

// ---------------------------------------------------------------------------
// Poll a single Parallel task until completed, failed, or timeout
// ---------------------------------------------------------------------------

async function pollParallelTask(
  taskId: string,
  apiKey: string,
): Promise<ParallelTaskPollResponse['output'] | null> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${PARALLEL_API_BASE}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      console.error(`Parallel poll failed for task ${taskId}: ${res.status}`);
      continue;
    }

    const data: ParallelTaskPollResponse = await res.json();

    if (data.status === 'completed') {
      return data.output ?? null;
    }

    if (data.status === 'failed') {
      console.error(`Parallel task ${taskId} failed:`, data.error);
      return null;
    }

    // status === "pending" | "running" — keep polling
  }

  console.error(`Parallel task ${taskId} timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
  return null;
}

// ---------------------------------------------------------------------------
// Research one company end-to-end: create task, poll, parse result
// ---------------------------------------------------------------------------

async function researchCompany(
  company: string,
  role: string,
  apiKey: string,
): Promise<CompanyIntel> {
  const defaultResult: CompanyIntel = {
    company,
    estimated_eng_headcount: null,
    tech_stack_signals: [],
    recent_hiring_signal: '',
    attrition_signal: '',
    why_source_from: '',
    linkedin_search_url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(role)}&currentCompany=${encodeURIComponent(company)}&origin=FACETED_SEARCH`,
  };

  try {
    const taskId = await createParallelTask(company, role, apiKey);
    console.log(`Created Parallel task ${taskId} for company: ${company}`);

    const output = await pollParallelTask(taskId, apiKey);

    if (!output) {
      console.warn(`No output for company "${company}", returning defaults`);
      return defaultResult;
    }

    return {
      company,
      estimated_eng_headcount: typeof output.estimated_eng_headcount === 'number'
        ? output.estimated_eng_headcount
        : null,
      tech_stack_signals: Array.isArray(output.tech_stack_signals)
        ? output.tech_stack_signals.filter((s): s is string => typeof s === 'string')
        : [],
      recent_hiring_signal: typeof output.recent_hiring_signal === 'string'
        ? output.recent_hiring_signal
        : '',
      attrition_signal: typeof output.attrition_signal === 'string'
        ? output.attrition_signal
        : '',
      why_source_from: typeof output.why_source_from === 'string'
        ? output.why_source_from
        : '',
      linkedin_search_url: typeof output.linkedin_search_url === 'string' && output.linkedin_search_url
        ? output.linkedin_search_url
        : defaultResult.linkedin_search_url,
    };
  } catch (err) {
    console.error(`Error researching company "${company}":`, err);
    return defaultResult;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const { companies, role } = await req.json();

    if (!Array.isArray(companies) || companies.length === 0) {
      return new Response(
        JSON.stringify({ error: 'companies must be a non-empty array of strings' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        },
      );
    }

    if (typeof role !== 'string' || !role.trim()) {
      return new Response(
        JSON.stringify({ error: 'role must be a non-empty string' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        },
      );
    }

    const apiKey = Deno.env.get('PARALLEL_API_KEY');
    if (!apiKey) {
      console.error('PARALLEL_API_KEY env var is not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing PARALLEL_API_KEY' }),
        {
          status: 500,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        },
      );
    }

    const validCompanies = companies
      .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      .map(c => c.trim());

    if (validCompanies.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid company names provided' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        },
      );
    }

    const trimmedRole = role.trim();

    // Fire all company research tasks in parallel
    const settled = await Promise.allSettled(
      validCompanies.map(company => researchCompany(company, trimmedRole, apiKey)),
    );

    const results: CompanyIntel[] = settled.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      // Rejected promises are handled inside researchCompany, but handle the
      // outer Promise.allSettled rejection case defensively as well.
      console.error(`Unexpected rejection for company "${validCompanies[idx]}":`, result.reason);
      return {
        company: validCompanies[idx],
        estimated_eng_headcount: null,
        tech_stack_signals: [],
        recent_hiring_signal: '',
        attrition_signal: '',
        why_source_from: '',
        linkedin_search_url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(trimmedRole)}&currentCompany=${encodeURIComponent(validCompanies[idx])}&origin=FACETED_SEARCH`,
      };
    });

    return new Response(
      JSON.stringify({ results }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  } catch (e) {
    console.error('company-intel error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  }
});
