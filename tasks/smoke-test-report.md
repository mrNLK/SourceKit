# SourceKit v2.0 — Smoke Test Report & Improvement Prompts

**Date**: 2026-02-28
**Tested on**: getsourcekit.vercel.app (deployed) + localhost:8080 (local dev)
**Tester**: Claude Code (automated E2E)

---

## Part 1: Smoke Test Results

### Tab-by-Tab Status

| Tab | Status | Issues Found |
|-----|--------|--------------|
| Research & Strategy | ✅ Pass | Working. JD URL parsing, strategy generation operational |
| Results (Search) | ❌ Fail | Suggestion chips produce 0 results; manual free-text search works |
| History | ✅ Pass | Shows prior searches. 0-result searches correctly omitted |
| Pipeline | ✅ Pass | Kanban loads, 5 stages visible, cards render with scores |
| Watchlist | ✅ Pass | Saved candidates display correctly |
| Bulk Actions | ✅ Pass | Table renders, action buttons visible, AI chat input works |
| Websets | ✅ Pass | Create form + empty state working. Pipeline import added (P3) |
| Settings | ✅ Pass | All 3 sections (Outreach, API Keys, Integrations) populated |

### Critical Bugs Found

#### BUG-1: Suggestion Chips Return 0 Results (CRITICAL)
- **Reproduction**: Click any suggestion chip (e.g., "Rust systems engineers", "ML infrastructure")
- **Expected**: 15-60 results
- **Actual**: 0 results every time
- **Root cause**: Expanded queries are descriptive prose (e.g., "Rust systems engineers with experience in low-level programming, memory safety, performance optimization…") but the AI `parseQuery()` step needs to map these to concrete GitHub repos. The verbose, abstract descriptions confuse the AI into either returning 0 repos or hallucinating invalid repo names.
- **Evidence**: The `parseQuery` prompt gives examples like `"ML infrastructure engineers" → pytorch/pytorch`, but the actual input it receives is 30+ words of expanded prose, not the short label.

#### BUG-2: "Ungettable" Candidates Get Top Scores (CRITICAL)
- **Reproduction**: Search for "contributors to pytorch/pytorch and huggingface/transformers"
- **Actual**: Thomas Wolf (co-founder/CEO of Hugging Face) appears with score 98
- **Problem**: Founders, CEOs, VCs, and executives who happen to contribute code are not recruitable for an IC role. Scoring prompt has zero filtering for unrecrutable profiles.
- **Affected data**: `followers > 10,000`, roles containing "founder", "CEO", "CTO", "VP", "Partner"

#### BUG-3: Stale Query State After Chip Click (MEDIUM)
- **Reproduction**: Click a suggestion chip, then manually edit the search input
- **Expected**: Should search with the manually entered text
- **Actual**: May retain the chip's expandedQuery internally while showing different text in the input

---

## Part 2: Complete Workflow Map & API Chain

### Search Pipeline (Primary Workflow)
```
User Input (SearchTab.tsx)
  ↓ query string (or chip expandedQuery)
  ↓
invokeFunction('github-search', { q: query })  [src/lib/api.ts]
  ↓ Supabase Edge Function
  ↓
┌─────────────────────────────────────────────────────┐
│ github-search/index.ts                               │
│                                                       │
│ Step 0: checkSearchGate() → user_subscriptions table │
│   API: Supabase DB (user_subscriptions)              │
│                                                       │
│ Step 1: parseQuery(query) → AI identifies repos      │
│   API: Anthropic Claude Haiku (via anthropicCall)    │
│   Returns: { repos: [...], skills, location }        │
│                                                       │
│ Step 2: fetchContributors(repos)                     │
│   API: GitHub REST v3                                 │
│     - /repos/{owner}/{name}/contributors?per_page=30 │
│     - Fallback: /search/users?q={skills}             │
│   Up to 6 repos × 30 contributors = 180 max         │
│                                                       │
│ Step 3: enrichCandidates(contributorMap)              │
│   API: GitHub REST v3 (parallel)                     │
│     - /users/{username}                              │
│     - /users/{username}/repos?sort=stars&per_page=30 │
│   Caching: candidates table, 7-day TTL              │
│   Max 15 fresh fetches per search                    │
│                                                       │
│ Step 4: scoreCandidates(candidates, query)            │
│   API: Anthropic Claude Haiku (via anthropicCall)    │
│   Batch: 25 per call, up to 3 concurrent             │
│   Caching: query_hash scoped (P5 fix)               │
│   Returns: score 0-100, summary, about, hidden_gem  │
│                                                       │
│ Step 5: incrementSearchCount(userId)                 │
│   API: Supabase DB (user_subscriptions)              │
└─────────────────────────────────────────────────────┘
  ↓ JSON response
  ↓
SearchTab.tsx renders DeveloperCard[]
```

