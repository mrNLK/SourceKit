import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Globe, Loader2, Mail, Search, Telescope, ExternalLink, Github, Linkedin } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  enrichEmails, pollDeepSearch, providerBadges, sourceCandidates, splitList, startDeepSearch, withTalentFlags,
  type SourceKey, type SourcedCandidate,
} from '@/services/candidateSources'

const ALL_SOURCES: { key: SourceKey; label: string }[] = [
  { key: 'exa', label: 'Exa people' },
  { key: 'harmonic', label: 'Harmonic' },
  { key: 'github', label: 'GitHub' },
  { key: 'parallel', label: 'Parallel' },
]

export function CandidateRow({
  c, selected, onToggle,
}: { c: SourcedCandidate; selected?: boolean; onToggle?: () => void }) {
  const badges = providerBadges(c.providers || [])
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3" data-testid="candidate-row">
      {onToggle && c.id && (
        <input type="checkbox" aria-label={`select ${c.full_name}`} checked={!!selected} onChange={onToggle} className="mt-1" />
      )}
      {c.avatar_url ? (
        <img src={c.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
          {c.full_name.slice(0, 1)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{c.full_name}</span>
          {badges.map((b) => (
            <span key={b.key} className={`text-[10px] px-1.5 py-0.5 rounded border ${b.className}`} data-testid="source-badge">{b.label}</span>
          ))}
          {c.hidden_gem && <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-600" data-testid="gem-badge">Hidden gem</span>}
          {c.ungettable && <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-600" title={c.ungettable_reason ?? undefined} data-testid="ungettable-badge">Ungettable</span>}
          <span className="ml-auto text-xs text-muted-foreground">score {c.sourcing_score}</span>
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {[c.current_title, c.current_company].filter(Boolean).join(' at ')}{c.location ? ` · ${c.location}` : ''}
        </div>
        {c.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.summary}</p>}
        <div className="flex items-center gap-3 mt-1.5 text-xs">
          {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary"><Linkedin className="w-3 h-3" />LinkedIn</a>}
          {c.github_login && <a href={`https://github.com/${c.github_login}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary"><Github className="w-3 h-3" />{c.github_login}</a>}
          {!c.linkedin_url && !c.github_login && c.profile_urls?.[0] && <a href={c.profile_urls[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary"><ExternalLink className="w-3 h-3" />Profile</a>}
          {c.emails?.[0] && <span className="inline-flex items-center gap-1 text-foreground"><Mail className="w-3 h-3" />{c.emails[0]}</span>}
        </div>
      </div>
    </div>
  )
}

/** Human summary of an email lookup batch, e.g. "Found 3 new emails · 1 already had one · 2 not found". */
export function summarizeEmailResults(results: { status: string; email?: string | null }[], checked: number) {
  const already = results.filter((r) => r.status === 'already_has_email').length
  const found = results.filter((r) => r.status !== 'already_has_email' && !!r.email).length
  const failed = results.filter((r) => r.status === 'error').length
  const insufficient = results.filter((r) => r.status === 'insufficient_input').length
  const notFound = Math.max(0, checked - found - already - failed - insufficient)
  const parts = [
    already ? `${already} already had one` : '',
    notFound ? `${notFound} not found` : '',
    insufficient ? `${insufficient} missing name/company` : '',
    failed ? `${failed} failed` : '',
  ].filter(Boolean)
  return {
    title: found ? `Found ${found} new email${found === 1 ? '' : 's'}` : 'No new emails found',
    description: `Checked ${checked} candidate${checked === 1 ? '' : 's'}${parts.length ? ` · ${parts.join(' · ')}` : ''}. Selection cleared.`,
  }
}

const PeopleSearchTab = () => {
  const [query, setQuery] = useState('')
  const [titles, setTitles] = useState('')
  const [locations, setLocations] = useState('')
  const [skills, setSkills] = useState('')
  const [companies, setCompanies] = useState('')
  const [sources, setSources] = useState<Set<SourceKey>>(new Set(['exa', 'harmonic', 'github', 'parallel']))
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SourcedCandidate[]>([])
  const [sourceStats, setSourceStats] = useState<Record<string, { count: number; error?: string }>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [enriching, setEnriching] = useState(false)
  const [gemsOnly, setGemsOnly] = useState(false)
  const [showUngettable, setShowUngettable] = useState(false)

  // Deep search
  const [dsRole, setDsRole] = useState('')
  const [dsCompany, setDsCompany] = useState('')
  const [dsLocation, setDsLocation] = useState('')
  const [dsStatus, setDsStatus] = useState<string | null>(null)
  const [dsResults, setDsResults] = useState<SourcedCandidate[]>([])
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  const runSearch = useCallback(async () => {
    if (!query.trim() && !titles && !companies) return
    setLoading(true)
    setSelected(new Set())
    try {
      const res = await sourceCandidates({
        query: query.trim(),
        filters: { titles: splitList(titles), locations: splitList(locations), skills: splitList(skills), companies: splitList(companies) },
        sources: [...sources],
        limit: 50,
      })
      setResults(res.candidates)
      setSourceStats(res.sources)
      const failed = Object.entries(res.sources).filter(([, s]) => s.error).map(([k]) => k)
      if (failed.length) toast({ title: 'Some sources failed', description: failed.join(', ') })
    } catch (e) {
      toast({ title: 'Search failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [query, titles, locations, skills, companies, sources])

  const runDeepSearch = useCallback(async () => {
    if (!dsRole.trim()) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setDsResults([])
    setDsStatus('starting')
    try {
      const start = await startDeepSearch({ role: dsRole.trim(), company: dsCompany.trim() || undefined, location: dsLocation.trim() || undefined })
      setDsStatus(`${start.engine === 'findall' ? 'FindAll' : 'Websets'}: ${start.status}`)
      await pollDeepSearch(start.run_id, (s) => {
        setDsStatus(`${start.engine === 'findall' ? 'FindAll' : 'Websets'}: ${s.status}${s.is_active ? '…' : ''}`)
        setDsResults(s.candidates)
      }, { signal: ctrl.signal })
    } catch (e) {
      setDsStatus(null)
      toast({ title: 'Deep search failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' })
    }
  }, [dsRole, dsCompany, dsLocation])

  const runEnrich = useCallback(async () => {
    const ids = [...selected].slice(0, 25)
    if (!ids.length) return
    setEnriching(true)
    try {
      const res = await enrichEmails(ids)
      const byId = new Map(res.results.map((r) => [r.id, r]))
      const apply = (list: SourcedCandidate[]) => list.map((c) => {
        const r = c.id ? byId.get(c.id) : undefined
        return r?.email ? { ...c, emails: [r.email], providers: [...new Set([...c.providers, 'airscale'])] } : c
      })
      setResults(apply)
      setDsResults(apply)
      toast(summarizeEmailResults(res.results, ids.length))
      setSelected(new Set())
    } catch (e) {
      toast({ title: 'Email lookup failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' })
    } finally {
      setEnriching(false)
    }
  }, [selected])

  const applyFlagFilters = useCallback((list: SourcedCandidate[]) => list.map(withTalentFlags)
    .filter((c) => showUngettable || !c.ungettable)
    .filter((c) => !gemsOnly || c.hidden_gem), [gemsOnly, showUngettable])
  const visible = useMemo(() => applyFlagFilters(results), [applyFlagFilters, results])
  const visibleDs = useMemo(() => applyFlagFilters(dsResults), [applyFlagFilters, dsResults])
  const hiddenCount = useMemo(() => results.map(withTalentFlags).filter((c) => c.ungettable).length, [results])

  const toggle = (id?: string) => id && setSelected((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else if (n.size < 25) n.add(id)
    return n
  })

  const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm'

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><Globe className="w-5 h-5" />People Search</h1>
        <p className="text-sm text-muted-foreground">Search across Exa people profiles, Harmonic, GitHub and (when enabled) Parallel. Results are deduplicated and saved.</p>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex gap-2">
          <input aria-label="people query" className={inputCls} placeholder="e.g. senior ML infrastructure engineers with CUDA experience" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
          <button onClick={runSearch} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Search
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className={inputCls} placeholder="Titles (comma-separated)" value={titles} onChange={(e) => setTitles(e.target.value)} />
          <input className={inputCls} placeholder="Locations" value={locations} onChange={(e) => setLocations(e.target.value)} />
          <input className={inputCls} placeholder="Skills" value={skills} onChange={(e) => setSkills(e.target.value)} />
          <input className={inputCls} placeholder="Target companies" value={companies} onChange={(e) => setCompanies(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {ALL_SOURCES.map((s) => (
            <label key={s.key} className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={sources.has(s.key)} onChange={() => setSources((cur) => { const n = new Set(cur); if (n.has(s.key)) n.delete(s.key); else n.add(s.key); return n })} />
              {s.label}{sourceStats[s.key] ? ` (${sourceStats[s.key].count}${sourceStats[s.key].error ? ', failed' : ''})` : ''}
            </label>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{visible.length} of {results.length} candidates</span>
              <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" aria-label="hidden gems only" checked={gemsOnly} onChange={(e) => setGemsOnly(e.target.checked)} />Hidden gems only</label>
              <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" aria-label="show ungettable" checked={showUngettable} onChange={(e) => setShowUngettable(e.target.checked)} />Show ungettable ({hiddenCount})</label>
            </div>
            <button onClick={runEnrich} disabled={!selected.size || enriching} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs disabled:opacity-50">
              {enriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}Find emails ({selected.size}/25)
            </button>
          </div>
          {visible.map((c, i) => <CandidateRow key={c.id ?? i} c={c} selected={!!c.id && selected.has(c.id)} onToggle={() => toggle(c.id)} />)}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div>
          <h2 className="font-medium flex items-center gap-2"><Telescope className="w-4 h-4" />Deep search</h2>
          <p className="text-xs text-muted-foreground">Slower, verified list-building (Parallel FindAll or Exa Websets). Runs in the background; results appear as they're found. Higher cost.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input aria-label="deep search role" className={inputCls} placeholder="Role (required)" value={dsRole} onChange={(e) => setDsRole(e.target.value)} />
          <input className={inputCls} placeholder="Company" value={dsCompany} onChange={(e) => setDsCompany(e.target.value)} />
          <input className={inputCls} placeholder="Location" value={dsLocation} onChange={(e) => setDsLocation(e.target.value)} />
          <button onClick={runDeepSearch} disabled={!dsRole.trim() || (!!dsStatus && dsStatus.endsWith('…'))} className="rounded-md bg-secondary px-3 py-2 text-sm disabled:opacity-50">Start deep search</button>
        </div>
        {dsStatus && <div className="text-xs text-muted-foreground" data-testid="deep-status">{dsStatus}</div>}
        {visibleDs.map((c, i) => <CandidateRow key={c.id ?? `ds-${i}`} c={c} selected={!!c.id && selected.has(c.id)} onToggle={() => toggle(c.id)} />)}
      </div>
    </div>
  )
}

export default PeopleSearchTab
