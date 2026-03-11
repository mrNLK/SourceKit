import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { anthropicCall, anthropicToolCall } from "../_shared/anthropic.ts";
import { checkSearchGate, incrementSearchCount } from "../_shared/gate.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';

// ---------------------------------------------------------------------------
// Exa Research API helpers
// ---------------------------------------------------------------------------

async function exaResearch(
  instructions: string,
  outputSchema: Record<string, unknown>,
  model: string,
  apiKey: string,
): Promise<Record<string, unknown> | null> {
  // 1. Create the research task
  const createRes = await fetch('https://api.exa.ai/research/v1', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, instructions, outputSchema }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error(`Exa Research create failed: ${createRes.status} ${errText}`);
    return null;
  }

  const createData = await createRes.json();
  const researchId = createData.id || createData.researchId;
  if (!researchId) {
    console.error('Exa Research: no researchId in response', createData);
    return null;
  }

  // 2. Poll until completion (max 90s = 30 attempts x 3s)
  const MAX_POLL = 30;
  const POLL_INTERVAL = 3000;

  for (let i = 0; i < MAX_POLL; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    const pollRes = await fetch(`https://api.exa.ai/research/v1/${researchId}`, {
      headers: { 'x-api-key': apiKey },
    });

    if (!pollRes.ok) {
      console.error(`Exa Research poll failed: ${pollRes.status}`);
      continue;
    }

    const pollData = await pollRes.json();
    const status = pollData.status;

    if (status === 'completed') {
      return pollData.data || pollData.output || pollData.result || null;
    }
    if (status === 'failed') {
      console.error('Exa Research task failed:', pollData.error || pollData);
      return null;
    }
    // status === 'running' — keep polling
  }

  console.error('Exa Research timed out after 90s');
  return null;
}

// ---------------------------------------------------------------------------
// The strategy output schema — matches the existing build_search_strategy tool
// ---------------------------------------------------------------------------

