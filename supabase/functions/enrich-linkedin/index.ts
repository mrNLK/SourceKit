import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { anthropicToolCall } from "../_shared/anthropic.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { assessMatch, minConfidence, isShowable, slugName, nameSimilarity, looksLikeRealName, type Confidence } from '../_shared/linkedin-match.ts';
import { requireAuth, authErrorResponse } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    await requireAuth(req, { usage: 'enrich' });

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
      .select('linkedin_url, linkedin_confidence, linkedin_fetched_at, name, company, location')
      .eq('github_username', username)
      .single();

    if (cached?.linkedin_url && cached?.linkedin_fetched_at) {
      const fetchedAt = new Date(cached.linkedin_fetched_at).getTime();
      const thirtyDaysAgo = Date.now() - 30 * 86400000;
      const confidence = cached.linkedin_confidence || 'low';
      // Re-check cached URLs: a cached profile whose slug names a different person is discarded.
      const cachedName = name || cached.name;
      const slug = slugName(cached.linkedin_url);
      const slugConflict = looksLikeRealName(cachedName, username) && slug.split(' ').length >= 2 && nameSimilarity(cachedName, slug) === 0;
      if (fetchedAt > thirtyDaysAgo && (confidence === 'high' || confidence === 'medium') && !slugConflict) {
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
    const company: string = (cached?.company || '').replace(/^@/, '');
    const gh = { username, name: name || cached?.name || null, company, location: location || cached?.location || null };
    const searchQuery = `${gh.name || username} ${company} ${location || ''} LinkedIn profile software engineer`.replace(/\s+/g, ' ');
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
        contents: { text: { maxCharacters: 1200 } },
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
        `GitHub Developer: ${gh.name || username}, Username: ${username}, Company: ${company || 'unknown'}, Location: ${location || 'unknown'}, Bio: ${bio || 'none'}\n\nLinkedIn search results:\n${results.map((r: any, i: number) => `${i + 1}. ${r.title} - ${r.url}\n   ${String(r.text || '').slice(0, 300).replace(/\s+/g, ' ')}`).join('\n')}\n\nIdentify the correct LinkedIn profile. The name must be the same person (similar-looking surnames like Zou vs Zhou are different people). Return null unless the name matches and there is corroboration (company, GitHub handle, location).`,
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
      const best = results
        .map((r: any) => ({ r, a: assessMatch({ url: r.url, title: r.title, text: r.text }, gh) }))
        .sort((x: any, y: any) => y.a.score - x.a.score)[0];
      result = best ? { linkedin_url: best.r.url, confidence: best.a.confidence, reasoning: 'Rule-based match' } : { linkedin_url: bestResult?.url || null, confidence: 'low', reasoning: 'No AI matching available' };
    }

    // Deterministic guardrail: confidence can never exceed what name/company/handle evidence supports.
    if (result.linkedin_url) {
      const hit = results.find((r: any) => r.url === result.linkedin_url) || { url: result.linkedin_url };
      const assessed = assessMatch({ url: hit.url, title: hit.title, text: hit.text }, gh);
      const finalConfidence = minConfidence((result.confidence as Confidence) || 'low', assessed.confidence);
      console.log(`LinkedIn match ${username} -> ${result.linkedin_url}: ai=${result.confidence} rules=${assessed.confidence} [${assessed.signals.join(', ')}]`);
      result = {
        linkedin_url: isShowable(finalConfidence) ? result.linkedin_url : null,
        confidence: finalConfidence,
        reasoning: isShowable(finalConfidence) ? `${result.reasoning} (${assessed.signals.join(', ')})` : `Low-confidence match hidden (${assessed.signals.join(', ') || 'no corroboration'})`,
      };
    }

    // Update candidate in DB (include fetched_at for dedup/cooldown). Low-confidence matches are cleared, not stored.
    {
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
    const authResp = authErrorResponse(error, getCorsHeaders(req));
    if (authResp) return authResp;
    console.error('Error in enrich-linkedin:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
