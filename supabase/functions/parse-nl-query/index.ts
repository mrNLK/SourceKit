import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { anthropicCall } from "../_shared/anthropic.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, getUserIdFromAuth } from '../_shared/gate.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authErr = requireAuth(req, corsHeaders);
  if (authErr) return authErr;

  try {
    const userId = await getUserIdFromAuth(req);
    if (userId) {
      const rl = checkRateLimit(userId, 'parse-nl-query', 10);
      const rlRes = rateLimitResponse(rl, corsHeaders);
      if (rlRes) return rlRes;
    }
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'query parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a search query parser for a developer recruiting tool. Given a natural language description of a developer candidate, extract structured parameters.

Return ONLY valid JSON with these fields (omit any that aren't mentioned):
{
  "role": "string - the job title or role",
  "skills": ["string array - programming languages, frameworks, tools"],
  "location": "string - city, state, or country",
  "seniority": "junior | mid | senior | staff | principal",
  "companies": ["string array - target companies"],
  "qualifications": ["string array - other requirements"],
  "github_query": "string - best GitHub search query to find this person"
}

Examples:
- "Senior React developer in NYC" -> {"role":"Frontend Developer","skills":["React"],"location":"New York","seniority":"senior","github_query":"react developer location:new york"}
- "ML engineer with PyTorch experience" -> {"role":"ML Engineer","skills":["PyTorch","Python","machine learning"],"github_query":"pytorch machine learning"}`;

    const result = await anthropicCall(
      systemPrompt,
      `Parse this search query into structured parameters:\n\n"${query}"`,
      { maxTokens: 500 }
    );

    // Parse the JSON from Claude's response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse query', raw: result }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ parsed, original: query }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('parse-nl-query error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Failed to parse query' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
