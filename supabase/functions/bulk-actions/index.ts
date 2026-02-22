import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, candidates, messages } = await req.json();

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    let systemPrompt = "You are an expert technical recruiter AI assistant. You help analyze candidate data and provide actionable recruiting insights. Use markdown formatting for readability.";
    let userPrompt = "";

    const candidateSummaries = (candidates || []).map((c: any) =>
      `- ${c.name || c.github_username} (@${c.github_username}): Score ${c.score || 'N/A'}, Stage: ${c.stage || 'N/A'}, Location: ${c.location || 'N/A'}, Languages: ${(c.top_languages || []).map((l: any) => l.name || l).join(', ') || 'N/A'}, Repos: ${c.public_repos || 0}, Stars: ${c.stars || 0}, Followers: ${c.followers || 0}, Bio: ${(c.bio || c.about || 'N/A').slice(0, 100)}`
    ).join('\n');

    switch (action) {
      case 'refine':
        userPrompt = `Analyze these candidates and recommend which to prioritize for outreach. Rank by fit and explain why.\n\nCandidates:\n${candidateSummaries}`;
        break;
      case 'outreach':
        systemPrompt = "You are an expert technical recruiter writing personalized outreach messages. Write concise, warm, professional messages (3-5 sentences each). Reference their GitHub work specifically. No subject lines or greetings. No placeholder brackets.";
        userPrompt = `Write a personalized outreach message for each of these candidates:\n\n${candidateSummaries}`;
        break;
      case 'insights':
        userPrompt = `Analyze this full candidate list and provide: average score, score distribution summary, most common skills/languages, any gaps or patterns you notice, and recommendations.\n\nCandidates:\n${candidateSummaries}`;
        break;
      case 'brief':
        userPrompt = `For each candidate below, generate a 2-sentence brief: the first sentence about their strongest signal, the second about their biggest risk or gap.\n\nCandidates:\n${candidateSummaries}`;
        break;
      case 'compare':
        userPrompt = `Compare these candidates side-by-side in a markdown table covering: experience signals, key skills, score, stars, followers, pros, and cons.\n\nCandidates:\n${candidateSummaries}`;
        break;
      case 'chat':
        // Free-form chat with candidate context
        const lastMessage = messages?.[messages.length - 1]?.content || '';
        userPrompt = `Context — selected candidates:\n${candidateSummaries}\n\nUser question: ${lastMessage}`;
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await res.text();
      console.error('AI gateway error:', res.status, errText);
      throw new Error(`AI gateway error: ${res.status}`);
    }

    return new Response(res.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('bulk-actions error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
