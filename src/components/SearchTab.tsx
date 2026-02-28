import { Search, ExternalLink, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { searchDevelopers, enrichLinkedIn } from "@/lib/api";
import CandidateSlideOut from "@/components/CandidateSlideOut";
import UpgradeModal from "@/components/UpgradeModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import type { Developer } from "@/types/developer";

import OnboardingCard from "@/components/search/OnboardingCard";
import SuggestionChips from "@/components/search/SuggestionChips";
import SearchFilters from "@/components/search/SearchFilters";
import SearchFunnel from "@/components/search/SearchFunnel";
import SearchResults from "@/components/search/SearchResults";
import SearchProgress from "@/components/search/SearchProgress";
import SkillPriorities from "@/components/search/SkillPriorities";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface SearchTabProps {
  initialQuery?: string;
  initialExpandedQuery?: string;
  initialTargetRepos?: string[];
  autoSubmit?: boolean;
  onNavigate?: (tab: string) => void;
}

import type { SuggestionChip } from "@/components/search/SuggestionChips";
interface SkillFilter { id: string; text: string; }

const DEFAULT_SUGGESTIONS: SuggestionChip[] = [
  { label: "Rust systems engineers", expandedQuery: "Rust systems engineers", targetRepos: ["rust-lang/rust", "tokio-rs/tokio", "servo/servo", "denoland/deno", "tauri-apps/tauri", "solana-labs/solana"] },
  { label: "React accessibility experts", expandedQuery: "React accessibility experts", targetRepos: ["facebook/react", "vercel/next.js", "jsx-eslint/eslint-plugin-jsx-a11y", "radix-ui/primitives", "shadcn-ui/ui"] },
  { label: "ML infrastructure", expandedQuery: "ML infrastructure engineers", targetRepos: ["pytorch/pytorch", "tensorflow/tensorflow", "ray-project/ray", "mlflow/mlflow", "huggingface/transformers"] },
  { label: "Kubernetes contributors", expandedQuery: "Kubernetes contributors", targetRepos: ["kubernetes/kubernetes", "helm/helm", "argoproj/argo-cd", "istio/istio", "cilium/cilium"] },
  { label: "Security researchers", expandedQuery: "Security researchers", targetRepos: ["OWASP/CheatSheetSeries", "zaproxy/zaproxy", "projectdiscovery/nuclei", "hashicorp/vault", "aquasecurity/trivy"] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOT_USERNAME_PATTERN = /\b(bot|dependabot|renovate|greenkeeper|snyk|codecov|github-actions|automator|copilot)\b/i;
function isLikelyBot(dev: any): boolean {
  if (BOT_USERNAME_PATTERN.test(dev.username || "")) return true;
  if ((dev.username || "").endsWith("-bot") || (dev.username || "").endsWith("[bot]")) return true;
  return false;
}

function computeSkillMatch(dev: any, skills: SkillFilter[]): number {
  if (skills.length === 0) return -1;
  const activeSkills = skills.filter(s => s.text.trim());
  if (activeSkills.length === 0) return -1;
  const searchText = [dev.bio || "", dev.about || "", dev.name || "", ...(dev.topLanguages || []).map((l: any) => l.name || ""), ...(dev.highlights || []), ...Object.keys(dev.contributedRepos || {})].join(" ").toLowerCase();
  let totalPossible = 0, earned = 0;
  activeSkills.forEach((skill, idx) => {
    const weight = Math.max(2, 10 - idx * 2);
    totalPossible += weight;
    const keywords = skill.text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const matched = keywords.filter(kw => searchText.includes(kw)).length;
    if (keywords.length > 0) earned += weight * (matched / keywords.length);
  });
  return totalPossible > 0 ? Math.round((earned / totalPossible) * 100) : 0;
}

type SeniorityFilter = "any" | "junior" | "mid" | "senior";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SearchTab = ({ initialQuery, initialExpandedQuery, initialTargetRepos, autoSubmit, onNavigate }: SearchTabProps) => {
  const queryClient = useQueryClient();

  // -- Search state --
  const [query, setQuery] = useState(initialQuery || "");
  const [activeQuery, setActiveQuery] = useState("");
  const [expandedQuery, setExpandedQuery] = useState(initialExpandedQuery || "");
  const [activeTargetRepos, setActiveTargetRepos] = useState<string[] | undefined>(undefined);
  const [showExpandedQuery, setShowExpandedQuery] = useState(false);
  const autoSubmitDone = useRef(false);
  const historySavedForQuery = useRef<string>("");

  // -- Filter state --
  const savedFilters = useRef(() => { try { return JSON.parse(localStorage.getItem('sourcekit-filters') || '{}'); } catch { return {}; } });
  const sf = savedFilters.current();
  const [seniorityFilter, setSeniorityFilter] = useState<SeniorityFilter>(sf.seniority || "any");
  const [skillFilters, setSkillFilters] = useState<SkillFilter[]>(sf.skills || []);
  const [showSkillPanel, setShowSkillPanel] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [showGemsOnly, setShowGemsOnly] = useState(false);
  const [resultLimit, setResultLimit] = useState(20);
  const [locationFilter, setLocationFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState(sf.language || "");
  const [minScore, setMinScore] = useState(sf.minScore || 0);

  // -- UI state --
  const [shortlisted, setShortlisted] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem('shortlisted') || '[]')); } catch { return new Set(); } });
  const [slideOutDev, setSlideOutDev] = useState<Developer | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [batchAdding, setBatchAdding] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ current: number; total: number; skipped: number } | null>(null);
  const [enrichedUsernames, setEnrichedUsernames] = useState<Set<string>>(new Set());
  const [expandedResults, setExpandedResults] = useState<any[]>([]);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandCount, setExpandCount] = useState(0);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const rateLimitRetryRef = useRef(0);

  // Persist filters
  useEffect(() => {
    localStorage.setItem('sourcekit-filters', JSON.stringify({ seniority: seniorityFilter, skills: skillFilters, language: languageFilter, minScore }));
  }, [seniorityFilter, skillFilters, languageFilter, minScore]);

  // Auto-submit for re-run from history or strategy
  useEffect(() => {
    if (autoSubmit && initialQuery && !autoSubmitDone.current) {
      autoSubmitDone.current = true;
      setExpandedQuery(initialExpandedQuery || "");
      setActiveTargetRepos(initialTargetRepos);
      setActiveQuery(initialExpandedQuery || initialQuery);
      setQuery(initialQuery);
    }
  }, [autoSubmit, initialQuery, initialExpandedQuery, initialTargetRepos]);

  // -- Data fetching --
  const { data, isLoading, error } = useQuery({
    queryKey: ["github-search", activeQuery, activeTargetRepos?.slice().sort().join(',')],
    queryFn: () => searchDevelopers(activeQuery, activeTargetRepos),
    enabled: !!activeQuery,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => { setExpandedResults([]); setExpandCount(0); }, [activeQuery]);

  // Rate-limit auto-retry with countdown
  const isRateLimited = !!error && (error as Error).message === 'RATE_LIMITED';
  useEffect(() => {
    if (!isRateLimited) { setRateLimitCountdown(0); return; }
    const attempt = rateLimitRetryRef.current;
    if (attempt >= 3) return; // stop after 3 retries
    const wait = attempt === 0 ? 30 : attempt === 1 ? 60 : 90;
    setRateLimitCountdown(wait);
    const interval = setInterval(() => {
      setRateLimitCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          rateLimitRetryRef.current += 1;
          queryClient.invalidateQueries({ queryKey: ["github-search", activeQuery] });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRateLimited, activeQuery, queryClient]);

  // Reset retry counter on new searches
  useEffect(() => { rateLimitRetryRef.current = 0; }, [activeQuery]);

  const baseResults = data?.results || [];
  const parsedCriteria = data?.parsedCriteria;
  const reposSearched = data?.reposSearched || [];

  const results = useMemo(() => {
    let combined: any[];
    if (expandedResults.length === 0) { combined = baseResults; }
    else { const seen = new Set(baseResults.map((d: any) => d.username)); combined = [...baseResults, ...expandedResults.filter((d: any) => !seen.has(d.username))]; }
    return combined.filter((d: any) => !isLikelyBot(d));
  }, [baseResults, expandedResults]);

  // P23: Save search history for ALL searches (including 0 results)
  // P20: Show toast when credit was not charged (0-result search)
  useEffect(() => {
    if (data && activeQuery && historySavedForQuery.current !== activeQuery) {
      historySavedForQuery.current = activeQuery;
      // Show toast if no credit was charged
      if (data.creditCharged === false) {
        toast({ title: "No results found", description: "Your search credit was not used." });
      }
      (async () => {
        try {
          await supabase.from("search_history").insert({ query: query || activeQuery, action_type: "search", result_count: baseResults.length, metadata: { expanded_query: expandedQuery || activeQuery, skills: parsedCriteria?.skills || [], location: parsedCriteria?.location || null, seniority: parsedCriteria?.seniority || null } } as any);
          queryClient.invalidateQueries({ queryKey: ["search-history"] });
          // Only fire search-complete event if credit was charged (so counter refreshes correctly)
          if (data.creditCharged !== false) {
            window.dispatchEvent(new Event("sourcekit-search-complete"));
          }
        } catch { /* silent */ }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const { data: pipelineUsernames } = useQuery({
    queryKey: ["pipeline-usernames"],
    queryFn: async () => { const { data } = await supabase.from('pipeline').select('github_username'); return new Set((data || []).map((r: any) => r.github_username)); },
    staleTime: 1000 * 30,
  });
  const pipelineSet = pipelineUsernames || new Set<string>();

  // -- Derived data --
  const availableLocations = useMemo(() => [...new Set(results.map((d: any) => d.location).filter((l: string) => l && l.trim()))] as string[], [results]);
  const availableLanguages = useMemo(() => { const langs = new Set<string>(); results.forEach((d: any) => { (d.topLanguages || []).forEach((l: any) => { if (l.name) langs.add(l.name); }); }); return [...langs].sort(); }, [results]);
  const locationSuggestions = useMemo(() => !locationFilter ? availableLocations : availableLocations.filter((l: string) => l.toLowerCase().includes(locationFilter.toLowerCase())), [availableLocations, locationFilter]);

  const resultsWithSkillMatch = useMemo(() => {
    const activeSkills = skillFilters.filter(s => s.text.trim());
    return results.map((dev: any) => ({ ...dev, skillMatch: computeSkillMatch(dev, activeSkills) }));
  }, [results, skillFilters]);

  const estimateSeniority = useCallback((dev: any): SeniorityFilter => {
    const yearsActive = new Date().getFullYear() - (dev.joinedYear || new Date().getFullYear());
    if (yearsActive >= 8 || dev.score >= 70) return "senior";
    if (yearsActive >= 4 || dev.score >= 40) return "mid";
    return "junior";
  }, []);

  const filtered = useMemo(() => {
    let list = resultsWithSkillMatch;
    if (showGemsOnly) list = list.filter((d: any) => d.hiddenGem);
    if (locationFilter) list = list.filter((d: any) => d.location && d.location.toLowerCase().includes(locationFilter.toLowerCase()));
    if (seniorityFilter !== "any") list = list.filter((d: any) => estimateSeniority(d) === seniorityFilter);
    if (languageFilter) list = list.filter((d: any) => (d.topLanguages || []).some((l: any) => l.name === languageFilter));
    if (minScore > 0) list = list.filter((d: any) => (d.score || 0) >= minScore);
    return list.slice(0, resultLimit);
  }, [resultsWithSkillMatch, showGemsOnly, locationFilter, resultLimit, seniorityFilter, estimateSeniority, languageFilter, minScore]);

  const funnelCounts = useMemo(() => {
    const total = results.length;
    let afterGems = results.length;
    if (showGemsOnly) afterGems = results.filter((d: any) => d.hiddenGem).length;
    let afterLocation = afterGems;
    if (locationFilter) { const locResults = (showGemsOnly ? results.filter((d: any) => d.hiddenGem) : results); afterLocation = locResults.filter((d: any) => d.location && d.location.toLowerCase().includes(locationFilter.toLowerCase())).length; }
    return { total, afterFiltered: afterGems, afterLocation, final: filtered.length };
  }, [results, showGemsOnly, locationFilter, filtered]);

  // -- Handlers --
  const buildSearchQuery = useCallback(() => {
    let q = expandedQuery.trim() || query.trim();
    const active = skillFilters.filter(s => s.text.trim());
    if (active.length > 0) q += ` Priority skills: ${active.map((s, i) => `${i + 1}. ${s.text}`).join(", ")}`;
    return q;
  }, [query, expandedQuery, skillFilters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) { toast({ title: "Enter a search query", description: "Type a skill, language, or domain to search for engineers." }); return; }
    // P22: Reset expanded query and target repos when user initiates a new manual search
    setExpandedQuery("");
    setActiveTargetRepos(undefined);
    setActiveQuery(buildSearchQuery());
  };

  // P25: Chips pass targetRepos directly to the Contributors API
  const handleChipSubmit = (chip: SuggestionChip) => {
    setQuery(chip.label);
    setExpandedQuery(chip.expandedQuery);
    setActiveTargetRepos(chip.targetRepos);
    setActiveQuery(chip.expandedQuery);
  };

  const toggleShortlist = (username: string) => {
    setShortlisted(prev => { const next = new Set(prev); if (next.has(username)) next.delete(username); else next.add(username); localStorage.setItem('shortlisted', JSON.stringify([...next])); return next; });
  };

  const handleBatchEnrich = useCallback(async () => {
    if (enrichProgress) return;
    const toEnrich = filtered.filter((d: any) => !d.linkedinUrl && !enrichedUsernames.has(d.username));
    const alreadyHave = filtered.length - toEnrich.length;
    setEnrichProgress({ current: 0, total: toEnrich.length, skipped: alreadyHave });
    const CONCURRENCY = 4;
    let completed = 0;
    for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
      const chunk = toEnrich.slice(i, i + CONCURRENCY);
      const res = await Promise.allSettled(chunk.map(dev => enrichLinkedIn(dev.username, dev.name, dev.location, dev.bio).then(result => ({ dev, result }))));
      const successful = res.filter((r): r is PromiseFulfilledResult<{ dev: any; result: any }> => r.status === 'fulfilled').filter(r => r.value.result.linkedin_url).map(r => r.value.dev.username);
      if (successful.length > 0) setEnrichedUsernames(prev => new Set([...prev, ...successful]));
      completed += chunk.length;
      setEnrichProgress({ current: completed, total: toEnrich.length, skipped: alreadyHave });
    }
    setTimeout(() => setEnrichProgress(null), 2000);
  }, [filtered, enrichedUsernames, enrichProgress]);

  const handleExpandSearch = async () => {
    if (currentResultCount >= maxResults || isExpanding || !activeQuery || isLoading) return;
    setIsExpanding(true);
    try {
      const nextCount = Math.min(currentResultCount * 2, maxResults);
      const moreData = await searchDevelopers(activeQuery + ` (find at least ${nextCount} candidates)`);
      const existing = new Set(results.map((d: any) => d.username));
      const unique = (moreData.results || []).filter((d: any) => !existing.has(d.username));
      if (unique.length > 0) { setExpandedResults(prev => [...prev, ...unique]); setExpandCount(prev => prev + unique.length); toast({ title: `Found ${unique.length} additional candidates`, description: `Total: ${currentResultCount + unique.length} candidates` }); }
      else { toast({ title: "No additional candidates found", description: "Try broadening your search query." }); }
    } catch (e) { toast({ title: "Expand failed", description: (e as Error).message, variant: "destructive" }); }
    finally { setIsExpanding(false); }
  };

  const handleBatchAddToPipeline = async () => {
    if (batchSelected.size === 0 || batchAdding) return;
    setBatchAdding(true);
    const toAdd = filtered.filter((d: any) => batchSelected.has(d.username) && !pipelineSet.has(d.username));
    let added = 0;
    for (const dev of toAdd) { try { const { error } = await supabase.from('pipeline').upsert({ github_username: dev.username, name: dev.name, avatar_url: dev.avatarUrl, stage: 'sourced' }, { onConflict: 'github_username' }); if (!error) added++; } catch {} }
    queryClient.invalidateQueries({ queryKey: ["pipeline-usernames"] });
    toast({ title: `Added ${added} candidate${added !== 1 ? 's' : ''} to pipeline`, description: `${added} candidate${added !== 1 ? 's' : ''} added to Sourced stage.` });
    setBatchSelected(new Set());
    setBatchAdding(false);
  };

  // Skill filter handlers
  const addSkillFilter = () => { if (skillFilters.length >= 10) return; setSkillFilters(prev => [...prev, { id: crypto.randomUUID(), text: "" }]); };
  const removeSkillFilter = (id: string) => setSkillFilters(prev => prev.filter(s => s.id !== id));
  const updateSkillFilter = (id: string, text: string) => setSkillFilters(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  const handleSkillDragStart = (idx: number) => setDragIdx(idx);
  const handleSkillDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); if (dragIdx === null || dragIdx === idx) return; setSkillFilters(prev => { const next = [...prev]; const [moved] = next.splice(dragIdx, 1); next.splice(idx, 0, moved); return next; }); setDragIdx(idx); };
  const handleSkillDragEnd = () => setDragIdx(null);

  const hasActiveSkills = skillFilters.some(s => s.text.trim());
  const hasActiveFilters = showGemsOnly || !!locationFilter || seniorityFilter !== "any" || !!languageFilter || minScore > 0;
  const currentResultCount = results.length;
  const maxResults = 50;
  const canExpand = currentResultCount < maxResults && !!activeQuery && !isLoading;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative mb-2">
          <div className="relative glass rounded-xl glow-border transition-all duration-300 focus-within:glow-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setExpandedQuery(""); setActiveTargetRepos(undefined); setShowExpandedQuery(false); }}
              placeholder="Search by skill, language, or domain..." className="w-full bg-transparent text-foreground placeholder:text-muted-foreground py-3.5 pl-12 pr-28 text-sm outline-none font-body" />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-5 py-2 rounded-lg font-display text-xs font-medium hover:opacity-90 transition-opacity">Search</button>
          </div>
        </form>

        {expandedQuery && (
          <Collapsible open={showExpandedQuery} onOpenChange={setShowExpandedQuery} className="mb-4">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] font-display text-muted-foreground hover:text-foreground transition-colors px-1 py-1">
              {showExpandedQuery ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Query details
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 p-3 rounded-lg bg-secondary/50 border border-border">
                <textarea value={expandedQuery} onChange={(e) => setExpandedQuery(e.target.value)} rows={3} className="w-full bg-transparent text-xs text-foreground font-body outline-none resize-none leading-relaxed" />
                <p className="text-[10px] text-muted-foreground mt-1 font-display">This expanded query will be sent to the search engine for better results.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {!activeQuery && !expandedQuery && (
          <div className="space-y-4 mb-8 mt-4">
            <OnboardingCard />
            <SuggestionChips suggestions={DEFAULT_SUGGESTIONS} onSubmit={handleChipSubmit} />
          </div>
        )}

        <SearchProgress
          isLoading={isLoading}
          hasTargetRepos={!!activeTargetRepos && activeTargetRepos.length > 0}
          repoCount={activeTargetRepos?.length}
        />

        {parsedCriteria && !isLoading && (
          <div className="glass rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span className="font-display text-xs font-semibold text-foreground">AI-Parsed Search Criteria</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {parsedCriteria.skills.map((s: string) => (<span key={s} title={s} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-display max-w-[200px] truncate">{s}</span>))}
              {parsedCriteria.location && (<span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground border border-border font-display">📍 {parsedCriteria.location}</span>)}
              {parsedCriteria.seniority !== 'any' && (<span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground border border-border font-display">🎯 {parsedCriteria.seniority}</span>)}
            </div>
            {reposSearched.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground font-display">Repos searched: </span>
                {reposSearched.map((r: string) => (<a key={r} href={`https://github.com/${r}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary/80 hover:text-primary mr-2 font-display">{r} <ExternalLink className="w-3 h-3" /></a>))}
              </div>
            )}
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <>
            <SearchFilters
              results={results} filtered={filtered}
              hasActiveFilters={hasActiveFilters} hasActiveSkills={hasActiveSkills}
              skillFilters={skillFilters} showSkillPanel={showSkillPanel} onToggleSkillPanel={() => setShowSkillPanel(!showSkillPanel)}
              locationFilter={locationFilter} onLocationChange={setLocationFilter} locationSuggestions={locationSuggestions}
              showGemsOnly={showGemsOnly} onToggleGems={() => setShowGemsOnly(!showGemsOnly)}
              resultLimit={resultLimit} onResultLimitChange={setResultLimit}
              enrichProgress={enrichProgress} onBatchEnrich={handleBatchEnrich}
              availableLanguages={availableLanguages} languageFilter={languageFilter} onLanguageChange={setLanguageFilter}
              minScore={minScore} onMinScoreChange={setMinScore}
              seniorityFilter={seniorityFilter} onSeniorityChange={setSeniorityFilter}
            />
            {hasActiveFilters && <SearchFunnel counts={funnelCounts} locationFilter={locationFilter} />}
          </>
        )}

        {error && (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-destructive font-display text-sm mb-2">
              {isRateLimited ? '⚡ GitHub API rate limit reached' : (error as Error).message === 'TRIAL_LIMIT_REACHED' ? '🔒 Trial limit reached' : 'Failed to search GitHub'}
            </p>
            <p className="text-muted-foreground text-xs">
              {isRateLimited
                ? rateLimitCountdown > 0
                  ? `Auto-retrying in ${rateLimitCountdown}s (attempt ${rateLimitRetryRef.current + 1}/3)...`
                  : rateLimitRetryRef.current >= 3
                    ? 'Auto-retry limit reached. Please try again later.'
                    : 'Retrying...'
                : (error as Error).message === 'TRIAL_LIMIT_REACHED' ? "You've used all 10 free searches." : (error as Error).message}
            </p>
            {isRateLimited && rateLimitCountdown > 0 && (
              <div className="mt-3 w-full max-w-xs mx-auto">
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full transition-all duration-1000" style={{ width: `${(1 - rateLimitCountdown / (rateLimitRetryRef.current === 0 ? 30 : rateLimitRetryRef.current === 1 ? 60 : 90)) * 100}%` }} />
                </div>
              </div>
            )}
            {(error as Error).message === 'TRIAL_LIMIT_REACHED' && (
              <button onClick={() => setShowUpgrade(true)} className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:bg-primary/90 transition-colors">Upgrade to Pro</button>
            )}
          </div>
        )}

        {!isLoading && !error && activeQuery && (
          <SearchResults
            filtered={filtered} results={results}
            isExpanding={isExpanding} canExpand={canExpand}
            currentResultCount={currentResultCount} maxResults={maxResults}
            batchSelected={batchSelected} batchAdding={batchAdding}
            pipelineSet={pipelineSet} shortlisted={shortlisted}
            onToggleBatchSelect={(u) => setBatchSelected(prev => { const next = new Set(prev); if (next.has(u)) next.delete(u); else next.add(u); return next; })}
            onSelectAll={() => setBatchSelected(new Set(filtered.map((d: any) => d.username)))}
            onClearSelection={() => setBatchSelected(new Set())}
            onBatchAddToPipeline={handleBatchAddToPipeline}
            onToggleShortlist={toggleShortlist}
            onCardClick={(d) => setSlideOutDev(d)}
            onExpandSearch={handleExpandSearch}
          />
        )}
      </div>

      {showSkillPanel && (
        <SkillPriorities
          skills={skillFilters}
          hasActiveQuery={!!activeQuery}
          dragIdx={dragIdx}
          onAdd={addSkillFilter}
          onRemove={removeSkillFilter}
          onUpdate={updateSkillFilter}
          onDragStart={handleSkillDragStart}
          onDragOver={handleSkillDragOver}
          onDragEnd={handleSkillDragEnd}
          onClose={() => setShowSkillPanel(false)}
        />
      )}

      {slideOutDev && <CandidateSlideOut developer={slideOutDev} onClose={() => setSlideOutDev(null)} />}
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
};

export default SearchTab;
