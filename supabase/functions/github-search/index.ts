import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { anthropicCall } from "../_shared/anthropic.ts";
import { checkSearchGate, incrementSearchCount } from "../_shared/gate.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

const GITHUB_API = "https://api.github.com";
const EXA_API = "https://api.exa.ai/search";
const CACHE_DAYS = 7;

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

const MAX_RETRIES = 3;

async function githubFetch(url: string, attempt = 0): Promise<any> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'SourceKit-App',
  };
  const token = Deno.env.get('GITHUB_TOKEN');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers });

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0' || res.status === 429) {
      if (attempt >= MAX_RETRIES) {
        const resetHeader = res.headers.get('x-ratelimit-reset');
        const retryAfter = resetHeader ? Math.max(Math.ceil((parseInt(resetHeader, 10) * 1000 - Date.now()) / 1000), 10) : 60;
        const err = new Error('RATE_LIMITED');
        (err as any).retryAfterSeconds = retryAfter;
        throw err;
      }

      // Calculate wait: use reset header if available, else exponential backoff
      const resetHeader = res.headers.get('x-ratelimit-reset');
      let waitMs: number;
      if (resetHeader) {
        const resetTime = parseInt(resetHeader, 10) * 1000;
        waitMs = Math.max(resetTime - Date.now(), 1000);
        // Cap at 60s to avoid absurdly long waits
        waitMs = Math.min(waitMs, 60000);
      } else {
        waitMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      }
      // Add jitter (0-500ms)
      waitMs += Math.random() * 500;

      console.log(`GitHub rate limited, retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(waitMs)}ms`);
      await new Promise(r => setTimeout(r, waitMs));
      return githubFetch(url, attempt + 1);
    }
  }

  if (!res.ok) {
    console.error(`GitHub API error: ${res.status} for ${url}`);
    return null;
  }
  return res.json();
}

