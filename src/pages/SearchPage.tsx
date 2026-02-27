import { useState, useCallback, useMemo } from 'react'
import { Search as SearchIcon, EyeOff, Eye, AlertCircle, Gem, ChevronDown, Download } from 'lucide-react'
import { SearchForm } from '@/components/search/SearchForm'
import { CandidateCard } from '@/components/search/CandidateCard'
import { FilterBar } from '@/components/search/FilterBar'
import { SearchHistory } from '@/components/search/SearchHistory'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCandidates } from '@/hooks/useCandidates'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { useSettings } from '@/hooks/useSettings'
import { searchGitHubUsers, fetchGitHubProfile } from '@/services/github'
import { searchCandidatesViaExa, searchGitHubContributors } from '@/services/edgeFunctions'
import { parseSignals, calculateScore } from '@/lib/scoring'
import { captureException } from '@/lib/sentry'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { exportToCSV } from '@/services/export'
import type { Candidate, SearchQuery, SourceType } from '@/types'

const QUICK_START_CHIPS: Array<{ label: string; query: string }> = [
  { label: 'Rust systems engineers', query: 'Rust systems engineers contributing to tokio or hyper' },
  { label: 'React accessibility experts', query: 'React accessibility experts working on reach-ui or radix' },
  { label: 'ML infrastructure', query: 'ML infrastructure engineers contributing to pytorch or ray' },
  { label: 'Kubernetes contributors', query: 'Kubernetes contributors working on helm or istio' },
  { label: 'Security researchers', query: 'Security researchers contributing to OWASP or security tools' },
]

type SeniorityFilter = 'any' | 'junior' | 'mid' | 'senior'
type MinScoreFilter = 0 | 30 | 50 | 70 | 80

const MIN_SCORE_OPTIONS: Array<{ value: MinScoreFilter; label: string }> = [
  { value: 0, label: 'Any' },
  { value: 30, label: '30+' },
  { value: 50, label: '50+' },
  { value: 70, label: '70+' },
  { value: 80, label: '80+' },
]

const SENIORITY_TABS: Array<{ value: SeniorityFilter; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
]

function matchesSeniority(candidate: Candidate, seniority: SeniorityFilter): boolean {
  if (seniority === 'any') return true
  const text = `${candidate.role || ''} ${candidate.title || ''} ${candidate.bio || ''}`.toLowerCase()
  switch (seniority) {
    case 'senior':
      return /\b(senior|staff|principal|lead|director|head|vp|chief|cto|founder|architect)\b/.test(text)
    case 'mid':
      return /\b(mid|intermediate|software engineer|engineer ii|sde\s*2)\b/.test(text) ||
        (!matchesSeniority(candidate, 'senior') && !matchesSeniority(candidate, 'junior'))
    case 'junior':
      return /\b(junior|jr|intern|entry|associate|new grad|graduate)\b/.test(text)
    default:
      return true
  }
}

function isHiddenGem(candidate: Candidate): boolean {
  const followers = candidate.github_profile?.followers ?? 0
  const totalStars = candidate.github_profile?.repositories.reduce((s, r) => s + r.stars, 0) ?? 0
  const repos = candidate.github_profile?.public_repos ?? 0
  // High contribution signals but low visibility
  return followers < 200 && (repos >= 10 || totalStars >= 20 || candidate.score >= 40)
}

function loadHidePipelined(): boolean {
  try {
    return localStorage.getItem('sourcekit-hide-pipelined') === 'true'
  } catch {
    return false
  }
}

// Batch size for background GitHub profile fetching to avoid rate limits
const PROFILE_BATCH_SIZE = 5

