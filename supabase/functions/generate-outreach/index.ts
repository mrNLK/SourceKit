import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { anthropicCall } from "../_shared/anthropic.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/auth.ts';
import { getUserIdFromAuth } from '../_shared/gate.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authErr = requireAuth(req, corsHeaders);
  if (authErr) return authErr;

  try {
    await requireAuth(req);

    const userId = await getUserIdFromAuth(req);
    if (userId) {
      const rl = checkRateLimit(userId, 'generate-outreach', 5);
      const rlRes = rateLimitResponse(rl, corsHeaders);
      if (rlRes) return rlRes;
    }

    const { candidate_name, github_username, role_context } = await req.json();

    if (!github_username) {
      return new Response(JSON.stringify({ error: 'Missing github_username' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert technical recruiter writing a personalized outreach message. Write a concise, warm, and professional message (3-5 sentences) to reach out to a software engineer. The tone should be friendly but not overly casual. Reference their GitHub work specifically. Do NOT use subject lines or greetings like "Hi [Name]" — just the message body. Do NOT use placeholder brackets.`;

    const userPrompt = `Write an outreach message for ${candidate_name || github_username} (GitHub: ${github_username}).${role_context ? ` Context: ${role_context}` : ''} Keep it short and genuine.`;

    const message = await anthropicCall(systemPrompt, userPrompt, {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 1024,
    });

    return new Response(JSON.stringify({ message: message || 'Could not generate message.' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const authResp = authErrorResponse(e, getCorsHeaders(req));
    if (authResp) return authResp;
    console.error('generate-outreach error:', e);
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
