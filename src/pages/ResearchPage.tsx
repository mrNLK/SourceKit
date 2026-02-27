import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FlaskConical, Play, AlertCircle, FileText, Sparkles, X, Plus, Pencil } from 'lucide-react'
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
import { generateAIStrategy } from '@/services/edgeFunctions'
import { parseSignals, calculateScore } from '@/lib/scoring'
import { captureException } from '@/lib/sentry'
import { track } from '@/lib/analytics'
import type { Candidate, ResearchStrategy } from '@/types'

const ROLE_KEYWORDS: Record<string, string[]> = {
  ml: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'neural networks', 'transformers', 'LLM'],
  ai: ['artificial intelligence', 'LLM', 'NLP', 'computer vision', 'RAG', 'fine-tuning'],
  frontend: ['react', 'vue', 'angular', 'typescript', 'CSS', 'UI', 'nextjs', 'svelte'],
  backend: ['API', 'microservices', 'distributed systems', 'databases', 'gRPC', 'message queues'],
  fullstack: ['react', 'node', 'typescript', 'API', 'fullstack', 'nextjs'],
  data: ['data engineering', 'spark', 'airflow', 'ETL', 'data pipeline', 'dbt', 'databricks'],
  devops: ['kubernetes', 'docker', 'CI/CD', 'terraform', 'infrastructure', 'helm', 'GitOps'],
  security: ['security', 'cryptography', 'penetration testing', 'zero trust', 'SAST', 'DAST'],
  mobile: ['iOS', 'android', 'react native', 'flutter', 'mobile', 'swift', 'kotlin'],
  platform: ['platform engineering', 'infrastructure', 'SRE', 'reliability', 'observability'],
  compiler: ['compiler', 'LLVM', 'WASM', 'language design', 'parser', 'AST', 'runtime'],
  rust: ['rust', 'tokio', 'wasm', 'systems programming', 'memory safety'],
  go: ['golang', 'go', 'microservices', 'cloud native', 'concurrency'],
}

const COMPETITOR_MAP: Record<string, string[]> = {
  google: ['meta', 'apple', 'microsoft', 'amazon', 'deepmind', 'waymo'],
  meta: ['google', 'apple', 'tiktok', 'snap', 'linkedin', 'twitter'],
  apple: ['google', 'microsoft', 'samsung', 'nvidia', 'qualcomm'],
  amazon: ['google', 'microsoft', 'shopify', 'cloudflare', 'vercel'],
  microsoft: ['google', 'amazon', 'salesforce', 'oracle', 'snowflake'],
  stripe: ['adyen', 'square', 'braintree', 'plaid', 'checkout.com'],
  openai: ['anthropic', 'google deepmind', 'cohere', 'mistral', 'meta ai'],
  anthropic: ['openai', 'google deepmind', 'cohere', 'mistral', 'meta ai'],
  nvidia: ['amd', 'intel', 'google', 'qualcomm', 'arm'],
  netflix: ['spotify', 'disney', 'hulu', 'youtube', 'twitch'],
  datadog: ['splunk', 'newrelic', 'grafana', 'elastic', 'pagerduty'],
  cloudflare: ['fastly', 'akamai', 'vercel', 'netlify', 'fly.io'],
  databricks: ['snowflake', 'dbt', 'fivetran', 'confluent', 'palantir'],
  vercel: ['netlify', 'cloudflare', 'fly.io', 'railway', 'render'],
  figma: ['sketch', 'framer', 'canva', 'adobe', 'invision'],
}

const EXAMPLE_PROMPTS = [
  { label: 'Staff ML Engineer @ Anthropic', title: 'Staff ML Engineer', company: 'Anthropic' },
  { label: 'Founding Engineer @ Series A AI startup', title: 'Founding Engineer', company: '' },
  { label: 'Staff Backend Engineer @ Stripe', title: 'Staff Backend Engineer', company: 'Stripe' },
]

const STRATEGY_STORAGE_KEY = 'sourcekit_last_strategy'

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

