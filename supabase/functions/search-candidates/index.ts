import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/auth.ts';
import { exaPeopleSearch, parallelEntitySearchPeople } from '../_shared/providers/clients.ts';
import { dedupCandidates } from '../_shared/providers/dedup.ts';
import { buildPeopleQuery } from '../_shared/providers/requests.ts';
import { exaMaxResults, isParallelPeopleEnabled } from '../_shared/providers/flags.ts';
import type { UnifiedCandidate } from '../_shared/providers/candidate.ts';

// Lightweight web people search (legacy response shape). For merged, persisted multi-source
// results use the source-candidates function.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }
  const headers = { ...getCorsHeaders(req), 'Content-Type': 'application/json' }

  try {
    await requireAuth(req, { usage: 'search' });

    const { query, role, company } = await req.json()
    const getEnv = (n: string) => Deno.env.get(n)
    const exaApiKey = getEnv('EXA_API_KEY')
    const parallelApiKey = isParallelPeopleEnabled(getEnv) ? getEnv('PARALLEL_API_KEY') : undefined

    if (!exaApiKey && !parallelApiKey) {
      return new Response(
        JSON.stringify({ error: 'No people sources configured. Set EXA_API_KEY (or enable Parallel people sources).' }),
        { status: 500, headers }
      )
    }

    const searchQuery = [query, role, company].filter(Boolean).join(' ')
    const nl = buildPeopleQuery(searchQuery)
    const searches: Promise<{ source: string; candidates: UnifiedCandidate[] }>[] = []
    if (exaApiKey) {
      searches.push(exaPeopleSearch(exaApiKey, nl, { numResults: Math.min(25, exaMaxResults(getEnv)) }).then((c) => ({ source: 'exa', candidates: c })))
    }
    if (parallelApiKey) {
      searches.push(parallelEntitySearchPeople(parallelApiKey, nl, 50).then((c) => ({ source: 'parallel', candidates: c })))
    }

    const results = await Promise.allSettled(searches)
    const sourceCounts: Record<string, number> = {}
    const all: UnifiedCandidate[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') {
        sourceCounts[r.value.source] = r.value.candidates.length
        all.push(...r.value.candidates)
      } else {
        console.error('Search source failed:', r.reason)
      }
    }

    const candidates = dedupCandidates(all).map((c) => {
      const url = c.linkedinUrl || (c.githubLogin ? `https://github.com/${c.githubLogin}` : c.profileUrls[0] || '')
      return {
        name: c.fullName,
        bio: c.summary || [c.currentTitle, c.currentCompany].filter(Boolean).join(' at '),
        profile_url: url,
        source: url.includes('linkedin') ? 'linkedin' : url.includes('github') ? 'github' : 'web',
        highlights: c.sources.map((s) => s.snippet).filter(Boolean),
      }
    })

    return new Response(JSON.stringify({ candidates, sources: sourceCounts }), { headers })
  } catch (error) {
    const authResp = authErrorResponse(error, getCorsHeaders(req));
    if (authResp) return authResp;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers }
    )
  }
})