export function SearchPage() {
  const [results, setResults] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<SourceType | 'all'>('all')
  const [hasSearched, setHasSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hidePipelined, setHidePipelined] = useState(loadHidePipelined)
  const [minScore, setMinScore] = useState<MinScoreFilter>(0)
  const [seniorityFilter, setSeniorityFilter] = useState<SeniorityFilter>('any')
  const [hiddenGemsOnly, setHiddenGemsOnly] = useState(false)
  const [showMinScoreDropdown, setShowMinScoreDropdown] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { addCandidate, allCandidates } = useCandidates()
  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory()
  const { settings } = useSettings()

  // Background enrichment: fetch GitHub profiles and recalculate scores
  const enrichWithGitHubProfiles = useCallback(async (candidates: Candidate[], token?: string) => {
    const batches: Candidate[][] = []
    for (let i = 0; i < candidates.length; i += PROFILE_BATCH_SIZE) {
      batches.push(candidates.slice(i, i + PROFILE_BATCH_SIZE))
    }

    for (const batch of batches) {
      const settled = await Promise.allSettled(
        batch.map(c => fetchGitHubProfile(c.github_handle!, token))
      )

      setResults(prev => {
        const updated = [...prev]
        for (let i = 0; i < batch.length; i++) {
          const result = settled[i]
          if (result.status !== 'fulfilled') continue
          const profile = result.value
          const idx = updated.findIndex(c => c.id === batch[i].id)
          if (idx === -1) continue
          const candidate = { ...updated[idx], github_profile: profile }
          // Re-parse signals from full profile bio + repo descriptions
          const bioText = `${profile.bio || ''} ${profile.repositories.map(r => r.description || '').join(' ')}`
          const profileSignals = parseSignals(bioText)
          // Merge signals: keep existing, add new unique ones
          const existingTypes = new Set(candidate.signals.map(s => `${s.type}:${s.label}`))
          for (const sig of profileSignals) {
            if (!existingTypes.has(`${sig.type}:${sig.label}`)) {
              candidate.signals.push(sig)
            }
          }
          candidate.score = calculateScore(candidate)
          updated[idx] = candidate
        }
        // Re-sort by score
        updated.sort((a, b) => b.score - a.score)
        // Update localStorage cache
        try {
          localStorage.setItem('sourcekit_last_search_results', JSON.stringify(updated))
        } catch { /* non-critical */ }
        return updated
      })
    }
  }, [])

  const handleSearch = useCallback(async (query: SearchQuery) => {
    setIsLoading(true)
    setHasSearched(true)
    setSearchError(null)
    const newResults: Candidate[] = []
    const errors: string[] = []
    const seenKeys = new Set<string>()

    const addResult = (c: Candidate) => {
      // Dedup by github_handle (primary) or name+company (fallback)
      if (c.github_handle) {
        const ghKey = `gh:${c.github_handle.toLowerCase()}`
        if (seenKeys.has(ghKey)) return
        seenKeys.add(ghKey)
      }
      const nameKey = `${c.name.toLowerCase()}|${(c.company || '').toLowerCase()}`
      if (seenKeys.has(nameKey)) return
      seenKeys.add(nameKey)
      newResults.push(c)
    }

    try {
      // GitHub profile fetch (direct handle)
      if (query.github_handle) {
        try {
          const profile = await fetchGitHubProfile(query.github_handle, settings.github_token || undefined)
          const bioText = `${profile.bio || ''} ${profile.repositories.map(r => r.description).join(' ')}`
          const signals = parseSignals(bioText)

          addResult({
            id: crypto.randomUUID(),
            name: query.name || profile.username,
            company: query.company || '',
            role: query.role || '',
            bio: profile.bio || undefined,
            avatar_url: profile.avatar_url,
            github_handle: profile.username,
            source: 'github',
            enrichment_data: null,
            github_profile: profile,
            stage: 'sourced',
            score: 0,
            notes: '',
            tags: [],
            signals,
            created_at: new Date().toISOString(),
          })
        } catch (err) {
          console.error('GitHub fetch error:', err)
          captureException(err, { github_handle: query.github_handle })
          errors.push(`GitHub profile lookup failed for "${query.github_handle}"`)
        }
      }

      // Capability-based search: use all three sources in parallel
      if (query.capability_query) {
        const ghQuery = query.capability_query + (query.role ? ` ${query.role}` : '')

        const [ghUsers, exaResults, ghContributors] = await Promise.allSettled([
          searchGitHubUsers(ghQuery, settings.github_token || undefined),
          searchCandidatesViaExa(query.capability_query, query.role, query.company),
          searchGitHubContributors(query.capability_query),
        ])

        // Process GitHub user search results
        if (ghUsers.status === 'fulfilled') {
          for (const user of ghUsers.value) {
            const signals = parseSignals(user.bio)
            addResult({
              id: crypto.randomUUID(),
              name: user.username,
              company: '',
              role: query.role || '',
              bio: user.bio || undefined,
              avatar_url: user.avatar_url,
              github_handle: user.username,
              source: 'github',
              enrichment_data: null,
              github_profile: null,
              stage: 'sourced',
              score: 0,
              notes: '',
              tags: [],
              signals,
              created_at: new Date().toISOString(),
            })
          }
        } else {
          errors.push('GitHub search failed')
        }

        // Process Exa results
        if (exaResults.status === 'fulfilled') {
          for (const candidate of exaResults.value) {
            const signals = parseSignals(candidate.bio || '')
            const source = candidate.source as SourceType || 'exa'
            addResult({
              id: crypto.randomUUID(),
              name: candidate.name || 'Unknown',
              company: '',
              role: query.role || '',
              bio: candidate.bio || undefined,
              profile_url: candidate.profile_url,
              source: source === 'linkedin' || source === 'github' ? source : 'exa',
              enrichment_data: null,
              github_profile: null,
              stage: 'sourced',
              score: 0,
              notes: '',
              tags: [],
              signals,
              created_at: new Date().toISOString(),
            })
          }
        }
        // Exa failure is non-fatal — just use GitHub results

        // Process GitHub contributor results
        if (ghContributors.status === 'fulfilled') {
          for (const contrib of ghContributors.value) {
            addResult({
              id: crypto.randomUUID(),
              name: contrib.username,
              company: '',
              role: query.role || '',
              avatar_url: contrib.avatar_url,
              github_handle: contrib.username,
              source: 'github',
              enrichment_data: null,
              github_profile: null,
              stage: 'sourced',
              score: 0,
              notes: '',
              tags: [],
              signals: [],
              created_at: new Date().toISOString(),
            })
          }
        }
        // Contributor failure is non-fatal
      }

      // Name/company search — web-sourced placeholder
      if (query.name && query.company) {
        const exists = newResults.some(
          r => r.name.toLowerCase() === query.name!.toLowerCase()
        )
        if (!exists) {
          // Only parse signals from candidate's own data (name + company), not the search query role
          const signals = parseSignals(`${query.name} ${query.company}`)
          addResult({
            id: crypto.randomUUID(),
            name: query.name,
            company: query.company,
            role: query.role || '',
            source: 'web',
            enrichment_data: null,
            stage: 'sourced',
            score: 0,
            notes: '',
            tags: [],
            signals,
            created_at: new Date().toISOString(),
          })
        }
      }

      // Calculate scores from signals for all results
      for (const c of newResults) {
        c.score = calculateScore(c)
      }
      // Sort by score descending
      newResults.sort((a, b) => b.score - a.score)

      setResults(newResults)
      // Cache results for Bulk Actions page
      try {
        localStorage.setItem('sourcekit_last_search_results', JSON.stringify(newResults))
      } catch { /* quota exceeded — non-critical */ }
      addEntry(query, newResults.length)
      track('search_executed', { result_count: newResults.length, has_github: Boolean(query.github_handle), has_capability: Boolean(query.capability_query) })

      // Background: fetch GitHub profiles for candidates with github_handle but no profile
      // Only runs when auto_enrich_github is enabled in settings
      if (settings.auto_enrich_github) {
        const needsProfile = newResults.filter(c => c.github_handle && !c.github_profile)
        if (needsProfile.length > 0) {
          enrichWithGitHubProfiles(needsProfile, settings.github_token || undefined)
        }
      }

      if (errors.length > 0) {
        setSearchError(errors.join('. '))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed'
      setSearchError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [settings.github_token, settings.auto_enrich_github, addEntry, enrichWithGitHubProfiles])

  const handleSave = useCallback((candidate: Candidate) => {
    addCandidate(candidate)
    track('candidate_pipelined', { source: candidate.source })
  }, [addCandidate])

  const isSaved = useCallback((candidate: Candidate) => {
    return allCandidates.some(
      c => (candidate.github_handle && c.github_handle === candidate.github_handle) ||
           (c.name.toLowerCase() === candidate.name.toLowerCase() &&
            c.company.toLowerCase() === candidate.company.toLowerCase())
    )
  }, [allCandidates])

  const toggleSelect = useCallback((candidate: Candidate) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(candidate.id)) next.delete(candidate.id)
      else next.add(candidate.id)
      return next
    })
  }, [])

  const handleBatchSave = useCallback(() => {
    let count = 0
    for (const candidate of results) {
      if (selectedIds.has(candidate.id) && !isSaved(candidate)) {
        addCandidate(candidate)
        count++
      }
    }
    setSelectedIds(new Set())
    if (count > 0) {
      track('batch_pipelined', { count })
    }
  }, [selectedIds, results, isSaved, addCandidate])

  const toggleHidePipelined = useCallback(() => {
    setHidePipelined(prev => {
      const next = !prev
      localStorage.setItem('sourcekit-hide-pipelined', String(next))
      return next
    })
  }, [])

  const sourceFiltered = sourceFilter === 'all'
    ? results
    : results.filter(r => r.source === sourceFilter)

  const pipelinedCount = hidePipelined
    ? sourceFiltered.filter(r => isSaved(r)).length
    : 0

  // Apply all filters: source, pipeline, min score, seniority, hidden gems
  const filteredResults = useMemo(() => {
    let filtered = sourceFiltered
    if (hidePipelined) filtered = filtered.filter(r => !isSaved(r))
    if (minScore > 0) filtered = filtered.filter(r => r.score >= minScore)
    if (seniorityFilter !== 'any') filtered = filtered.filter(r => matchesSeniority(r, seniorityFilter))
    if (hiddenGemsOnly) filtered = filtered.filter(r => isHiddenGem(r))
    return filtered
  }, [sourceFiltered, hidePipelined, isSaved, minScore, seniorityFilter, hiddenGemsOnly])

  const totalFound = results.length
  const afterFilters = filteredResults.length

  const sourceCounts = results.reduce((acc, r) => {
    acc[r.source] = (acc[r.source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-col">
      <SearchForm onSearch={handleSearch} isLoading={isLoading} />

      {results.length > 0 && (
        <>
          <div className="flex items-center gap-2 pr-4">
            <div className="flex-1 overflow-x-auto">
              <FilterBar
                activeFilter={sourceFilter}
                onFilterChange={setSourceFilter}
                counts={sourceCounts}
              />
            </div>
            <button
              onClick={toggleHidePipelined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                hidePipelined
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {hidePipelined ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              Hide pipelined
              {hidePipelined && pipelinedCount > 0 && (
                <span className="text-[10px] text-primary/70">({pipelinedCount} hidden)</span>
              )}
            </button>
          </div>

          {/* Advanced Filters Row: Seniority, Min Score, Hidden Gems */}
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
            {/* Seniority tabs */}
            <div className="flex items-center gap-1 shrink-0">
              {SENIORITY_TABS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSeniorityFilter(value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    seniorityFilter === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-border shrink-0" />

            {/* Min Score dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowMinScoreDropdown(!showMinScoreDropdown)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  minScore > 0
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                Min Score {minScore > 0 ? `${minScore}+` : 'Any'}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showMinScoreDropdown && (
                <div className="absolute left-0 top-full mt-1 w-28 bg-card border border-border rounded-lg shadow-lg z-20">
                  {MIN_SCORE_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setMinScore(value)
                        setShowMinScoreDropdown(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors first:rounded-t-lg last:rounded-b-lg',
                        value === minScore ? 'text-primary font-medium' : 'text-foreground'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-border shrink-0" />

            {/* Hidden Gems toggle */}
            <button
              onClick={() => setHiddenGemsOnly(!hiddenGemsOnly)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                hiddenGemsOnly
                  ? 'bg-emerald-600 text-white'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              <Gem className="w-3 h-3" />
              Hidden Gems
            </button>

            {/* Funnel */}
            {(minScore > 0 || seniorityFilter !== 'any' || hiddenGemsOnly) && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                {totalFound} found &rarr; {afterFilters} filtered
              </span>
            )}
          </div>
        </>
      )}

      {/* Search error */}
      {searchError && (
        <div className="mx-4 mb-2 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive flex-1">{searchError}</p>
          <button onClick={() => setSearchError(null)} className="text-destructive/60 hover:text-destructive text-xs">
            dismiss
          </button>
        </div>
      )}

      {hasSearched && results.length === 0 && !isLoading && (
        <EmptyState
          icon={SearchIcon}
          title="No results found"
          description="Try broadening your search or using different keywords"
        />
      )}

      {filteredResults.length > 0 && (
        <div className="space-y-3 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Showing {filteredResults.length} of {totalFound} engineer{totalFound !== 1 ? 's' : ''}
              </p>
              {/* Batch select controls */}
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBatchSave}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Save {selectedIds.size} to Pipeline
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const unsavedIds = filteredResults.filter(c => !isSaved(c)).map(c => c.id)
                  if (selectedIds.size === unsavedIds.length) {
                    setSelectedIds(new Set())
                  } else {
                    setSelectedIds(new Set(unsavedIds))
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                {selectedIds.size > 0 ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={() => exportToCSV(filteredResults)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-3 h-3" />
                Export CSV
              </button>
            </div>
          </div>
          {filteredResults.map(candidate => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onSave={handleSave}
              saved={isSaved(candidate)}
              showScore={true}
              selectable={true}
              selected={selectedIds.has(candidate.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {!hasSearched && (
        <>
          {/* Quick Start Chips */}
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground mb-2">Quick start — click to preview, double-click to search:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_START_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => {
                    // Single click: fill the search with expanded query (preview)
                    handleSearch({ capability_query: chip.query })
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title={chip.query}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <SearchHistory
            history={history}
            onRerun={handleSearch}
            onDelete={removeEntry}
            onClear={clearHistory}
          />
        </>
      )}
    </div>
  )
}