const strategyOutputSchema = {
  type: "object",
  properties: {
    search_query: {
      type: "string",
      description: "A detailed, natural language search query optimized for a GitHub-based talent search tool. Should be 2-4 sentences covering the ideal candidate profile, key skills, and what makes them stand out. DO NOT use boolean operators — write it like you're describing your dream candidate to a smart recruiter."
    },
    target_repos: {
      type: "array",
      description: "8-10 specific GitHub repositories (owner/name format) whose contributors would be strong candidates.",
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
      description: "5-8 specific Evidence of Exceptional Ability signals for this role.",
      items: {
        type: "object",
        properties: {
          signal: { type: "string", description: "The EEA signal in plain language" },
          strength: { type: "string", enum: ["strong", "moderate"], description: "How strong of a signal this is" },
          criterion: { type: "string", description: "Which EEA criterion this maps to" },
          webset_criterion: { type: "string", description: "A precise search filter statement for Exa Websets." },
          enrichment_description: { type: "string", description: "An instruction for an AI enrichment agent to extract verifiable evidence." },
          enrichment_format: { type: "string", enum: ["text", "options"], description: "Format for the enrichment result." },
          enrichment_options: { type: "array", items: { type: "string" }, description: "Only when enrichment_format is 'options'." },
          verification_method: { type: "string", description: "How to verify this signal from public data." }
        },
        required: ["signal", "strength", "criterion", "webset_criterion", "enrichment_description", "enrichment_format", "verification_method"]
      }
    },
    role_overview: {
      type: "string",
      description: "2-3 paragraph overview of the role written as a compelling pitch."
    }
  },
  required: ["search_query", "target_repos", "poach_companies", "skills", "eea_signals", "role_overview"]
};

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Subscription gate check (requires authenticated user)
    const gate = await checkSearchGate(req.headers.get('Authorization'));
    if (!gate.allowed) {
      const isAuthError = gate.error === 'authentication_required' || gate.error === 'invalid_token';
      return new Response(JSON.stringify({
        error: gate.error,
        ...(isAuthError ? {} : { upgrade: true, searches_used: gate.searchesUsed, search_limit: gate.searchLimit }),
      }), {
        status: isAuthError ? 401 : 402,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (gate.userId) {
      const rl = checkRateLimit(gate.userId, 'research-role', 3);
      const rlRes = rateLimitResponse(rl, getCorsHeaders(req));
      if (rlRes) return rlRes;
    }

    const { action, job_title, company_name, job_description, research_model } = await req.json();

    if (action !== 'start') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Either job_description OR (job_title + company_name) must be provided
    const hasJD = job_description && typeof job_description === 'string' && job_description.trim().length > 50;
    const hasManual = job_title && company_name;

    if (!hasJD && !hasManual) {
      return new Response(JSON.stringify({ error: 'Provide either job_description text, or both job_title and company_name' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // -----------------------------------------------------------------------
    // Try Exa Research API first (if EXA_API_KEY is set)
    // -----------------------------------------------------------------------
    const exaApiKey = Deno.env.get('EXA_API_KEY');
    let strategy: Record<string, unknown> | null = null;
    let usedExa = false;

    if (exaApiKey) {
      try {
        // Build instructions string
        let instructions: string;
        if (hasJD) {
          instructions = `You are a technical recruiting strategist. Analyze this job description and build a sourcing strategy with real, verifiable data from the web. Search for the actual companies building in this space, real GitHub repositories where top engineers in this domain are active contributors (verify they exist and have meaningful activity), and EEA signals grounded in what exceptional practitioners in this field actually demonstrate. Job description: ${job_description.trim().substring(0, 8000)}`;
        } else {
          instructions = `Build a sourcing strategy for the role ${job_title} at ${company_name}. Research the actual competitive landscape: which companies compete in this space and where their engineers come from, which open source repos the best candidates contribute to (real repos with real activity), and what evidence of exceptional ability looks like for this specific role. Use live web data — check GitHub, LinkedIn, company blogs, and job boards.`;
        }

        // Choose model
        const model = research_model === 'pro' ? 'exa-research-pro' : 'exa-research';

        const result = await exaResearch(instructions, strategyOutputSchema, model, exaApiKey);

        if (result && result.search_query && result.target_repos) {
          strategy = result;
          usedExa = true;
          console.log('Exa Research completed successfully');
        } else {
          console.warn('Exa Research returned incomplete data, falling back to Anthropic');
        }
      } catch (exaErr) {
        console.error('Exa Research error, falling back to Anthropic:', exaErr);
      }
    }

    // -----------------------------------------------------------------------
    // Fallback: existing Anthropic tool call path
    // -----------------------------------------------------------------------
    if (!strategy) {
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
        input_schema: strategyOutputSchema,
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

      strategy = result.toolInput;
    }

    // -------------------------------------------------------------------
    // Harmonic enrichment: enrich poach_companies with real data,
    // expand with similar companies, deduplicate, and score poachability.
    // -------------------------------------------------------------------
    const harmonicApiKey = Deno.env.get('HARMONIC_API_KEY');
    if (harmonicApiKey && strategy.poach_companies?.length > 0) {
      try {
        // Helper: enrich a single company via Harmonic
        async function enrichCompany(name: string, category: string, reason: string, source: string) {
          const domain = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
          const url = new URL('https://api.harmonic.ai/companies');
          url.searchParams.set('website_domain', domain);
          url.searchParams.set('apikey', harmonicApiKey!);
          const res = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': harmonicApiKey! },
          });
          if (!res.ok) return null;
          const data = await res.json();

          // Compute poachability
          const tm = data.traction_metrics;
          const engGrowth = tm?.headcountEngineering?.ago90d?.percentChange;
          const webChange = tm?.webTraffic?.ago30d?.percentChange;
          const signals: string[] = [];
          let poachScore = 50;
          if (engGrowth !== undefined && engGrowth < -5) { poachScore += 20; signals.push(`Eng team shrinking (${engGrowth.toFixed(0)}% 90d)`); }
          else if (engGrowth !== undefined && engGrowth > 20) { poachScore -= 15; signals.push(`Eng team growing (+${engGrowth.toFixed(0)}% 90d)`); }
          if (webChange !== undefined && webChange < -10) { poachScore += 15; signals.push(`Traffic declining (${webChange.toFixed(0)}% 30d)`); }
          if (data.funding?.lastFundingDate) {
            const months = (Date.now() - new Date(data.funding.lastFundingDate).getTime()) / (30*24*60*60*1000);
            if (months > 24) { poachScore += 15; signals.push(`No funding in ${Math.round(months)} months`); }
            else if (months < 6) { poachScore -= 10; signals.push('Recently funded'); }
          }
          for (const h of (data.highlights || [])) {
            if (h.text?.toLowerCase().includes('layoff')) { poachScore += 20; signals.push('Layoff signals'); break; }
          }

          return {
            name: data.name || name,
            domain: data.website?.domain || domain,
            category,
            reason,
            source,
            funding_stage: data.stage,
            funding_total: data.funding?.fundingTotal,
            last_funding_date: data.funding?.lastFundingDate,
            last_funding_total: data.funding?.lastFundingAmount,
            headcount: data.headcount,
            headcount_growth_30d: tm?.headcount?.ago30d?.percentChange,
            headcount_growth_90d: engGrowth,
            top_investors: data.funding_rounds
              ?.flatMap((r: any) => r.investors?.filter((i: any) => i.isLead).map((i: any) => i.investorName) || [])
              .slice(0, 3) || [],
            industry_tags: data.tags_v2?.filter((t: any) => t.type === 'INDUSTRY').map((t: any) => t.displayValue) || [],
            technology_tags: data.tags_v2?.filter((t: any) => t.type === 'TECHNOLOGY').map((t: any) => t.displayValue) || [],
            poachability_score: Math.max(0, Math.min(100, poachScore)),
            poachability_rationale: signals,
            _entity_urn: data.entity_urn, // for similar-company expansion
            _logo_url: data.logo_url,
          };
        }

        // Step 1: Enrich all Claude seed companies
        const seedResults = await Promise.allSettled(
          strategy.poach_companies.map((pc: any) =>
            enrichCompany(pc.name, pc.category, pc.reason, 'claude_seed')
          )
        );
        const enrichedSeeds = seedResults
          .map(r => r.status === 'fulfilled' ? r.value : null)
          .filter(Boolean) as any[];

        // Step 2: Expand with similar companies from high-confidence seeds
        // (those that resolved successfully and are direct_competitors)
        const highConfidenceUrns = enrichedSeeds
          .filter(c => c._entity_urn && c.category === 'direct_competitor')
          .map(c => c._entity_urn)
          .slice(0, 3); // Limit to 3 seeds for expansion

        let similarCompanies: any[] = [];
        if (highConfidenceUrns.length > 0) {
          try {
            const simUrl = new URL('https://api.harmonic.ai/search/similar_companies');
            simUrl.searchParams.set('apikey', harmonicApiKey);
            const simRes = await fetch(simUrl.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': harmonicApiKey },
              body: JSON.stringify({ company_urns: highConfidenceUrns }),
            });
            if (simRes.ok) {
              const simData = await simRes.json();
              const simResults = simData.results || [];
              // Take top 3 similar companies
              similarCompanies = simResults.slice(0, 3).map((c: any) => ({
                name: c.name,
                domain: c.website?.domain,
                category: 'adjacent',
                reason: 'Similar to direct competitor (discovered via Harmonic)',
                source: 'harmonic_similar',
                funding_stage: c.stage,
                funding_total: c.funding?.fundingTotal,
                last_funding_date: c.funding?.lastFundingDate,
                last_funding_total: c.funding?.lastFundingAmount,
                headcount: c.headcount,
                headcount_growth_30d: c.traction_metrics?.headcount?.ago30d?.percentChange,
                headcount_growth_90d: c.traction_metrics?.headcountEngineering?.ago90d?.percentChange,
                top_investors: c.funding_rounds
                  ?.flatMap((r: any) => r.investors?.filter((i: any) => i.isLead).map((i: any) => i.investorName) || [])
                  .slice(0, 3) || [],
                industry_tags: c.tags_v2?.filter((t: any) => t.type === 'INDUSTRY').map((t: any) => t.displayValue) || [],
                technology_tags: c.tags_v2?.filter((t: any) => t.type === 'TECHNOLOGY').map((t: any) => t.displayValue) || [],
                poachability_score: 50, // Default for similar companies
                poachability_rationale: [],
                _logo_url: c.logo_url,
              }));
            }
          } catch (e) {
            console.error('Similar company expansion failed (non-blocking):', e);
          }
        }

        // Step 3: Merge + deduplicate by normalized domain/name
        const allCompanies = [...enrichedSeeds, ...similarCompanies];
        const seen = new Set<string>();
        const deduped: any[] = [];
        for (const c of allCompanies) {
          const key = (c.domain || c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(c);
        }

        // Step 4: Sort by poachability, but preserve at least 2 direct competitors
        const competitors = deduped.filter(c => c.category === 'direct_competitor');
        const others = deduped.filter(c => c.category !== 'direct_competitor');
        others.sort((a, b) => (b.poachability_score || 0) - (a.poachability_score || 0));

        // Ensure at least 2 competitors are in the final list (preserve recruiter intent)
        const preservedCompetitors = competitors.slice(0, Math.max(2, competitors.length));
        const remainingSlots = Math.max(0, 10 - preservedCompetitors.length);
        const finalList = [...preservedCompetitors, ...others.slice(0, remainingSlots)];
        finalList.sort((a, b) => (b.poachability_score || 0) - (a.poachability_score || 0));

        // Clean internal fields
        for (const c of finalList) {
          delete c._entity_urn;
          delete c._logo_url;
        }

        strategy.poach_companies = finalList;
      } catch (e) {
        console.error('Harmonic enrichment failed (non-blocking):', e);
        // Strategy still works with Claude's original poach_companies
      }
    }


    // Increment search count for gated users
    if (gate.userId) {
      await incrementSearchCount(gate.userId).catch(e => console.error('Failed to increment search count:', e));
    }

    return new Response(JSON.stringify({
      strategy,
      job_title: job_title || '',
      company_name: company_name || '',
      source: hasJD ? 'job_description' : 'manual',
      research_source: usedExa ? 'exa_research' : 'anthropic',
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('research-role error:', e);
    if ((e as Error).message === 'RATE_LIMITED') {
      return new Response(JSON.stringify({ error: 'Rate limited. Please try again in a moment.' }), {
        status: 429,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
