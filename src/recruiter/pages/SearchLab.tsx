import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import TierBadge from '../components/TierBadge'
import { useRecruiterScorecards } from '../hooks/useRecruiterScorecard'
import { useRecruiterSavedSearches } from '../hooks/useRecruiterSavedSearches'
import {
  Search,
  Sliders,
  Play,
  Save,
  Bookmark,
  ChevronDown,
  ChevronRight,
  X,
  ToggleLeft,
  ToggleRight,
  GitBranch,
  Eye,
  Sparkles,
  Building2,
  FileText,
  Globe,
  Database,
} from 'lucide-react'
import { SUGGESTED_ARCHETYPES, DEFAULT_SEARCH_SOURCES, DEFAULT_SEARCH_MODES, OUTREACH_TONES } from '../lib/constants'
import type { RecruiterSearchConfig, SearchSource, SearchMode } from '../lib/types'

type SectionKey = 'roleBrief' | 'archetypes' | 'proofSignals' | 'sources' | 'filters'

interface ProofSignal {
  id: string
  name: string
  weight: number
}

const SOURCE_LABELS: { key: keyof SearchSource; label: string; icon: typeof GitBranch }[] = [
  { key: 'github', label: 'GitHub', icon: GitBranch },
  { key: 'linkedin', label: 'LinkedIn', icon: Globe },
  { key: 'web_blog', label: 'Web / Blog', icon: FileText },
  { key: 'huggingface', label: 'HuggingFace', icon: Database },
  { key: 'conference_talks', label: 'Conference Talks', icon: Eye },
  { key: 'company_mapping', label: 'Company Mapping', icon: Building2 },
  { key: 'exa_websets', label: 'Exa Websets', icon: Sparkles },
]

const MODE_LABELS: { key: keyof SearchMode; label: string }[] = [
  { key: 'standard', label: 'Standard Search' },
  { key: 'hidden_gem', label: 'Hidden Gem Mode' },
  { key: 'company_mapping', label: 'Company Mapping' },
  { key: 'artifact_led', label: 'Artifact-Led' },
]

const SENIORITY_OPTIONS = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal', 'Lead']

let signalIdCounter = 0
function nextSignalId() {
  signalIdCounter += 1
  return `signal-${signalIdCounter}`
}

