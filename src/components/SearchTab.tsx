import { Search, Loader2, Gem, ExternalLink, SlidersHorizontal, MapPin, X, Zap, ChevronDown, ChevronUp, GripVertical, Plus } from "lucide-react";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { searchDevelopers, enrichLinkedIn } from "@/lib/api";
import DeveloperCard from "@/components/DeveloperCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";

interface SearchTabProps {
  initialQuery?: string;
  initialExpandedQuery?: string;
  autoSubmit?: boolean;
}

interface SuggestionChip {
  label: string;
  expandedQuery: string;
}

interface SkillFilter {
  id: string;
  text: string;
}

const DEFAULT_SUGGESTIONS: SuggestionChip[] = [
  { label: "Rust systems engineers", expandedQuery: "Rust systems engineers with experience in low-level programming, memory safety, performance optimization, and systems-level software development including operating systems, compilers, or embedded systems" },
  { label: "React accessibility experts", expandedQuery: "React frontend engineers specializing in web accessibility (a11y), WCAG compliance, ARIA attributes, screen reader compatibility, and inclusive design patterns using React and TypeScript" },
  { label: "ML infrastructure", expandedQuery: "Machine learning infrastructure engineers experienced with ML pipelines, model serving, distributed training, MLOps, Kubernetes for ML workloads, feature stores, and tools like Ray, Kubeflow, or MLflow" },
  { label: "Kubernetes contributors", expandedQuery: "Kubernetes contributors and cloud-native engineers with experience in container orchestration, Helm charts, operators, service mesh, cloud infrastructure automation, and Go programming" },
  { label: "Security researchers", expandedQuery: "Security researchers and application security engineers with expertise in vulnerability research, penetration testing, cryptography, secure coding practices, and CVE discovery" },
];

function computeSkillMatch(dev: any, skills: SkillFilter[]): number {
  if (skills.length === 0) return -1;
  const activeSkills = skills.filter(s => s.text.trim());
  if (activeSkills.length === 0) return -1;

  const searchText = [
    dev.bio || "",
    dev.about || "",
    dev.name || "",
    ...(dev.topLanguages || []).map((l: any) => l.name || ""),
    ...(dev.highlights || []),
    ...Object.keys(dev.contributedRepos || {}),
  ].join(" ").toLowerCase();

  let totalPossible = 0;
  let earned = 0;
  activeSkills.forEach((skill, idx) => {
    const weight = Math.max(2, 10 - idx * 2); // 10, 8, 6, 4, 2, 2...
    totalPossible += weight;
    const keywords = skill.text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const matched = keywords.filter(kw => searchText.includes(kw)).length;
    if (keywords.length > 0) {
      earned += weight * (matched / keywords.length);
    }
  });

  return totalPossible > 0 ? Math.round((earned / totalPossible) * 100) : 0;
}

