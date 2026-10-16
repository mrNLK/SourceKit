import { supabase } from '@/integrations/supabase/client'
import { classifyPerson } from '../../supabase/functions/_shared/talent-flags.ts'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export type SourceKey = 'exa' | 'parallel' | 'harmonic' | 'github'

export interface SourcedCandidate {
  id?: string
  full_name: string
  headline?: string | null
  current_title?: string | null
  current_company?: string | null
  company_domain?: string | null
  location?: string | null
  linkedin_url?: string | null
  github_login?: string | null
  harmonic_urn?: string | null
  emails: string[]
  email_status?: string | null
  profile_urls: string[]
  summary?: string | null
  avatar_url?: string | null
  providers: string[]
  sourcing_score: number
  github_followers?: number | null
  hidden_gem?: boolean
  ungettable?: boolean
  ungettable_reason?: string | null
}

export interface CandidateFiltersInput {
  titles?: string[]
  locations?: string[]
  skills?: string[]
  companies?: string[]
  company_domains?: string[]
  seniorities?: string[]
  keywords?: string
}

export interface SourceCandidatesResponse {
  candidates: SourcedCandidate[]
  sources: Record<string, { count: number; est_cost_usd: number; error?: string }>
  enabled: Record<SourceKey, boolean>
  raw_count: number
  est_cost_usd: number
}

export interface DeepSearchStart {
  run_id: string
  engine: 'findall' | 'webset'
  external_run_id: string
  status: string
  est_cost_usd: number | null
}

export interface DeepSearchStatus {
  status: string
  is_active: boolean
  candidates: SourcedCandidate[]
}

export const PROVIDER_LABELS: Record<string, { label: string; className: string }> = {
  github: { label: 'GitHub', className: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  exa: { label: 'Exa', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  exa_webset: { label: 'Websets', className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  parallel_entity: { label: 'Parallel', className: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  parallel_findall: { label: 'FindAll', className: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
  parallel_search: { label: 'Parallel', className: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  harmonic: { label: 'Harmonic', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  airscale: { label: 'Airscale', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
}

/** Badge descriptors for a candidate's providers (deduped, unknown providers shown verbatim). */
export function providerBadges(providers: string[]): { key: string; label: string; className: string }[] {
  const seen = new Set<string>()
  const out: { key: string; label: string; className: string }[] = []
  for (const p of providers) {
    const meta = PROVIDER_LABELS[p] ?? { label: p, className: 'bg-muted text-muted-foreground border-border' }
    if (seen.has(meta.label)) continue
    seen.add(meta.label)
    out.push({ key: p, ...meta })
  }
  return out
}

/** Split a comma/newline separated input into a clean list. */
export function splitList(v: string): string[] {
  return v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Authentication required – please sign in.')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  if (!res.ok || data?.error) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
  }
  return data as T
}

export function sourceCandidates(input: {
  query: string
  filters?: CandidateFiltersInput
  sources?: SourceKey[]
  limit?: number
  person_name?: string
  harmonic_enrich?: boolean
}): Promise<SourceCandidatesResponse> {
  return invoke('source-candidates', input)
}

export function startDeepSearch(input: {
  role: string
  company?: string
  location?: string
  engine?: 'findall' | 'webset'
  match_limit?: number
}): Promise<DeepSearchStart> {
  return invoke('map-company-talent', { action: 'start', ...input })
}

export function getDeepSearchStatus(runId: string): Promise<DeepSearchStatus> {
  return invoke('map-company-talent', { action: 'status', run_id: runId })
}

/** Which People Search sources are enabled server-side (does not count against search caps). */
export async function getEnabledSources(): Promise<Partial<Record<SourceKey, boolean>>> {
  const res = await invoke('source-candidates', { probe: true }) as { enabled?: Partial<Record<SourceKey, boolean>> }
  return res?.enabled ?? {}
}

export function enrichEmails(candidateIds: string[]): Promise<{ results: { id: string; status: string; email?: string | null }[]; found: number; est_credits: number }> {
  return invoke('enrich-candidate-emails', { candidate_ids: candidateIds })
}

/**
 * Poll a deep-search run until it is no longer active, the attempt budget runs out, or the signal aborts.
 * Calls onUpdate with each status snapshot. Status polls don't consume pilot search caps.
 */
export async function pollDeepSearch(
  runId: string,
  onUpdate: (s: DeepSearchStatus) => void,
  opts: { intervalMs?: number; maxAttempts?: number; signal?: AbortSignal; getStatus?: typeof getDeepSearchStatus; sleep?: (ms: number) => Promise<void> } = {},
): Promise<DeepSearchStatus | null> {
  const interval = opts.intervalMs ?? 10_000
  const max = opts.maxAttempts ?? 90 // ~15 min at 10s
  const get = opts.getStatus ?? getDeepSearchStatus
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  let last: DeepSearchStatus | null = null
  for (let i = 0; i < max; i++) {
    if (opts.signal?.aborted) return last
    last = await get(runId)
    onUpdate(last)
    if (!last.is_active) return last
    await sleep(interval)
  }
  return last
}

/** Flags from the server, or computed from title/headline when absent (deep-search results). */
export function withTalentFlags(c: SourcedCandidate): SourcedCandidate {
  if (c.ungettable !== undefined) return c
  const f = classifyPerson({ currentTitle: c.current_title, headline: c.headline, githubLogin: c.github_login, sourcingScore: c.sourcing_score })
  return { ...c, hidden_gem: f.hiddenGem, ungettable: f.ungettable, ungettable_reason: f.ungettableReason }
}
