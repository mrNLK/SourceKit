import { supabase } from '@/lib/supabase'

interface ExaCandidate {
  name: string
  bio: string
  profile_url: string
  source: string
  highlights: string[]
}

interface GitHubContributor {
  username: string
  avatar_url: string
  repos: string[]
  total_stars: number
}

export async function searchCandidatesViaExa(
  query: string,
  role?: string,
  company?: string
): Promise<ExaCandidate[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured — skipping Exa search')
    return []
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/search-candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query, role, company }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }))
    console.error('Exa search failed:', response.status, errorBody)
    throw new Error(errorBody.error || `Exa search failed: ${response.status}`)
  }
  const data = await response.json()
  return data.candidates || []
}

export async function searchGitHubContributors(
  query: string,
  language?: string,
  minStars?: number
): Promise<GitHubContributor[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured — skipping GitHub contributor search')
    return []
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/github-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query, language, min_stars: minStars }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }))
    console.error('GitHub contributor search failed:', response.status, errorBody)
    throw new Error(errorBody.error || `GitHub contributor search failed: ${response.status}`)
  }
  const data = await response.json()
  return data.results || []
}

export async function enrichCandidateViaEdge(
  githubHandle: string
): Promise<Record<string, unknown> | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured — skipping enrichment')
    return null
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/enrich-candidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ github_handle: githubHandle }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }))
    console.error('Enrichment failed:', response.status, errorBody)
    throw new Error(errorBody.error || `Enrichment failed: ${response.status}`)
  }
  return response.json()
}

interface AIStrategy {
  jobTitle: string
  companyName: string
  searchQueries: string[]
  targetCompanies: string[]
  targetRepos: string[]
  keywords: string[]
  generatedAt: string
}

export async function generateAIStrategy(
  jobTitle: string,
  companyName?: string,
  jobDescription?: string
): Promise<AIStrategy | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured — skipping AI strategy generation')
    return null
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-strategy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      job_title: jobTitle,
      company_name: companyName,
      job_description: jobDescription,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }))
    console.error('AI strategy generation failed:', response.status, errorBody)
    throw new Error(errorBody.error || `AI strategy generation failed: ${response.status}`)
  }
  const data = await response.json()
  return data.strategy || null
}
