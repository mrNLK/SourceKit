/* eslint-disable @typescript-eslint/no-explicit-any -- mixed row shapes */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { githubFetch } from "../_shared/github.ts";
import { classifyPerson } from "../_shared/talent-flags.ts";
import { chooseSummary } from "../_shared/providers/bio.ts";
import { requireAuth, authErrorResponse } from "../_shared/auth.ts";
import {
  exaPeopleSearch, githubContributorSearch, githubHandleByNameCompany, harmonicCompanyFirstPeople, harmonicPeopleByName, harmonicPersonByLinkedin,
  parallelEntitySearchPeople, type HarmonicConfig,
} from "../_shared/providers/clients.ts";
import {
  buildGithubRepoQueries, buildHarmonicCompanyQueries, buildPeopleQuery, extractSearchTerms, hasFilters, harmonicEmployeeGroup, sanitizeFilters,
} from "../_shared/providers/requests.ts";
import { clamp, exaMaxResults, harmonicBaseUrl, isHarmonicEnabled, isParallelPeopleEnabled } from "../_shared/providers/flags.ts";
import { COST } from "../_shared/providers/persist.ts";
import { persistCandidates } from "../_shared/providers/store.ts";
import type { UnifiedCandidate } from "../_shared/providers/candidate.ts";
import { evidenceBoost, firecrawlDiscover, firecrawlScrapeEvidence, isFirecrawlEnabled, isPersonalSiteUrl, FIRECRAWL_LIMITS } from "../_shared/providers/firecrawl.ts";

/**
 * source-candidates: one query -> fan out to all enabled people sources -> normalize -> dedup -> persist.
 *
 * Body: { query: string, filters?: { titles, seniorities, locations, skills, company_domains, companies, keywords },
 *         sources?: ("exa"|"parallel"|"harmonic"|"github")[], limit?: number, persist?: boolean,
 *         person_name?: string (Harmonic typeahead PERSON lookup), harmonic_enrich?: boolean }
 * Consumes one pilot "search" unit per call (same as other search functions).
 */
type SourceName = "exa" | "parallel" | "harmonic" | "github" | "firecrawl";
const HARMONIC_ENRICH_TOP = 10;
const GITHUB_FLAG_LOOKUPS = 25;
const GITHUB_NAME_LOOKUPS = 10; // free name+company -> GitHub handle lookups for top Exa results // free GitHub /users lookups for follower counts (hidden gem / ungettable)

