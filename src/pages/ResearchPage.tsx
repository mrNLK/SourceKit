import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FlaskConical, Play, RefreshCw, AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { OnboardingBanner } from '@/components/OnboardingBanner'
import { CandidateCard } from '@/components/search/CandidateCard'
import { useCandidates } from '@/hooks/useCandidates'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { useSettings } from '@/hooks/useSettings'
import { searchGitHubUsers } from '@/services/github'
import { parseSignals } from '@/lib/scoring'
import { captureException } from '@/lib/sentry'
import { track } from '@/lib/analytics'
import type { Candidate, ResearchStrategy } from '@/types'

const ROLE_KEYWORDS: Record<string, string[]> = {
  ml: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'neural networks'],
  ai: ['artificial intelligence', 'LLM', 'NLP', 'computer vision'],
  frontend: ['react', 'vue', 'angular', 'typescript', 'CSS', 'UI'],
  backend: ['API', 'microservices', 'distributed systems', 'databases'],
  fullstack: ['react', 'node', 'typescript', 'API', 'fullstack'],
  data: ['data engineering', 'spark', 'airflow', 'ETL', 'data pipeline'],
  devops: ['kubernetes', 'docker', 'CI/CD', 'terraform', 'infrastructure'],
  security: ['security', 'cryptography', 'penetration testing'],
  mobile: ['iOS', 'android', 'react native', 'flutter', 'mobile'],
  platform: ['platform engineering', 'infrastructure', 'SRE', 'reliability'],
  compiler: ['compiler', 'LLVM', 'WASM', 'language design', 'parser'],
}

const COMPETITOR_MAP: Record<string, string[]> = {
  google: ['meta', 'apple', 'microsoft', 'amazon'],
  meta: ['google', 'apple', 'tiktok', 'snap'],
  apple: ['google', 'microsoft', 'samsung'],
  amazon: ['google', 'microsoft', 'shopify'],
  microsoft: ['google', 'amazon', 'salesforce'],
  stripe: ['adyen', 'square', 'braintree'],
  openai: ['anthropic', 'google deepmind', 'cohere', 'mistral'],
  anthropic: ['openai', 'google deepmind', 'cohere', 'mistral'],
}

const EXAMPLE_PROMPTS = [
  { label: 'Staff ML Engineer @ Anthropic', title: 'Staff ML Engineer', company: 'Anthropic' },
  { label: 'Founding Engineer @ Series A AI startup', title: 'Founding Engineer', company: '' },
  { label: 'Staff Backend Engineer @ Stripe', title: 'Staff Backend Engineer', company: 'Stripe' },
]

function extractKeywords(jobTitle: string): string[] {
  const lower = jobTitle.toLowerCase()
  const matched: string[] = []
  for (const [key, keywords] of Object.entries(ROLE_KEYWORDS)) {
    if (lower.includes(key)) {
      matched.push(...keywords)
    }
  }
  const titleWords = lower
    .replace(/\b(senior|junior|lead|principal|staff|intern|associate|manager|director|head|vp|chief|founding)\b/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2)
  matched.push(...titleWords)
  return [...new Set(matched)]
}

function getCompetitors(company: string): string[] {
  const lower = company.toLowerCase()
  for (const [key, competitors] of Object.entries(COMPETITOR_MAP)) {
    if (lower.includes(key)) return competitors
  }
  return []
}

function generateStrategy(jobTitle: string, companyName: string): ResearchStrategy {
  const keywords = extractKeywords(jobTitle)
  const competitors = getCompetitors(companyName)
  const targetCompanies = companyName ? [companyName, ...competitors] : []
  const targetRepos = keywords.slice(0, 3).map(k => `${k} projects`)

  const searchQueries = [
    keywords.slice(0, 3).join(' ') + (jobTitle ? ` ${jobTitle}` : ''),
    ...targetCompanies.slice(0, 3).map(c => `${c} ${keywords[0] || 'engineer'}`),
  ]

  return {
    jobTitle,
    companyName,
    searchQueries,
    targetCompanies,
    targetRepos,
    keywords,
    generatedAt: new Date().toISOString(),
  }
}

