import { Search, Loader2, ExternalLink, SlidersHorizontal, ChevronDown, ChevronUp, Bookmark, BookmarkCheck, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { searchDevelopers, searchDevelopersStreaming, loadSearchResults, enrichLinkedIn, type SearchOptions, type StreamProgress } from "@/lib/api";
import CandidateSlideOut from "@/components/CandidateSlideOut";
import UpgradeModal from "@/components/UpgradeModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import type { Developer } from "@/types/developer";
import { useSavedSearches, type SavedSearch } from "@/hooks/useSavedSearches";
import {
  DEFAULT_SUGGESTIONS,
  isLikelyBot,
  computeSkillMatch,
  estimateSeniority,
  type SuggestionChip,
  type SkillFilter,
  type SeniorityFilter,
} from "@/lib/search-helpers";

import OnboardingCard from "@/components/search/OnboardingCard";
import SuggestionChips from "@/components/search/SuggestionChips";
import SearchFilters from "@/components/search/SearchFilters";
import SearchFunnel from "@/components/search/SearchFunnel";
import SearchResults from "@/components/search/SearchResults";
import SearchProgress from "@/components/search/SearchProgress";
import SkillPriorities from "@/components/search/SkillPriorities";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// P28: Structured strategy data from Research tab
interface StrategyHandoff {
  targetRepos?: string[];
  skills?: string[];
}

interface SearchTabProps {
  initialQuery?: string;
  initialExpandedQuery?: string;
  initialStrategy?: StrategyHandoff;
  initialSearchId?: string;
  autoSubmit?: boolean;
  onNavigate?: (tab: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SearchTab = ({ initialQuery, initialExpandedQuery, initialStrategy, initialSearchId, autoSubmit, onNavigate }: SearchTabProps) => {
  const queryClient = useQueryClient();

  // -- Search state --
  const [query, setQuery] = useState(initialQuery || "");
  // BUG-002 fix: Initialize activeQuery eagerly when autoSubmit to avoid race condition
  const [activeQuery, setActiveQuery] = useState(() => {
    if (autoSubmit && initialQuery && !initialSearchId) {
      return initialExpandedQuery || initialQuery;
    }
    return "";
  });
  const [expandedQuery, setExpandedQuery] = useState(initialExpandedQuery || "");
  const [showExpandedQuery, setShowExpandedQuery] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState<StrategyHandoff | undefined>(initialStrategy);
  const [activeSearchId, setActiveSearchId] = useState<string | undefined>(initialSearchId);
  const autoSubmitDone = useRef(false);
  const historySavedForQuery = useRef<string>("");

  // -- Filter state (FEAT-002: persisted to localStorage) --
  const [sf] = useState<Record<string, any>>(() => { try { return JSON.parse(localStorage.getItem('sourcekit-filters') || '{}'); } catch { return {}; } });
  const [seniorityFilter, setSeniorityFilter] = useState<SeniorityFilter>(sf.seniority || "any");
  const [skillFilters, setSkillFilters] = useState<SkillFilter[]>(sf.skills || []);
  const [showSkillPanel, setShowSkillPanel] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [showGemsOnly, setShowGemsOnly] = useState(sf.showGemsOnly ?? false);
  const [showUngettable, setShowUngettable] = useState(sf.showUngettable ?? false);
  const [resultLimit, setResultLimit] = useState(sf.resultLimit || 20);
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
  const rateLimitTotalRef = useRef(0);
  const [searchStep, setSearchStep] = useState(0);
  // FEAT-008: Real-time streaming progress
  const [streamSteps, setStreamSteps] = useState<{ step: string; detail?: string; done: boolean }[]>([]);

  // FEAT-006: Saved searches (bookmarks)
  const { savedSearches, isSaved: checkIsSaved, saveSearch, deleteSearch } = useSavedSearches();
  const isSaved = checkIsSaved(query);
  const handleSaveSearch = () => saveSearch(query, expandedQuery, {
    seniority: seniorityFilter, skills: skillFilters, language: languageFilter,
    minScore, showGemsOnly, showUngettable, resultLimit,
  });
  const handleDeleteSaved = (id: string) => deleteSearch(id);
  const handleLoadSaved = (saved: SavedSearch) => {
    setQuery(saved.query);
    setExpandedQuery(saved.expanded_query || "");
    setActiveStrategy(undefined);
    setActiveSearchId(undefined);
    // Restore filters if present
    if (saved.filters) {
      const f = saved.filters;
      if (f.seniority) setSeniorityFilter(f.seniority);
      if (f.skills) setSkillFilters(f.skills);
      if (f.language !== undefined) setLanguageFilter(f.language);
      if (f.minScore !== undefined) setMinScore(f.minScore);
      if (f.showGemsOnly !== undefined) setShowGemsOnly(f.showGemsOnly);
      if (f.showUngettable !== undefined) setShowUngettable(f.showUngettable);
      if (f.resultLimit) setResultLimit(f.resultLimit);
    }
    // Auto-submit
    setActiveQuery(saved.expanded_query || saved.query);
  };

  // FEAT-002: Persist all filters to localStorage
  useEffect(() => {
    localStorage.setItem('sourcekit-filters', JSON.stringify({
      seniority: seniorityFilter, skills: skillFilters, language: languageFilter,
      minScore, showGemsOnly, showUngettable, resultLimit,
    }));
  }, [seniorityFilter, skillFilters, languageFilter, minScore, showGemsOnly, showUngettable, resultLimit]);

  // Auto-submit for re-run from history (BUG-002: activeQuery is now set eagerly in useState init)
  useEffect(() => {
    if (autoSubmit && initialQuery && !autoSubmitDone.current) {
      autoSubmitDone.current = true;
      setQuery(initialQuery);
      setExpandedQuery(initialExpandedQuery || "");
      if (initialSearchId) {
        // BUG-001: History replay — load cached results via junction table
        setActiveSearchId(initialSearchId);
      }
      // Note: activeQuery is already initialized eagerly for non-searchId case (BUG-002 fix)
    }
  }, [autoSubmit, initialQuery, initialExpandedQuery, initialSearchId]);

  // -- Data fetching (FEAT-008: streaming with real-time progress) --
  const { data: freshData, isLoading: freshLoading, error: freshError } = useQuery({
    queryKey: ["github-search", activeQuery, activeStrategy?.targetRepos?.join(','), showUngettable],
    queryFn: () => {
      setStreamSteps([]);
      return searchDevelopersStreaming(
        activeQuery,
        {
          targetRepos: activeStrategy?.targetRepos,
          skills: activeStrategy?.skills,
          hideUngettable: !showUngettable,
        },
        (p: StreamProgress) => {
          setStreamSteps(prev => {
            // Mark all previous steps as done, add/update current step
            const updated = prev.map(s => ({ ...s, done: true }));
            const existing = updated.findIndex(s => s.step === p.step);
            if (existing >= 0) {
              updated[existing] = { step: p.step, detail: p.detail, done: false };
            } else {
              updated.push({ step: p.step, detail: p.detail, done: false });
            }
            return updated;
          });
        },
      ).catch((err) => {
        // Fall back to non-streaming if SSE fails (e.g. edge function doesn't support it yet)
        if (err.message === 'No response body') {
          return searchDevelopers(activeQuery, {
            targetRepos: activeStrategy?.targetRepos,
            skills: activeStrategy?.skills,
            hideUngettable: !showUngettable,
          });
        }
        throw err;
      });
    },
    enabled: !!activeQuery && !activeSearchId,
    staleTime: 1000 * 60 * 5,
  });

  // BUG-001: Cached search results for history replay
  const { data: cachedData, isLoading: cachedLoading, error: cachedError } = useQuery({
    queryKey: ["cached-search", activeSearchId],
    queryFn: () => loadSearchResults(activeSearchId!),
    enabled: !!activeSearchId,
    staleTime: Infinity,
  });

  // BUG-001: Fallback — if cached results are empty (pre-migration history), re-run search
  useEffect(() => {
    if (activeSearchId && cachedData && cachedData.results.length === 0) {
      setActiveSearchId(undefined);
      setActiveQuery(expandedQuery || query);
    }
  }, [activeSearchId, cachedData, expandedQuery, query]);

  // BUG-001: Unified data from either path
  const isHistoryReplay = !!activeSearchId;
  const data = isHistoryReplay ? cachedData : freshData;
  const isLoading = isHistoryReplay ? cachedLoading : freshLoading;
  const error = isHistoryReplay ? cachedError : freshError;

  // FEAT-008: Streaming progress replaces fake timed steps
  const SEARCH_STEPS_FALLBACK = ["Parsing your query...", "Searching repositories...", "Fetching contributor profiles...", "Scoring candidates with AI...", "Ranking results..."];
  const stepDelays = [0, 3000, 6000, 12000, 18000];
  useEffect(() => {
    // Only use fallback timers when streaming steps are empty (e.g. cached path)
    if (!isLoading || streamSteps.length > 0) { if (!isLoading) setSearchStep(0); return; }
    const timers = stepDelays.map((delay, i) =>
      i === 0 ? null : setTimeout(() => setSearchStep(i), delay)
    );
    return () => timers.forEach(t => t && clearTimeout(t));
  }, [isLoading, streamSteps.length]);

  useEffect(() => { setExpandedResults([]); setExpandCount(0); setStreamSteps([]); }, [activeQuery]);

  // Rate-limit auto-retry with countdown
  const isRateLimited = !!error && (error as Error).message === 'RATE_LIMITED';
  useEffect(() => {
    if (!isRateLimited) { setRateLimitCountdown(0); return; }
    const attempt = rateLimitRetryRef.current;
    if (attempt >= 3) return; // stop after 3 retries
    const serverRetry = (error as any)?.retryAfterSeconds;
    const wait = serverRetry ? Math.min(serverRetry + attempt * 10, 120) : (attempt === 0 ? 30 : attempt === 1 ? 60 : 90);
    rateLimitTotalRef.current = wait;
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
    // P17: Deduplicate by username (case-insensitive)
    const seen = new Map<string, any>();
    for (const d of combined) {
      const key = (d.username || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.set(key, d);
    }
    return [...seen.values()].filter((d: any) => !isLikelyBot(d));
  }, [baseResults, expandedResults]);

  // P23: Save search history for ALL searches (including 0 results and errors)
  // BUG-001: Skip saving when replaying from history; use searchId as PK to link junction rows
  useEffect(() => {
    if (data && activeQuery && !isHistoryReplay && historySavedForQuery.current !== activeQuery) {
      historySavedForQuery.current = activeQuery;
      // Show toast if no credit was charged
      if (data.creditCharged === false) {
        toast({ title: "No results found", description: "Your search credit was not used." });
      }
      (async () => {
        try {
          const insertRow: any = { query: query || activeQuery, action_type: "search", result_count: baseResults.length, metadata: { expanded_query: expandedQuery || activeQuery, skills: parsedCriteria?.skills || [], location: parsedCriteria?.location || null, seniority: parsedCriteria?.seniority || null, status: baseResults.length > 0 ? 'success' : 'no_results' } };
          if (data.searchId) insertRow.id = data.searchId;
          await supabase.from("search_history").insert(insertRow as any);
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

  // P23: Also record failed searches (errors)
  useEffect(() => {
    if (error && activeQuery && !isHistoryReplay && historySavedForQuery.current !== activeQuery) {
      historySavedForQuery.current = activeQuery;
      (async () => {
        try {
          const errorMsg = (error as Error).message;
          await supabase.from("search_history").insert({ query: query || activeQuery, action_type: "search", result_count: 0, metadata: { expanded_query: expandedQuery || activeQuery, status: 'error', error: errorMsg } } as any);
          queryClient.invalidateQueries({ queryKey: ["search-history"] });
        } catch { /* silent */ }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

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

  const filtered = useMemo(() => {
    let list = resultsWithSkillMatch;
    if (showGemsOnly) list = list.filter((d: any) => d.hiddenGem);
    if (locationFilter) list = list.filter((d: any) => d.location && d.location.toLowerCase().includes(locationFilter.toLowerCase()));
    if (seniorityFilter !== "any") list = list.filter((d: any) => estimateSeniority(d) === seniorityFilter);
    if (languageFilter) list = list.filter((d: any) => (d.topLanguages || []).some((l: any) => l.name === languageFilter));
    if (minScore > 0) list = list.filter((d: any) => (d.score || 0) >= minScore);
    // Sort ungettable candidates to the bottom
    list = [...list].sort((a: any, b: any) => {
      if (a.ungettable && !b.ungettable) return 1;
      if (!a.ungettable && b.ungettable) return -1;
      return 0;
    });
    return list.slice(0, resultLimit);
  }, [resultsWithSkillMatch, showGemsOnly, locationFilter, resultLimit, seniorityFilter, languageFilter, minScore]);

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
    // P22: Clear strategy when doing a manual search (prevents stale strategy data)
    if (!expandedQuery) setActiveStrategy(undefined);
    setActiveSearchId(undefined);
    setActiveQuery(buildSearchQuery());
  };

  const handleChipSubmit = (chip: SuggestionChip) => {
    setQuery(chip.label);
    setExpandedQuery(chip.expandedQuery);
    // P25: Pass pre-configured repos directly as strategy data
    setActiveStrategy(chip.targetRepos ? { targetRepos: chip.targetRepos } : undefined);
    setActiveSearchId(undefined);
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
  const hasActiveFilters = showGemsOnly || showUngettable || !!locationFilter || seniorityFilter !== "any" || !!languageFilter || minScore > 0;
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
            <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setExpandedQuery(''); setShowExpandedQuery(false); setActiveStrategy(undefined); }}
              placeholder="Search by skill, language, or domain..." className="w-full bg-transparent text-foreground placeholder:text-muted-foreground py-3.5 pl-12 pr-36 text-sm outline-none font-body" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {query.trim() && (
                <button type="button" onClick={handleSaveSearch} className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors" title={isSaved ? "Remove bookmark" : "Bookmark this search"}>
                  {isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
                </button>
              )}
              <button type="submit" className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-display text-xs font-medium hover:opacity-90 transition-opacity">Search</button>
            </div>
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

        {!activeQuery && !activeSearchId && !expandedQuery && (
          <div className="space-y-4 mb-8 mt-4">
            <OnboardingCard />
            {savedSearches.length > 0 && (
              <div>
                <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">Saved Searches</p>
                <div className="flex flex-wrap gap-2">
                  {savedSearches.map((s: any) => (
                    <div key={s.id} className="group flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => handleLoadSaved(s)}>
                      <Bookmark className="w-3 h-3 text-primary shrink-0" />
                      <span className="text-xs font-display text-foreground truncate max-w-[200px]">{s.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSaved(s.id); }} className="ml-1 p-0.5 rounded text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <SuggestionChips suggestions={DEFAULT_SUGGESTIONS} onSubmit={handleChipSubmit} />
          </div>
        )}

        {isLoading && (
          <div className="glass rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="font-display text-sm font-semibold text-foreground">Analyzing your query with AI...</span>
            </div>
            <div className="space-y-2">
              {streamSteps.length > 0 ? (
                /* FEAT-008: Real-time streaming progress */
                streamSteps.map((s, i) => {
                  const active = i === streamSteps.length - 1 && !s.done;
                  return (
                    <div key={`${s.step}-${i}`} className={`flex items-center gap-2 transition-opacity duration-300 ${s.done || active ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-2 h-2 rounded-full ${s.done ? 'bg-green-400' : active ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
                      <span className={`text-xs font-display ${s.done ? 'text-green-400' : active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.step}{s.detail ? ` --- ${s.detail}` : ''}
                      </span>
                    </div>
                  );
                })
              ) : (
                /* Fallback: timed steps for cached/non-streaming path */
                SEARCH_STEPS_FALLBACK.map((label, i) => {
                  const done = i < searchStep;
                  const active = i === searchStep;
                  return (
                    <div key={label} className={`flex items-center gap-2 transition-opacity duration-300 ${!done && !active ? 'opacity-40' : 'opacity-100'}`}>
                      <div className={`w-2 h-2 rounded-full ${done ? 'bg-green-400' : active ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
                      <span className={`text-xs font-display ${done ? 'text-green-400' : active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                    </div>
                  );
                })
              )}
            </div>
            {/* Skeleton result cards for perceived performance */}
            <div className="space-y-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-lg p-4 flex items-start gap-3">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                    <div className="flex gap-2 mt-1">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

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
              showUngettable={showUngettable} onToggleUngettable={() => setShowUngettable(!showUngettable)}
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
                  <div className="h-full bg-primary/60 rounded-full transition-all duration-1000" style={{ width: `${(1 - rateLimitCountdown / (rateLimitTotalRef.current || 30)) * 100}%` }} />
                </div>
              </div>
            )}
            {(error as Error).message === 'TRIAL_LIMIT_REACHED' && (
              <button onClick={() => setShowUpgrade(true)} className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:bg-primary/90 transition-colors">Upgrade to Pro</button>
            )}
          </div>
        )}

        {!isLoading && !error && (activeQuery || activeSearchId) && (
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
