/**
 * harmonic-search: Company discovery and search via Harmonic.
 *
 * Actions:
 *   similar_companies   — find companies similar to given URNs
 *   search_agent        — natural language company search
 *   search_companies    — keyword-based company search
 *   typeahead           — company/person/investor typeahead
 *   team_connections    — get team network connections to a company (gated)
 *   saved_searches      — list saved searches
 *   net_new_results     — get net-new results for a subscribed saved search
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { requireAuth, authErrorResponse } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

const HARMONIC_BASE = 'https://api.harmonic.ai'

const ALLOWED_ACTIONS = [
  'similar_companies', 'search_agent', 'search_companies', 'typeahead',
  'team_connections', 'saved_searches', 'net_new_results',
]

function getApiKey(): string {
  const key = Deno.env.get('HARMONIC_API_KEY')
  if (!key) throw { status: 500, body: { error: 'HARMONIC_API_KEY not configured on server' } }
  return key
}

async function harmonicFetch(
  path: string,
  apiKey: string,
  opts?: { method?: string; body?: unknown; params?: Record<string, string> },
): Promise<Response> {
  const url = new URL(`${HARMONIC_BASE}${path}`)
  url.searchParams.set('apikey', apiKey)
  if (opts?.params) {
    for (const [k, v] of Object.entries(opts.params)) url.searchParams.set(k, v)
  }
  return fetch(url.toString(), {
    method: opts?.method || 'GET',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    await requireAuth(req)
    const body = await req.json()
    const { action, ...params } = body

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${ALLOWED_ACTIONS.join(', ')}` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = getApiKey()
    let response: Response

    switch (action) {
      case 'similar_companies': {
        const { company_urns } = params
        if (!company_urns || !Array.isArray(company_urns)) {
          return new Response(JSON.stringify({ error: 'company_urns array is required' }), {
            status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }
        response = await harmonicFetch('/search/similar_companies', apiKey, {
          method: 'POST',
          body: { company_urns },
        })
        break
      }

      case 'search_agent': {
        const { query } = params
        if (!query) return new Response(JSON.stringify({ error: 'query is required' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
        response = await harmonicFetch('/search/search_agent', apiKey, {
          params: { query },
        })
        break
      }

      case 'search_companies': {
        const { keywords, size, page } = params
        if (!keywords) return new Response(JSON.stringify({ error: 'keywords is required' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
        const qp: Record<string, string> = {}
        if (size) qp.size = String(size)
        if (page) qp.page = String(page)
        response = await harmonicFetch('/search/companies_by_keywords', apiKey, {
          method: 'POST',
          params: qp,
          body: { contains_all_of_keywords: keywords },
        })
        break
      }

      case 'typeahead': {
        const { query, search_type } = params
        if (!query) return new Response(JSON.stringify({ error: 'query is required' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
        response = await harmonicFetch('/search/typeahead', apiKey, {
          params: { query, search_type: search_type || 'COMPANY' },
        })
        break
      }

      case 'team_connections': {
        const { id_or_urn } = params
        if (!id_or_urn) return new Response(JSON.stringify({ error: 'id_or_urn is required' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
        // Gated: attempt call, but gracefully handle if account lacks access
        try {
          response = await harmonicFetch(`/companies/${encodeURIComponent(id_or_urn)}/userConnections`, apiKey)
          if (response.status === 403) {
            return new Response(JSON.stringify({
              error: 'team_connections_not_available',
              message: 'Team connections feature not available on current Harmonic plan',
            }), {
              status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
            })
          }
        } catch {
          return new Response(JSON.stringify({
            error: 'team_connections_not_available',
            message: 'Team connections feature not available',
          }), {
            status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }
        break
      }

      case 'saved_searches': {
        response = await harmonicFetch('/savedSearches', apiKey)
        break
      }

      case 'net_new_results': {
        const { saved_search_id, new_results_since } = params
        if (!saved_search_id) return new Response(JSON.stringify({ error: 'saved_search_id is required' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
        const qp: Record<string, string> = {}
        if (new_results_since) qp.new_results_since = new_results_since
        response = await harmonicFetch(
          `/savedSearches/${encodeURIComponent(saved_search_id)}/net_new_results`,
          apiKey,
          { params: qp },
        )
        break
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
    }

    const data = await response!.json()
    return new Response(JSON.stringify(data), {
      status: response!.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const authResp = authErrorResponse(err, cors)
    if (authResp) return authResp
    console.error('harmonic-search error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