function generateLocalStrategy(jobTitle: string, companyName: string): ResearchStrategy {
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
  const titleMatch = jdText.match(/(?:^|\n)\s*(?:job\s+title|role|position)\s*[:-]\s*(.+)/i)
    || jdText.match(/^(.+?)\n/)
  const jobTitle = titleMatch?.[1]?.trim().slice(0, 60) || 'Engineer'
  const companyMatch = jdText.match(/(?:at|@|company)\s*[:-]?\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/m)
  const companyName = companyMatch?.[1]?.trim() || ''
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

function loadPersistedStrategy(): ResearchStrategy | null {
  try {
    const data = localStorage.getItem(STRATEGY_STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
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
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiSource, setAiSource] = useState<'ai' | 'local' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const { addCandidate, allCandidates } = useCandidates()
  const { addEntry } = useSearchHistory()
  const { settings } = useSettings()

  // Hydrate from navigation state or localStorage
  useEffect(() => {
    const state = location.state as { strategy?: ResearchStrategy } | null
    if (state?.strategy) {
      setJobTitle(state.strategy.jobTitle)
      setCompanyName(state.strategy.companyName)
      setStrategy(state.strategy)
    } else {
      const persisted = loadPersistedStrategy()
      if (persisted) {
        setJobTitle(persisted.jobTitle)
        setCompanyName(persisted.companyName)
        setStrategy(persisted)
      }
    }
  }, [location.state])

  // Persist strategy to localStorage
  useEffect(() => {
    if (strategy) {
      try {
        localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(strategy))
      } catch { /* non-critical */ }
    }
  }, [strategy])

  const handleGenerateStrategy = async () => {
    setIsGenerating(true)
    setAiSource(null)

    try {
      if (mode === 'jd') {
        if (!jdText.trim()) return
        // Try AI first for JD parsing
        try {
          const aiStrategy = await generateAIStrategy('', '', jdText.trim())
          if (aiStrategy) {
            setStrategy(aiStrategy)
            setJobTitle(aiStrategy.jobTitle)
            setCompanyName(aiStrategy.companyName)
            setAiSource('ai')
            setResults([])
            track('strategy_built', { mode, source: 'ai' })
            return
          }
        } catch (err) {
          console.warn('AI strategy failed, falling back to local:', err)
        }
        // Fall back to local
        const s = parseJDToStrategy(jdText.trim())
        setJobTitle(s.jobTitle)
        setCompanyName(s.companyName)
        setStrategy(s)
        setAiSource('local')
      } else {
        if (!jobTitle.trim()) return
        // Try AI first
        try {
          const aiStrategy = await generateAIStrategy(jobTitle.trim(), companyName.trim())
          if (aiStrategy) {
            setStrategy(aiStrategy)
            setAiSource('ai')
            setResults([])
            track('strategy_built', { mode, source: 'ai', job_title: jobTitle })
            return
          }
        } catch (err) {
          console.warn('AI strategy failed, falling back to local:', err)
        }
        // Fall back to local
        const s = generateLocalStrategy(jobTitle.trim(), companyName.trim())
        setStrategy(s)
        setAiSource('local')
      }
      setResults([])
      track('strategy_built', { mode, source: 'local', job_title: jobTitle })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExamplePrompt = (example: typeof EXAMPLE_PROMPTS[0]) => {
    setJobTitle(example.title)
    setCompanyName(example.company)
    setMode('role')
  }

  // Editable strategy helpers
  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field)
    setEditValue(currentValue)
  }

  const commitEdit = () => {
    if (!strategy || !editingField) return
    const updated = { ...strategy }
    if (editingField === 'keywords') {
      updated.keywords = editValue.split(',').map(s => s.trim()).filter(Boolean)
    } else if (editingField === 'targetCompanies') {
      updated.targetCompanies = editValue.split(',').map(s => s.trim()).filter(Boolean)
    } else if (editingField === 'targetRepos') {
      updated.targetRepos = editValue.split(',').map(s => s.trim()).filter(Boolean)
    } else if (editingField === 'searchQueries') {
      updated.searchQueries = editValue.split('\n').map(s => s.trim()).filter(Boolean)
    }
    setStrategy(updated)
    setEditingField(null)
    setEditValue('')
  }

  const removeItem = (field: 'keywords' | 'targetCompanies' | 'targetRepos' | 'searchQueries', index: number) => {
    if (!strategy) return
    const updated = { ...strategy }
    updated[field] = [...updated[field]]
    updated[field].splice(index, 1)
    setStrategy(updated)
  }

  const addItem = (field: 'keywords' | 'targetCompanies' | 'targetRepos' | 'searchQueries', value: string) => {
    if (!strategy || !value.trim()) return
    const updated = { ...strategy }
    updated[field] = [...updated[field], value.trim()]
    setStrategy(updated)
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
            // Improved dedup: check github_handle and name
            if (allResults.some(r => r.github_handle === user.username)) continue
            const signals = parseSignals(user.bio || '')
            const candidate: Candidate = {
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
            }
            candidate.score = calculateScore(candidate)
            allResults.push(candidate)
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

      // Sort by score
      allResults.sort((a, b) => b.score - a.score)
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
      c => (c.github_handle && c.github_handle === candidate.github_handle) ||
           (c.name.toLowerCase() === candidate.name.toLowerCase() &&
            c.company.toLowerCase() === candidate.company.toLowerCase())
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
          disabled={(mode === 'role' ? !jobTitle.trim() : !jdText.trim()) || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Generating Strategy...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Build Sourcing Strategy
            </span>
          )}
        </Button>
      </div>

      {/* Strategy Preview — editable */}
      {strategy && (
        <div className="px-4 pb-3 space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {strategy.jobTitle} {strategy.companyName && `@ ${strategy.companyName}`}
                </h3>
                {aiSource && (
                  <Badge variant={aiSource === 'ai' ? 'default' : 'secondary'} className="text-[10px]">
                    {aiSource === 'ai' ? (
                      <><Sparkles className="w-3 h-3 mr-0.5" /> AI-generated</>
                    ) : (
                      'keyword-based'
                    )}
                  </Badge>
                )}
              </div>

              {/* Editable Keywords */}
              <EditableSection
                label="Keywords"
                items={strategy.keywords}
                field="keywords"
                editingField={editingField}
                editValue={editValue}
                onStartEdit={startEditing}
                onCommitEdit={commitEdit}
                onSetEditValue={setEditValue}
                onRemove={removeItem}
                onAdd={addItem}
                onCancel={() => setEditingField(null)}
              />

              {/* Editable Target Companies */}
              {strategy.targetCompanies.length > 0 && (
                <EditableSection
                  label="Target Companies"
                  items={strategy.targetCompanies}
                  field="targetCompanies"
                  editingField={editingField}
                  editValue={editValue}
                  onStartEdit={startEditing}
                  onCommitEdit={commitEdit}
                  onSetEditValue={setEditValue}
                  onRemove={removeItem}
                  onAdd={addItem}
                  onCancel={() => setEditingField(null)}
                  variant="outline"
                />
              )}

              {/* Editable Target Repos */}
              {strategy.targetRepos.length > 0 && (
                <EditableSection
                  label="Target Repos"
                  items={strategy.targetRepos}
                  field="targetRepos"
                  editingField={editingField}
                  editValue={editValue}
                  onStartEdit={startEditing}
                  onCommitEdit={commitEdit}
                  onSetEditValue={setEditValue}
                  onRemove={removeItem}
                  onAdd={addItem}
                  onCancel={() => setEditingField(null)}
                  variant="outline"
                />
              )}

              {/* Editable Search Queries */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">
                    Search Queries ({strategy.searchQueries.length})
                  </p>
                  <button
                    onClick={() => startEditing('searchQueries', strategy.searchQueries.join('\n'))}
                    className="text-muted-foreground hover:text-foreground p-0.5"
                    title="Edit queries"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                {editingField === 'searchQueries' ? (
                  <div className="space-y-1">
                    <Textarea
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder="One query per line"
                      className="text-xs font-mono min-h-[80px]"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={commitEdit} className="h-6 text-[10px]">Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingField(null)} className="h-6 text-[10px]">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {strategy.searchQueries.map((q, i) => (
                      <div key={i} className="flex items-center gap-1 group">
                        <p className="text-xs text-foreground font-mono bg-secondary/50 rounded px-2 py-1 flex-1">
                          {q}
                        </p>
                        <button
                          onClick={() => removeItem('searchQueries', i)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
              showScore={true}
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

// Reusable editable section component for strategy fields
function EditableSection({
  label,
  items,
  field,
  editingField,
  editValue,
  onStartEdit,
  onCommitEdit,
  onSetEditValue,
  onRemove,
  onAdd,
  onCancel,
  variant = 'secondary',
}: {
  label: string
  items: string[]
  field: 'keywords' | 'targetCompanies' | 'targetRepos' | 'searchQueries'
  editingField: string | null
  editValue: string
  onStartEdit: (field: string, value: string) => void
  onCommitEdit: () => void
  onSetEditValue: (value: string) => void
  onRemove: (field: 'keywords' | 'targetCompanies' | 'targetRepos' | 'searchQueries', index: number) => void
  onAdd: (field: 'keywords' | 'targetCompanies' | 'targetRepos' | 'searchQueries', value: string) => void
  onCancel: () => void
  variant?: 'secondary' | 'outline'
}) {
  const [adding, setAdding] = useState(false)
  const [addValue, setAddValue] = useState('')

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">{label} ({items.length})</p>
        <button
          onClick={() => onStartEdit(field, items.join(', '))}
          className="text-muted-foreground hover:text-foreground p-0.5"
          title={`Edit ${label.toLowerCase()}`}
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
      {editingField === field ? (
        <div className="space-y-1">
          <Input
            value={editValue}
            onChange={e => onSetEditValue(e.target.value)}
            placeholder="Comma-separated values"
            className="text-xs"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={onCommitEdit} className="h-6 text-[10px]">Save</Button>
            <Button size="sm" variant="ghost" onClick={onCancel} className="h-6 text-[10px]">Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <Badge key={`${item}-${i}`} variant={variant} className="text-[10px] group gap-0.5" title={item}>
              {item}
              <button
                onClick={() => onRemove(field, i)}
                className="opacity-0 group-hover:opacity-100 ml-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
          {adding ? (
            <input
              autoFocus
              value={addValue}
              onChange={e => setAddValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && addValue.trim()) {
                  onAdd(field, addValue)
                  setAddValue('')
                  setAdding(false)
                } else if (e.key === 'Escape') {
                  setAdding(false)
                  setAddValue('')
                }
              }}
              onBlur={() => { setAdding(false); setAddValue('') }}
              className="w-24 px-2 py-0.5 text-[10px] bg-transparent border border-border rounded-full focus:outline-none focus:border-primary"
              placeholder="add..."
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-dashed border-border text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="w-2.5 h-2.5" />
              add
            </button>
          )}
        </div>
      )}
    </div>
  )
}