### Research Pipeline
```
User pastes JD URL → ResearchTab.tsx
  ↓
invokeFunction('parse-jd', { url, parallel_api_key? })
  ↓
┌──────────────────────────────────────┐
│ parse-jd/index.ts                     │
│                                       │
│ Try 1: Parallel.ai Extract API       │
│   POST api.parallel.ai/v1beta/extract│
│   (JS-rendered pages: Greenhouse,    │
│    Lever, Workable)                  │
│                                       │
│ Try 2: Direct HTML fetch (fallback)  │
│   fetch(url) → strip tags → text    │
│                                       │
│ Then: Anthropic Claude Haiku         │
│   Extract: title, company, skills,   │
│   experience, responsibilities       │
└──────────────────────────────────────┘
  ↓ parsed JD
  ↓
invokeFunction('generate-outreach', { ... })
  → Anthropic Claude for strategy/outreach generation
```

### LinkedIn Enrichment
```
DeveloperCard → "Find LinkedIn" button
  ↓
invokeFunction('enrich-linkedin', { username, name, location, bio })
  ↓
┌──────────────────────────────────────┐
│ enrich-linkedin/index.ts              │
│                                       │
│ Step 1: Check cache (P8 fix)         │
│   - If linkedin_url exists AND       │
│     linkedin_fetched_at < 30 days    │
│   → Return cached immediately        │
│                                       │
│ Step 2: Exa Neural Search            │
│   POST api.exa.ai/search             │
│   Query: "{name} {location} {bio}"   │
│   Category: linkedin profile         │
│                                       │
│ Step 3: Anthropic AI verification    │
│   Match Exa results to candidate     │
│   Return best match URL              │
└──────────────────────────────────────┘
```

### Websets Pipeline
```
WebsetsTab → Create form
  ↓
callWebsetsApi('create', { query, count, criteria, enrichments })
  ↓
┌──────────────────────────────────────┐
│ exa-websets/index.ts                  │
│                                       │
│ Step 0: Verify user via JWT (P2 fix) │
│ Step 1: POST api.exa.ai/websets/v0   │
│   Create webset on Exa               │
│ Step 2: INSERT webset_mappings       │
│   (multi-tenant isolation)           │
│ List: filter by user_id              │
│ Delete: verify ownership first       │
└──────────────────────────────────────┘
```

### External API Summary

| API | Used For | Auth | Rate Limits |
|-----|----------|------|-------------|
| GitHub REST v3 | Contributors, profiles, repos | GITHUB_TOKEN (env) | 5000/hr authenticated |
| Anthropic Claude Haiku | Query parsing, scoring, outreach, JD extraction, matching | ANTHROPIC_API_KEY (env) | Token-based billing |
| Exa AI Search | LinkedIn profile matching | EXA_API_KEY (env, server-side only) | API key billing |
| Exa Websets | Entity collection + enrichment | EXA_API_KEY (env) | API key billing |
| Parallel.ai Extract | JS-rendered page scraping | parallel_api_key (user settings) | API key billing |
| Supabase | Auth, DB, Edge Functions | Service role key | Generous free tier |

---

## Part 3: Claude Code Improvement Prompts

### P9 — Fix Suggestion Chip Queries (CRITICAL — 0 results bug)

