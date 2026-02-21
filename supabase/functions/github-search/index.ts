import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GITHUB_API = "https://api.github.com";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const CACHE_DAYS = 7;

async function claudeCall(system: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get('PARALLEL_API_KEY');
  if (!apiKey) throw new Error('PARALLEL_API_KEY not configured');

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Claude API error:', res.status, errText);
    throw new Error(`Claude API error: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function githubFetch(url: string) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'SourceKit-App',
  };
  const token = Deno.env.get('GITHUB_TOKEN');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, { headers });
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      throw new Error('RATE_LIMITED');
    }
  }
  if (!res.ok) {
    console.error(`GitHub API error: ${res.status} for ${url}`);
    return null;
  }
  return res.json();
}

const langColors: Record<string, string> = {
  JavaScript: "hsl(50, 90%, 50%)", TypeScript: "hsl(210, 80%, 55%)",
  Python: "hsl(55, 70%, 50%)", Rust: "hsl(20, 80%, 55%)",
  Go: "hsl(195, 60%, 50%)", Java: "hsl(15, 80%, 55%)",
  "C++": "hsl(240, 50%, 55%)", C: "hsl(200, 40%, 50%)",
  Ruby: "hsl(0, 60%, 50%)", PHP: "hsl(240, 40%, 55%)",
  Swift: "hsl(15, 90%, 55%)", Kotlin: "hsl(270, 60%, 55%)",
  Shell: "hsl(100, 40%, 50%)", HTML: "hsl(15, 80%, 55%)",
  CSS: "hsl(280, 60%, 55%)", Dart: "hsl(195, 80%, 50%)",
  Scala: "hsl(0, 70%, 55%)", Lua: "hsl(240, 80%, 60%)",
};

function getLangColor(lang: string): string {
  return langColors[lang] || `hsl(${Math.abs(lang.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 50%, 55%)`;
}

// Step 1: Parse query with Claude
async function parseQuery(query: string): Promise<{ repos: { owner: string; name: string }[]; skills: string[]; location: string | null; seniority: string | null }> {
  try {
    const text = await claudeCall(
      'You are a technical recruiting assistant. Given a hiring query, identify the most relevant GitHub repositories where ideal candidates would be active contributors. Also generate 4 ranked skill criteria. Return valid JSON only, no markdown: { "repos": [{"owner": "string", "name": "string"}], "skills": ["string"], "location": "string | null", "seniority": "string | null" }',
      `Parse this recruiting search query:\n\n"${query}"\n\nIdentify 3-6 GitHub repositories where the best candidates for this role would be active contributors. For example, "React experts" → repos like facebook/react, vercel/next.js. "ML infrastructure engineers" → pytorch/pytorch, huggingface/transformers, etc.`
    );

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        repos: parsed.repos || [],
        skills: parsed.skills || [query],
        location: parsed.location || null,
        seniority: parsed.seniority || null,
      };
    }
  } catch (e) {
    console.error('Claude parse error:', e);
  }
  return { repos: [], skills: [query], location: null, seniority: null };
}

// Step 2: Fetch contributors from repos
async function fetchContributors(repos: { owner: string; name: string }[], skills: string[]): Promise<Map<string, { username: string; commitCounts: Record<string, number> }>> {
  const contributorMap = new Map<string, { username: string; commitCounts: Record<string, number> }>();

  // Fetch contributors from each repo
  for (const repo of repos.slice(0, 6)) {
    const repoFullName = `${repo.owner}/${repo.name}`;
    try {
      const contributors = await githubFetch(`${GITHUB_API}/repos/${repoFullName}/contributors?per_page=30`);
      if (!contributors || !Array.isArray(contributors)) continue;

      for (const c of contributors) {
        if (c.type !== 'User') continue;
        const existing = contributorMap.get(c.login);
        if (existing) {
          existing.commitCounts[repoFullName] = c.contributions;
        } else {
          contributorMap.set(c.login, {
            username: c.login,
            commitCounts: { [repoFullName]: c.contributions },
          });
        }
      }
    } catch (e) {
      if ((e as Error).message === 'RATE_LIMITED') throw e;
      console.error(`Error fetching contributors for ${repo}:`, e);
    }
  }

  // If no repos found contributors, fall back to user search
  if (contributorMap.size === 0 && skills.length > 0) {
    const searchQuery = skills.join('+');
    const searchData = await githubFetch(`${GITHUB_API}/search/users?q=${encodeURIComponent(searchQuery)}&per_page=20`);
    if (searchData?.items) {
      for (const user of searchData.items) {
        contributorMap.set(user.login, { username: user.login, commitCounts: {} });
      }
    }
  }

  return contributorMap;
}

// Step 3: Enrich with profile data (with caching)
async function enrichCandidates(
  contributorMap: Map<string, { username: string; commitCounts: Record<string, number> }>,
  supabase: ReturnType<typeof createClient>
) {
  const usernames = Array.from(contributorMap.keys());
  
  // Check cache
  const { data: cached } = await supabase
    .from('candidates')
    .select('*')
    .in('github_username', usernames)
    .gte('fetched_at', new Date(Date.now() - CACHE_DAYS * 86400000).toISOString());

  const cachedMap = new Map((cached || []).map((c: any) => [c.github_username, c]));
  const toFetch = usernames.filter(u => !cachedMap.has(u));

  // Fetch uncached profiles
  const freshProfiles = await Promise.all(
    toFetch.slice(0, 15).map(async (username) => {
      const [profile, repos] = await Promise.all([
        githubFetch(`${GITHUB_API}/users/${username}`),
        githubFetch(`${GITHUB_API}/users/${username}/repos?sort=stars&per_page=30`),
      ]);
      if (!profile) return null;

      const repoList = (repos || []).filter((r: any) => !r.fork);
      const totalStars = repoList.reduce((sum: number, r: any) => sum + r.stargazers_count, 0);

      const langCount: Record<string, number> = {};
      for (const repo of repoList) {
        if (repo.language) langCount[repo.language] = (langCount[repo.language] || 0) + 1;
      }
      const totalLangRepos = Object.values(langCount).reduce((a, b) => a + b, 0) || 1;
      const topLanguages = Object.entries(langCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({ name, percentage: Math.round((count / totalLangRepos) * 100), color: getLangColor(name) }));

      const highlights = repoList
        .filter((r: any) => r.stargazers_count > 0)
        .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count)
        .slice(0, 3)
        .map((r: any) => `${r.name}: ${r.description || 'No description'} (${r.stargazers_count}⭐)`);

      const commitCounts = contributorMap.get(username)?.commitCounts || {};

      return {
        github_username: username,
        name: profile.name || username,
        avatar_url: profile.avatar_url,
        bio: profile.bio || `GitHub user with ${profile.public_repos} public repos.`,
        location: profile.location || '',
        followers: profile.followers,
        public_repos: profile.public_repos,
        stars: totalStars,
        top_languages: topLanguages,
        highlights: highlights.length ? highlights : [`${profile.public_repos} public repositories`],
        is_hidden_gem: totalStars > 50 && profile.followers < 500,
        joined_year: new Date(profile.created_at).getFullYear(),
        contributed_repos: commitCounts,
        twitter_username: profile.twitter_username || null,
        email: profile.email || null,
        github_url: profile.html_url,
        fetched_at: new Date().toISOString(),
      };
    })
  );

  // Upsert fresh profiles into cache
  const validProfiles = freshProfiles.filter(Boolean);
  if (validProfiles.length > 0) {
    for (const p of validProfiles) {
      await supabase.from('candidates').upsert(p as any, { onConflict: 'github_username' });
    }
  }

  // Merge cached + fresh
  const allCandidates = [];
  for (const username of usernames) {
    const cached = cachedMap.get(username);
    const fresh = validProfiles.find((p: any) => p?.github_username === username);
    const candidate = fresh || cached;
    if (candidate) {
      // Attach commit counts from this search
      const commitCounts = contributorMap.get(username)?.commitCounts || {};
      allCandidates.push({ ...candidate, contributed_repos: { ...(candidate.contributed_repos || {}), ...commitCounts } });
    }
  }

  return allCandidates;
}

// Step 4: AI scoring and summarization with Claude
async function scoreCandidates(candidates: any[], query: string, parsedCriteria: any): Promise<any[]> {
  if (candidates.length === 0) return candidates;

  // Process in batches of 12
  const batchSize = 12;
  const batches = [];
  for (let i = 0; i < candidates.length; i += batchSize) {
    batches.push(candidates.slice(i, i + batchSize));
  }

  const allScored: any[] = [];

  for (const batch of batches) {
    const candidateInfo = batch.map((c: any) => ({
      username: c.github_username,
      name: c.name,
      bio: c.bio,
      location: c.location,
      repos: c.public_repos,
      followers: c.followers,
      stars: c.stars,
      languages: (c.top_languages || []).map((l: any) => l.name),
      contributed_repos: c.contributed_repos,
    }));

    try {
      const text = await claudeCall(
        'You are a technical recruiting expert. Score and summarize these GitHub contributors for the role described. For each, return JSON array (no markdown): [{ "username": "string", "score": 0-100, "summary": "1 concise line mentioning repos and commit counts", "about": "2-3 sentences", "is_hidden_gem": true/false (true if high contributions but under 500 followers) }]',
        `Search query: "${query}"\nCriteria: ${JSON.stringify(parsedCriteria)}\n\nCandidates:\n${JSON.stringify(candidateInfo)}`
      );

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const scored: any[] = JSON.parse(jsonMatch[0]);
        for (const s of scored) {
          const candidate = batch.find((c: any) => c.github_username === s.username);
          if (candidate) {
            candidate.score = s.score;
            candidate.summary = s.summary;
            candidate.about = s.about;
            candidate.is_hidden_gem = s.is_hidden_gem;
          }
        }
      }
    } catch (e) {
      console.error('Claude scoring error:', e);
    }

    allScored.push(...batch);
  }

  // Update cache with AI-generated data
  const supabase = getSupabase();
  for (const c of allScored) {
    if (c.summary) {
      await supabase.from('candidates').upsert({
        github_username: c.github_username,
        score: c.score,
        summary: c.summary,
        about: c.about,
        is_hidden_gem: c.is_hidden_gem,
      }, { onConflict: 'github_username' });
    }
  }

  return allScored.sort((a, b) => (b.score || 0) - (a.score || 0));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || '';

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();

    // Step 1: Parse query with AI
    const parsedCriteria = await parseQuery(query);
    console.log('Parsed criteria:', parsedCriteria);

    // Step 2: Fetch contributors
    const contributorMap = await fetchContributors(parsedCriteria.repos, parsedCriteria.skills);
    console.log(`Found ${contributorMap.size} contributors`);

    // Step 3: Enrich with profiles (with caching)
    const candidates = await enrichCandidates(contributorMap, supabase);
    console.log(`Enriched ${candidates.length} candidates`);

    // Step 4: AI scoring
    const scored = await scoreCandidates(candidates, query, parsedCriteria);

    // Format response
    const results = scored.map((c: any) => ({
      id: c.github_username,
      username: c.github_username,
      name: c.name,
      avatarUrl: c.avatar_url,
      bio: c.summary || c.bio,
      about: c.about || '',
      location: c.location,
      totalContributions: Object.values(c.contributed_repos || {}).reduce((a: number, b: any) => a + (b as number), 0) as number,
      publicRepos: c.public_repos,
      followers: c.followers,
      stars: c.stars,
      topLanguages: c.top_languages || [],
      highlights: c.highlights || [],
      score: c.score || 0,
      hiddenGem: c.is_hidden_gem || false,
      joinedYear: c.joined_year,
      contributedRepos: c.contributed_repos || {},
      linkedinUrl: c.linkedin_url,
      twitterUsername: c.twitter_username,
      email: c.email,
      githubUrl: c.github_url,
    }));

    return new Response(JSON.stringify({
      results,
      parsedCriteria,
      reposSearched: parsedCriteria.repos.map((r: any) => `${r.owner}/${r.name}`),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in github-search:', error);
    
    if ((error as Error).message === 'RATE_LIMITED') {
      return new Response(JSON.stringify({ 
        error: 'GitHub API rate limit reached. Please try again in a few minutes.',
        rateLimited: true
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
