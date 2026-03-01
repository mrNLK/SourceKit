import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const { query, role, company } = await req.json()

    const exaApiKey = Deno.env.get('EXA_API_KEY')
    const parallelApiKey = Deno.env.get('PARALLEL_API_KEY')

    if (!exaApiKey && !parallelApiKey) {
      return new Response(
        JSON.stringify({ error: 'No API keys configured. Set EXA_API_KEY or PARALLEL_API_KEY.' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const searchQuery = [query, role, company].filter(Boolean).join(' ')
    const searches: Promise<{ source: string; candidates: Record<string, unknown>[] }>[] = []

    // Exa search
    if (exaApiKey) {
      searches.push(
        fetch('https://api.exa.ai/search', {
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
        })
          .then(res => res.json())
          .then(data => ({
            source: 'exa',
            candidates: (data.results || []).map((result: Record<string, unknown>) => ({
              name: result.title || '',
              bio: result.text || '',
              profile_url: result.url,
              source: (result.url as string || '').includes('linkedin') ? 'linkedin' :
                      (result.url as string || '').includes('github') ? 'github' : 'web',
              highlights: result.highlights || [],
            })),
          }))
      )
    }

    // Parallel.ai search
    if (parallelApiKey) {
      searches.push(
        fetch('https://api.parallel.ai/v1beta/search', {
          method: 'POST',
          headers: {
            'x-api-key': parallelApiKey,
            'Content-Type': 'application/json',
            'parallel-beta': 'search-extract-2025-10-10',
          },
          body: JSON.stringify({
            objective: `Find profiles of people matching: ${searchQuery}`,
            search_queries: [`${searchQuery} linkedin`, `${searchQuery} github`],
          }),
        })
          .then(res => res.json())
          .then(data => {
            const items = data.results || data.data || data.items || []
            return {
              source: 'parallel',
              candidates: items.map((result: Record<string, unknown>) => {
                const url = (result.url || result.link || '') as string
                return {
                  name: (result.title || result.name || '') as string,
                  bio: (result.excerpt || result.content || result.snippet || result.text || '') as string,
                  profile_url: url,
                  source: url.includes('linkedin') ? 'linkedin' :
                          url.includes('github') ? 'github' : 'web',
                  highlights: result.excerpt ? [result.excerpt] : [],
                }
              }),
            }
          })
      )
    }

    const results = await Promise.allSettled(searches)
    const allCandidates: Record<string, unknown>[] = []
    const sourceCounts: Record<string, number> = {}

    for (const result of results) {
      if (result.status === 'fulfilled') {
        sourceCounts[result.value.source] = result.value.candidates.length
        for (const candidate of result.value.candidates) {
          // Deduplicate by profile_url
          const url = candidate.profile_url as string
          if (url && allCandidates.some(c => c.profile_url === url)) continue
          allCandidates.push(candidate)
        }
      } else {
        console.error('Search source failed:', result.reason)
      }
    }

    return new Response(
      JSON.stringify({ candidates: allCandidates, sources: sourceCounts }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
