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
    const { query, role, company } = await req.json()

    // Input validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const exaApiKey = Deno.env.get('EXA_API_KEY')

    if (!exaApiKey) {
      return new Response(
        JSON.stringify({ error: 'EXA_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const searchQuery = [query, role, company].filter(Boolean).join(' ')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': exaApiKey,
      },
      body: JSON.stringify({
        query: searchQuery,
        type: 'neural',
        useAutoprompt: true,
        numResults: 20,
        category: 'person',
        contents: {
          text: { maxCharacters: 500 },
          highlights: { numSentences: 3 },
        },
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(`Exa API error: ${response.status}`, errorText)
      return new Response(
        JSON.stringify({ error: `Search API error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    const candidates = (data.results || []).map((result: Record<string, unknown>) => ({
      name: result.title || '',
      bio: result.text || '',
      profile_url: result.url,
      source: (result.url as string || '').includes('linkedin') ? 'linkedin' :
              (result.url as string || '').includes('github') ? 'github' : 'web',
      highlights: result.highlights || [],
    }))

    return new Response(
      JSON.stringify({ candidates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('search-candidates error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
