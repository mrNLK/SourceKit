/**
 * harmonic-company: Lookup, enrich, and cache company data from Harmonic.
 *
 * Actions:
 *   enrich_company   — lookup by domain/URL/LinkedIn, normalize + cache
 *   get_company      — fetch by Harmonic ID/URN
 *   get_employees    — list employees of a company
 *   enrich_person    — lookup person by LinkedIn URL
 *   get_person       — fetch person by ID/URN
 *   enrichment_status — check async enrichment status
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { requireAuth, authErrorResponse } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

const HARMONIC_BASE = 'https://api.harmonic.ai'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const ALLOWED_ACTIONS = [
  'enrich_company', 'get_company', 'get_employees',
  'enrich_person', 'get_person', 'enrichment_status',
]

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

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

/** Normalize Harmonic company response into company_cache row shape. */
function normalizeCompany(raw: any): Record<string, unknown> {
  const tm = raw.traction_metrics
  const funding = raw.funding || {}
  return {
    harmonic_company_id: String(raw.id || ''),
    name: raw.name,
    domain: raw.website?.domain,
    website_url: raw.website?.url,
    linkedin_url: raw.socials?.linkedin?.url,
    location: raw.location ? [raw.location.city, raw.location.state, raw.location.country].filter(Boolean).join(', ') : null,
    funding_stage: raw.stage,
    funding_total: funding.fundingTotal,
    last_funding_date: funding.lastFundingDate,
    last_funding_total: funding.lastFundingAmount,
    headcount: raw.headcount,
    headcount_growth_30d: tm?.headcount?.ago30d?.percentChange,
    headcount_growth_90d: tm?.headcount?.ago90d?.percentChange,
    headcount_growth_180d: null,
    web_traffic: tm?.webTraffic || null,
    investors: raw.funding_rounds
      ?.flatMap((r: any) => r.investors || [])
      .map((i: any) => ({ name: i.investorName, isLead: i.isLead })) || null,
    founders: raw.people
      ?.filter((p: any) => p.title?.toLowerCase().includes('founder') || p.title?.toLowerCase().includes('ceo'))
      .map((p: any) => ({ name: p.full_name, title: p.title, urn: p.entity_urn })) || null,
    industry_tags: raw.tags_v2?.filter((t: any) => t.type === 'INDUSTRY').map((t: any) => t.displayValue) || [],
    technology_tags: raw.tags_v2?.filter((t: any) => t.type === 'TECHNOLOGY').map((t: any) => t.displayValue) || [],
    customer_tags: raw.tags_v2?.filter((t: any) => t.type === 'CUSTOMER' || t.type === 'BUSINESS_MODEL').map((t: any) => t.displayValue) || [],
    company_quality: {
      highlights: raw.highlights?.map((h: any) => h.text) || [],
      employee_highlights: raw.employee_highlights?.map((h: any) => h.text) || [],
      logo_url: raw.logo_url,
      short_description: raw.short_description,
    },
    raw_payload: raw,
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/** Check company_cache for a fresh entry by domain. */
async function getCachedCompany(supabase: ReturnType<typeof getSupabase>, domain: string) {
  const { data } = await supabase
    .from('company_cache')
    .select('*')
    .eq('domain', domain)
    .maybeSingle()

  if (!data) return null
  const age = Date.now() - new Date(data.fetched_at).getTime()
  if (age > CACHE_TTL_MS) return null
  return data
}

async function upsertCompanyCache(supabase: ReturnType<typeof getSupabase>, normalized: Record<string, unknown>) {
  await supabase.from('company_cache').upsert(normalized, { onConflict: 'harmonic_company_id' })
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
    const supabase = getSupabase()

    switch (action) {
      case 'enrich_company': {
        const { website_domain, website_url, linkedin_url, crunchbase_url } = params
        const cacheKey = website_domain || ''

        // Cache check
        if (cacheKey) {
          const cached = await getCachedCompany(supabase, cacheKey)
          if (cached) {
            return new Response(JSON.stringify(cached), {
              headers: { ...cors, 'Content-Type': 'application/json' },
            })
          }
        }

        const qp: Record<string, string> = {}
        if (website_domain) qp.website_domain = website_domain
        if (website_url) qp.website_url = website_url
        if (linkedin_url) qp.linkedin_url = linkedin_url
        if (crunchbase_url) qp.crunchbase_url = crunchbase_url

        const response = await harmonicFetch('/companies', apiKey, { method: 'POST', params: qp })

        if (response.status === 404) {
          const errData = await response.json()
          if (errData.enrichment_id) {
            return new Response(
              JSON.stringify({ enrichment_pending: true, enrichment_id: errData.enrichment_id }),
              { status: 202, headers: { ...cors, 'Content-Type': 'application/json' } }
            )
          }
          return new Response(JSON.stringify({ error: 'Company not found' }), {
            status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          return new Response(JSON.stringify({ error: errData.message || `Harmonic error ${response.status}` }), {
            status: response.status, headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }

        const raw = await response.json()
        const normalized = normalizeCompany(raw)
        await upsertCompanyCache(supabase, normalized).catch(e => console.error('Cache write failed:', e))

        return new Response(JSON.stringify(normalized), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      case 'get_company': {
        const { id_or_urn } = params
        if (!id_or_urn) return new Response(JSON.stringify({ error: 'id_or_urn required' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
        const response = await harmonicFetch(`/companies/${encodeURIComponent(id_or_urn)}`, apiKey)
        const data = await response.json()
        return new Response(JSON.stringify(data), {
          status: response.status, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      case 'get_employees': {
        const { id_or_urn, employee_group_type, size, page } = params
        if (!id_or_urn) return new Response(JSON.stringify({ error: 'id_or_urn required' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
        const qp: Record<string, string> = {}
        if (employee_group_type) qp.employee_group_type = employee_group_type
        if (size) qp.size = String(size)
        if (page) qp.page = String(page)
        const response = await harmonicFetch(`/companies/${encodeURIComponent(id_or_urn)}/employees`, apiKey, { params: qp })
        const data = await response.json()
        return new Response(JSON.stringify(data), {
          status: response.status, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      case 'enrich_person': {
        const { person_linkedin_url } = params
        if (!person_linkedin_url) return new Response(JSON.stringify({ error: 'person_linkedin_url required' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
        const response = await harmonicFetch('/persons', apiKey, {
          method: 'POST', params: { linkedin_url: person_linkedin_url },
        })
        const data = await response.json()
        if (response.status === 404 && data.enrichment_id) {
          return new Response(
            JSON.stringify({ enrichment_pending: true, enrichment_id: data.enrichment_id }),
            { status: 202, headers: { ...cors, 'Content-Type': 'application/json' } }
          )
        }
        return new Response(JSON.stringify(data), {
          status: response.status, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      case 'get_person': {
        const { id_or_urn } = params
        if (!id_or_urn) return new Response(JSON.stringify({ error: 'id_or_urn required' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
        const response = await harmonicFetch(`/persons/${encodeURIComponent(id_or_urn)}`, apiKey)
        const data = await response.json()
        return new Response(JSON.stringify(data), {
          status: response.status, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      case 'enrichment_status': {
        const { ids, urns } = params
        const qp: Record<string, string> = {}
        if (ids) qp.ids = ids.join(',')
        if (urns) qp.urns = urns.join(',')
        const response = await harmonicFetch('/enrichment_status', apiKey, { params: qp })
        const data = await response.json()
        return new Response(JSON.stringify(data), {
          status: response.status, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
    }
  } catch (err) {
    const authResp = authErrorResponse(err, cors)
    if (authResp) return authResp
    console.error('harmonic-company error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
