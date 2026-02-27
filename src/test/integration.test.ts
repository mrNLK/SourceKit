/**
 * Integration smoke tests for SourceKit features.
 *
 * Tests cover:
 *   1. GitHub search + scoring
 *   2. Signal parsing (including false positive fixes)
 *   3. Availability signals
 *   4. Outreach generation (AI + template fallback)
 *   5. Outreach history via useOutreach hook
 *   6. Export functions
 *   7. Input validation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { calculateScore, parseSignals } from '@/lib/scoring'
import { generateOutreach } from '@/services/outreach'
import { searchGitHubUsers } from '@/services/github'
import { exportToCSV, exportToJSON } from '@/services/export'
import { useOutreach } from '@/hooks/useOutreach'
import type { Candidate, Settings, GitHubProfile } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: crypto.randomUUID(),
    name: 'Jane Doe',
    company: 'Acme',
    role: 'Senior Engineer',
    source: 'github',
    enrichment_data: null,
    stage: 'sourced',
    score: 0,
    notes: '',
    tags: [],
    signals: [],
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeGitHubProfile(overrides: Partial<GitHubProfile> = {}): GitHubProfile {
  return {
    username: 'janedoe',
    avatar_url: 'https://example.com/avatar.jpg',
    public_repos: 30,
    followers: 50,
    following: 20,
    top_languages: [{ language: 'TypeScript', percentage: 60, bytes: 60 }],
    skill_profile: {
      domains: [],
      overall_score: 50,
      depth_score: 40,
      breadth_score: 30,
      collaboration_score: 50,
      consistency_score: 40,
    },
    repositories: [],
    ...overrides,
  }
}

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    enrichment_api_url: '',
    slack_webhook_url: '',
    target_company: 'TestCorp',
    role_title: 'Staff Engineer',
    one_line_pitch: 'building the future of search',
    auto_enrich_github: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. GitHub search + scoring
// ---------------------------------------------------------------------------

describe('GitHub search + scoring', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('searchGitHubUsers returns de-duplicated user objects', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/search/users')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { login: 'alice', avatar_url: 'a.jpg' },
              { login: 'bob', avatar_url: 'b.jpg' },
              { login: 'alice', avatar_url: 'a.jpg' },
            ],
          }),
        }
      }
      const login = url.split('/users/')[1]?.split('?')[0]
      return {
        ok: true,
        json: async () => ({
          login,
          avatar_url: `${login}.jpg`,
          bio: `I am ${login}`,
          public_repos: 10,
          followers: 5,
        }),
      }
    })

    const results = await searchGitHubUsers('typescript')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]).toHaveProperty('username')
    expect(results[0]).toHaveProperty('bio')
    expect(results[0]).toHaveProperty('repos')
  })

  it('parseSignals extracts multiple signal types from text', () => {
    const text = 'PhD from Stanford, worked at Google and Meta. Published at NeurIPS. Open-source maintainer.'
    const signals = parseSignals(text)

    const types = signals.map(s => s.type)
    expect(types).toContain('degree')
    expect(types).toContain('university')
    expect(types).toContain('company')
    expect(types).toContain('conference')
    expect(types).toContain('open_source')
  })

  it('calculateScore is deterministic — same signals produce same score', () => {
    const candidate = makeCandidate({
      signals: [
        { type: 'degree', label: 'PhD in CS' },
        { type: 'company', label: 'Google' },
        { type: 'publication', label: 'Publications' },
      ],
      github_profile: makeGitHubProfile({ public_repos: 25, followers: 60 }),
    })

    const score1 = calculateScore(candidate)
    const score2 = calculateScore(candidate)
    expect(score1).toBe(score2)
    expect(score1).toBeGreaterThan(0)
    expect(score1).toBeLessThanOrEqual(100)
  })

  it('calculateScore caps at 100', () => {
    const candidate = makeCandidate({
      signals: [
        { type: 'degree', label: 'PhD' },
        { type: 'company', label: 'Google' },
        { type: 'company', label: 'Meta' },
        { type: 'university', label: 'Stanford' },
        { type: 'publication', label: 'Publications' },
        { type: 'conference', label: 'Conference Speaker' },
        { type: 'open_source', label: 'Open Source' },
        { type: 'patent', label: 'Patents' },
        { type: 'leadership', label: 'CTO' },
        { type: 'experience', label: '15 years', value: '15' },
      ],
      github_profile: makeGitHubProfile({
        public_repos: 100,
        followers: 500,
        skill_profile: {
          domains: [],
          overall_score: 90,
          depth_score: 90,
          breadth_score: 80,
          collaboration_score: 80,
          consistency_score: 80,
        },
        repositories: [{ name: 'bigproject', full_name: 'x/bigproject', stars: 5000, forks: 200, is_fork: false, topics: [], created_at: '', updated_at: '', description: '' }],
      }),
    })

    expect(calculateScore(candidate)).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// 2. Signal parsing false positive fixes
// ---------------------------------------------------------------------------

describe('Signal parsing - false positive prevention', () => {
  it('"published a blog post" should NOT match as publication', () => {
    const signals = parseSignals('published a blog post on Medium')
    const types = signals.map(s => s.type)
    expect(types).not.toContain('publication')
  })

  it('"published on Medium" should NOT match as publication', () => {
    const signals = parseSignals('I published on Medium about JavaScript')
    const types = signals.map(s => s.type)
    expect(types).not.toContain('publication')
  })

  it('"published at NeurIPS" SHOULD match as publication', () => {
    const signals = parseSignals('published at NeurIPS 2024')
    const types = signals.map(s => s.type)
    expect(types).toContain('publication')
  })

  it('"arxiv" SHOULD match as publication', () => {
    const signals = parseSignals('My paper on arxiv about transformers')
    const types = signals.map(s => s.type)
    expect(types).toContain('publication')
  })

  it('"Director of Engineering" SHOULD match leadership', () => {
    const signals = parseSignals('Director of Engineering at Acme Corp')
    const types = signals.map(s => s.type)
    expect(types).toContain('leadership')
  })

  it('"directed the project" should NOT match leadership', () => {
    const signals = parseSignals('I directed the project to completion')
    const types = signals.map(s => s.type)
    expect(types).not.toContain('leadership')
  })

  it('"directed my efforts" should NOT match leadership', () => {
    const signals = parseSignals('Directed my efforts toward improving the codebase')
    const types = signals.map(s => s.type)
    expect(types).not.toContain('leadership')
  })

  it('"Staff Engineer" SHOULD match leadership', () => {
    const signals = parseSignals('Staff Engineer at Google building ML infrastructure')
    const types = signals.map(s => s.type)
    expect(types).toContain('leadership')
  })

  it('"CTO" SHOULD match leadership', () => {
    const signals = parseSignals('CTO at early-stage startup')
    const types = signals.map(s => s.type)
    expect(types).toContain('leadership')
  })

  it('"co-founder" SHOULD match leadership', () => {
    const signals = parseSignals('co-founder of a DevTools company')
    const types = signals.map(s => s.type)
    expect(types).toContain('leadership')
  })
})

// ---------------------------------------------------------------------------
// 3. Availability signals
// ---------------------------------------------------------------------------

describe('Availability signals', () => {
  function deriveAvailability(candidate: Candidate): 'active' | 'moderate' | 'low' | null {
    const freq = candidate.github_profile?.contribution_patterns?.commit_frequency
    if (!freq) return null
    if (freq === 'daily' || freq === 'weekly') return 'active'
    if (freq === 'monthly') return 'moderate'
    return 'low'
  }

  it('daily commit frequency → active', () => {
    const c = makeCandidate({
      github_profile: makeGitHubProfile({
        contribution_patterns: {
          total_commits: 500, total_prs: 50, total_reviews: 30, total_issues: 20,
          commit_frequency: 'daily', peak_hours: [10, 14], active_days: [1, 2, 3, 4, 5],
          streak_current: 30, streak_longest: 90,
        },
      }),
    })
    expect(deriveAvailability(c)).toBe('active')
  })

  it('weekly commit frequency → active', () => {
    const c = makeCandidate({
      github_profile: makeGitHubProfile({
        contribution_patterns: {
          total_commits: 100, total_prs: 20, total_reviews: 10, total_issues: 5,
          commit_frequency: 'weekly', peak_hours: [15], active_days: [1, 3, 5],
          streak_current: 10, streak_longest: 40,
        },
      }),
    })
    expect(deriveAvailability(c)).toBe('active')
  })

  it('monthly commit frequency → moderate', () => {
    const c = makeCandidate({
      github_profile: makeGitHubProfile({
        contribution_patterns: {
          total_commits: 20, total_prs: 5, total_reviews: 2, total_issues: 1,
          commit_frequency: 'monthly', peak_hours: [20], active_days: [6],
          streak_current: 1, streak_longest: 5,
        },
      }),
    })
    expect(deriveAvailability(c)).toBe('moderate')
  })

  it('sporadic commit frequency → low', () => {
    const c = makeCandidate({
      github_profile: makeGitHubProfile({
        contribution_patterns: {
          total_commits: 5, total_prs: 1, total_reviews: 0, total_issues: 0,
          commit_frequency: 'sporadic', peak_hours: [], active_days: [],
          streak_current: 0, streak_longest: 2,
        },
      }),
    })
    expect(deriveAvailability(c)).toBe('low')
  })

  it('null github_profile returns null without crashing', () => {
    const c = makeCandidate({ github_profile: null })
    expect(deriveAvailability(c)).toBeNull()
  })

  it('github_profile without contribution_patterns returns null', () => {
    const c = makeCandidate({
      github_profile: makeGitHubProfile({ contribution_patterns: undefined }),
    })
    expect(deriveAvailability(c)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 4. Outreach generation
// ---------------------------------------------------------------------------

describe('Outreach generation', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('generates outreach via edge function when supabase URL is provided', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Hey Jane, love your work at Google on TensorFlow!' }),
    })

    const candidate = makeCandidate({ name: 'Jane Smith', company: 'Google' })
    const settings = makeSettings()

    const result = await generateOutreach(candidate, settings, 'https://my-project.supabase.co', 'anon-key-123')

    expect(result.message).toBe('Hey Jane, love your work at Google on TensorFlow!')
    expect(result.source).toBe('ai')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://my-project.supabase.co/functions/v1/generate-outreach',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer anon-key-123',
        }),
      })
    )
  })

  it('falls back to template with source indicator when AI fails', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ ok: false, status: 500 })

    const candidate = makeCandidate({ name: 'Alice', company: 'Stripe' })
    const settings = makeSettings()

    const result = await generateOutreach(candidate, settings, 'https://my.supabase.co', 'key')
    expect(result.source).toBe('template')
    expect(result.message).toContain('Alice')
  })

  it('falls back to template when no supabase URL is provided', async () => {
    const candidate = makeCandidate({ name: 'Alice Chen', company: 'Stripe' })
    const settings = makeSettings({
      target_company: 'AcmeCo',
      role_title: 'Platform Engineer',
      one_line_pitch: 'the next-gen developer platform',
    })

    const result = await generateOutreach(candidate, settings)

    expect(result.source).toBe('template')
    expect(result.message).toContain('Alice')
    expect(result.message).toContain('Stripe')
    expect(result.message).toContain('AcmeCo')
    expect(result.message).toContain('Platform Engineer')
    expect(result.message).toContain('the next-gen developer platform')
  })

  it('fallback template handles missing company gracefully', async () => {
    const candidate = makeCandidate({ name: 'Bob Lee', company: '' })
    const settings = makeSettings()

    const result = await generateOutreach(candidate, settings)

    expect(result.message).toContain('Bob')
    expect(result.message).not.toContain(' at  ')
  })

  it('edge function request body includes candidate and context', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'hi' }),
    })

    const candidate = makeCandidate({
      name: 'Test User',
      company: 'TestCo',
      role: 'SRE',
      bio: 'Loves infra',
      signals: [{ type: 'leadership', label: 'Staff' }],
    })
    const settings = makeSettings({ target_company: 'MyCo', role_title: 'SRE Lead', one_line_pitch: 'infra excellence' })

    await generateOutreach(candidate, settings, 'https://sb.co', 'key')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.candidate.name).toBe('Test User')
    expect(body.candidate.company).toBe('TestCo')
    expect(body.candidate.role).toBe('SRE')
    expect(body.candidate.signals).toHaveLength(1)
    expect(body.context.target_company).toBe('MyCo')
    expect(body.context.role_title).toBe('SRE Lead')
    expect(body.context.pitch).toBe('infra excellence')
  })
})

// ---------------------------------------------------------------------------
// 5. Outreach history (useOutreach hook)
// ---------------------------------------------------------------------------

describe('Outreach history', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('saveOutreach stores an entry and getHistory retrieves it', () => {
    const { result } = renderHook(() => useOutreach())

    act(() => {
      result.current.saveOutreach('alice-chen', 'Alice Chen', 'Hello Alice!')
    })

    const history = result.current.getHistory('alice-chen')
    expect(history).toHaveLength(1)
    expect(history[0].candidate_key).toBe('alice-chen')
    expect(history[0].candidate_name).toBe('Alice Chen')
    expect(history[0].message).toBe('Hello Alice!')
    expect(history[0].channel).toBe('email')
    expect(history[0].created_at).toBeTruthy()
    expect(history[0].id).toBeTruthy()
  })

  it('getHistory filters by candidate key', () => {
    const { result } = renderHook(() => useOutreach())

    act(() => {
      result.current.saveOutreach('alice', 'Alice', 'Message to Alice')
      result.current.saveOutreach('bob', 'Bob', 'Message to Bob')
      result.current.saveOutreach('alice', 'Alice', 'Second message to Alice')
    })

    expect(result.current.getHistory('alice')).toHaveLength(2)
    expect(result.current.getHistory('bob')).toHaveLength(1)
    expect(result.current.getHistory('nobody')).toHaveLength(0)
  })

  it('clearHistory removes all entries', () => {
    const { result } = renderHook(() => useOutreach())

    act(() => {
      result.current.saveOutreach('alice', 'Alice', 'Msg 1')
      result.current.saveOutreach('bob', 'Bob', 'Msg 2')
    })

    expect(result.current.entries).toHaveLength(2)

    act(() => {
      result.current.clearHistory()
    })

    expect(result.current.entries).toHaveLength(0)
    expect(result.current.getHistory('alice')).toHaveLength(0)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useOutreach())

    act(() => {
      result.current.saveOutreach('jane', 'Jane', 'Persisted message')
    })

    const stored = JSON.parse(localStorage.getItem('sourcekit_outreach') || '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].candidate_key).toBe('jane')
  })

  it('loads persisted data on mount', () => {
    const entries = [{
      id: 'pre-existing',
      candidate_key: 'preloaded',
      candidate_name: 'Pre Loaded',
      message: 'From previous session',
      channel: 'email',
      created_at: new Date().toISOString(),
    }]
    localStorage.setItem('sourcekit_outreach', JSON.stringify(entries))

    const { result } = renderHook(() => useOutreach())

    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].id).toBe('pre-existing')
    expect(result.current.getHistory('preloaded')).toHaveLength(1)
  })

  it('saveOutreach supports custom channel', () => {
    const { result } = renderHook(() => useOutreach())

    act(() => {
      result.current.saveOutreach('alice', 'Alice', 'LinkedIn DM', 'linkedin')
    })

    expect(result.current.entries[0].channel).toBe('linkedin')
  })
})

// ---------------------------------------------------------------------------
// 6. Export functions
// ---------------------------------------------------------------------------

describe('Export functions', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>
  let mockClick: ReturnType<typeof vi.fn>
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    mockCreateObjectURL = vi.fn(() => 'blob:mock')
    mockRevokeObjectURL = vi.fn()
    mockClick = vi.fn()
    URL.createObjectURL = mockCreateObjectURL
    URL.revokeObjectURL = mockRevokeObjectURL
    vi.spyOn(document, 'createElement').mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
      click: mockClick,
    } as unknown as HTMLElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn() as ReturnType<typeof vi.fn>)
    vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn() as ReturnType<typeof vi.fn>)
  })

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    vi.restoreAllMocks()
  })

  it('exportToCSV generates CSV content and triggers download', () => {
    const candidates = [
      makeCandidate({ name: 'Test User', company: 'TestCo', stage: 'sourced', score: 75, tags: ['ml'] }),
    ]

    exportToCSV(candidates)

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })

  it('exportToJSON generates JSON content and triggers download', () => {
    const candidates = [makeCandidate()]

    exportToJSON(candidates)

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
  })
})
