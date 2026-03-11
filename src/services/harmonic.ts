import { supabase } from "@/integrations/supabase/client"
import type {
  HarmonicPerson,
  HarmonicEnrichmentStatus,
  HarmonicSearchResult,
  HarmonicCompany,
  HarmonicSavedSearch,
  CompanyContext,
  PoachabilityScore,
} from "@/types/harmonic"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

async function callEdgeFunction(
  functionName: string,
  action: string,
  params: Record<string, unknown>,
) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase not configured')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Authentication required – please sign in.')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...params }),
  })

  const data = await res.json()
  if (!res.ok && !data.enrichment_pending) {
    const message =
      typeof data.error === 'string' ? data.error
      : data.error?.message ?? data.message ?? JSON.stringify(data)
    throw new Error(message)
  }
  return data
}

// ---------------------------------------------------------------------------
// Company enrichment (harmonic-enrich function)
// ---------------------------------------------------------------------------

export async function enrichCompanyByDomain(domain: string): Promise<CompanyContext> {
  return callEdgeFunction('harmonic-enrich', 'enrich_company', { website_domain: domain })
}

export async function enrichCompanyByLinkedIn(linkedinUrl: string): Promise<CompanyContext> {
  return callEdgeFunction('harmonic-enrich', 'enrich_company', { linkedin_url: linkedinUrl })
}

export async function getCompanyById(idOrUrn: string): Promise<HarmonicCompany> {
  return callEdgeFunction('harmonic-enrich', 'get_company', { id_or_urn: idOrUrn })
}

export async function getCompanyEmployees(
  idOrUrn: string,
  groupType?: 'ALL' | 'FOUNDERS_AND_CEO' | 'EXECUTIVES' | 'FOUNDERS' | 'LEADERSHIP',
  size = 20,
) {
  return callEdgeFunction('harmonic-enrich', 'get_employees', {
    id_or_urn: idOrUrn,
    employee_group_type: groupType,
    size,
  })
}

// ---------------------------------------------------------------------------
// Person enrichment (harmonic-enrich function)
// ---------------------------------------------------------------------------

export async function enrichPersonByLinkedIn(linkedinUrl: string): Promise<HarmonicPerson> {
  return callEdgeFunction('harmonic-enrich', 'enrich_person', { person_linkedin_url: linkedinUrl })
}

export async function getPersonById(idOrUrn: string): Promise<HarmonicPerson> {
  return callEdgeFunction('harmonic-enrich', 'get_person', { id_or_urn: idOrUrn })
}

export async function checkEnrichmentStatus(
  ids?: string[],
  urns?: string[],
): Promise<HarmonicEnrichmentStatus[]> {
  return callEdgeFunction('harmonic-enrich', 'enrichment_status', { ids, urns })
}

// ---------------------------------------------------------------------------
// Search (harmonic-search function)
// ---------------------------------------------------------------------------

export async function searchCompaniesNaturalLanguage(
  query: string,
): Promise<HarmonicSearchResult<HarmonicCompany>> {
  return callEdgeFunction('harmonic-search', 'search_agent', { query })
}

export async function findSimilarCompanies(
  companyUrns: string[],
): Promise<HarmonicSearchResult<HarmonicCompany>> {
  return callEdgeFunction('harmonic-search', 'similar_companies', { company_urns: companyUrns })
}

export async function searchCompaniesByKeywords(
  keywords: string,
  size = 25,
): Promise<HarmonicSearchResult<HarmonicCompany>> {
  return callEdgeFunction('harmonic-search', 'search_companies', { keywords, size })
}

export async function typeaheadSearch(
  query: string,
  searchType: 'COMPANY' | 'PERSON' | 'INVESTOR' = 'COMPANY',
) {
  return callEdgeFunction('harmonic-search', 'typeahead', { query, search_type: searchType })
}

// ---------------------------------------------------------------------------
// Network / Connections (gated — may not be available on all plans)
// ---------------------------------------------------------------------------

export async function getTeamConnections(companyIdOrUrn: string) {
  return callEdgeFunction('harmonic-search', 'team_connections', { id_or_urn: companyIdOrUrn })
}

// ---------------------------------------------------------------------------
// Saved Searches (harmonic-search function)
// ---------------------------------------------------------------------------

export async function listSavedSearches(): Promise<HarmonicSavedSearch[]> {
  const data = await callEdgeFunction('harmonic-search', 'saved_searches', {})
  return Array.isArray(data) ? data : data.results || []
}

