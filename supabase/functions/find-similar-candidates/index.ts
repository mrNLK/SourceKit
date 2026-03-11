import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

interface SimilarCandidate {
  title: string;
  url: string;
  score: number;
  highlights: string[];
  github_username: string | null;
}

function extractGithubUsername(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === 'github.com' ||
      parsed.hostname === 'www.github.com'
    ) {
      // pathname is like /username or /username/repo
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 1) {
        return parts[0];
      }
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await req.json();
    const { github_url, num_results } = body as {
      github_url: string;
      num_results?: number;
    };

    if (!github_url) {
      return new Response(
        JSON.stringify({ error: 'github_url is required' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    const exaApiKey = Deno.env.get('EXA_API_KEY');
    if (!exaApiKey) {
      return new Response(
        JSON.stringify({ error: 'EXA_API_KEY environment variable is not set' }),
        {
          status: 500,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    const exaResponse = await fetch('https://api.exa.ai/findSimilar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': exaApiKey,
      },
      body: JSON.stringify({
        url: github_url,
        numResults: num_results || 10,
        contents: { text: true, highlights: true },
      }),
    });

    if (!exaResponse.ok) {
      const errorText = await exaResponse.text();
      return new Response(
        JSON.stringify({
          error: 'Exa API request failed',
          details: errorText,
        }),
        {
          status: exaResponse.status,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    const exaData = await exaResponse.json();
    const rawResults: Record<string, unknown>[] = exaData.results || [];

    const results: SimilarCandidate[] = rawResults.map((result) => {
      const url = (result.url as string) || '';
      const highlightsRaw = result.highlights;
      const highlights: string[] = Array.isArray(highlightsRaw)
        ? (highlightsRaw as unknown[]).map((h) =>
            typeof h === 'string' ? h : String(h)
          )
        : [];

      return {
        title: (result.title as string) || '',
        url,
        score: typeof result.score === 'number' ? result.score : 0,
        highlights,
        github_username: extractGithubUsername(url),
      };
    });

    return new Response(
      JSON.stringify({ results }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});
