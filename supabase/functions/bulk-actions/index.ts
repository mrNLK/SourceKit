import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { anthropicStream } from "../_shared/anthropic.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const { action, candidates, messages } = await req.json();

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
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }

    const stream = await anthropicStream(systemPrompt, userPrompt, {
      maxTokens: 4096,
    });

    return new Response(stream, {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('bulk-actions error:', e);
    if ((e as Error).message === 'RATE_LIMITED') {
      return new Response(JSON.stringify({ error: 'Rate limited. Try again shortly.' }), {
        status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
