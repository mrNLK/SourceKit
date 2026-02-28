import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { anthropicCall } from "../_shared/anthropic.ts";
import { checkSearchGate, incrementSearchCount } from "../_shared/gate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GITHUB_API = "https://api.github.com";
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
    if (remaining === '0') throw new Error('RATE_LIMITED');
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
async function parseQuery(query: string): Promise<{ repos: { owner: string; name: string }[]; skills: string[]; location: string | null; seniority: string | null }> {
  try {
    const text = await anthropicCall(
      'You are a technical recruiting assistant. Given a hiring query, identify the most relevant GitHub repositories where ideal candidates would be active contributors. Also generate 4 ranked skill criteria. Return valid JSON only, no markdown, no code fences: { "repos": [{"owner": "string", "name": "string"}], "skills": ["string"], "location": "string or null", "seniority": "string or null" }',
      `Parse this recruiting search query:\n\n"${query}"\n\nIdentify 3-6 GitHub repositories where the best candidates for this role would be active contributors. For example, "React experts" → repos like facebook/react, vercel/next.js. "ML infrastructure engineers" → pytorch/pytorch, huggingface/transformers, etc.`
    );

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('AI parsed repos:', parsed.repos);
      return {
        repos: parsed.repos || [],
        skills: parsed.skills || [query],
        location: parsed.location || null,
        seniority: parsed.seniority || null,
      };
    }
  } catch (e) {
    console.error('AI parse error:', e);
  }
  return { repos: [], skills: [query], location: null, seniority: null };
}

// Step 2: Fetch contributors from repos — PARALLEL
async function fetchContributors(repos: { owner: string; name: string }[], skills: string[]): Promise<Map<string, { username: string; commitCounts: Record<string, number> }>> {
  const contributorMap = new Map<string, { username: string; commitCounts: Record<string, number> }>();

  // Fetch all repos in parallel instead of sequentially
  const repoResults = await Promise.all(
    repos.slice(0, 6).map(async (repo) => {
      const repoFullName = `${repo.owner}/${repo.name}`;
      try {
        const contributors = await githubFetch(`${GITHUB_API}/repos/${repoFullName}/contributors?per_page=30`);
        return { repoFullName, contributors };
      } catch (e) {
        if ((e as Error).message === 'RATE_LIMITED') throw e;
        console.error(`Error fetching contributors for ${repoFullName}:`, e);
        return { repoFullName, contributors: null };
      }
    })
  );

  for (const { repoFullName, contributors } of repoResults) {
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
  }

  // Fallback to user search if no repo contributors found
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

// Step 3: Enrich with profile data (with caching) — PARALLEL profiles + BATCH upsert
async function enrichCandidates(
  contributorMap: Map<string, { username: string; commitCounts: Record<string, number> }>,
  supabase: ReturnType<typeof createClient>
) {
  const usernames = Array.from(contributorMap.keys());

  const { data: cached } = await supabase
    .from('candidates')
    .select('*')
    .in('github_username', usernames)
    .gte('fetched_at', new Date(Date.now() - CACHE_DAYS * 86400000).toISOString());

  const cachedMap = new Map((cached || []).map((c: any) => [c.github_username, c]));
  const toFetch = usernames.filter(u => !cachedMap.has(u));

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

  const validProfiles = freshProfiles.filter(Boolean);

  // Batch upsert instead of one-by-one
  if (validProfiles.length > 0) {
    await supabase.from('candidates').upsert(validProfiles as any[], { onConflict: 'github_username' });
  }

  const allCandidates = [];
  for (const username of usernames) {
    const c = cachedMap.get(username);
    const fresh = validProfiles.find((p: any) => p?.github_username === username);
    const candidate = fresh || c;
    if (candidate) {
      const commitCounts = contributorMap.get(username)?.commitCounts || {};
      allCandidates.push({ ...candidate, contributed_repos: { ...(candidate.contributed_repos || {}), ...commitCounts } });
    }
  }

  return allCandidates;
}

// Step 4: AI scoring — skip candidates already scored, batch the rest
async function scoreCandidates(candidates: any[], query: string, parsedCriteria: any): Promise<any[]> {
  if (candidates.length === 0) return candidates;

  // Split into already-scored (from cache) and needs-scoring
  const needsScoring = candidates.filter((c: any) => !c.summary || c.score === null || c.score === undefined || c.score === 0);
  const alreadyScored = candidates.filter((c: any) => c.summary && c.score !== null && c.score !== undefined && c.score !== 0);

  console.log(`Scoring: ${needsScoring.length} need AI, ${alreadyScored.length} already cached`);

  if (needsScoring.length === 0) {
    return candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  const batchSize = 25;
  const batches: any[][] = [];
  for (let i = 0; i < needsScoring.length; i += batchSize) {
    batches.push(needsScoring.slice(i, i + batchSize));
  }

  // Run scoring batches concurrently (up to 3 at a time)
  const concurrency = 3;
  const freshlyScored: any[] = [];

  for (let i = 0; i < batches.length; i += concurrency) {
    const chunk = batches.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (batch) => {
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
          const text = await anthropicCall(
            'You are a technical recruiting expert. Score and summarize these GitHub contributors for the role described. For each, return a JSON array (no markdown, no code fences): [{ "username": "string", "score": 0-100, "summary": "1 concise line mentioning repos and commit counts", "about": "2-3 sentences", "is_hidden_gem": true/false }]. Hidden gem = high contributions but under 500 followers.',
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
          console.error('AI scoring error:', e);
        }

        return batch;
      })
    );
    freshlyScored.push(...results.flat());
  }

  // Batch upsert only freshly scored candidates
  const supabase = getSupabase();
  const toUpdate = freshlyScored
    .filter((c) => c.summary)
    .map((c) => ({
      github_username: c.github_username,
      score: c.score,
      summary: c.summary,
      about: c.about,
      is_hidden_gem: c.is_hidden_gem,
    }));

  if (toUpdate.length > 0) {
    await supabase.from('candidates').upsert(toUpdate as any[], { onConflict: 'github_username' });
  }

  return [...alreadyScored, ...freshlyScored].sort((a, b) => (b.score || 0) - (a.score || 0));
}

