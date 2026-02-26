import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { anthropicCall, anthropicToolCall } from "../_shared/anthropic.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, job_title, company_name, job_description } = await req.json();

    if (action !== 'start') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Either job_description OR (job_title + company_name) must be provided
    const hasJD = job_description && typeof job_description === 'string' && job_description.trim().length > 50;
    const hasManual = job_title && company_name;

    if (!hasJD && !hasManual) {
      return new Response(JSON.stringify({ error: 'Provide either job_description text, or both job_title and company_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a world-class technical recruiting strategist. Your job is to build a comprehensive sourcing strategy for a specific role at a specific company.

Think like a senior recruiter who:
- Knows exactly which GitHub repos attract the best talent for this role
- Knows which companies to poach from (direct competitors AND adjacent companies with transferable talent)
- Understands the EEA (Evidence of Exceptional Ability) signals that indicate exceptional candidates
- Can build targeted, high-signal search queries

Be extremely specific with real company names, real GitHub repo names, and actionable intelligence. No generic advice.`;

    let userPrompt: string;

    if (hasJD) {
      userPrompt = `Analyze this job description and build a complete sourcing strategy to find ideal candidates for this role.

<job_description>
${job_description.trim().substring(0, 12000)}
</job_description>

Based on the job description above, I need:
1. A natural language search query optimized for a GitHub-based talent search tool — should capture the ideal candidate profile
2. 8-10 specific GitHub repositories whose contributors would be strong candidates (real repos, owner/name format)
3. 6-8 companies to poach from — direct competitors AND adjacent companies with transferable skills
4. Key technical skills extracted from the JD (the must-haves and nice-to-haves)
5. EEA signals specific to this role — what would make someone exceptional vs. just qualified
6. A brief overview of the role and why someone would want it (based on the JD but written as a compelling pitch)`;
    } else {
      userPrompt = `Build a complete sourcing strategy for: "${job_title}" at "${company_name}"

I need:
1. A natural language search query optimized for a GitHub-based talent search tool
2. 8-10 specific GitHub repositories whose contributors would be strong candidates
3. 6-8 companies to poach from — direct competitors AND adjacent companies with transferable skills
4. Key technical skills (the must-haves and nice-to-haves)
5. EEA signals specific to this role — what would make someone exceptional vs. just qualified
6. A brief overview of the role and why someone would want it`;
    }

    const tools = [{
      name: "build_search_strategy",
      description: "Build a structured search strategy for sourcing candidates",
      input_schema: {
        type: "object",
        properties: {
          search_query: {
            type: "string",
            description: "A detailed, natural language search query optimized for a GitHub-based talent search tool. Should be 2-4 sentences covering the ideal candidate profile, key skills, and what makes them stand out. DO NOT use boolean operators — write it like you're describing your dream candidate to a smart recruiter."
          },
          target_repos: {
            type: "array",
            description: "8-10 specific GitHub repositories (owner/name format) whose contributors would be strong candidates. Include a mix of: the company's own repos, competitor repos, key open-source projects in the domain, and foundational tools. Each with a brief reason.",
            items: {
              type: "object",
              properties: {
                repo: { type: "string", description: "GitHub repo in owner/name format (e.g. 'vercel/next.js')" },
                reason: { type: "string", description: "Why contributors to this repo would be good candidates (1 sentence)" }
              },
              required: ["repo", "reason"]
            }
          },
          poach_companies: {
            type: "array",
            description: "6-8 companies to source from. Mix of direct competitors, adjacent companies with transferable talent, and companies known for strong engineering in this domain.",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Company name" },
                reason: { type: "string", description: "Why people from this company would be good fits (1 sentence)" },
                category: { type: "string", enum: ["direct_competitor", "adjacent", "talent_hub"], description: "Relationship to the target company" }
              },
              required: ["name", "reason", "category"]
            }
          },
          skills: {
            type: "object",
            description: "Technical skills breakdown",
            properties: {
              must_have: {
                type: "array",
                items: { type: "string" },
                description: "5-8 must-have skills/technologies"
              },
              nice_to_have: {
                type: "array",
                items: { type: "string" },
                description: "4-6 nice-to-have skills/technologies"
              }
            },
            required: ["must_have", "nice_to_have"]
          },
          eea_signals: {
            type: "array",
            description: "5-8 specific Evidence of Exceptional Ability signals for this role. What would make someone clearly exceptional? Think: contributions, leadership, publications, community impact, technical depth.",
            items: {
              type: "object",
              properties: {
                signal: { type: "string", description: "The EEA signal (e.g. 'Maintains a 1000+ star Kubernetes operator')" },
                strength: { type: "string", enum: ["strong", "moderate"], description: "How strong of a signal this is" },
                criterion: { type: "string", description: "Which EEA criterion this maps to (e.g. 'Original Contributions', 'Critical Role', 'Published Material')" }
              },
              required: ["signal", "strength", "criterion"]
            }
          },
          role_overview: {
            type: "string",
            description: "2-3 paragraph overview of the role, what the team works on, why it's exciting, and the kind of impact this person would have. Write it like a compelling pitch to a passive candidate."
          }
        },
        required: ["search_query", "target_repos", "poach_companies", "skills", "eea_signals", "role_overview"]
      }
    }];

    const result = await anthropicToolCall(
      systemPrompt,
      userPrompt,
      tools,
      { type: "tool", name: "build_search_strategy" },
      { maxTokens: 4096 }
    );

    if (!result) {
      throw new Error("AI failed to generate search strategy");
    }

    const strategy = result.toolInput;

    return new Response(JSON.stringify({
      strategy,
      job_title: job_title || '',
      company_name: company_name || '',
      source: hasJD ? 'job_description' : 'manual',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('research-role error:', e);
    if ((e as Error).message === 'RATE_LIMITED') {
      return new Response(JSON.stringify({ error: 'Rate limited. Please try again in a moment.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