```
Fix the suggestion chip search feature that currently returns 0 results every time.

ROOT CAUSE: The DEFAULT_SUGGESTIONS in src/components/SearchTab.tsx use long descriptive
expandedQuery strings (30+ words of prose), but the parseQuery() AI step in
supabase/functions/github-search/index.ts needs short, specific input to map to GitHub repos.

SOLUTION: Replace the expandedQuery values with repo-hinted queries that the AI can reliably parse.

In src/components/SearchTab.tsx, change DEFAULT_SUGGESTIONS to:

const DEFAULT_SUGGESTIONS: SuggestionChip[] = [
  { label: "Rust systems engineers", expandedQuery: "Rust systems engineers — repos like rust-lang/rust, tokio-rs/tokio, denoland/deno" },
  { label: "React accessibility experts", expandedQuery: "React accessibility experts — repos like facebook/react, jsx-eslint/eslint-plugin-jsx-a11y, reach/reach-ui" },
  { label: "ML infrastructure", expandedQuery: "ML infrastructure engineers — repos like pytorch/pytorch, huggingface/transformers, ray-project/ray" },
  { label: "Kubernetes contributors", expandedQuery: "Kubernetes contributors — repos like kubernetes/kubernetes, helm/helm, istio/istio" },
  { label: "Security researchers", expandedQuery: "Security researchers — repos like OWASP/owasp-testing-guide, sqlmapproject/sqlmap, rapid7/metasploit-framework" },
];

Also improve the parseQuery() AI system prompt (line 92 of github-search/index.ts) to handle both
short and long queries. Add to the prompt: "If the query mentions specific repos after a dash or
colon, use those. Otherwise, infer the best repos for the described role."

VERIFICATION: Click each suggestion chip — each should return 10+ results.
```

### P10 — Filter Ungettable Candidates (CRITICAL — accuracy)

```
Add "ungettable candidate" detection to prevent founders, CEOs, and other unrecrutable people
from appearing in search results with high scores.

CHANGES:

1. In supabase/functions/github-search/index.ts, add a new Step 4b after scoring:

   function filterUngettable(candidates: any[]): any[] {
     const UNRECRUTABLE_TITLES = /\b(founder|co-founder|cofounder|ceo|chief executive|cto|chief technology|coo|chief operating|vp |vice president|managing partner|general partner|venture partner|president)\b/i;
     const FOLLOWER_THRESHOLD = 10000;

     return candidates.map(c => {
       const bio = (c.bio || '') + ' ' + (c.about || '');
       const isUngettable = UNRECRUTABLE_TITLES.test(bio) || c.followers >= FOLLOWER_THRESHOLD;
       if (isUngettable) {
         c.ungettable = true;
         c.ungettableReason = c.followers >= FOLLOWER_THRESHOLD
           ? `${c.followers.toLocaleString()} followers — likely industry leader`
           : `Bio mentions executive/founder role`;
       }
       return c;
     });
   }

   Call this after scoreCandidates and before formatting the response.

2. Add `ungettable` and `ungettableReason` to the response object (line ~391).

3. In src/components/DeveloperCard.tsx (or the search results renderer):
   - If `ungettable === true`: show an amber/yellow badge "⚠️ Likely Ungettable" with the reason
     in a tooltip
   - Do NOT remove them from results entirely — the user may still want to see them
   - Sort ungettable candidates to the bottom of results

4. Also update the scoring prompt (line 292) to add this instruction:
   "If a candidate is a company founder, CEO, CTO, VP, or has >10K followers, note this in their
   summary and give a lower score (cap at 60) since they are unlikely to be recruited for an IC role."

VERIFICATION: Search for "contributors to huggingface/transformers" — Thomas Wolf should appear
with the "Likely Ungettable" badge and a score ≤ 60.
```

### P11 — Add GitHub Search Users API as Primary Source (HIGH — result volume)