export default function SearchLab() {
  const navigate = useNavigate()
  const { data: scorecards } = useRecruiterScorecards()
  const { data: savedSearches } = useRecruiterSavedSearches()

  // --- Section collapse state ---
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(['roleBrief'])
  )

  // --- Search config state ---
  const [roleName, setRoleName] = useState('')
  const [scorecardId, setScorecardId] = useState<string | null>(null)
  const [roleBrief, setRoleBrief] = useState('')
  const [archetypes, setArchetypes] = useState<string[]>([])
  const [customArchetype, setCustomArchetype] = useState('')
  const [proofSignals, setProofSignals] = useState<ProofSignal[]>([])
  const [sources, setSources] = useState<SearchSource>({ ...DEFAULT_SEARCH_SOURCES })
  const [recencyMonths, setRecencyMonths] = useState(12)
  const [location, setLocation] = useState('')
  const [seniority, setSeniority] = useState('Senior')
  const [scoreFloor, setScoreFloor] = useState(0)
  const [suppressions, setSuppressions] = useState('')
  const [modes, setModes] = useState<SearchMode>({ ...DEFAULT_SEARCH_MODES })

  // --- UI state ---
  const [parseMessage, setParseMessage] = useState<string | null>(null)
  const [showLoadDropdown, setShowLoadDropdown] = useState(false)

  function toggleSection(key: SectionKey) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function isSectionOpen(key: SectionKey) {
    return openSections.has(key)
  }

  function addArchetype(a: string) {
    const trimmed = a.trim()
    if (trimmed && !archetypes.includes(trimmed)) {
      setArchetypes((prev) => [...prev, trimmed])
    }
  }

  function removeArchetype(a: string) {
    setArchetypes((prev) => prev.filter((x) => x !== a))
  }

  function addProofSignal() {
    setProofSignals((prev) => [...prev, { id: nextSignalId(), name: '', weight: 50 }])
  }

  function updateSignal(id: string, field: 'name' | 'weight', value: string | number) {
    setProofSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  function removeSignal(id: string) {
    setProofSignals((prev) => prev.filter((s) => s.id !== id))
  }

  function toggleSource(key: keyof SearchSource) {
    setSources((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleMode(key: keyof SearchMode) {
    setModes((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleParseAI() {
    setParseMessage('AI parsing is not yet connected. Role brief saved locally.')
    setTimeout(() => setParseMessage(null), 3000)
  }

  function handleRunSearch() {
    // TODO: Wire to recruiter-search-orchestrator edge function
  }

  function handleSaveSearch() {
    // TODO: Save via useSaveSearch mutation
  }

  function handleLoadSearch(config: RecruiterSearchConfig) {
    setRoleName(config.role_name)
    setRoleBrief(config.role_brief)
    setScorecardId(config.scorecard_id)
    setArchetypes([...config.archetypes])
    setSources({ ...config.sources })
    setRecencyMonths(config.recency_months)
    setLocation(config.location_preference)
    setSeniority(config.seniority_band)
    setScoreFloor(config.score_floor)
    setSuppressions(config.suppressions.join('\n'))
    setModes({ ...config.modes })
    setShowLoadDropdown(false)
  }

  // --- Shared styles ---
  const inputStyle: React.CSSProperties = {
    background: 'var(--ros-bg-secondary)',
    border: '1px solid var(--ros-border)',
    color: 'var(--ros-text-primary)',
    borderRadius: 6,
  }

  const sectionHeaderStyle: React.CSSProperties = {
    color: 'var(--ros-text-primary)',
    borderBottom: '1px solid var(--ros-border)',
    cursor: 'pointer',
    userSelect: 'none',
  }

  function SectionHeader({ sectionKey, label }: { sectionKey: SectionKey; label: string }) {
    const open = isSectionOpen(sectionKey)
    return (
      <button
        className="flex items-center gap-2 w-full py-2.5 px-1 text-sm font-semibold tracking-tight"
        style={sectionHeaderStyle}
        onClick={() => toggleSection(sectionKey)}
        type="button"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label}
      </button>
    )
  }

  return (
    <div className="ros-fade-in p-4 lg:p-6 h-full flex flex-col">
      <PageHeader
        title="Search Lab"
        subtitle="Configure, tune, and run recruiter searches"
        actions={
          <div className="flex items-center gap-2">
            <Sliders size={16} style={{ color: 'var(--ros-text-muted)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--ros-text-muted)' }}>
              Recruiter Search Workspace
            </span>
          </div>
        }
      />

      {/* Parse AI toast */}
      {parseMessage && (
        <div
          className="mb-4 px-3 py-2 rounded text-xs font-mono flex items-center gap-2"
          style={{
            background: 'var(--ros-accent-muted)',
            color: 'var(--ros-accent)',
            border: '1px solid var(--ros-accent)',
          }}
        >
          <Sparkles size={12} />
          {parseMessage}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
        {/* ====== LEFT PANEL — SEARCH CONFIG ====== */}
        <div
          className="lg:w-[45%] flex flex-col rounded-lg overflow-hidden"
          style={{
            background: 'var(--ros-bg-card)',
            border: '1px solid var(--ros-border)',
          }}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* --- 1. Role Brief (always open) --- */}
            <SectionHeader sectionKey="roleBrief" label="Role Brief" />
            {isSectionOpen('roleBrief') && (
              <div className="space-y-3 pt-3 pb-2">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ros-text-secondary)' }}>
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Senior ML Engineer"
                    className="w-full px-3 py-2 text-sm rounded"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ros-text-secondary)' }}>
                    Scorecard
                  </label>
                  <select
                    value={scorecardId ?? ''}
                    onChange={(e) => setScorecardId(e.target.value || null)}
                    className="w-full px-3 py-2 text-sm rounded"
                    style={inputStyle}
                  >
                    <option value="">No scorecard selected</option>
                    {scorecards?.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ros-text-secondary)' }}>
                    Role brief or JD paste
                  </label>
                  <textarea
                    value={roleBrief}
                    onChange={(e) => setRoleBrief(e.target.value)}
                    placeholder="Paste a job description or describe the ideal candidate..."
                    rows={6}
                    className="w-full px-3 py-2 text-sm rounded resize-none"
                    style={inputStyle}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleParseAI}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded"
                  style={{
                    background: 'var(--ros-accent-muted)',
                    color: 'var(--ros-accent)',
                    border: '1px solid var(--ros-accent)',
                  }}
                >
                  <Sparkles size={12} />
                  Parse with AI
                </button>
              </div>
            )}

            {/* --- 2. Target Archetypes --- */}
            <SectionHeader sectionKey="archetypes" label="Target Archetypes" />
            {isSectionOpen('archetypes') && (
              <div className="space-y-3 pt-3 pb-2">
                {/* Selected archetypes as pills */}
                {archetypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {archetypes.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => removeArchetype(a)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded"
                        style={{
                          background: 'var(--ros-accent-muted)',
                          color: 'var(--ros-accent)',
                          border: '1px solid var(--ros-accent)',
                        }}
                      >
                        {a}
                        <X size={10} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggested archetypes */}
                <div>
                  <span className="block text-xs mb-1.5" style={{ color: 'var(--ros-text-muted)' }}>
                    Suggested
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_ARCHETYPES.filter((a) => !archetypes.includes(a)).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => addArchetype(a)}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          background: 'var(--ros-bg-tertiary)',
                          color: 'var(--ros-text-secondary)',
                          border: '1px solid var(--ros-border)',
                        }}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom archetype input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customArchetype}
                    onChange={(e) => setCustomArchetype(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addArchetype(customArchetype)
                        setCustomArchetype('')
                      }
                    }}
                    placeholder="Add custom archetype..."
                    className="flex-1 px-3 py-1.5 text-xs rounded"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addArchetype(customArchetype)
                      setCustomArchetype('')
                    }}
                    className="px-2 py-1.5 text-xs font-mono rounded"
                    style={{
                      background: 'var(--ros-bg-tertiary)',
                      color: 'var(--ros-text-secondary)',
                      border: '1px solid var(--ros-border)',
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* --- 3. Proof Signals --- */}
            <SectionHeader sectionKey="proofSignals" label="Proof Signals" />
            {isSectionOpen('proofSignals') && (
              <div className="space-y-3 pt-3 pb-2">
                {proofSignals.map((signal) => (
                  <div key={signal.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={signal.name}
                      onChange={(e) => updateSignal(signal.id, 'name', e.target.value)}
                      placeholder="Signal name"
                      className="flex-1 px-2 py-1.5 text-xs rounded"
                      style={inputStyle}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={signal.weight}
                      onChange={(e) => updateSignal(signal.id, 'weight', Number(e.target.value))}
                      className="w-20"
                    />
                    <span
                      className="text-xs font-mono w-8 text-right"
                      style={{ color: 'var(--ros-text-muted)' }}
                    >
                      {signal.weight}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSignal(signal.id)}
                      className="p-1 rounded"
                      style={{ color: 'var(--ros-text-muted)' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addProofSignal}
                  className="text-xs font-mono px-3 py-1.5 rounded"
                  style={{
                    background: 'var(--ros-bg-tertiary)',
                    color: 'var(--ros-text-secondary)',
                    border: '1px solid var(--ros-border)',
                  }}
                >
                  + Add signal
                </button>
              </div>
            )}

            {/* --- 4. Source Selection --- */}
            <SectionHeader sectionKey="sources" label="Source Selection" />
            {isSectionOpen('sources') && (
              <div className="space-y-2 pt-3 pb-2">
                {SOURCE_LABELS.map(({ key, label, icon: Icon }) => {
                  const active = sources[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSource(key)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs rounded"
                      style={{
                        background: active ? 'var(--ros-accent-muted)' : 'var(--ros-bg-secondary)',
                        border: `1px solid ${active ? 'var(--ros-accent)' : 'var(--ros-border)'}`,
                        color: active ? 'var(--ros-accent)' : 'var(--ros-text-secondary)',
                      }}
                    >
                      {active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      <Icon size={14} />
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* --- 5. Filters --- */}
            <SectionHeader sectionKey="filters" label="Filters" />
            {isSectionOpen('filters') && (
              <div className="space-y-3 pt-3 pb-2">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ros-text-secondary)' }}>
                    Activity in last N months
                  </label>
                  <input
                    type="number"
                    value={recencyMonths}
                    onChange={(e) => setRecencyMonths(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 text-sm rounded"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ros-text-secondary)' }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. SF Bay Area, Remote US"
                    className="w-full px-3 py-2 text-sm rounded"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ros-text-secondary)' }}>
                    Seniority
                  </label>
                  <select
                    value={seniority}
                    onChange={(e) => setSeniority(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded"
                    style={inputStyle}
                  >
                    {SENIORITY_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ros-text-secondary)' }}>
                    Score floor (0-100)
                  </label>
                  <input
                    type="number"
                    value={scoreFloor}
                    onChange={(e) => setScoreFloor(Math.min(100, Math.max(0, Number(e.target.value))))}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2 text-sm rounded"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ros-text-secondary)' }}>
                    Suppressions (one per line)
                  </label>
                  <textarea
                    value={suppressions}
                    onChange={(e) => setSuppressions(e.target.value)}
                    placeholder="company names or individual names to exclude..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs rounded resize-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* --- 6. Search Modes (toggle row) --- */}
            <div className="pt-4 pb-2">
              <span className="block text-xs font-semibold mb-2" style={{ color: 'var(--ros-text-primary)' }}>
                Search Modes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MODE_LABELS.map(({ key, label }) => {
                  const active = modes[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleMode(key)}
                      className="px-3 py-1.5 text-xs font-mono rounded"
                      style={{
                        background: active ? 'var(--ros-accent-muted)' : 'var(--ros-bg-tertiary)',
                        color: active ? 'var(--ros-accent)' : 'var(--ros-text-muted)',
                        border: `1px solid ${active ? 'var(--ros-accent)' : 'var(--ros-border)'}`,
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* --- Action Bar (sticky bottom) --- */}
          <div
            className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
            style={{
              borderTop: '1px solid var(--ros-border)',
              background: 'var(--ros-bg-card)',
            }}
          >
            <button
              type="button"
              onClick={handleRunSearch}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-mono font-semibold rounded"
              style={{
                background: 'var(--ros-accent)',
                color: 'var(--ros-bg-card)',
              }}
            >
              <Play size={14} />
              Run Search
            </button>

            <button
              type="button"
              onClick={handleSaveSearch}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-mono rounded"
              style={{
                background: 'var(--ros-bg-secondary)',
                color: 'var(--ros-text-secondary)',
                border: '1px solid var(--ros-border)',
              }}
            >
              <Save size={14} />
              Save Search
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLoadDropdown((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-mono rounded"
                style={{
                  background: 'var(--ros-bg-secondary)',
                  color: 'var(--ros-text-secondary)',
                  border: '1px solid var(--ros-border)',
                }}
              >
                <Bookmark size={14} />
                Load Saved
                <ChevronDown size={12} />
              </button>

              {showLoadDropdown && (
                <div
                  className="absolute bottom-full left-0 mb-1 w-64 rounded-lg shadow-lg overflow-hidden z-20"
                  style={{
                    background: 'var(--ros-bg-card)',
                    border: '1px solid var(--ros-border)',
                  }}
                >
                  {savedSearches && savedSearches.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto">
                      {savedSearches.map((ss) => (
                        <button
                          key={ss.id}
                          type="button"
                          onClick={() => handleLoadSearch(ss.config)}
                          className="w-full text-left px-3 py-2 text-xs"
                          style={{ color: 'var(--ros-text-secondary)' }}
                          onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLButtonElement).style.background =
                              'var(--ros-bg-hover)'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                          }}
                        >
                          <span className="font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
                            {ss.name}
                          </span>
                          <br />
                          <span style={{ color: 'var(--ros-text-muted)' }}>
                            {ss.result_count} results
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-xs text-center" style={{ color: 'var(--ros-text-muted)' }}>
                      No saved searches yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ====== RIGHT PANEL — RESULTS FEED ====== */}
        <div
          className="lg:w-[55%] flex flex-col rounded-lg overflow-hidden"
          style={{
            background: 'var(--ros-bg-card)',
            border: '1px solid var(--ros-border)',
          }}
        >
          {/* Results header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--ros-border)' }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
                Results
              </h2>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--ros-bg-tertiary)',
                  color: 'var(--ros-text-muted)',
                }}
              >
                0
              </span>
            </div>
          </div>

          {/* Empty state */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'var(--ros-bg-tertiary)',
                border: '1px solid var(--ros-border)',
              }}
            >
              <Search size={20} style={{ color: 'var(--ros-text-muted)' }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--ros-text-secondary)' }}>
              Configure your search and hit Run to see results.
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--ros-text-muted)' }}>
              {'// TODO: Wire to recruiter-search-orchestrator edge function'}
            </p>

            {/* Mock result card preview */}
            <div className="w-full mt-8 max-w-md">
              <span className="block text-[10px] font-mono mb-2 uppercase tracking-wide" style={{ color: 'var(--ros-text-muted)' }}>
                Result card preview
              </span>
              <div
                className="rounded-lg p-4"
                style={{
                  background: 'var(--ros-bg-secondary)',
                  border: '1px solid var(--ros-border)',
                  opacity: 0.5,
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div
                      className="h-3 w-32 rounded mb-1.5"
                      style={{ background: 'var(--ros-bg-tertiary)' }}
                    />
                    <div
                      className="h-2.5 w-48 rounded"
                      style={{ background: 'var(--ros-bg-tertiary)' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: 'var(--ros-bg-tertiary)',
                        color: 'var(--ros-text-muted)',
                      }}
                    >
                      85
                    </span>
                    <TierBadge tier="tier_1" size="sm" />
                  </div>
                </div>
                <div className="flex gap-1.5 mb-3">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: 'var(--ros-bg-tertiary)',
                      color: 'var(--ros-text-muted)',
                    }}
                  >
                    builder: 92
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: 'var(--ros-bg-tertiary)',
                      color: 'var(--ros-text-muted)',
                    }}
                  >
                    ai_recency: 88
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {['Review', 'Shortlist', 'Suppress'].map((action) => (
                    <span
                      key={action}
                      className="text-[10px] font-mono px-2 py-1 rounded"
                      style={{
                        background: 'var(--ros-bg-tertiary)',
                        color: 'var(--ros-text-muted)',
                        border: '1px solid var(--ros-border)',
                      }}
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