async function hashQuery(query: string): Promise<string> {
  const data = new TextEncoder().encode(query.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

// Curated fallback repos for common search patterns (P12)
const REPO_HINTS: Record<string, { owner: string; name: string }[]> = {
  'rust': [{ owner: 'rust-lang', name: 'rust' }, { owner: 'tokio-rs', name: 'tokio' }, { owner: 'denoland', name: 'deno' }],
  'react': [{ owner: 'facebook', name: 'react' }, { owner: 'vercel', name: 'next.js' }, { owner: 'remix-run', name: 'remix' }],
  'python': [{ owner: 'python', name: 'cpython' }, { owner: 'django', name: 'django' }, { owner: 'pallets', name: 'flask' }],
  'machine learning': [{ owner: 'pytorch', name: 'pytorch' }, { owner: 'tensorflow', name: 'tensorflow' }, { owner: 'huggingface', name: 'transformers' }],
  'ml ': [{ owner: 'pytorch', name: 'pytorch' }, { owner: 'tensorflow', name: 'tensorflow' }, { owner: 'huggingface', name: 'transformers' }],
  'kubernetes': [{ owner: 'kubernetes', name: 'kubernetes' }, { owner: 'helm', name: 'helm' }, { owner: 'istio', name: 'istio' }],
  'k8s': [{ owner: 'kubernetes', name: 'kubernetes' }, { owner: 'helm', name: 'helm' }, { owner: 'istio', name: 'istio' }],
  'security': [{ owner: 'OWASP', name: 'CheatSheetSeries' }, { owner: 'zaproxy', name: 'zaproxy' }, { owner: 'sqlmapproject', name: 'sqlmap' }],
  'go ': [{ owner: 'golang', name: 'go' }, { owner: 'gin-gonic', name: 'gin' }, { owner: 'gofiber', name: 'fiber' }],
  'golang': [{ owner: 'golang', name: 'go' }, { owner: 'gin-gonic', name: 'gin' }, { owner: 'gofiber', name: 'fiber' }],
  'typescript': [{ owner: 'microsoft', name: 'TypeScript' }, { owner: 'trpc', name: 'trpc' }, { owner: 'colinhacks', name: 'zod' }],
  'ios': [{ owner: 'apple', name: 'swift' }, { owner: 'Alamofire', name: 'Alamofire' }],
  'swift': [{ owner: 'apple', name: 'swift' }, { owner: 'Alamofire', name: 'Alamofire' }],
  'android': [{ owner: 'android', name: 'architecture-components-samples' }, { owner: 'square', name: 'retrofit' }],
  'vue': [{ owner: 'vuejs', name: 'core' }, { owner: 'vuejs', name: 'router' }, { owner: 'nuxt', name: 'nuxt' }],
  'svelte': [{ owner: 'sveltejs', name: 'svelte' }, { owner: 'sveltejs', name: 'kit' }],
  'node': [{ owner: 'nodejs', name: 'node' }, { owner: 'expressjs', name: 'express' }, { owner: 'fastify', name: 'fastify' }],
  'accessibility': [{ owner: 'facebook', name: 'react' }, { owner: 'jsx-eslint', name: 'eslint-plugin-jsx-a11y' }],
  'a11y': [{ owner: 'facebook', name: 'react' }, { owner: 'jsx-eslint', name: 'eslint-plugin-jsx-a11y' }],
};

// Step 1: Parse query with AI
async function parseQuery(query: string): Promise<{ repos: { owner: string; name: string }[]; skills: string[]; location: string | null; seniority: string | null }> {
  try {
    const text = await anthropicCall(
      'You are a technical recruiting assistant. Given a hiring query, identify the most relevant GitHub repositories where ideal candidates would be active contributors. If the query mentions specific repos after a dash, colon, or "repos like", extract and use those exact repos. Otherwise, infer the best 3-6 repos for the described role. Also generate 4 ranked skill criteria. Return valid JSON only, no markdown, no code fences: { "repos": [{"owner": "string", "name": "string"}], "skills": ["string"], "location": "string or null", "seniority": "string or null" }',
      `Parse this recruiting search query:\n\n"${query}"\n\nIdentify 3-6 GitHub repositories where the best candidates for this role would be active contributors. For example, "React experts" → repos like facebook/react, vercel/next.js. "ML infrastructure engineers" → pytorch/pytorch, huggingface/transformers. "Rust systems engineers — repos like rust-lang/rust, tokio-rs/tokio" → use those exact repos.`
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

// Step 2a: Fetch contributors from repos — PARALLEL
async function fetchContributors(repos: { owner: string; name: string }[], skills: string[]): Promise<Map<string, { username: string; commitCounts: Record<string, number> }>> {
  const contributorMap = new Map<string, { username: string; commitCounts: Record<string, number> }>();

  // Fetch all repos in parallel (P19: increased per_page to 100 for better coverage)
  const repoResults = await Promise.all(
    repos.slice(0, 8).map(async (repo) => {
      const repoFullName = `${repo.owner}/${repo.name}`;
      try {
        const contributors = await githubFetch(`${GITHUB_API}/repos/${repoFullName}/contributors?per_page=100`);
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
      const login = c.login.toLowerCase(); // BUG-003: normalize to lowercase
      const existing = contributorMap.get(login);
      if (existing) {
        existing.commitCounts[repoFullName] = c.contributions;
      } else {
        contributorMap.set(login, {
          username: login,
          commitCounts: { [repoFullName]: c.contributions },
        });
      }
    }
  }

  return contributorMap;
}

// Step 2b: Search GitHub Users API as parallel source (P11)
async function searchGitHubUsers(
  query: string,
  skills: string[],
  location: string | null
): Promise<Map<string, { username: string; commitCounts: Record<string, number> }>> {
  const userMap = new Map<string, { username: string; commitCounts: Record<string, number> }>();

  try {
    // Build GitHub search query with qualifiers
    let searchQ = skills.slice(0, 3).join(' ');
    if (location) searchQ += ` location:${location}`;

    const data = await githubFetch(
      `${GITHUB_API}/search/users?q=${encodeURIComponent(searchQ)}&per_page=25&sort=followers`
    );

    if (data?.items) {
      for (const user of data.items) {
        const login = user.login.toLowerCase(); // BUG-003: normalize
        userMap.set(login, { username: login, commitCounts: {} });
      }
    }
  } catch (e) {
    if ((e as Error).message === 'RATE_LIMITED') throw e;
    console.error('GitHub user search error:', e);
  }

  return userMap;
}

// Step 2c: Exa semantic search for GitHub profiles (P15)
async function searchExaForCandidates(query: string): Promise<string[]> {
  const exaKey = Deno.env.get('EXA_API_KEY');
  if (!exaKey) return [];

  try {
    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'x-api-key': exaKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `${query} github profile`,
        numResults: 10,
        includeDomains: ['github.com'],
        type: 'neural',
      }),
    });
    const data = await res.json();
    return (data.results || [])
      .map((r: any) => r.url?.match(/github\.com\/([^\/\?\#]+)/)?.[1]?.toLowerCase()) // BUG-003: normalize
      .filter((u: string | undefined) => u && !u.includes('.') && u !== 'topics' && u !== 'search' && u !== 'explore');
  } catch (e) {
    console.error('Exa search error:', e);
    return [];
  }
}

// Step 2b: Parallel Exa search (P24)
interface ExaCandidate {
  name: string;
  bio: string;
  profileUrl: string;
  source: 'exa';
  highlights: string[];
}

async function searchExa(query: string): Promise<ExaCandidate[]> {
  const exaKey = Deno.env.get('EXA_API_KEY');
  if (!exaKey) return [];

  try {
    const res = await fetch(EXA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': exaKey },
      body: JSON.stringify({
        query: `${query} software engineer developer`,
        type: 'neural',
        useAutoprompt: true,
        numResults: 25,
        category: 'person',
        contents: { text: { maxCharacters: 500 }, highlights: { numSentences: 3 } },
      }),
    });

    if (!res.ok) {
      console.error(`Exa API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      name: r.title || '',
      bio: (r.text || '').slice(0, 300),
      profileUrl: r.url || '',
      source: 'exa' as const,
      highlights: r.highlights || [],
    }));
  } catch (e) {
    console.error('Exa search failed:', e);
    return [];
  }
}

// Extract GitHub username from Exa result URL if it's a GitHub profile
function extractGitHubUsername(url: string): string | null {
  const match = url.match(/github\.com\/([a-zA-Z0-9_-]+)\/?$/);
  return match ? match[1] : null;
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
        githubFetch(`${GITHUB_API}/users/${username}/repos?sort=stars&per_page=15`),
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

      const commitCounts = contributorMap.get(username)?.commitCounts || {};

      // P26: Merge authored repos + contributed repos into one ranked "Notable Work" list
      // Contributed repos (high-star repos the user committed to) ranked above minor personal repos
      const notableWork: { text: string; impact: number }[] = [];

      // Add contributed repos with commit counts (these are often the most impressive)
      for (const [repoFullName, commits] of Object.entries(commitCounts)) {
        notableWork.push({
          text: `${repoFullName} (${commits} commits)`,
          impact: (commits as number) * 100, // weight contributed repos heavily
        });
      }

      // Add authored repos sorted by stars
      for (const r of repoList.filter((r: any) => r.stargazers_count > 0)) {
        // Skip if already in contributed repos
        const fullName = r.full_name || `${username}/${r.name}`;
        if (commitCounts[fullName]) continue;
        notableWork.push({
          text: `${r.name}: ${r.description || 'No description'} (${r.stargazers_count.toLocaleString()} stars)`,
          impact: r.stargazers_count,
        });
      }

      const highlights = notableWork
        .sort((a, b) => b.impact - a.impact)
        .slice(0, 5)
        .map(w => w.text);
      if (highlights.length === 0) highlights.push(`${profile.public_repos} public repositories`);

      return {
        github_username: username.toLowerCase(), // BUG-003: normalize
        name: profile.name || username,
        avatar_url: profile.avatar_url,
        bio: profile.bio || `GitHub user with ${profile.public_repos} public repos.`,
        location: profile.location || '',
        followers: profile.followers,
        public_repos: profile.public_repos,
        stars: totalStars,
        top_languages: topLanguages,
        highlights,
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

  const freshMap = new Map(validProfiles.map((p: any) => [p.github_username, p]));
  const allCandidates = [];
  for (const username of usernames) {
    const c = cachedMap.get(username);
    const fresh = freshMap.get(username);
    const candidate = fresh || c;
    if (candidate) {
      const commitCounts = contributorMap.get(username)?.commitCounts || {};
      allCandidates.push({ ...candidate, contributed_repos: { ...(candidate.contributed_repos || {}), ...commitCounts } });
    }
  }

  return allCandidates;
}

// Step 4: AI scoring — skip candidates already scored for this query, batch the rest
async function scoreCandidates(candidates: any[], query: string, parsedCriteria: any, queryHash: string): Promise<any[]> {
  if (candidates.length === 0) return candidates;

  // Only reuse cached scores if they were scored for this exact query (by hash)
  const needsScoring = candidates.filter((c: any) => !c.summary || c.score === null || c.score === undefined || c.score === 0 || c.query_hash !== queryHash);
  const alreadyScored = candidates.filter((c: any) => c.summary && c.score !== null && c.score !== undefined && c.score !== 0 && c.query_hash === queryHash);

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
            `You are an elite technical recruiter scoring GitHub contributors for a specific role. For EACH candidate, analyze:

1. RELEVANCE (40%): How closely do their contributions, languages, and repos match the search query?
2. ACTIVITY (20%): Contribution volume. High commit counts in relevant repos score higher.
3. SENIORITY SIGNALS (20%): Years on GitHub, stars received, whether they maintain popular projects.
4. RECRUITABILITY (20%): Are they likely open to opportunities? Negative signals: founder/CEO/CTO/VP titles, 10K+ followers (industry leaders). Positive signals: moderate following, IC-level bio.

SCORING BANDS:
- 90-100: Perfect match — deep contributions to query-relevant repos, right seniority, likely recruitable
- 70-89: Strong match — good contributions, some alignment gaps
- 50-69: Moderate match — tangential contributions or seniority mismatch
- 30-49: Weak match — minimal relevance or clearly unrecrutable (founders/CEOs with 10K+ followers)
- 0-29: Poor match — wrong domain or bot accounts

Return a JSON array (no markdown, no code fences): [{ "username": "string", "score": 0-100, "summary": "1 concise line mentioning repos and commit counts", "about": "2-3 sentences", "is_hidden_gem": true/false, "recruitable": true/false }]

Hidden gem = high contributions but under 500 followers.
recruitable = false if they are a founder, CEO, CTO, VP, or have >10K followers.`,
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
                candidate.recruitable = s.recruitable !== false; // default true if not specified
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

  // Batch upsert only freshly scored candidates (include query_hash for cache scoping)
  const supabase = getSupabase();
  const toUpdate = freshlyScored
    .filter((c) => c.summary)
    .map((c) => ({
      github_username: c.github_username,
      score: c.score,
      summary: c.summary,
      about: c.about,
      is_hidden_gem: c.is_hidden_gem,
      query_hash: queryHash,
    }));

  if (toUpdate.length > 0) {
    await supabase.from('candidates').upsert(toUpdate as any[], { onConflict: 'github_username' });
  }

  return [...alreadyScored, ...freshlyScored].sort((a, b) => (b.score || 0) - (a.score || 0));
}

// Step 5: Flag ungettable candidates (P10)
const UNRECRUTABLE_TITLES = /\b(founder|co-founder|cofounder|ceo|chief executive|cto|chief technology|coo|chief operating|vp |vice president|managing partner|general partner|venture partner|president)\b/i;
const FOLLOWER_THRESHOLD = 500;

function flagUngettable(candidates: any[]): any[] {
  return candidates.map(c => {
    const bio = (c.bio || '') + ' ' + (c.about || '');
    const highFollowers = (c.followers || 0) >= FOLLOWER_THRESHOLD;
    const executiveTitle = UNRECRUTABLE_TITLES.test(bio);
    const isUngettable = highFollowers || executiveTitle;
    if (isUngettable) {
      c.ungettable = true;
      c.ungettableReason = highFollowers
        ? `${(c.followers || 0).toLocaleString()} followers — likely industry leader`
        : 'Bio mentions executive/founder role';
      // Also check AI recruitable flag
      if (c.recruitable === false) {
        c.ungettable = true;
      }
    } else if (c.recruitable === false) {
      c.ungettable = true;
      c.ungettableReason = 'AI flagged as unlikely to be recruited';
    }
    return c;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Subscription gate check (requires authenticated user)
    const gate = await checkSearchGate(req.headers.get('Authorization'));
    if (!gate.allowed) {
      const isAuthError = gate.error === 'authentication_required' || gate.error === 'invalid_token';
      return new Response(JSON.stringify({
        error: gate.error,
        ...(isAuthError ? {} : { upgrade: true, searches_used: gate.searchesUsed, search_limit: gate.searchLimit }),
      }), {
        status: isAuthError ? 401 : 402,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    let query = url.searchParams.get('q') || '';

    // P19/P28: Accept POST body with targetRepos and structured strategy data
    let bodyTargetRepos: { owner: string; name: string }[] = [];
    let bodySkills: string[] = [];
    let hideUngettable = true; // P21: default to hiding ungettable candidates
    let streamMode = false; // FEAT-008: SSE streaming
    if (req.method === 'POST' || (req.headers.get('content-type') || '').includes('json')) {
      try {
        const body = await req.json();
        if (typeof body.query === 'string' && body.query) query = body.query;
        if (body.targetRepos && Array.isArray(body.targetRepos)) {
          bodyTargetRepos = body.targetRepos
            .map((r: any) => {
              if (typeof r === 'string') {
                const [owner, name] = r.split('/');
                return owner && name ? { owner, name } : null;
              }
              return r.owner && r.name ? { owner: r.owner, name: r.name } : null;
            })
            .filter(Boolean);
        }
        if (body.skills && Array.isArray(body.skills)) bodySkills = body.skills;
        if (body.hideUngettable === false) hideUngettable = false;
        if (body.stream === true) streamMode = true;
      } catch (e) {
        console.error('Failed to parse request body:', e);
        // For POST requests, body parsing failure is an error — don't silently fall through
        if (req.method === 'POST' && !query) {
          return new Response(JSON.stringify({ error: 'Invalid request body — expected JSON with "query" field' }), {
            status: 400,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          });
        }
      }
    }

    if (!query && bodyTargetRepos.length === 0) {
      return new Response(JSON.stringify({ error: 'Query parameter "q" or targetRepos is required' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();
    const t0 = Date.now();
    const searchId = crypto.randomUUID();
    const queryHash = await hashQuery(query);

    // FEAT-008: SSE streaming helper
    let sseController: ReadableStreamDefaultController<Uint8Array> | null = null;
    const encoder = new TextEncoder();
    function emitProgress(step: string, detail?: string) {
      if (sseController) {
        const data = JSON.stringify({ type: 'progress', step, detail, elapsed: Date.now() - t0 });
        sseController.enqueue(encoder.encode(`data: ${data}\n\n`));
      }
    }

    if (streamMode) {
      // Return SSE stream immediately; the search runs inside the stream body
      const stream = new ReadableStream({
        async start(controller) {
          sseController = controller;
          try {
            await runSearch(controller);
          } catch (e) {
            const errData = JSON.stringify({ type: 'error', error: (e as Error).message });
            controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    // Non-streaming: run search inline and return JSON
    async function runSearch(streamCtrl?: ReadableStreamDefaultController<Uint8Array>) {

    // Step 1: Parse query with AI
    emitProgress('parsing', 'Parsing your query with AI...');
    const parsedCriteria = await parseQuery(query);
    console.log(`[${Date.now() - t0}ms] Parsed criteria:`, parsedCriteria);
    emitProgress('parsed', `Found ${parsedCriteria.repos.length} repos, ${parsedCriteria.skills.length} skills`);

    // P19/P28: Merge strategy-provided repos (highest priority, skip validation)
    if (bodyTargetRepos.length > 0) {
      // Deduplicate: strategy repos first, then AI-parsed repos
      const seen = new Set(bodyTargetRepos.map(r => `${r.owner}/${r.name}`.toLowerCase()));
      const aiRepos = parsedCriteria.repos.filter(r => !seen.has(`${r.owner}/${r.name}`.toLowerCase()));
      parsedCriteria.repos = [...bodyTargetRepos, ...aiRepos].slice(0, 8);
      console.log(`[${Date.now() - t0}ms] Merged strategy repos:`, parsedCriteria.repos);
    }

    // Merge strategy-provided skills
    if (bodySkills.length > 0) {
      const existing = new Set(parsedCriteria.skills.map(s => s.toLowerCase()));
      const newSkills = bodySkills.filter(s => !existing.has(s.toLowerCase()));
      parsedCriteria.skills = [...parsedCriteria.skills, ...newSkills];
    }

    // Step 1b: Fallback to REPO_HINTS if no repos found (P12)
    if (parsedCriteria.repos.length === 0) {
      const queryLower = query.toLowerCase();
      for (const [keyword, repos] of Object.entries(REPO_HINTS)) {
        if (queryLower.includes(keyword)) {
          parsedCriteria.repos = repos;
          console.log(`[${Date.now() - t0}ms] Used REPO_HINTS fallback for "${keyword}":`, repos);
          break;
        }
      }
    }

    // Step 1c: Validate AI-returned repos exist (P12) — skip if repos came from strategy
    if (bodyTargetRepos.length === 0 && parsedCriteria.repos.length > 0 && parsedCriteria.repos.length <= 8) {
      const validated = await Promise.all(
        parsedCriteria.repos.map(async (r: { owner: string; name: string }) => {
          const check = await githubFetch(`${GITHUB_API}/repos/${r.owner}/${r.name}`);
          if (!check) console.log(`Repo ${r.owner}/${r.name} not found, removing`);
          return check ? r : null;
        })
      );
      parsedCriteria.repos = validated.filter(Boolean) as { owner: string; name: string }[];

      // If all AI repos were invalid, fall back to REPO_HINTS
      if (parsedCriteria.repos.length === 0) {
        const queryLower = query.toLowerCase();
        for (const [keyword, repos] of Object.entries(REPO_HINTS)) {
          if (queryLower.includes(keyword)) {
            parsedCriteria.repos = repos;
            console.log(`[${Date.now() - t0}ms] All AI repos invalid, used REPO_HINTS for "${keyword}"`);
            break;
          }
        }
      }
    }

    // Step 2: Fetch candidates from ALL sources in parallel (P11, P15)
    emitProgress('searching', `Searching ${parsedCriteria.repos.length} repositories...`);
    const [contributorMap, userSearchMap, exaUsernames] = await Promise.all([
      fetchContributors(parsedCriteria.repos, parsedCriteria.skills),
      searchGitHubUsers(query, parsedCriteria.skills, parsedCriteria.location),
      searchExaForCandidates(query),
    ]);

    // Merge: contributor data takes priority (has commit counts)
    for (const [username, data] of userSearchMap) {
      const key = username.toLowerCase(); // BUG-003: normalize
      if (!contributorMap.has(key)) {
        contributorMap.set(key, { ...data, username: key });
      }
    }
    // Merge Exa-sourced usernames
    for (const username of exaUsernames) {
      const key = username.toLowerCase(); // BUG-003: normalize
      if (!contributorMap.has(key)) {
        contributorMap.set(key, { username: key, commitCounts: {} });
      }
    }

    console.log(`[${Date.now() - t0}ms] Found ${contributorMap.size} candidates (contributors: ${contributorMap.size - userSearchMap.size - exaUsernames.length}, user search: ${userSearchMap.size}, exa: ${exaUsernames.length})`);
    emitProgress('found', `Found ${contributorMap.size} candidates from ${parsedCriteria.repos.length} repos`);

    // Step 3: Enrich with profiles (with caching + batch upsert)
    emitProgress('enriching', `Fetching profiles for ${contributorMap.size} candidates...`);
    const candidates = await enrichCandidates(contributorMap, supabase);
    console.log(`[${Date.now() - t0}ms] Enriched ${candidates.length} candidates`);
    emitProgress('enriched', `Enriched ${candidates.length} candidate profiles`);

    // Step 4: AI scoring (batch size 25, concurrent, query-scoped cache)
    emitProgress('scoring', `Scoring ${candidates.length} candidates with AI...`);
    const scored = await scoreCandidates(candidates, query, parsedCriteria, queryHash);
    console.log(`[${Date.now() - t0}ms] Scored ${scored.length} candidates`);
    emitProgress('scored', `Scored ${scored.length} candidates`);

    // Step 5: Flag ungettable candidates (P10)
    const flagged = flagUngettable(scored);

    // P21: Filter out ungettable candidates by default, or sort to bottom if showing all
    let finalCandidates = flagged;
    if (hideUngettable) {
      finalCandidates = flagged.filter(c => !c.ungettable);
      console.log(`[${Date.now() - t0}ms] Filtered ${flagged.length - finalCandidates.length} ungettable candidates`);
    } else {
      // Sort: recruitable candidates first, ungettable at bottom
      finalCandidates.sort((a, b) => {
        if (a.ungettable && !b.ungettable) return 1;
        if (!a.ungettable && b.ungettable) return -1;
        return (b.score || 0) - (a.score || 0);
      });
    }

    // BUG-001: Insert search_results junction rows for history replay
    try {
      const candidateUsernames = finalCandidates.map((c: any) => c.github_username);
      if (candidateUsernames.length > 0) {
        const { data: candidateRows } = await supabase
          .from('candidates')
          .select('id, github_username')
          .in('github_username', candidateUsernames);

        if (candidateRows && candidateRows.length > 0) {
          const usernameToId = new Map(candidateRows.map((r: any) => [r.github_username, r.id]));
          const junctionRows = finalCandidates
            .map((c: any, idx: number) => {
              const candidateId = usernameToId.get(c.github_username);
              if (!candidateId) return null;
              return {
                search_id: searchId,
                candidate_id: candidateId,
                rank: idx,
                score: c.score || 0,
              };
            })
            .filter(Boolean);

          if (junctionRows.length > 0) {
            await supabase.from('search_results').insert(junctionRows as any[]);
          }
        }
      }
      console.log(`[${Date.now() - t0}ms] Saved ${finalCandidates.length} search_results for searchId=${searchId}`);
    } catch (e) {
      console.error('Failed to insert search_results:', e);
      // Non-fatal: search still returns results even if junction insert fails
    }

    // Format response
    const results = finalCandidates.map((c: any) => ({
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
      recruitable: c.recruitable !== false,
      ungettable: c.ungettable || false,
      ungettableReason: c.ungettableReason || null,
      joinedYear: c.joined_year,
      contributedRepos: c.contributed_repos || {},
      linkedinUrl: c.linkedin_url,
      twitterUsername: c.twitter_username,
      email: c.email,
      githubUrl: c.github_url,
    }));

    // P20: Credit Guard — only increment when search returned results
    if (gate.userId && results.length > 0) {
      await incrementSearchCount(gate.userId).catch(e => console.error('Failed to increment search count:', e));
    }

    emitProgress('complete', `${results.length} results ready`);

    const responsePayload = {
      results,
      searchId,
      parsedCriteria,
      reposSearched: parsedCriteria.repos.map((r: any) => `${r.owner}/${r.name}`),
      ungettableCount: flagged.filter(c => c.ungettable).length,
      totalBeforeFilter: flagged.length,
    };

    // FEAT-008: In streaming mode, emit result event and close stream
    if (streamCtrl) {
      const resultData = JSON.stringify({ type: 'result', data: responsePayload });
      streamCtrl.enqueue(encoder.encode(`data: ${resultData}\n\n`));
      streamCtrl.close();
      return;
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });

    } // end runSearch

    return await runSearch() as Response;

  } catch (error) {
    console.error('Error in github-search:', error);

    if ((error as Error).message === 'RATE_LIMITED') {
      const retryAfter = (error as any).retryAfterSeconds || 60;
      return new Response(JSON.stringify({
        error: 'Rate limit reached. Please try again in a few minutes.',
        rateLimited: true,
        retryAfterSeconds: retryAfter,
      }), {
        status: 429,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