```
Currently, if parseQuery() fails to identify repos (returns 0 repos), the fallback to GitHub
search/users API only kicks in inside fetchContributors(). This fallback is too narrow and uses
raw skill keywords.

IMPROVE the search pipeline to use GitHub's search/users API as a PARALLEL primary source
alongside the repo contributor approach:

In supabase/functions/github-search/index.ts:

1. Add a new function `searchGitHubUsers()`:

   async function searchGitHubUsers(query: string, skills: string[], location: string | null): Promise<Map<string, { username: string; commitCounts: Record<string, number> }>> {
     const userMap = new Map();

     // Build GitHub search query with qualifiers
     let searchQ = skills.slice(0, 3).join(' ');
     if (location) searchQ += ` location:${location}`;
     searchQ += ' type:user';

     const data = await githubFetch(
       `${GITHUB_API}/search/users?q=${encodeURIComponent(searchQ)}&per_page=25&sort=followers`
     );

     if (data?.items) {
       for (const user of data.items) {
         userMap.set(user.login, { username: user.login, commitCounts: {} });
       }
     }
     return userMap;
   }

2. In the serve handler (line ~377), run BOTH in parallel:

   const [contributorMap, userSearchMap] = await Promise.all([
     fetchContributors(parsedCriteria.repos, parsedCriteria.skills),
     searchGitHubUsers(query, parsedCriteria.skills, parsedCriteria.location),
   ]);

   // Merge: contributor data takes priority (has commit counts)
   for (const [username, data] of userSearchMap) {
     if (!contributorMap.has(username)) {
       contributorMap.set(username, data);
     }
   }

This ensures we always have candidates even if repo identification fails, and adds users who
match the skill profile but contribute to repos we didn't think to check.

VERIFICATION: Suggestion chip searches should now return 15-25+ results even if parseQuery
misidentifies repos, because the user search provides a fallback pool.
```

### P12 — Improve parseQuery AI Reliability (HIGH — accuracy)

```
The parseQuery() function in supabase/functions/github-search/index.ts (line 88) frequently
fails to return valid repos. Improve its reliability.

CHANGES:

1. Add a curated fallback repo map for common search patterns:

   const REPO_HINTS: Record<string, { owner: string; name: string }[]> = {
     'rust': [{ owner: 'rust-lang', name: 'rust' }, { owner: 'tokio-rs', name: 'tokio' }, { owner: 'denoland', name: 'deno' }],
     'react': [{ owner: 'facebook', name: 'react' }, { owner: 'vercel', name: 'next.js' }, { owner: 'remix-run', name: 'remix' }],
     'python': [{ owner: 'python', name: 'cpython' }, { owner: 'django', name: 'django' }, { owner: 'pallets', name: 'flask' }],
     'ml': [{ owner: 'pytorch', name: 'pytorch' }, { owner: 'tensorflow', name: 'tensorflow' }, { owner: 'huggingface', name: 'transformers' }],
     'kubernetes': [{ owner: 'kubernetes', name: 'kubernetes' }, { owner: 'helm', name: 'helm' }, { owner: 'istio', name: 'istio' }],
     'security': [{ owner: 'OWASP', name: 'CheatSheetSeries' }, { owner: 'zaproxy', name: 'zaproxy' }],
     'go': [{ owner: 'golang', name: 'go' }, { owner: 'gin-gonic', name: 'gin' }, { owner: 'gofiber', name: 'fiber' }],
     'typescript': [{ owner: 'microsoft', name: 'TypeScript' }, { owner: 'trpc', name: 'trpc' }, { owner: 'colinhacks', name: 'zod' }],
     'ios': [{ owner: 'apple', name: 'swift' }, { owner: 'Alamofire', name: 'Alamofire' }, { owner: 'realm', name: 'realm-swift' }],
     'android': [{ owner: 'android', name: 'architecture-components-samples' }, { owner: 'square', name: 'retrofit' }],
   };

2. After AI parseQuery returns, if repos.length === 0, check REPO_HINTS:

   if (parsedCriteria.repos.length === 0) {
     const queryLower = query.toLowerCase();
     for (const [keyword, repos] of Object.entries(REPO_HINTS)) {
       if (queryLower.includes(keyword)) {
         parsedCriteria.repos = repos;
         break;
       }
     }
   }

3. Validate AI-returned repos: after parsing, verify each repo exists with a HEAD request
   (githubFetch). Remove 404s before passing to fetchContributors:

   parsedCriteria.repos = (await Promise.all(
     parsedCriteria.repos.map(async r => {
       const check = await githubFetch(`${GITHUB_API}/repos/${r.owner}/${r.name}`);
       return check ? r : null;
     })
   )).filter(Boolean);

VERIFICATION: The query "Rust systems engineers" should always return rust-lang/rust,
tokio-rs/tokio repos even if the AI hallucinates others.
```

### P13 — Performance: Stream Search Progress via SSE (MEDIUM — speed perception)

