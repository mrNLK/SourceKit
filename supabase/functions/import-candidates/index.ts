import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

const WEBSETS_BASE = 'https://api.exa.ai/websets/v0';

interface Candidate {
  name: string;
  url: string;
  metadata?: Record<string, string>;
}

interface ImportRequest {
  candidates: Candidate[];
  webset_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const apiKey = Deno.env.get('EXA_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'EXA_API_KEY not configured on server' }),
        {
          status: 500,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    let body: ImportRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    const { candidates, webset_id } = body;

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'candidates must be a non-empty array' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    for (const candidate of candidates) {
      if (!candidate.name || typeof candidate.name !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Each candidate must have a valid name string' }),
          {
            status: 400,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          }
        );
      }
      if (!candidate.url || typeof candidate.url !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Each candidate must have a valid url string' }),
          {
            status: 400,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const exaHeaders: Record<string, string> = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    };

    // Resolve or create the target webset
    let resolvedWebsetId: string;

    if (webset_id) {
      resolvedWebsetId = webset_id;
    } else {
      // Create a new webset with a placeholder search (count: 0 so no search runs)
      const createRes = await fetch(`${WEBSETS_BASE}/websets`, {
        method: 'POST',
        headers: exaHeaders,
        body: JSON.stringify({
          search: {
            query: 'imported candidates',
            count: 0,
          },
        }),
      });

      if (!createRes.ok) {
        const errBody = await createRes.text();
        return new Response(
          JSON.stringify({
            error: 'Failed to create webset',
            details: errBody,
          }),
          {
            status: createRes.status,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          }
        );
      }

      const createdWebset = await createRes.json();
      resolvedWebsetId = createdWebset.id;

      if (!resolvedWebsetId) {
        return new Response(
          JSON.stringify({ error: 'Webset creation response did not include an id' }),
          {
            status: 502,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Submit the import request
    const importRes = await fetch(
      `${WEBSETS_BASE}/websets/${resolvedWebsetId}/imports`,
      {
        method: 'POST',
        headers: exaHeaders,
        body: JSON.stringify({
          urls: candidates.map((c) => c.url),
        }),
      }
    );

    if (!importRes.ok) {
      const errBody = await importRes.text();
      return new Response(
        JSON.stringify({
          error: 'Failed to import candidates into webset',
          details: errBody,
        }),
        {
          status: importRes.status,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    const importData = await importRes.json();

    return new Response(
      JSON.stringify({
        webset_id: resolvedWebsetId,
        import_id: importData.id,
        items_submitted: candidates.length,
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});
