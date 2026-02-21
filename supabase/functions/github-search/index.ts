import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GITHUB_API = "https://api.github.com";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CACHE_DAYS = 7;

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

// Step 1: Parse query with AI
async function parseQuery(query: string): Promise<{ repos: string[]; skills: string[]; location: string; seniority: string }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const res = await fetch(AI_GATEWAY, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'You are a technical recruiting query parser. Extract structured search criteria from natural language recruiting queries. Always return valid JSON.' },
        { role: 'user', content: `Parse this recruiting query into structured criteria. Return JSON only, no markdown:\n\nQuery: "${query}"\n\nReturn: { "repos": ["owner/repo"], "skills": ["skill1"], "location": "location or empty string", "seniority": "junior|mid|senior|any" }\n\nFor repos: infer relevant GitHub repos from the skills/domain. E.g. "React experts" → ["facebook/react", "vercel/next.js"]. "Rust systems" → ["rust-lang/rust", "tokio-rs/tokio"]. Include 3-6 repos.\nFor skills: extract programming languages, frameworks, tools mentioned.\nFor location: extract location if mentioned, empty string if not.\nFor seniority: infer from context, default to "any".` }
      ],
      tools: [{
        type: "function",
        function: {
          name: "parse_query",
          description: "Parse a recruiting query into structured criteria",
          parameters: {
            type: "object",
            properties: {
              repos: { type: "array", items: { type: "string" }, description: "GitHub repos in owner/repo format" },
              skills: { type: "array", items: { type: "string" }, description: "Skills/technologies" },
              location: { type: "string", description: "Location filter or empty string" },
              seniority: { type: "string", enum: ["junior", "mid", "senior", "any"] }
            },
            required: ["repos", "skills", "location", "seniority"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "parse_query" } }
    }),
  });

  if (!res.ok) {
    console.error('AI parse error:', res.status, await res.text());
    // Fallback: use query as skill
    return { repos: [], skills: [query], location: '', seniority: 'any' };
  }

  const data = await res.json();
  try {
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      return JSON.parse(toolCall.function.arguments);
    }
    // Fallback to content parsing
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }
  return { repos: [], skills: [query], location: '', seniority: 'any' };
}

// Step 2: Fetch contributors from repos
async function fetchContributors(repos: string[], skills: string[]): Promise<Map<string, { username: string; commitCounts: Record<string, number> }>> {
  const contributorMap = new Map<string, { username: string; commitCounts: Record<string, number> }>();

  // Fetch contributors from each repo
  for (const repo of repos.slice(0, 6)) {
    try {
      const contributors = await githubFetch(`${GITHUB_API}/repos/${repo}/contributors?per_page=30`);
      if (!contributors || !Array.isArray(contributors)) continue;

      for (const c of contributors) {
        if (c.type !== 'User') continue;
        const existing = contributorMap.get(c.login);
        if (existing) {
          existing.commitCounts[repo] = c.contributions;
        } else {
          contributorMap.set(c.login, {
            username: c.login,
            commitCounts: { [repo]: c.contributions },
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

// Step 4: AI scoring and summarization
async function scoreCandidates(candidates: any[], query: string, parsedCriteria: any): Promise<any[]> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey || candidates.length === 0) return candidates;

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
      const res = await fetch(AI_GATEWAY, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'You are a technical recruiting expert. Score and summarize GitHub contributors for relevance to the given search. Return valid JSON only.' },
            { role: 'user', content: `Search query: "${query}"\nCriteria: ${JSON.stringify(parsedCriteria)}\n\nCandidates:\n${JSON.stringify(candidateInfo)}\n\nFor each candidate return JSON array (no markdown): [{ "username": string, "score": number (0-100 relevance to the search), "summary": string (1 concise line mentioning their key repos and commit counts), "about": string (2-3 sentences describing their expertise and contributions), "is_hidden_gem": boolean (true if significant contributions but under 500 followers) }]` }
          ],
          tools: [{
            type: "function",
            function: {
              name: "score_candidates",
              description: "Score and summarize candidates",
              parameters: {
                type: "object",
                properties: {
                  scored: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        username: { type: "string" },
                        score: { type: "number" },
                        summary: { type: "string" },
                        about: { type: "string" },
                        is_hidden_gem: { type: "boolean" }
                      },
                      required: ["username", "score", "summary", "about", "is_hidden_gem"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["scored"],
                additionalProperties: false
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "score_candidates" } }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        let scored: any[] = [];
        if (toolCall) {
          scored = JSON.parse(toolCall.function.arguments).scored;
        } else {
          const content = data.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) scored = JSON.parse(jsonMatch[0]);
        }

        // Merge AI scores into candidates
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
      console.error('AI scoring error:', e);
      // Keep existing scores if AI fails
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
      reposSearched: parsedCriteria.repos,
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
