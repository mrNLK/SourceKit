import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { job_title, company_name, job_description } = await req.json()

    if (!job_title && !job_description) {
      return new Response(
        JSON.stringify({ error: 'job_title or job_description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `You are an expert technical recruiter. Generate a research strategy for sourcing candidates.

${job_description ? `Job Description:\n${job_description.slice(0, 2000)}` : `Job Title: ${job_title}\nCompany: ${company_name || 'Not specified'}`}

Return a JSON object with these fields:
- jobTitle: string (extracted or inferred job title)
- companyName: string (extracted or inferred company)
- searchQueries: string[] (5-8 GitHub search queries to find matching engineers — use keywords, language names, framework names, and relevant repos)
- targetCompanies: string[] (8-12 companies where similar talent works — include the company itself plus competitors and peers)
- targetRepos: string[] (5-8 specific GitHub repos/projects where ideal candidates contribute)
- keywords: string[] (10-15 specific technical keywords for this role — frameworks, tools, concepts)

Be specific and practical. Target real repos and real companies. Search queries should work well on GitHub's user/repo search.

Return ONLY valid JSON, no markdown fences or explanation.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2024-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      console.error(`Anthropic API error: ${response.status}`, errorBody)
      return new Response(
        JSON.stringify({ error: `AI generation failed: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const text = data.content?.[0]?.text

    if (!text) {
      console.error('Anthropic returned empty content:', JSON.stringify(data))
      return new Response(
        JSON.stringify({ error: 'AI returned empty response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the JSON from the response (strip markdown fences if present)
    const jsonStr = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
    const strategy = JSON.parse(jsonStr)

    // Validate required fields
    if (!strategy.searchQueries || !Array.isArray(strategy.searchQueries)) {
      throw new Error('Invalid strategy: missing searchQueries')
    }

    return new Response(
      JSON.stringify({
        strategy: {
          jobTitle: strategy.jobTitle || job_title || 'Engineer',
          companyName: strategy.companyName || company_name || '',
          searchQueries: strategy.searchQueries.slice(0, 10),
          targetCompanies: (strategy.targetCompanies || []).slice(0, 15),
          targetRepos: (strategy.targetRepos || []).slice(0, 10),
          keywords: (strategy.keywords || []).slice(0, 20),
          generatedAt: new Date().toISOString(),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('generate-strategy error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