function parseJDToStrategy(jdText: string): ResearchStrategy {
  const lower = jdText.toLowerCase()

  // Extract job title from first line or common patterns
  const titleMatch = jdText.match(/(?:^|\n)\s*(?:job\s+title|role|position)\s*[:-]\s*(.+)/i)
    || jdText.match(/^(.+?)\n/)
  const jobTitle = titleMatch?.[1]?.trim().slice(0, 60) || 'Engineer'

  // Extract company name
  const companyMatch = jdText.match(/(?:at|@|company)\s*[:-]?\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/m)
  const companyName = companyMatch?.[1]?.trim() || ''

  // Extract keywords from the JD
  const allKeywords: string[] = []
  for (const [, keywords] of Object.entries(ROLE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        allKeywords.push(kw)
      }
    }
  }

  const keywords = [...new Set(allKeywords)]
  const competitors = getCompetitors(companyName)
  const targetCompanies = companyName ? [companyName, ...competitors] : []

  return {
    jobTitle,
    companyName,
    searchQueries: [
      keywords.slice(0, 3).join(' ') + ` ${jobTitle}`,
      ...targetCompanies.slice(0, 2).map(c => `${c} ${keywords[0] || 'engineer'}`),
    ],
    targetCompanies,
    targetRepos: keywords.slice(0, 3).map(k => `${k} projects`),
    keywords,
    generatedAt: new Date().toISOString(),
  }
}

type ResearchMode = 'role' | 'jd'

