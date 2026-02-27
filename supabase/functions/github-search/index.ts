import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, language, min_stars, min_followers } = await req.json()
    const githubToken = Deno.env.get('GITHUB_TOKEN')

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    }
    if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`

    // Build GitHub search query
    const parts = [query]
    if (language) parts.push(`language:${language}`)
    if (min_followers) parts.push(`followers:>=${min_followers}`)
    const searchQuery = parts.join(' ')

    // Search repos matching the capability query
    const repoRes = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&per_page=30`,
      { headers }
    )
    const repoData = await repoRes.json()

    // Extract unique contributors
    const contributorMap = new Map<string, { username: string; avatar_url: string; repos: string[]; total_stars: number }>()

    for (const repo of (repoData.items || []).slice(0, 15)) {
      if (min_stars && repo.stargazers_count < min_stars) continue

      try {
        const contribRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/contributors?per_page=5`,
          { headers }
        )
        const contributors = await contribRes.json()

        for (const contrib of (contributors || []).slice(0, 3)) {
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
      .slice(0, 20)

    return new Response(
      JSON.stringify({ results, total: results.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
