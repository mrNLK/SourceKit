import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_REPOS = 15
const MAX_CONTRIBUTORS_PER_REPO = 3
const MAX_RESULTS = 20

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { query, language, min_stars, min_followers } = body

    // Input validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'query is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (query.length > 500) {
      return new Response(
        JSON.stringify({ error: 'query must be under 500 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const githubToken = Deno.env.get('GITHUB_TOKEN')
    if (!githubToken) {
      console.warn('GITHUB_TOKEN not set — using unauthenticated API (60 req/hr limit)')
    }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    }
    if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`

    // Build GitHub search query
    const parts = [query.trim()]
    if (language) parts.push(`language:${language}`)
    if (min_followers) parts.push(`followers:>=${min_followers}`)
    const searchQuery = parts.join(' ')

    // Search repos matching the capability query
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const repoRes = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&per_page=30`,
      { headers, signal: controller.signal }
    )
    clearTimeout(timeout)

    if (!repoRes.ok) {
      const errorText = await repoRes.text().catch(() => '')
      console.error(`GitHub repo search failed: ${repoRes.status}`, errorText)
      return new Response(
        JSON.stringify({ error: `GitHub API error: ${repoRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const repoData = await repoRes.json()

    // Extract unique contributors
    const contributorMap = new Map<string, { username: string; avatar_url: string; repos: string[]; total_stars: number }>()

    for (const repo of (repoData.items || []).slice(0, MAX_REPOS)) {
      if (min_stars && repo.stargazers_count < min_stars) continue

      try {
        const contribController = new AbortController()
        const contribTimeout = setTimeout(() => contribController.abort(), 10000)

        const contribRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/contributors?per_page=5`,
          { headers, signal: contribController.signal }
        )
        clearTimeout(contribTimeout)

        if (!contribRes.ok) {
          console.warn(`Contributors fetch failed for ${repo.full_name}: ${contribRes.status}`)
          continue
        }

        const contributors = await contribRes.json()

        if (!Array.isArray(contributors)) continue

        for (const contrib of contributors.slice(0, MAX_CONTRIBUTORS_PER_REPO)) {
          if (contrib.type !== 'User') continue
          const existing = contributorMap.get(contrib.login)
          if (existing) {
            existing.repos.push(repo.full_name)
            existing.total_stars += repo.stargazers_count
          } else {
            contributorMap.set(contrib.login, {
              username: contrib.login,
              avatar_url: contrib.avatar_url,
              repos: [repo.full_name],
              total_stars: repo.stargazers_count,
            })
          }
        }
      } catch {
        // Skip repos with contributor access issues
      }
    }

    // Sort by total stars and return top results
    const results = Array.from(contributorMap.values())
      .sort((a, b) => b.total_stars - a.total_stars)
      .slice(0, MAX_RESULTS)

    return new Response(
      JSON.stringify({ results, total: results.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('github-search error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