export function ResearchPage() {
  const location = useLocation()
  const [mode, setMode] = useState<ResearchMode>('role')
  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jdText, setJdText] = useState('')
  const [strategy, setStrategy] = useState<ResearchStrategy | null>(null)
  const [results, setResults] = useState<Candidate[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { addCandidate, allCandidates } = useCandidates()
  const { addEntry } = useSearchHistory()
  const { settings } = useSettings()

  // Hydrate from navigation state (re-run from history)
  useEffect(() => {
    const state = location.state as { strategy?: ResearchStrategy } | null
    if (state?.strategy) {
      setJobTitle(state.strategy.jobTitle)
      setCompanyName(state.strategy.companyName)
      setStrategy(state.strategy)
    }
  }, [location.state])

  const handleGenerateStrategy = () => {
    if (mode === 'role') {
      if (!jobTitle.trim()) return
      const s = generateStrategy(jobTitle.trim(), companyName.trim())
      setStrategy(s)
    } else {
      if (!jdText.trim()) return
      const s = parseJDToStrategy(jdText.trim())
      setJobTitle(s.jobTitle)
      setCompanyName(s.companyName)
      setStrategy(s)
    }
    setResults([])
    track('strategy_built', { mode, job_title: jobTitle })
  }

  const handleExamplePrompt = (example: typeof EXAMPLE_PROMPTS[0]) => {
    setJobTitle(example.title)
    setCompanyName(example.company)
    setMode('role')
  }

  const handleSearchWithStrategy = useCallback(async () => {
    if (!strategy) return
    setIsRunning(true)
    setError(null)
    const allResults: Candidate[] = []
    let failedQueries = 0

    try {
      for (const query of strategy.searchQueries) {
        try {
          const users = await searchGitHubUsers(query, settings.github_token || undefined)
          for (const user of users) {
            if (allResults.some(r => r.github_handle === user.username)) continue
            const signals = parseSignals(`${user.bio || ''} ${query}`)
            allResults.push({
              id: crypto.randomUUID(),
              name: user.username,
              company: '',
              role: strategy.jobTitle,
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
        } catch (err) {
          failedQueries++
          console.error(`Strategy query failed: ${query}`, err)
          captureException(err, { query })
        }
      }

      if (failedQueries > 0 && allResults.length === 0) {
        setError(`All ${failedQueries} search queries failed. Check your GitHub token in Settings or try again.`)
      } else if (failedQueries > 0) {
        setError(`${failedQueries} of ${strategy.searchQueries.length} queries failed. Partial results shown.`)
      }

      setResults(allResults)

      const expandedQuery = strategy.searchQueries.join(' | ')
      addEntry(
        { capability_query: expandedQuery, role: strategy.jobTitle, company: strategy.companyName },
        allResults.length,
        {
          type: 'research_strategy',
          strategy,
          role: strategy.jobTitle,
          company: strategy.companyName,
        }
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Strategy search failed'
      setError(msg)
    } finally {
      setIsRunning(false)
    }
  }, [strategy, settings.github_token, addEntry])

  const handleSave = useCallback((candidate: Candidate) => {
    addCandidate(candidate)
  }, [addCandidate])

  const isSaved = useCallback((candidate: Candidate) => {
    return allCandidates.some(
      c => c.name.toLowerCase() === candidate.name.toLowerCase() &&
           c.company.toLowerCase() === candidate.company.toLowerCase()
    )
  }, [allCandidates])

  return (
    <div className="flex flex-col">
      <OnboardingBanner />

      {/* Strategy Builder */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FlaskConical className="w-4 h-4 text-primary" />
          Research Strategy Builder
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-lg">
          <button
            onClick={() => setMode('role')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              mode === 'role' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Role + Company
          </button>
          <button
            onClick={() => setMode('jd')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              mode === 'jd' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Job Description
          </button>
        </div>

        {mode === 'role' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Job title (e.g. ML Engineer)"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              />
              <Input
                placeholder="Company (optional)"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>

            {/* Example prompts */}
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map(ex => (
                <button
                  key={ex.label}
                  onClick={() => handleExamplePrompt(ex)}
                  className="px-3 py-1.5 rounded-full text-xs bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <Textarea
            placeholder="Paste a job description here..."
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            className="min-h-[120px]"
          />
        )}

        <Button
          onClick={handleGenerateStrategy}
          disabled={mode === 'role' ? !jobTitle.trim() : !jdText.trim()}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Build Sourcing Strategy
        </Button>
      </div>

      {/* Strategy Preview */}
      {strategy && (
        <div className="px-4 pb-3 space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {strategy.jobTitle} {strategy.companyName && `@ ${strategy.companyName}`}
                </h3>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Keywords</p>
                <div className="flex flex-wrap gap-1">
                  {strategy.keywords.map(k => (
                    <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>
                  ))}
                </div>
              </div>

              {strategy.targetCompanies.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Target Companies ({strategy.targetCompanies.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {strategy.targetCompanies.map(c => (
                      <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {strategy.targetRepos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Target Repos ({strategy.targetRepos.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {strategy.targetRepos.map(r => (
                      <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Search Queries ({strategy.searchQueries.length})
                </p>
                <div className="space-y-1">
                  {strategy.searchQueries.map((q, i) => (
                    <p key={i} className="text-xs text-foreground font-mono bg-secondary/50 rounded px-2 py-1">
                      {q}
                    </p>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSearchWithStrategy}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Running Strategy...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Run Strategy
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mx-4 mb-3 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive text-xs">
            dismiss
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3 px-4 pb-4">
          <p className="text-sm text-muted-foreground">
            {results.length} candidate{results.length !== 1 ? 's' : ''} found
          </p>
          {results.map(candidate => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onSave={handleSave}
              saved={isSaved(candidate)}
            />
          ))}
        </div>
      )}

      {!strategy && results.length === 0 && (
        <EmptyState
          icon={FlaskConical}
          title="Build a research strategy"
          description="Enter a job title or paste a JD to generate a targeted sourcing strategy with keywords, companies, and search queries"
        />
      )}
    </div>
  )
}
