import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

interface EngineerProfile {
  name: string;
  title: string;
  linkedin_url: string | null;
  github_url: string | null;
  notable_work: string;
  company: string;
}

interface FindAllTaskResult {
  name?: string;
  title?: string;
  linkedin_url?: string;
  github_url?: string;
  notable_work?: string;
}

interface FindAllTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: FindAllTaskResult[];
  error?: string;
}

const PARALLEL_FINDALL_URL = 'https://api.parallel.ai/v1beta/findall';
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 24;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { company, role, max_results } = await req.json();

    if (!company || typeof company !== 'string') {
      return new Response(
        JSON.stringify({ error: 'company is required and must be a string' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    if (!role || typeof role !== 'string') {
      return new Response(
        JSON.stringify({ error: 'role is required and must be a string' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const parallelApiKey = Deno.env.get('PARALLEL_API_KEY');
    if (!parallelApiKey) {
      return new Response(
        JSON.stringify({ error: 'PARALLEL_API_KEY is not configured' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const maxResults = max_results || 20;

    const requestHeaders = {
      'x-api-key': parallelApiKey,
      'Content-Type': 'application/json',
    };

    // Step 1: Create the FindAll task
    const createResponse = await fetch(PARALLEL_FINDALL_URL, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        objective: `Find engineers at ${company} who work on ${role}-related projects`,
        max_results: maxResults,
        output_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            title: { type: 'string' },
            linkedin_url: { type: 'string' },
            github_url: { type: 'string' },
            notable_work: { type: 'string' },
          },
        },
      }),
    });

    if (!createResponse.ok) {
      const errorBody = await createResponse.text();
      return new Response(
        JSON.stringify({ error: `Failed to create FindAll task: ${createResponse.status} ${errorBody}` }),
        { status: 502, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const task: FindAllTask = await createResponse.json();
    const taskId = task.id;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'No task ID returned from Parallel API' }),
        { status: 502, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Poll until complete or max attempts reached
    let attempts = 0;
    let completedTask: FindAllTask | null = null;

    while (attempts < MAX_POLL_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      attempts++;

      const pollResponse = await fetch(`${PARALLEL_FINDALL_URL}/${taskId}`, {
        method: 'GET',
        headers: requestHeaders,
      });

      if (!pollResponse.ok) {
        const errorBody = await pollResponse.text();
        return new Response(
          JSON.stringify({ error: `Failed to poll FindAll task: ${pollResponse.status} ${errorBody}` }),
          { status: 502, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const polledTask: FindAllTask = await pollResponse.json();

      if (polledTask.status === 'failed') {
        return new Response(
          JSON.stringify({ error: `FindAll task failed: ${polledTask.error || 'Unknown error'}` }),
          { status: 502, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      if (polledTask.status === 'completed') {
        completedTask = polledTask;
        break;
      }
    }

    if (!completedTask) {
      return new Response(
        JSON.stringify({ error: `FindAll task timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s` }),
        { status: 504, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Map results to EngineerProfile[]
    const rawResults: FindAllTaskResult[] = completedTask.results || [];
    const engineers: EngineerProfile[] = rawResults.map((result) => ({
      name: result.name || '',
      title: result.title || '',
      linkedin_url: result.linkedin_url || null,
      github_url: result.github_url || null,
      notable_work: result.notable_work || '',
      company,
    }));

    return new Response(
      JSON.stringify({ engineers }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