const SearchTab = ({ initialQuery, initialExpandedQuery, autoSubmit }: SearchTabProps) => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(initialQuery || "");
  const [activeQuery, setActiveQuery] = useState("");
  const [expandedQuery, setExpandedQuery] = useState(initialExpandedQuery || "");
  const [showExpandedQuery, setShowExpandedQuery] = useState(false);
  const [shortlisted, setShortlisted] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('shortlisted') || '[]')); } catch { return new Set(); }
  });
  const [showGemsOnly, setShowGemsOnly] = useState(false);
  const [resultLimit, setResultLimit] = useState(20);
  const [locationFilter, setLocationFilter] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const [enrichProgress, setEnrichProgress] = useState<{ current: number; total: number; skipped: number } | null>(null);
  const [enrichedUsernames, setEnrichedUsernames] = useState<Set<string>>(new Set());
  const autoSubmitDone = useRef(false);

  // Skill filters
  const [skillFilters, setSkillFilters] = useState<SkillFilter[]>([]);
  const [showSkillPanel, setShowSkillPanel] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Expand search
  const [expandedResults, setExpandedResults] = useState<any[]>([]);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandCount, setExpandCount] = useState(0);

  // Auto-submit for re-run from history
  useEffect(() => {
    if (autoSubmit && initialQuery && !autoSubmitDone.current) {
      autoSubmitDone.current = true;
      const q = initialExpandedQuery || initialQuery;
      setActiveQuery(q);
      setQuery(initialQuery);
      setExpandedQuery(initialExpandedQuery || "");
    }
  }, [autoSubmit, initialQuery, initialExpandedQuery]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["github-search", activeQuery],
    queryFn: () => searchDevelopers(activeQuery),
    enabled: !!activeQuery,
    staleTime: 1000 * 60 * 5,
  });

  // Reset expanded results when a new search runs
  useEffect(() => {
    setExpandedResults([]);
    setExpandCount(0);
  }, [activeQuery]);

  const baseResults = data?.results || [];
  const parsedCriteria = data?.parsedCriteria;
  const reposSearched = data?.reposSearched || [];

  // Merge base + expanded, deduplicate by username
  const results = useMemo(() => {
    if (expandedResults.length === 0) return baseResults;
    const seen = new Set(baseResults.map((d: any) => d.username));
    const unique = expandedResults.filter((d: any) => !seen.has(d.username));
    return [...baseResults, ...unique];
  }, [baseResults, expandedResults]);

  // Save to search_history when results arrive
  useEffect(() => {
    if (data && activeQuery && baseResults.length >= 0) {
      const saveHistory = async () => {
        try {
          await supabase.from("search_history").insert({
            query: query || activeQuery,
            action_type: "search",
            result_count: baseResults.length,
            metadata: {
              expanded_query: expandedQuery || activeQuery,
              skills: parsedCriteria?.skills || [],
              location: parsedCriteria?.location || null,
              seniority: parsedCriteria?.seniority || null,
            },
          } as any);
          queryClient.invalidateQueries({ queryKey: ["search-history"] });
        } catch { /* silent */ }
      };
      saveHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const { data: pipelineUsernames } = useQuery({
    queryKey: ["pipeline-usernames"],
    queryFn: async () => {
      const { data } = await supabase.from('pipeline').select('github_username');
      return new Set((data || []).map((r: any) => r.github_username));
    },
    staleTime: 1000 * 30,
  });
  const pipelineSet = pipelineUsernames || new Set<string>();

  const availableLocations = useMemo(() => {
    const locs = results.map((d: any) => d.location).filter((l: string) => l && l.trim());
    return [...new Set(locs)] as string[];
  }, [results]);

  const locationSuggestions = useMemo(() => {
    if (!locationFilter) return availableLocations;
    return availableLocations.filter((l: string) => l.toLowerCase().includes(locationFilter.toLowerCase()));
  }, [availableLocations, locationFilter]);

  // Compute skill matches for each result
  const resultsWithSkillMatch = useMemo(() => {
    const activeSkills = skillFilters.filter(s => s.text.trim());
    return results.map((dev: any) => ({
      ...dev,
      skillMatch: computeSkillMatch(dev, activeSkills),
    }));
  }, [results, skillFilters]);

  const filtered = useMemo(() => {
    let list = resultsWithSkillMatch;
    if (showGemsOnly) list = list.filter((d: any) => d.hiddenGem);
    if (locationFilter) {
      list = list.filter((d: any) => d.location && d.location.toLowerCase().includes(locationFilter.toLowerCase()));
    }
    return list.slice(0, resultLimit);
  }, [resultsWithSkillMatch, showGemsOnly, locationFilter, resultLimit]);

  const handleBatchEnrich = useCallback(async () => {
    if (enrichProgress) return;
    const toEnrich = filtered.filter((d: any) => !d.linkedinUrl && !enrichedUsernames.has(d.username));
    const alreadyHave = filtered.length - toEnrich.length;
    setEnrichProgress({ current: 0, total: toEnrich.length, skipped: alreadyHave });
    for (let i = 0; i < toEnrich.length; i++) {
      const dev = toEnrich[i];
      setEnrichProgress({ current: i + 1, total: toEnrich.length, skipped: alreadyHave });
      try {
        const result = await enrichLinkedIn(dev.username, dev.name, dev.location, dev.bio);
        if (result.linkedin_url) setEnrichedUsernames(prev => new Set([...prev, dev.username]));
      } catch { /* skip */ }
    }
    setTimeout(() => setEnrichProgress(null), 2000);
  }, [filtered, enrichedUsernames, enrichProgress]);

  const buildSearchQuery = useCallback(() => {
    let searchQuery = expandedQuery.trim() || query.trim();
    const activeSkills = skillFilters.filter(s => s.text.trim());
    if (activeSkills.length > 0) {
      const skillStr = activeSkills.map((s, i) => `${i + 1}. ${s.text}`).join(", ");
      searchQuery += ` Priority skills: ${skillStr}`;
    }
    return searchQuery;
  }, [query, expandedQuery, skillFilters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setActiveQuery(buildSearchQuery());
    }
  };

  const handleChipClick = (chip: SuggestionChip) => {
    setQuery(chip.label);
    setExpandedQuery(chip.expandedQuery);
    setShowExpandedQuery(true);
  };

  const handleChipSubmit = (chip: SuggestionChip) => {
    setQuery(chip.label);
    setExpandedQuery(chip.expandedQuery);
    setActiveQuery(chip.expandedQuery);
  };

  const toggleShortlist = (username: string) => {
    setShortlisted(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username); else next.add(username);
      localStorage.setItem('shortlisted', JSON.stringify([...next]));
      return next;
    });
  };

  // Skill filter handlers
  const addSkillFilter = () => {
    if (skillFilters.length >= 10) return;
    setSkillFilters(prev => [...prev, { id: crypto.randomUUID(), text: "" }]);
  };

  const removeSkillFilter = (id: string) => {
    setSkillFilters(prev => prev.filter(s => s.id !== id));
  };

  const updateSkillFilter = (id: string, text: string) => {
    setSkillFilters(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  };

  const handleSkillDragStart = (idx: number) => setDragIdx(idx);
  const handleSkillDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setSkillFilters(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };
  const handleSkillDragEnd = () => setDragIdx(null);

  // Expand search
  const currentResultCount = results.length;
  const maxResults = 50;
  const canExpand = currentResultCount < maxResults && activeQuery && !isLoading;

  const handleExpandSearch = async () => {
    if (!canExpand || isExpanding) return;
    setIsExpanding(true);
    try {
      const nextCount = Math.min(currentResultCount * 2, maxResults);
      // Re-search with a modified query hint for more results
      const expandQuery = activeQuery + ` (find at least ${nextCount} candidates)`;
      const moreData = await searchDevelopers(expandQuery);
      const newResults = moreData.results || [];

      const existingUsernames = new Set(results.map((d: any) => d.username));
      const unique = newResults.filter((d: any) => !existingUsernames.has(d.username));

      if (unique.length > 0) {
        setExpandedResults(prev => [...prev, ...unique]);
        setExpandCount(prev => prev + unique.length);
        toast({
          title: `Found ${unique.length} additional candidates`,
          description: `Total: ${currentResultCount + unique.length} candidates`,
        });
      } else {
        toast({
          title: "No additional candidates found",
          description: "Try broadening your search query.",
        });
      }
    } catch (e) {
      toast({
        title: "Expand failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsExpanding(false);
    }
  };

  const hasActiveSkills = skillFilters.some(s => s.text.trim());

  return (
    <div className="flex gap-4">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative mb-2">
          <div className="relative glass rounded-xl glow-border transition-all duration-300 focus-within:glow-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (!expandedQuery) setShowExpandedQuery(false); }}
              placeholder="Search by skill, language, or domain..."
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground py-3.5 pl-12 pr-28 text-sm outline-none font-body"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-5 py-2 rounded-lg font-display text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </div>
        </form>

        {/* Expanded query details (collapsible) */}
        {expandedQuery && (
          <Collapsible open={showExpandedQuery} onOpenChange={setShowExpandedQuery} className="mb-4">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] font-display text-muted-foreground hover:text-foreground transition-colors px-1 py-1">
              {showExpandedQuery ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Query details
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 p-3 rounded-lg bg-secondary/50 border border-border">
                <textarea
                  value={expandedQuery}
                  onChange={(e) => setExpandedQuery(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent text-xs text-foreground font-body outline-none resize-none leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground mt-1 font-display">
                  This expanded query will be sent to the search engine for better results. Edit before submitting.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Suggestion chips when no active query */}
        {!activeQuery && !expandedQuery && (
          <div className="flex flex-wrap gap-2 mb-8 mt-4">
            {DEFAULT_SUGGESTIONS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleChipClick(chip)}
                onDoubleClick={() => handleChipSubmit(chip)}
                className="text-xs font-display px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                title="Click to preview expanded query, double-click to search"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="glass rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="font-display text-sm font-semibold text-foreground">Analyzing your query with AI...</span>
            </div>
            <div className="space-y-2">
              {["Understanding your query...", "Fetching contributors from repositories...", "Scoring and ranking candidates..."].map(l => (
                <div key={l} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-display text-foreground">{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parsed Criteria */}
        {parsedCriteria && !isLoading && (
          <div className="glass rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span className="font-display text-xs font-semibold text-foreground">AI-Parsed Search Criteria</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {parsedCriteria.skills.map((s: string) => (
                <span key={s} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-display">{s}</span>
              ))}
              {parsedCriteria.location && (
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground border border-border font-display">📍 {parsedCriteria.location}</span>
              )}
              {parsedCriteria.seniority !== 'any' && (
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground border border-border font-display">🎯 {parsedCriteria.seniority}</span>
              )}
            </div>
            {reposSearched.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground font-display">Repos searched: </span>
                {reposSearched.map((r: string) => (
                  <a key={r} href={`https://github.com/${r}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary/80 hover:text-primary mr-2 font-display">
                    {r} <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {!isLoading && results.length > 0 && (
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                {locationFilter || showGemsOnly ? (
                  <>Showing <span className="text-primary">{filtered.length}</span> of {results.length} engineers</>
                ) : (
                  <>Found <span className="text-primary">{filtered.length}</span> engineers</>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-display">
                Sorted by AI relevance score
                {hasActiveSkills && " + skill priorities"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Skill filter toggle */}
              <button
                onClick={() => setShowSkillPanel(!showSkillPanel)}
                className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border transition-colors ${
                  showSkillPanel || hasActiveSkills
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                Filters
                {hasActiveSkills && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary font-bold">
                    {skillFilters.filter(s => s.text.trim()).length}
                  </span>
                )}
              </button>

              <div className="relative">
                <div className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border border-border bg-secondary">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <input
                    ref={locationInputRef}
                    type="text"
                    value={locationFilter}
                    onChange={(e) => { setLocationFilter(e.target.value); setShowLocationSuggestions(true); }}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                    placeholder="Filter by location..."
                    className="bg-transparent outline-none text-foreground placeholder:text-muted-foreground w-32"
                  />
                  {locationFilter && (
                    <button onClick={() => setLocationFilter("")} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                    {locationSuggestions.map((loc) => (
                      <button
                        key={loc}
                        onMouseDown={() => { setLocationFilter(loc); setShowLocationSuggestions(false); }}
                        className="w-full text-left text-xs px-3 py-1.5 hover:bg-accent text-foreground font-display truncate"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowGemsOnly(!showGemsOnly)}
                className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border transition-colors ${
                  showGemsOnly ? 'bg-warning/10 text-warning border-warning/30' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Gem className="w-3 h-3" />
                Hidden Gems
              </button>
              <div className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border border-border bg-secondary">
                <span className="text-muted-foreground">Results</span>
                <select
                  value={resultLimit}
                  onChange={(e) => setResultLimit(Number(e.target.value))}
                  className="bg-popover text-foreground border border-border rounded px-1.5 py-0.5 outline-none text-xs font-display cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <button
                onClick={handleBatchEnrich}
                disabled={!!enrichProgress}
                className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border transition-colors ${
                  enrichProgress ? 'bg-info/10 text-info border-info/30' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                } disabled:cursor-not-allowed`}
              >
                {enrichProgress ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {enrichProgress.current}/{enrichProgress.total}
                    {enrichProgress.skipped > 0 && <span className="text-muted-foreground">· {enrichProgress.skipped} skipped</span>}
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3" />
                    Enrich All
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-destructive font-display text-sm mb-2">
              {(error as Error).message === 'RATE_LIMITED' ? '⚡ GitHub API rate limit reached' : 'Failed to search GitHub'}
            </p>
            <p className="text-muted-foreground text-xs">
              {(error as Error).message === 'RATE_LIMITED'
                ? 'Please wait a few minutes and try again.'
                : (error as Error).message}
            </p>
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && activeQuery && (
          <>
            <div className="grid gap-3">
              {filtered.map((dev: any) => (
                <div key={dev.id} className="relative">
                  <DeveloperCard
                    developer={dev}
                    isShortlisted={shortlisted.has(dev.username)}
                    onToggleShortlist={() => toggleShortlist(dev.username)}
                    showPipelineButton
                    inPipeline={pipelineSet.has(dev.username)}
                  />
                  {/* Skill Match badge */}
                  {dev.skillMatch >= 0 && (
                    <div
                      className={`absolute bottom-3 right-3 text-[10px] font-display font-bold px-2 py-0.5 rounded-full border ${
                        dev.skillMatch >= 70
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : dev.skillMatch >= 40
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-secondary text-secondary-foreground border-border"
                      }`}
                    >
                      {dev.skillMatch}% skill match
                    </div>
                  )}
                </div>
              ))}
              {results.length === 0 && (
                <p className="text-center text-muted-foreground py-12 font-display text-sm">No results found. Try a different query.</p>
              )}
              {results.length > 0 && filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-12 font-display text-sm">No engineers match the current filters.</p>
              )}
            </div>

            {/* Expand Search button */}
            {results.length > 0 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleExpandSearch}
                  disabled={!canExpand || isExpanding}
                  className={`flex items-center gap-2 text-xs font-display px-5 py-2.5 rounded-xl border transition-colors ${
                    !canExpand
                      ? "border-border text-muted-foreground/50 cursor-not-allowed"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
                  }`}
                  title={currentResultCount >= maxResults ? "Maximum results reached" : `Expand to find more candidates`}
                >
                  {isExpanding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Expanding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      {currentResultCount >= maxResults ? "Maximum results reached" : "Expand Search"}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Skill Priorities Panel */}
      {showSkillPanel && (
        <div className="w-72 shrink-0 glass rounded-xl p-4 self-start sticky top-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold text-foreground">Skill Priorities</h3>
            <button
              onClick={() => setShowSkillPanel(false)}
              className="p-1 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground font-display mb-3">
            Add skills in priority order. Higher priority skills weight more in match scoring. Drag to reorder.
          </p>

          <div className="space-y-2 mb-3">
            {skillFilters.map((skill, idx) => (
              <div
                key={skill.id}
                draggable
                onDragStart={() => handleSkillDragStart(idx)}
                onDragOver={(e) => handleSkillDragOver(e, idx)}
                onDragEnd={handleSkillDragEnd}
                className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition-all ${
                  dragIdx === idx ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/30"
                }`}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab shrink-0" />
                <span className="w-4 h-4 rounded bg-primary/15 text-primary text-[9px] font-display font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={skill.text}
                  onChange={(e) => updateSkillFilter(skill.id, e.target.value)}
                  placeholder="e.g. Transformer architectures"
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-body min-w-0"
                />
                <button
                  onClick={() => removeSkillFilter(skill.id)}
                  className="p-0.5 rounded text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addSkillFilter}
            disabled={skillFilters.length >= 10}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
            Add Skill {skillFilters.length > 0 && `(${skillFilters.length}/10)`}
          </button>

          {hasActiveSkills && activeQuery && (
            <p className="text-[10px] text-muted-foreground font-display mt-3 text-center">
              Run a new search to include skill priorities in the query.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchTab;
