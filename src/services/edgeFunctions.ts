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
  if (!supabaseUrl || !supabaseKey) return []

  const response = await fetch(`${supabaseUrl}/functions/v1/search-candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query, role, company }),
  })

  if (!response.ok) return []
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
  if (!supabaseUrl || !supabaseKey) return []

  const response = await fetch(`${supabaseUrl}/functions/v1/github-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query, language, min_stars: minStars }),
  })

  if (!response.ok) return []
  const data = await response.json()
  return data.results || []
}

export async function enrichCandidateViaEdge(
  githubHandle: string
): Promise<Record<string, unknown> | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return null

  const response = await fetch(`${supabaseUrl}/functions/v1/enrich-candidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ github_handle: githubHandle }),
  })

  if (!response.ok) return null
  return response.json()
}