export async function getNetNewResults(
  savedSearchId: string,
  newResultsSince?: string,
): Promise<HarmonicSearchResult<HarmonicCompany>> {
  return callEdgeFunction('harmonic-search', 'net_new_results', {
    saved_search_id: savedSearchId,
    new_results_since: newResultsSince,
  })
}

// ---------------------------------------------------------------------------
// Poachability scoring (client-side computation from normalized company data)
// ---------------------------------------------------------------------------

export function computePoachability(company: CompanyContext): PoachabilityScore {
  const signals: string[] = []
  let score = 50

  // Engineering headcount growth
  const engGrowth = company.headcount_growth_90d
  if (engGrowth !== undefined && engGrowth !== null && engGrowth < -5) {
    score += 20
    signals.push(`Engineering team shrinking (${engGrowth.toFixed(0)}% in 90d)`)
  } else if (engGrowth !== undefined && engGrowth !== null && engGrowth > 20) {
    score -= 15
    signals.push(`Engineering team growing fast (+${engGrowth.toFixed(0)}% in 90d)`)
  }

  // Web traffic
  const webTraffic = company.web_traffic as { ago30d?: { percentChange?: number } } | null
  const webChange = webTraffic?.ago30d?.percentChange
  if (webChange !== undefined && webChange !== null && webChange < -10) {
    score += 15
    signals.push(`Web traffic declining (${webChange.toFixed(0)}% in 30d)`)
  } else if (webChange !== undefined && webChange !== null && webChange > 30) {
    score -= 10
    signals.push(`Web traffic surging (+${webChange.toFixed(0)}% in 30d)`)
  }

  // Funding stage
  const stage = company.funding_stage
  if (stage === 'PRE_SEED' || stage === 'SEED') {
    score += 10
    signals.push('Early stage — candidates may want stability')
  } else if (stage && ['SERIES_D', 'SERIES_E', 'GROWTH'].includes(stage)) {
    score -= 5
    signals.push('Late-stage / growth — harder to poach')
  }

  // Last funding date
  if (company.last_funding_date) {
    const monthsSince = (Date.now() - new Date(company.last_funding_date).getTime()) / (30 * 24 * 60 * 60 * 1000)
    if (monthsSince > 24) {
      score += 15
      signals.push(`No funding in ${Math.round(monthsSince)} months`)
    } else if (monthsSince < 6) {
      score -= 10
      signals.push('Recently funded — retention likely strong')
    }
  }

  // Small headcount
  if (company.headcount !== undefined && company.headcount !== null && company.headcount < 20) {
    score += 5
    signals.push(`Small team (${company.headcount} employees)`)
  }

  // Layoff signals from highlights
  const quality = company.company_quality as { highlights?: string[] } | null
  const highlights = quality?.highlights || []
  for (const h of highlights) {
    const text = (h || '').toLowerCase()
    if (text.includes('layoff') || text.includes('restructur') || text.includes('downsiz')) {
      score += 20
      signals.push('Recent layoff/restructuring signals')
      break
    }
  }

  // Top investors
  const investors = company.investors as { name: string; isLead: boolean }[] | null
  const topInvestors = investors
    ?.filter(i => i.isLead)
    .map(i => i.name)
    .slice(0, 3) || []

  return {
    domain: company.domain || '',
    name: company.name || '',
    score: Math.max(0, Math.min(100, score)),
    signals,
    funding_stage: company.funding_stage,
    headcount: company.headcount,
    headcount_growth_90d: company.headcount_growth_90d,
    web_traffic_change_30d: webChange,
    funding_total: company.funding_total,
    last_funding_date: company.last_funding_date ? String(company.last_funding_date) : undefined,
    top_investors: topInvestors,
    logo_url: (company.company_quality as any)?.logo_url,
  }
}

// ---------------------------------------------------------------------------
// Utility: extract domain from company name (best-effort)
// ---------------------------------------------------------------------------

export function companyNameToDomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .concat('.com')
}

// ---------------------------------------------------------------------------
// Bulk: enrich multiple companies and rank by poachability
// ---------------------------------------------------------------------------

export async function enrichAndRankCompanies(
  companies: { name: string; domain?: string }[],
): Promise<PoachabilityScore[]> {
  const results = await Promise.allSettled(
    companies.map(async (c) => {
      const domain = c.domain || companyNameToDomain(c.name)
      const data = await enrichCompanyByDomain(domain)
      return computePoachability(data)
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<PoachabilityScore> => r.status === 'fulfilled')
    .map(r => r.value)
    .sort((a, b) => b.score - a.score)
}