// Step 5: Filter ungettable candidates (founders, C-suite)
const UNGETTABLE_TITLE_PATTERN = /\b(co-?founder|founder|ceo|cto|cso|cpo|coo|cio|chief\s+(executive|technology|science|product|operating|information))\b/i;
const UNGETTABLE_BLOCKLIST = new Set([
  'torvalds', 'karpathy', 'gaborcselle', 'thomwolf', 'guido', 'gvanrossum',
  'yyx990803', 'rauchg', 'tj', 'sindresorhus', 'maboroshi',
]);

function detectUngettable(candidate: any): { reachability: string; reason: string } | null {
  const username = (candidate.github_username || '').toLowerCase();
  if (UNGETTABLE_BLOCKLIST.has(username)) {
    return { reachability: 'low', reason: `Known high-profile individual` };
  }
  const bio = candidate.bio || '';
  const match = bio.match(UNGETTABLE_TITLE_PATTERN);
  if (match) {
    return { reachability: 'low', reason: `Bio contains "${match[0]}"` };
  }
  if (candidate.followers > 5000) {
    return { reachability: 'low', reason: `Very high visibility (${candidate.followers} followers)` };
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Subscription gate check
    const gate = await checkSearchGate(req.headers.get('Authorization'));
    if (!gate.allowed) {
      return new Response(JSON.stringify({
        error: gate.error,
        upgrade: true,
        searches_used: gate.searchesUsed,
        search_limit: gate.searchLimit,
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Support both GET (query string) and POST (body with targetRepos)
    let query = '';
    let directRepos: { owner: string; name: string }[] = [];

    if (req.method === 'POST') {
      const body = await req.json();
      query = body.query || body.q || '';
      if (body.targetRepos && Array.isArray(body.targetRepos)) {
        directRepos = body.targetRepos.map((r: string) => {
          const [owner, name] = r.split('/');
          return { owner, name };
        }).filter((r: any) => r.owner && r.name);
      }
    } else {
      const url = new URL(req.url);
      query = url.searchParams.get('q') || '';
    }

    if (!query && directRepos.length === 0) {
      return new Response(JSON.stringify({ error: 'Query parameter "q" or targetRepos is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();
    const t0 = Date.now();

    // Step 1: Parse query with AI (skip if targetRepos provided directly)
    let parsedCriteria: { repos: { owner: string; name: string }[]; skills: string[]; location: string | null; seniority: string | null };
    if (directRepos.length > 0) {
      // Use directly-provided repos, extract skills from query for scoring
      parsedCriteria = {
        repos: directRepos,
        skills: query ? query.split(/[\s,]+/).filter(w => w.length > 2).slice(0, 6) : [],
        location: null,
        seniority: null,
      };
      console.log(`[${Date.now() - t0}ms] Using ${directRepos.length} direct target repos`);
    } else {
      parsedCriteria = await parseQuery(query);
      console.log(`[${Date.now() - t0}ms] Parsed criteria:`, parsedCriteria);
    }

    // Step 2: Fetch contributors from identified repos (parallel)
    const contributorMap = await fetchContributors(parsedCriteria.repos, parsedCriteria.skills);
    console.log(`[${Date.now() - t0}ms] Found ${contributorMap.size} contributors`);

    // Step 3: Enrich with profiles (with caching + batch upsert)
    const candidates = await enrichCandidates(contributorMap, supabase);
    console.log(`[${Date.now() - t0}ms] Enriched ${candidates.length} candidates`);

    // Step 4: AI scoring (batch size 25, concurrent)
    const scored = await scoreCandidates(candidates, query, parsedCriteria);
    console.log(`[${Date.now() - t0}ms] Scored ${scored.length} candidates`);

    // Step 5: Mark ungettable candidates
    const results = scored.map((c: any) => {
      const ungettable = detectUngettable(c);
      return {
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
        ...(ungettable ? { reachability: ungettable.reachability, reachabilityReason: ungettable.reason } : {}),
      };
    });

    // Sort: reachable candidates first (same score range), then ungettable
    results.sort((a: any, b: any) => {
      const aUngettable = a.reachability === 'low' ? 1 : 0;
      const bUngettable = b.reachability === 'low' ? 1 : 0;
      if (aUngettable !== bUngettable) return aUngettable - bUngettable;
      return (b.score || 0) - (a.score || 0);
    });

    // P20: Only increment search count if results were found
    const creditCharged = results.length > 0;
    if (gate.userId && creditCharged) {
      await incrementSearchCount(gate.userId).catch(e => console.error('Failed to increment search count:', e));
    }

    return new Response(JSON.stringify({
      results,
      parsedCriteria,
      reposSearched: parsedCriteria.repos.map((r: any) => `${r.owner}/${r.name}`),
      creditCharged,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in github-search:', error);

    if ((error as Error).message === 'RATE_LIMITED') {
      return new Response(JSON.stringify({
        error: 'Rate limit reached. Please try again in a few minutes.',
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