/** Attach hidden_gem / ungettable flags (and GitHub follower counts) and drop bot accounts. */
async function addTalentFlags(rows: any[]): Promise<any[]> {
  const login = (c: any) => c.github_login ?? c.githubLogin ?? null;
  const logins = [...new Set(rows.map(login).filter(Boolean))].slice(0, GITHUB_FLAG_LOOKUPS) as string[];
  const gh = new Map<string, any>();
  await Promise.allSettled(logins.map(async (l) => {
    const u = await githubFetch(`https://api.github.com/users/${encodeURIComponent(l)}`);
    if (u?.login) gh.set(l.toLowerCase(), u);
  }));
  return rows.map((c) => {
    const l = login(c);
    const u = l ? gh.get(String(l).toLowerCase()) : undefined;
    const f = classifyPerson({
      currentTitle: c.current_title ?? c.currentTitle, headline: c.headline, githubLogin: l,
      githubFollowers: u?.followers ?? null, githubPublicRepos: u?.public_repos ?? null, githubType: u?.type ?? null,
      sourcingScore: c.sourcing_score,
    });
    const providers: string[] = Array.isArray(c.providers) ? c.providers : Array.isArray(c.sources) ? c.sources.map((h: any) => h?.provider).filter(Boolean) : [];
    const summary = u ? chooseSummary(c.summary, u.bio, providers) : c.summary;
    return { ...c, summary, gh_type: u?.type ?? null, blog_url: u?.blog || null, github_followers: u?.followers ?? null, is_bot: f.isBot, hidden_gem: f.hiddenGem, ungettable: f.ungettable, ungettable_reason: f.ungettableReason };
  }).filter((c) => !c.is_bot && c.gh_type !== "Organization"); // orgs (e.g. README owners) are not people
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  try {
    // Lightweight capability probe (no usage charge): which sources are enabled server-side.
    const probe = await req.clone().json().catch(() => ({}));
    if (probe && probe.probe === true) {
      await requireAuth(req);
      const ge = (n: string) => Deno.env.get(n);
      return new Response(JSON.stringify({ enabled: {
        exa: !!ge("EXA_API_KEY"),
        parallel: isParallelPeopleEnabled(ge) && !!ge("PARALLEL_API_KEY"),
        harmonic: isHarmonicEnabled(ge),
        github: true,
        firecrawl: isFirecrawlEnabled(ge),
      } }), { headers });
    }
    const { user } = await requireAuth(req, { usage: "search" });
    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim().slice(0, 500) : "";
    const filters = sanitizeFilters(body.filters);
    const personName = typeof body.person_name === "string" ? body.person_name.trim().slice(0, 120) : "";
    if (!query && !hasFilters(filters) && !personName) {
      return new Response(JSON.stringify({ error: "query or filters required" }), { status: 400, headers });
    }
    const getEnv = (n: string) => Deno.env.get(n);
    const limit = clamp(body.limit, 5, 200, 50);
    const requested = new Set<SourceName>(Array.isArray(body.sources) && body.sources.length ? body.sources : ["exa", "parallel", "harmonic", "github", "firecrawl"]);

    const enabled: Record<SourceName, boolean> = {
      exa: !!getEnv("EXA_API_KEY"),
      parallel: isParallelPeopleEnabled(getEnv) && !!getEnv("PARALLEL_API_KEY"),
      harmonic: isHarmonicEnabled(getEnv),
      github: !!query,
      firecrawl: isFirecrawlEnabled(getEnv) && !!(query || filters.skills?.length),
    };

    const nl = buildPeopleQuery(query, filters);
    const tasks: { source: SourceName; run: () => Promise<{ candidates: UnifiedCandidate[]; cost: number; total?: number | null; detail?: Record<string, unknown> }> }[] = [];
    if (requested.has("exa") && enabled.exa) {
      const n = Math.min(exaMaxResults(getEnv), limit);
      tasks.push({ source: "exa", run: async () => ({ candidates: await exaPeopleSearch(getEnv("EXA_API_KEY")!, nl, { numResults: n }), cost: COST.exaSearch(n) }) });
    }
    if (requested.has("parallel") && enabled.parallel) {
      const n = Math.max(limit, 100); // first 100 results are included in the per-request price
      tasks.push({ source: "parallel", run: async () => ({ candidates: await parallelEntitySearchPeople(getEnv("PARALLEL_API_KEY")!, nl, n), cost: COST.parallelEntitySearch(n) }) });
    }
    const harmonicCfg: HarmonicConfig | null = enabled.harmonic ? { apiKey: getEnv("HARMONIC_API_KEY")!, baseUrl: harmonicBaseUrl(getEnv) } : null;
    if (requested.has("harmonic") && harmonicCfg) {
      tasks.push({ source: "harmonic", run: async () => {
        const found: UnifiedCandidate[] = [];
        if (personName) found.push(...await harmonicPeopleByName(harmonicCfg, personName, 10));
        if (query || hasFilters(filters)) {
          const r = await harmonicCompanyFirstPeople(harmonicCfg, buildHarmonicCompanyQueries(query, filters), {
            companies: 5, perCompany: Math.max(5, Math.min(20, Math.ceil(limit / 5))), group: harmonicEmployeeGroup(filters, query),
          });
          found.push(...r.candidates);
          return { candidates: found, cost: 0, detail: { company_query: r.queryUsed, companies: r.companyUrns.length, attempts: r.attempts } };
        }
        return { candidates: found, cost: 0 };
      } });
    }
    if (requested.has("github") && enabled.github) {
      tasks.push({ source: "github", run: async () => {
        const r = await githubContributorSearch(getEnv("GITHUB_TOKEN"), buildGithubRepoQueries(query, filters), { repos: 3, perRepo: 10, maxUsers: Math.min(30, limit), keywords: extractSearchTerms(query, filters).keywords });
        return { candidates: r.candidates, cost: 0, detail: { repos: r.repos, rejected: r.rejected } };
      } });
    }

    if (requested.has("firecrawl") && enabled.firecrawl) {
      tasks.push({ source: "firecrawl", run: async () => {
        const fq = [query, ...(filters.skills || []).slice(0, 4)].filter(Boolean).join(" ");
        const r = await firecrawlDiscover(getEnv("FIRECRAWL_API_KEY")!, fq, {
          issueAuthor: async (o, rp, n) => {
            const it = await githubFetch(`https://api.github.com/repos/${encodeURIComponent(o)}/${encodeURIComponent(rp)}/issues/${n}`);
            return it?.user?.type === "User" ? it.user.login : null;
          },
        });
        return { candidates: r.candidates, cost: 0, detail: r.detail };
      } });
    }

    if (!tasks.length) {
      return new Response(JSON.stringify({ error: "No enabled people sources for this request", enabled }), { status: 422, headers });
    }

    const settled = await Promise.allSettled(tasks.map((t) => t.run()));
    const sources: Record<string, { count: number; est_cost_usd: number; total?: number | null; error?: string; detail?: Record<string, unknown> }> = {};
    // Order = merge priority for field conflicts: structured sources first.
    const priority: SourceName[] = ["harmonic", "github", "exa", "parallel", "firecrawl"];
    const bySource = new Map<SourceName, UnifiedCandidate[]>();
    settled.forEach((r, i) => {
      const s = tasks[i].source;
      if (r.status === "fulfilled") {
        sources[s] = { count: r.value.candidates.length, est_cost_usd: Number(r.value.cost.toFixed(4)), total: r.value.total, ...(r.value.detail ? { detail: r.value.detail } : {}) };
        bySource.set(s, r.value.candidates);
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        console.error(`source ${s} failed:`, msg);
        sources[s] = { count: 0, est_cost_usd: 0, error: msg.slice(0, 200) };
      }
    });
    const all = priority.flatMap((s) => bySource.get(s) || []);

    // Optional: resolve top LinkedIn candidates to Harmonic people so they dedup by Harmonic URN.
    if (harmonicCfg && body.harmonic_enrich === true) {
      const targets = all.filter((c) => c.linkedinUrl && !c.harmonicUrn).slice(0, HARMONIC_ENRICH_TOP);
      const enriched = await Promise.allSettled(targets.map((c) => harmonicPersonByLinkedin(harmonicCfg, c.linkedinUrl!)));
      for (const r of enriched) if (r.status === "fulfilled" && r.value) all.push(r.value);
    }

    // Free GitHub handle lookup (name + company) for top web-profile results without one.
    const nameTargets = all.filter((c) => !c.githubLogin && c.currentCompany && c.sources.some((h) => h.provider === "exa"))
      .sort((a, b) => (a.sources[0]?.rank ?? 99) - (b.sources[0]?.rank ?? 99)).slice(0, GITHUB_NAME_LOOKUPS);
    const handles = await Promise.allSettled(nameTargets.map((c) => githubHandleByNameCompany(getEnv("GITHUB_TOKEN"), c.fullName, c.currentCompany!, fetch, c.location)));
    handles.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        nameTargets[i].githubLogin = r.value.login.toLowerCase();
        nameTargets[i].profileUrls.push(`https://github.com/${r.value.login}`);
      }
    });
    const githubMatched = handles.filter((r) => r.status === "fulfilled" && r.value).length;

    const supabase = createClient(getEnv("SUPABASE_URL")!, getEnv("SUPABASE_SERVICE_ROLE_KEY")!);
    const persist = body.persist !== false;
    let candidates: unknown[];
    if (persist) {
      candidates = (await persistCandidates(supabase, user.id, all, { query: query || nl })).slice(0, limit);
    } else {
      const { dedupCandidates, sourcingScore } = await import("../_shared/providers/dedup.ts");
      candidates = dedupCandidates(all).map((c) => ({ ...c, sourcing_score: sourcingScore(c) }))
        .sort((a, b) => b.sourcing_score - a.sourcing_score).slice(0, limit);
    }

    candidates = await addTalentFlags(candidates as any[]);

    // Firecrawl profile enrichment: scrape a few personal sites/blogs for scoring evidence (fail soft, capped).
    if (enabled.firecrawl && requested.has("firecrawl")) {
      const kw = extractSearchTerms(query, filters).keywords;
      const targets = (candidates as any[]).filter((c) => isPersonalSiteUrl(c.blog_url)).slice(0, FIRECRAWL_LIMITS.scrapes);
      const ev = await Promise.allSettled(targets.map((c) => firecrawlScrapeEvidence(getEnv("FIRECRAWL_API_KEY")!, String(c.blog_url).startsWith("http") ? c.blog_url : `https://${c.blog_url}`)));
      let scraped = 0;
      ev.forEach((r, i) => {
        const text = r.status === "fulfilled" ? r.value : null;
        if (!text) return;
        scraped++;
        const c = targets[i];
        c.web_evidence = text;
        c.sourcing_score = (c.sourcing_score || 0) + evidenceBoost(text, kw);
        if (!c.summary) c.summary = text.slice(0, 280);
        if (persist && c.id) {
          supabase.from("candidate_source_hits").insert({ candidate_id: c.id, user_id: user.id, provider: "firecrawl", snippet: text.slice(0, 500) }).then(() => {}, () => {});
        }
      });
      sources.firecrawl = { ...(sources.firecrawl || { count: 0, est_cost_usd: 0 }), detail: { ...(sources.firecrawl?.detail || {}), scraped } };
      (candidates as any[]).sort((a, b) => (b.sourcing_score || 0) - (a.sourcing_score || 0));
    }

    return new Response(JSON.stringify({
      candidates,
      sources,
      enabled,
      raw_count: all.length,
      keywords: extractSearchTerms(query, filters).keywords,
      github_name_matches: githubMatched,
      est_cost_usd: Number(Object.values(sources).reduce((a, s) => a + s.est_cost_usd, 0).toFixed(4)),
    }), { headers });
  } catch (e) {
    const authResp = authErrorResponse(e, getCorsHeaders(req));
    if (authResp) return authResp;
    console.error("source-candidates error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "source-candidates failed" }), { status: 500, headers });
  }
});