```
Currently the search endpoint returns a single JSON response after ALL 4 steps complete (15-25s).
The frontend shows fake timed progress steps (P6). Replace with real server-sent progress.

CHANGES:

1. In supabase/functions/github-search/index.ts, convert the response to SSE:

   - Instead of building a final JSON response, stream progress events:
     event: progress
     data: {"step": 1, "message": "Parsed query — found 4 repos", "repos": [...]}

     event: progress
     data: {"step": 2, "message": "Found 87 contributors", "count": 87}

     event: progress
     data: {"step": 3, "message": "Enriched 45 profiles", "count": 45}

     event: progress
     data: {"step": 4, "message": "Scored 45 candidates", "count": 45}

     event: result
     data: {full results JSON}

2. In src/lib/api.ts, add a streaming search function:

   export async function searchDevelopersStream(
     query: string,
     onProgress: (step: number, message: string) => void
   ): Promise<SearchResponse> {
     // Use EventSource or fetch + ReadableStream
     // Call onProgress for each SSE "progress" event
     // Return final "result" event data
   }

3. In src/components/SearchTab.tsx:
   - Replace the timer-based progress steps with real SSE events
   - Show actual repo names, contributor counts as they arrive
   - Update the step display with real data instead of generic messages

VERIFICATION: Run a search — progress steps should update with real counts
(e.g., "Found 87 contributors from pytorch/pytorch, tensorflow/tensorflow").
```

### P14 — Improve Scoring Prompt Quality (MEDIUM — accuracy)

```
The scoring prompt in supabase/functions/github-search/index.ts (line 292) is generic.
Improve it to produce more useful, differentiated scores.

Replace the scoring system prompt with:

'You are an elite technical recruiter scoring GitHub contributors for a specific role. For EACH candidate, analyze:

1. RELEVANCE (40%): How closely do their contributions, languages, and repos match the search query? A React expert contributing to Vue repos is less relevant.

2. ACTIVITY (20%): Contribution volume and recency. Recent active contributors score higher than one-time contributors from years ago.

3. SENIORITY SIGNALS (20%): Years on GitHub, number of repos, stars received, whether they maintain popular projects. More experience = higher score for senior roles.

4. RECRUITABILITY (20%): Are they likely open to opportunities? Negative signals: founder/CEO/CTO titles, 10K+ followers (industry leaders), employed at FAANG with "not looking" indicators. Positive signals: recent job change, "open to work", moderate following.

SCORING BANDS:
- 90-100: Perfect match — deep contributions to query-relevant repos, right seniority, likely recruitable
- 70-89: Strong match — good contributions, some alignment gaps
- 50-69: Moderate match — tangential contributions or seniority mismatch
- 30-49: Weak match — minimal relevance or clearly unrecrutable (founders/CEOs)
- 0-29: Poor match — wrong domain or bot accounts

Return a JSON array (no markdown): [{ "username": "string", "score": 0-100, "summary": "1 line mentioning their top repos and commit counts", "about": "2-3 sentences on why they match or don't", "is_hidden_gem": true/false, "recruitable": true/false }]

Hidden gem = high contributions but under 500 followers.
recruitable = false if they are a founder, CEO, CTO, VP, or have >10K followers.'

Also add `recruitable` to the response format (line ~391) and surface it in DeveloperCard.

VERIFICATION: Thomas Wolf should score ≤ 50 with recruitable: false. A regular contributor
with 200 commits and 300 followers should score 80+.
```

### P15 — Add Multi-Source Search via Exa (MEDIUM — result diversity)

```
Currently search only uses GitHub API. Add Exa semantic search as a supplementary source
to find candidates from non-GitHub signals (blog posts, talks, publications).

CHANGES:

1. In supabase/functions/github-search/index.ts, add after Step 2:

   async function searchExaForCandidates(query: string, skills: string[]): Promise<string[]> {
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
       // Extract GitHub usernames from URLs like github.com/username
       return (data.results || [])
         .map((r: any) => r.url?.match(/github\.com\/([^\/\?]+)/)?.[1])
         .filter(Boolean);
     } catch { return []; }
   }

2. Run this in parallel with fetchContributors and merge the usernames into the contributor map.

3. In the response, add a `sources` field showing where each candidate was found:
   { source: 'contributor' | 'github_search' | 'exa' }

VERIFICATION: Results should include candidates found via Exa that weren't in the contributor
lists, marked with their source.
```

