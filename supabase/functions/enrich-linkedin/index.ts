import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, name, location, bio } = await req.json();

    if (!username) {
      return new Response(JSON.stringify({ error: 'username is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const EXA_API_KEY = Deno.env.get('EXA_API_KEY');
    if (!EXA_API_KEY) {
      return new Response(JSON.stringify({ error: 'EXA_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const exaData = await exaRes.json();
    const results = exaData.results || [];

    if (results.length === 0) {
      return new Response(JSON.stringify({ linkedin_url: null, confidence: 'low', reasoning: 'No LinkedIn profiles found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to match the best LinkedIn profile
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      // Return best guess without AI
      const bestResult = results.find((r: any) => r.url?.includes('linkedin.com/in/')) || results[0];
      return new Response(JSON.stringify({ linkedin_url: bestResult?.url || null, confidence: 'low', reasoning: 'No AI matching available' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a recruiter matching GitHub developers to LinkedIn profiles. Return JSON only.' },
          { role: 'user', content: `GitHub Developer: ${name || username}, Username: ${username}, Location: ${location || 'unknown'}, Bio: ${bio || 'none'}\n\nLinkedIn search results:\n${results.map((r: any, i: number) => `${i + 1}. ${r.title} - ${r.url}`).join('\n')}\n\nIdentify the correct LinkedIn profile. Return JSON: { "linkedin_url": string | null, "confidence": "high" | "medium" | "low", "reasoning": string }` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "match_linkedin",
            description: "Match a LinkedIn profile to a GitHub developer",
            parameters: {
              type: "object",
              properties: {
                linkedin_url: { type: ["string", "null"] },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
                reasoning: { type: "string" }
              },
              required: ["linkedin_url", "confidence", "reasoning"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "match_linkedin" } }
      }),
    });

    let result = { linkedin_url: results[0]?.url || null, confidence: 'low', reasoning: 'AI matching failed' };

    if (res.ok) {
      const data = await res.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        result = JSON.parse(toolCall.function.arguments);
      }
    }

    // Update candidate in DB
    if (result.linkedin_url) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await supabase.from('candidates').update({
        linkedin_url: result.linkedin_url,
        linkedin_confidence: result.confidence,
      }).eq('github_username', username);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in enrich-linkedin:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
