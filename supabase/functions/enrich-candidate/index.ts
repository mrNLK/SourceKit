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
    const { github_handle } = await req.json()

    if (!github_handle) {
      return new Response(
        JSON.stringify({ error: 'github_handle is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const githubToken = Deno.env.get('GITHUB_TOKEN')
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    }
    if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`

    // Fetch user profile and repos in parallel
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(github_handle)}`, { headers }),
      fetch(`https://api.github.com/users/${encodeURIComponent(github_handle)}/repos?sort=stars&per_page=10`, { headers }),
    ])

    if (!userRes.ok) {
      return new Response(
        JSON.stringify({ error: `GitHub user not found: ${userRes.status}` }),
        { status: userRes.status === 404 ? 404 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = await userRes.json()
    const repos = reposRes.ok ? await reposRes.json() : []

    // Compute total stars and top languages
    let totalStars = 0
    const langCount: Record<string, number> = {}

    const topRepos = (repos as Array<Record<string, unknown>>)
      .filter((r) => !r.fork)
      .slice(0, 10)
      .map((r) => {
        const stars = (r.stargazers_count as number) || 0
        totalStars += stars
        const lang = r.language as string | null
        if (lang) langCount[lang] = (langCount[lang] || 0) + 1
        return {
          name: r.name as string,
          stars,
          language: lang,
        }
      })

    const topLanguages = Object.entries(langCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang]) => lang)

    return new Response(
      JSON.stringify({
        name: user.name || user.login,
        bio: user.bio,
        company: user.company,
        location: user.location,
        avatar_url: user.avatar_url,
        public_repos: user.public_repos,
        followers: user.followers,
        top_repos: topRepos,
        top_languages: topLanguages,
        total_stars: totalStars,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
