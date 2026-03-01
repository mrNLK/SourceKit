import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { anthropicToolCall } from "../_shared/anthropic.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const { username, name, location, bio } = await req.json();

    if (!username) {
      return new Response(JSON.stringify({ error: 'username is required' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Check for cached enrichment (within 30 days, confidence >= medium)
    const supabaseCheck = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: cached } = await supabaseCheck
      .from('candidates')
      .select('linkedin_url, linkedin_confidence, linkedin_fetched_at')
      .eq('github_username', username)
      .single();

    if (cached?.linkedin_url && cached?.linkedin_fetched_at) {
      const fetchedAt = new Date(cached.linkedin_fetched_at).getTime();
      const thirtyDaysAgo = Date.now() - 30 * 86400000;
      const confidence = cached.linkedin_confidence || 'low';
      if (fetchedAt > thirtyDaysAgo && (confidence === 'high' || confidence === 'medium')) {
        console.log(`Returning cached LinkedIn for ${username} (${confidence}, ${cached.linkedin_url})`);
        return new Response(JSON.stringify({
          linkedin_url: cached.linkedin_url,
          confidence,
          reasoning: 'Cached result',
          cached: true,
        }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
    }

    const EXA_API_KEY = Deno.env.get('EXA_API_KEY');
    if (!EXA_API_KEY) {
      return new Response(JSON.stringify({ error: 'EXA_API_KEY not configured' }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Search Exa for LinkedIn profile
    const searchQuery = `${name || username} ${location || ''} LinkedIn profile software engineer`;
    const exaRes = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': EXA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        numResults: 5,
        includeDomains: ['linkedin.com'],
        type: 'neural',
      }),
    });

    if (!exaRes.ok) {
      console.error('Exa API error:', exaRes.status, await exaRes.text());
      return new Response(JSON.stringify({ error: 'LinkedIn search failed' }), {
        status: 502,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const exaData = await exaRes.json();
    const results = exaData.results || [];

    if (results.length === 0) {
      return new Response(JSON.stringify({ linkedin_url: null, confidence: 'low', reasoning: 'No LinkedIn profiles found' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Use AI to match the best LinkedIn profile
    let result = { linkedin_url: results[0]?.url || null, confidence: 'low', reasoning: 'AI matching failed' };

    try {
      const toolResult = await anthropicToolCall(
        'You are a recruiter matching GitHub developers to LinkedIn profiles. Return JSON only.',
        `GitHub Developer: ${name || username}, Username: ${username}, Location: ${location || 'unknown'}, Bio: ${bio || 'none'}\n\nLinkedIn search results:\n${results.map((r: any, i: number) => `${i + 1}. ${r.title} - ${r.url}`).join('\n')}\n\nIdentify the correct LinkedIn profile.`,
        [{
          name: "match_linkedin",
          description: "Match a LinkedIn profile to a GitHub developer",
          input_schema: {
            type: "object",
            properties: {
              linkedin_url: { anyOf: [{ type: "string" }, { type: "null" }] },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              reasoning: { type: "string" },
            },
            required: ["linkedin_url", "confidence", "reasoning"],
          },
        }],
        { type: "tool", name: "match_linkedin" }
      );

      if (toolResult) {
        result = toolResult.toolInput as typeof result;
      }
    } catch (e) {
      console.error('AI matching error:', e);
      // Fall back to best guess without AI
      const bestResult = results.find((r: any) => r.url?.includes('linkedin.com/in/')) || results[0];
      result = { linkedin_url: bestResult?.url || null, confidence: 'low', reasoning: 'No AI matching available' };
    }

    // Update candidate in DB (include fetched_at for dedup/cooldown)
    if (result.linkedin_url) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await supabase.from('candidates').update({
        linkedin_url: result.linkedin_url,
        linkedin_confidence: result.confidence,
        linkedin_fetched_at: new Date().toISOString(),
      }).eq('github_username', username);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in enrich-linkedin:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