### P16 — Fix Stale Query State in SearchTab (MEDIUM — UX bug)

```
Fix the stale expanded query bug in src/components/SearchTab.tsx.

PROBLEM: When a user clicks a suggestion chip, the expandedQuery is stored in state. If the user
then manually types in the search input, the search may still use the old expandedQuery.

Find the search submission handler and ensure:

1. When a chip is clicked: set both the display query AND the internal expandedQuery
2. When the user types in the input: CLEAR the expandedQuery state so only the typed text is used
3. The search should use expandedQuery if it was set by a chip, otherwise use the raw input value

Look for the input onChange handler and add: setExpandedQuery('') or equivalent.
Look for the search submit handler and use: const finalQuery = expandedQuery || inputValue

VERIFICATION: Click "Rust systems engineers" chip, then clear the input and type "python
developers". Submit — should search for "python developers", NOT the Rust expanded query.
```

### P17 — Add Candidate Deduplication (LOW — data quality)

```
When running multiple searches, the same candidates can appear across results. Add deduplication.

CHANGES:

1. In supabase/functions/github-search/index.ts, after merging contributor maps (if P11 is
   implemented), the Map already deduplicates by username. No backend change needed.

2. In src/components/SearchTab.tsx (or wherever results are displayed):
   - Before rendering, deduplicate by `id` (github_username)
   - If a candidate appears from multiple sources, merge and keep the highest score

3. In the pipeline (PipelineTab.tsx), when adding candidates:
   - Check if github_username already exists in any pipeline stage
   - If yes, show a "Already in pipeline (Stage: X)" message instead of duplicating

VERIFICATION: Run two searches that share contributors (e.g., "pytorch contributors" and
"ML infrastructure"). Same person should not appear twice in combined results.
```

### P18 — Optimize GitHub API Usage (LOW — performance)

```
Current GitHub API usage can be optimized to reduce rate limit pressure and speed up searches.

CHANGES:

1. Reduce per-repo contributor fetch from 30 to 20 (line 122):
   /repos/{owner}/{name}/contributors?per_page=20

   Most repos' top 20 contributors capture 80%+ of meaningful contributors.

2. Reduce profile repo fetch from 30 to 15 (line 182):
   /users/{username}/repos?sort=stars&per_page=15

   We only use top 3 highlights anyway.

3. Add conditional requests with If-None-Match (ETags) for cached profiles:
   - Store the ETag from GitHub responses in the candidates table
   - On cache miss, send If-None-Match header → 304 = no change, skip processing

4. Use GraphQL API for profile + repos in a single call:
   Instead of 2 REST calls per user (/users/{username} + /users/{username}/repos),
   use a single GraphQL query:

   query { user(login: "{username}") {
     name bio location followers { totalCount }
     repositories(first: 15, orderBy: {field: STARGAZERS, direction: DESC}, isFork: false) {
       nodes { name description stargazerCount primaryLanguage { name } }
     }
   }}

   This cuts API calls in half for uncached profiles.

VERIFICATION: Monitor x-ratelimit-remaining header in logs. Should see ~40% fewer API calls
per search.
```

---

## Part 4: Priority Matrix

| Prompt | Severity | Effort | Impact | Dependencies |
|--------|----------|--------|--------|--------------|
| P9 — Fix suggestion chips | CRITICAL | Small | Fixes broken feature | None |
| P10 — Filter ungettable | CRITICAL | Medium | Accuracy | None |
| P11 — Add user search API | HIGH | Medium | More results | None |
| P12 — parseQuery reliability | HIGH | Medium | Accuracy | None |
| P14 — Better scoring prompt | MEDIUM | Small | Accuracy | P10 |
| P16 — Fix stale query state | MEDIUM | Small | UX bug | P9 |
| P13 — SSE progress | MEDIUM | Large | Perf perception | None |
| P15 — Exa multi-source | MEDIUM | Medium | Diversity | None |
| P17 — Deduplication | LOW | Small | Data quality | P11 |
| P18 — GitHub API optimization | LOW | Large | Performance | None |

**Recommended execution order**: P9 → P10 → P16 → P14 → P11 → P12 → P15 → P13 → P17 → P18
