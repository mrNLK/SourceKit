import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Search, GitBranch, Loader2, Gem, Linkedin, ExternalLink, Bookmark, BookmarkCheck, SlidersHorizontal, MapPin, X, FlaskConical, Kanban } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchDevelopers, type SearchResponse } from "@/lib/api";
import DeveloperCard from "@/components/DeveloperCard";
import ResearchTab, { type ResearchState } from "@/components/ResearchTab";

type SearchPhase = 'parsing' | 'fetching' | 'scoring' | 'done';
type TabMode = 'search' | 'research';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);
  const [tabMode, setTabMode] = useState<TabMode>('search');
  const [researchState, setResearchState] = useState<ResearchState>({
    jobTitle: "", companyName: "", research: "", error: "",
  });
  const [shortlisted, setShortlisted] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('shortlisted') || '[]')); } catch { return new Set(); }
  });
  const [seniorityFilter, setSeniorityFilter] = useState<string>("all");
  const [showGemsOnly, setShowGemsOnly] = useState(false);
  const [resultLimit, setResultLimit] = useState(20);
  const [locationFilter, setLocationFilter] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["github-search", query],
    queryFn: () => searchDevelopers(query),
    enabled: !!query,
    staleTime: 1000 * 60 * 5,
  });

  const results = data?.results || [];
  const parsedCriteria = data?.parsedCriteria;
  const reposSearched = data?.reposSearched || [];

  const phase: SearchPhase = isLoading ? 'scoring' : 'done';

  const availableLocations = useMemo(() => {
    const locs = results.map((d: any) => d.location).filter((l: string) => l && l.trim());
    return [...new Set(locs)] as string[];
  }, [results]);

  const locationSuggestions = useMemo(() => {
    if (!locationFilter) return availableLocations;
    return availableLocations.filter((l: string) => l.toLowerCase().includes(locationFilter.toLowerCase()));
  }, [availableLocations, locationFilter]);

  const filtered = useMemo(() => {
    let list = results;
    if (showGemsOnly) list = list.filter((d: any) => d.hiddenGem);
    if (locationFilter) {
      list = list.filter((d: any) => d.location && d.location.toLowerCase().includes(locationFilter.toLowerCase()));
    }
    return list.slice(0, resultLimit);
  }, [results, showGemsOnly, locationFilter, resultLimit]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTabMode('search');
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const toggleShortlist = (username: string) => {
    setShortlisted(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username); else next.add(username);
      localStorage.setItem('shortlisted', JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-sm font-semibold text-foreground hidden sm:inline">SourceKit</span>
          </Link>
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2 pl-10 pr-4 outline-none border border-border focus:border-primary/40 transition-colors font-body"
              placeholder="Search engineers..."
            />
          </form>
          <Link
            to="/pipeline"
            className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors shrink-0"
          >
            <Kanban className="w-3.5 h-3.5" />
            Pipeline
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 p-1 glass rounded-lg w-fit">
          <button
            onClick={() => setTabMode('search')}
            className={`flex items-center gap-1.5 text-xs font-display px-4 py-2 rounded-md transition-colors ${
              tabMode === 'search' ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
          <button
            onClick={() => setTabMode('research')}
            className={`flex items-center gap-1.5 text-xs font-display px-4 py-2 rounded-md transition-colors ${
              tabMode === 'research' ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Research
          </button>
        </div>

        {tabMode === 'research' ? (
          <ResearchTab state={researchState} onStateChange={setResearchState} />
        ) : (
          <>
            {/* Search Progress */}
            {isLoading && (
              <div className="glass rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="font-display text-sm font-semibold text-foreground">
                    Analyzing your query with AI...
                  </span>
                </div>
                <div className="space-y-2">
                  <ProgressStep label="Understanding your query..." active={true} />
                  <ProgressStep label="Fetching contributors from repositories..." active={true} />
                  <ProgressStep label="Scoring and ranking candidates..." active={true} />
                </div>
              </div>
            )}

            {/* Parsed Criteria Display */}
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

            {/* Results header + filters */}
            {!isLoading && results.length > 0 && (
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h1 className="font-display text-lg font-semibold text-foreground">
                    {locationFilter || showGemsOnly ? (
                      <>Showing <span className="text-primary">{filtered.length}</span> of {results.length} engineers</>
                    ) : (
                      <>Found <span className="text-primary">{filtered.length}</span> engineers</>
                    )}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5 font-display">Sorted by AI relevance score</p>
                </div>
                <div className="flex items-center gap-2">
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
                  {/* Result count */}
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
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="glass rounded-xl p-6 text-center">
                <p className="text-destructive font-display text-sm mb-2">
                  {(error as Error).message === 'RATE_LIMITED'
                    ? '⚡ GitHub API rate limit reached'
                    : 'Failed to search GitHub'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {(error as Error).message === 'RATE_LIMITED'
                    ? 'Please wait a few minutes and try again. The GitHub API limits requests per hour.'
                    : (error as Error).message}
                </p>
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && (
              <div className="grid gap-3">
                {filtered.map((dev: any) => (
                  <DeveloperCard
                    key={dev.id}
                    developer={dev}
                    isShortlisted={shortlisted.has(dev.username)}
                    onToggleShortlist={() => toggleShortlist(dev.username)}
                    showPipelineButton
                  />
                ))}
                {results.length === 0 && (
                  <p className="text-center text-muted-foreground py-12 font-display text-sm">No results found. Try a different query.</p>
                )}
                {results.length > 0 && filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-12 font-display text-sm">No engineers match the current filters.</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const ProgressStep = ({ label, active }: { label: string; active: boolean }) => (
  <div className="flex items-center gap-2">
    {active ? (
      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
    ) : (
      <div className="w-2 h-2 rounded-full bg-muted" />
    )}
    <span className={`text-xs font-display ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
  </div>
);

export default SearchResults;
