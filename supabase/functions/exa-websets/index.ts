import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WEBSETS_BASE = 'https://api.exa.ai/websets/v0'
const ALLOWED_ACTIONS = ['create', 'list', 'get', 'items', 'enrich', 'delete']

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, exa_api_key, ...params } = body

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${ALLOWED_ACTIONS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = exa_api_key || Deno.env.get('EXA_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'EXA_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    }

    let response: Response

    switch (action) {
      case 'create': {
        const { query, count, entity_type, criteria, enrichments } = params
        response = await fetch(`${WEBSETS_BASE}/websets`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            search: {
              query,
              count: count || 10,
              entity: { type: entity_type || 'person' },
              ...(criteria ? { criteria } : {}),
            },
            ...(enrichments && enrichments.length > 0 ? { enrichments } : {}),
          }),
        })
        break
      }

      case 'list': {
        const { limit, cursor } = params
        const qs = new URLSearchParams()
        if (limit) qs.set('limit', String(limit))
        if (cursor) qs.set('cursor', cursor)
        response = await fetch(`${WEBSETS_BASE}/websets?${qs.toString()}`, { headers })
        break
      }

      case 'get': {
        const { webset_id } = params
        if (!webset_id) {
          return new Response(
            JSON.stringify({ error: 'webset_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        response = await fetch(`${WEBSETS_BASE}/websets/${webset_id}`, { headers })
        break
      }

      case 'items': {
        const { webset_id, limit, cursor } = params
        if (!webset_id) {
          return new Response(
            JSON.stringify({ error: 'webset_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const qs = new URLSearchParams()
        if (limit) qs.set('limit', String(limit))
        if (cursor) qs.set('cursor', cursor)
        response = await fetch(`${WEBSETS_BASE}/websets/${webset_id}/items?${qs.toString()}`, { headers })
        break
      }

      case 'enrich': {
        const { webset_id, description, format } = params
        if (!webset_id) {
          return new Response(
            JSON.stringify({ error: 'webset_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        response = await fetch(`${WEBSETS_BASE}/websets/${webset_id}/enrichments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ description, format }),
        })
        break
      }

      case 'delete': {
        const { webset_id } = params
        if (!webset_id) {
          return new Response(
            JSON.stringify({ error: 'webset_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        response = await fetch(`${WEBSETS_BASE}/websets/${webset_id}`, {
          method: 'DELETE',
          headers,
        })
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
