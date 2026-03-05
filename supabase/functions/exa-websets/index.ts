import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { getCorsHeaders } from '../_shared/cors.ts';

const WEBSETS_BASE = 'https://api.exa.ai/websets/v0'
const ALLOWED_ACTIONS = [
  'create', 'list', 'get', 'items', 'enrich', 'delete',
  'create_monitor', 'pause_monitor', 'resume_monitor', 'list_monitors',
  'batch_pipeline', 'register_webhook',
]

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  return user?.id || null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const body = await req.json()
    const { action, ...params } = body

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${ALLOWED_ACTIONS.join(', ')}` }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Use server-side API key only (no client-side key passthrough)
    const apiKey = Deno.env.get('EXA_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'EXA_API_KEY not configured on server' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Extract user for multi-tenant isolation
    const userId = await getUserId(req.headers.get('Authorization'))

    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    }

    const supabase = getSupabase()
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

        // Track webset ownership if user is authenticated
        if (response.ok && userId) {
          const data = await response.clone().json()
          if (data.id) {
            await supabase.from('webset_mappings').insert({
              webset_id: data.id,
              user_id: userId,
              query: query || '',
              status: data.status || 'running',
            })
          }
        }
        break
      }

      case 'list': {
        // Return only websets owned by this user
        if (userId) {
          const { data: mappings } = await supabase
            .from('webset_mappings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

          if (!mappings || mappings.length === 0) {
            return new Response(
              JSON.stringify({ data: [] }),
              { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
          }

          // Fetch details for each webset from Exa
          const websets = await Promise.all(
            mappings.map(async (m: any) => {
              try {
                const res = await fetch(`${WEBSETS_BASE}/websets/${m.webset_id}`, { headers })
                if (!res.ok) return null
                const ws = await res.json()
                return { ...ws, _mapping: { query: m.query, created_at: m.created_at } }
              } catch {
                return null
              }
            })
          )

          return new Response(
            JSON.stringify({ data: websets.filter(Boolean) }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }

        // Fallback: no auth, list all (legacy behavior)
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
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
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
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
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
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
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
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }

        // Verify ownership before deleting
        if (userId) {
          const { data: mapping } = await supabase
            .from('webset_mappings')
            .select('id')
            .eq('webset_id', webset_id)
            .eq('user_id', userId)
            .maybeSingle()

          if (!mapping) {
            return new Response(
              JSON.stringify({ error: 'Webset not found or not owned by you' }),
              { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
          }

          // Clean up mapping
          await supabase.from('webset_mappings').delete().eq('webset_id', webset_id).eq('user_id', userId)
        }

        response = await fetch(`${WEBSETS_BASE}/websets/${webset_id}`, {
          method: 'DELETE',
          headers,
        })
        break
      }

      // -----------------------------------------------------------------
      // Monitor management
      // -----------------------------------------------------------------

      case 'create_monitor': {
        const { webset_id, cron, query, entity, criteria, count, behavior } = params
        if (!webset_id) {
          return new Response(
            JSON.stringify({ error: 'webset_id is required' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
        if (!cron) {
          return new Response(
            JSON.stringify({ error: 'cron is required' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
        const monitorBody: Record<string, unknown> = { cron }
        if (query) monitorBody.search = {
          query,
          ...(entity ? { entity } : { entity: { type: 'person' } }),
          ...(criteria ? { criteria } : {}),
          ...(count ? { count } : {}),
        }
        if (behavior) monitorBody.behavior = behavior
        response = await fetch(`${WEBSETS_BASE}/websets/${webset_id}/monitors`, {
          method: 'POST',
          headers,
          body: JSON.stringify(monitorBody),
        })
        break
      }

      case 'list_monitors': {
        const { webset_id } = params
        if (!webset_id) {
          return new Response(
            JSON.stringify({ error: 'webset_id is required' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
        response = await fetch(`${WEBSETS_BASE}/websets/${webset_id}/monitors`, { headers })
        break
      }

      case 'pause_monitor': {
        const { webset_id, monitor_id } = params
        if (!webset_id || !monitor_id) {
          return new Response(
            JSON.stringify({ error: 'webset_id and monitor_id are required' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
        response = await fetch(`${WEBSETS_BASE}/websets/${webset_id}/monitors/${monitor_id}/pause`, {
          method: 'POST',
          headers,
        })
        break
      }

      case 'resume_monitor': {
        const { webset_id, monitor_id } = params
        if (!webset_id || !monitor_id) {
          return new Response(
            JSON.stringify({ error: 'webset_id and monitor_id are required' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
        response = await fetch(`${WEBSETS_BASE}/websets/${webset_id}/monitors/${monitor_id}/resume`, {
          method: 'POST',
          headers,
        })
        break
      }

      // -----------------------------------------------------------------
      // Batch pipeline import (local Supabase operation)
      // -----------------------------------------------------------------

      case 'batch_pipeline': {
        const { items } = params
        if (!items || !Array.isArray(items) || items.length === 0) {
          return new Response(
            JSON.stringify({ error: 'items array is required and must not be empty' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'Authentication required for pipeline import' }),
            { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }

        const rows = items.map((item: any) => ({
          user_id: userId,
          webset_item_id: item.id,
          name: item.title,
          url: item.url,
          eea_data: item.eea_data || null,
          status: 'sourced',
        }))

        const { data: inserted, error: dbError } = await supabase
          .from('pipeline_candidates')
          .upsert(rows, { onConflict: 'user_id,webset_item_id' })
          .select('id')

        if (dbError) {
          return new Response(
            JSON.stringify({ error: dbError.message }),
            { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ added: inserted?.length || 0, skipped: items.length - (inserted?.length || 0) }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      // -----------------------------------------------------------------
      // Webhook registration (Prompt 7)
      // -----------------------------------------------------------------

      case 'register_webhook': {
        const { webset_id, events } = params
        if (!webset_id) {
          return new Response(
            JSON.stringify({ error: 'webset_id is required' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const webhookUrl = `${supabaseUrl}/functions/v1/webset-webhook`
        const webhookSecret = Deno.env.get('WEBSET_WEBHOOK_SECRET') || ''
        response = await fetch(`${WEBSETS_BASE}/websets/${webset_id}/webhooks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: webhookUrl,
            secret: webhookSecret,
            events: events || ['webset.idle', 'webset.item.created', 'webset.item.enriched', 'webset.enrichment.completed'],
          }),
        })
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
    }

    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
