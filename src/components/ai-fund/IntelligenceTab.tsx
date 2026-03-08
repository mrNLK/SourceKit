import { useState, useEffect } from "react";
import {
  Zap, Clock, CheckCircle, XCircle, Loader2,
  Building2, ChevronDown, ChevronRight, MapPin, DollarSign, Users,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type {
  AiFundIntelligenceRun,
  IntelligenceProvider,
  IntelligenceRunStatus,
  HarmonicRunSummary,
} from "@/types/ai-fund";
import { fetchIntelligenceRuns, createIntelligenceRun, updateIntelligenceRun } from "@/lib/ai-fund";
import {
  searchCompaniesNaturalLanguage,
  computePoachability,
  enrichCompanyByDomain,
  listSavedSearches,
  getNetNewResults,
} from "@/services/harmonic";
import type { HarmonicSavedSearch } from "@/types/harmonic";

const STATUS_CONFIG: Record<IntelligenceRunStatus, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: "text-yellow-400" },
  running: { icon: Loader2, color: "text-blue-400" },
  completed: { icon: CheckCircle, color: "text-emerald-400" },
  failed: { icon: XCircle, color: "text-destructive" },
};

const PROVIDER_LABELS: Record<IntelligenceProvider, string> = {
  exa: "Exa Websets",
  parallel: "Parallel Deep Research",
  github: "GitHub API",
  harmonic: "Harmonic Company Search",
  manual: "Manual Import",
};

function poachColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function CompanyResultCard({ company }: { company: HarmonicRunSummary["companies"][0] }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-background border border-border rounded-lg">
      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
          {company.location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" /> {company.location}
            </span>
          )}
          {company.fundingStage && (
            <span>{company.fundingStage.replace(/_/g, " ")}</span>
          )}
          {company.headcount != null && (
            <span className="flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" /> {company.headcount}
            </span>
          )}
          {company.fundingTotal != null && (
            <span className="flex items-center gap-0.5">
              <DollarSign className="w-2.5 h-2.5" />
              ${(company.fundingTotal / 1_000_000).toFixed(1)}M
            </span>
          )}
        </div>
      </div>
      {company.poachabilityScore != null && (
        <div className="text-right shrink-0">
          <span className={`text-sm font-bold ${poachColor(company.poachabilityScore)}`}>
            {company.poachabilityScore}
          </span>
          <p className="text-[10px] text-muted-foreground">poach</p>
        </div>
      )}
    </div>
  );
}

export default function IntelligenceTab() {
  const [runs, setRuns] = useState<AiFundIntelligenceRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Form
  const [formProvider, setFormProvider] = useState<IntelligenceProvider>("harmonic");
  const [formQuery, setFormQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<HarmonicSavedSearch[]>([]);
  const [savedSearchesLoading, setSavedSearchesLoading] = useState(false);
  const [savedSearchError, setSavedSearchError] = useState<string | null>(null);
  const [pollingSearch, setPollingSearch] = useState<string | null>(null);
  const [netNewCount, setNetNewCount] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetchIntelligenceRuns();
        setRuns(r);
      } catch (err) {
        console.error("Failed to load intelligence runs:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load saved searches
  const loadSavedSearches = async () => {
    setSavedSearchesLoading(true);
    setSavedSearchError(null);
    try {
      const searches = await listSavedSearches();
      setSavedSearches(searches);
    } catch (err) {
      setSavedSearchError(err instanceof Error ? err.message : "Failed to load saved searches");
    } finally {
      setSavedSearchesLoading(false);
    }
  };

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const handlePollSearch = async (searchUrn: string) => {
    setPollingSearch(searchUrn);
    try {
      const results = await getNetNewResults(searchUrn);
      setNetNewCount((prev) => ({ ...prev, [searchUrn]: results.count || results.results?.length || 0 }));
    } catch (err) {
      console.error("Failed to poll saved search:", err);
      toast({ title: "Saved search check failed", description: err instanceof Error ? err.message : "Could not fetch new results", variant: "destructive" });
    } finally {
      setPollingSearch(null);
    }
  };

  const handleCreate = async () => {
    if (!formQuery.trim()) return;
    setSubmitting(true);
    try {
      const run = await createIntelligenceRun({
        provider: formProvider,
        queryParams: { query: formQuery.trim() },
      });
      setRuns((prev) => [run, ...prev]);
      setFormQuery("");
      setShowForm(false);

      // If Harmonic, execute the search immediately
      if (formProvider === "harmonic") {
        // Mark running
        const runningRun = { ...run, status: "running" as const };
        setRuns((prev) => prev.map((r) => (r.id === run.id ? runningRun : r)));
        await updateIntelligenceRun(run.id, { status: "running" });

        try {
          const searchResult = await searchCompaniesNaturalLanguage(formQuery.trim());
          const companies = searchResult.results || [];

          // Enrich top results with poachability (best-effort, parallel)
          const enriched = await Promise.allSettled(
            companies.slice(0, 10).map(async (c) => {
              const domain = c.website?.domain;
              let poachabilityScore: number | undefined;
              if (domain) {
                try {
                  const ctx = await enrichCompanyByDomain(domain);
                  poachabilityScore = computePoachability(ctx).score;
                } catch {
                  // enrichment failed — skip poachability
                }
              }
              return {
                name: c.name || "Unknown",
                domain: c.website?.domain,
                fundingStage: c.stage,
                headcount: c.headcount,
                fundingTotal: c.funding?.fundingTotal,
                location: c.location
                  ? [c.location.city, c.location.state, c.location.country].filter(Boolean).join(", ")
                  : undefined,
                poachabilityScore,
                harmonicId: String(c.id),
              };
            })
          );

          const companySummaries = enriched
            .filter((r): r is PromiseFulfilledResult<HarmonicRunSummary["companies"][0]> => r.status === "fulfilled")
            .map((r) => r.value)
            .sort((a, b) => (b.poachabilityScore ?? 0) - (a.poachabilityScore ?? 0));

          const summary: HarmonicRunSummary = { companies: companySummaries };

          await updateIntelligenceRun(run.id, {
            status: "completed",
            resultsCount: companySummaries.length,
            resultsSummary: summary as unknown as Record<string, unknown>,
            completedAt: new Date().toISOString(),
          });

          setRuns((prev) =>
            prev.map((r) =>
              r.id === run.id
                ? {
                    ...r,
                    status: "completed" as const,
                    resultsCount: companySummaries.length,
                    resultsSummary: summary as unknown as Record<string, unknown>,
                    completedAt: new Date().toISOString(),
                  }
                : r
            )
          );
          setExpandedRunId(run.id);
        } catch (err) {
          console.error("Harmonic search failed:", err);
          toast({ title: "Harmonic search failed", description: err instanceof Error ? err.message : "Search could not be completed", variant: "destructive" });
          await updateIntelligenceRun(run.id, {
            status: "failed",
            completedAt: new Date().toISOString(),
          });
          setRuns((prev) =>
            prev.map((r) =>
              r.id === run.id ? { ...r, status: "failed" as const, completedAt: new Date().toISOString() } : r
            )
          );
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground text-sm">Loading intelligence runs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            External sourcing runs via Harmonic, Exa, Parallel, and GitHub
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Zap className="w-4 h-4" />
          New Run
        </button>
      </div>

      {/* New run form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select
              value={formProvider}
              onChange={(e) => setFormProvider(e.target.value as IntelligenceProvider)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
            >
              <option value="harmonic">Harmonic Company Search</option>
              <option value="exa">Exa Websets</option>
              <option value="parallel">Parallel Deep Research</option>
              <option value="github">GitHub API</option>
              <option value="manual">Manual Import</option>
            </select>
            <input
              type="text"
              placeholder={formProvider === "harmonic" ? "e.g. AI startups in healthcare" : "Search query *"}
              value={formQuery}
              onChange={(e) => setFormQuery(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!formQuery.trim() || submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Start Run
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Saved Searches */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Saved Searches</h2>
          <button
            onClick={loadSavedSearches}
            disabled={savedSearchesLoading}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {savedSearchesLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {savedSearchError ? (
          <div className="px-4 py-3 bg-card border border-border rounded-lg">
            <p className="text-xs text-muted-foreground">{savedSearchError}</p>
          </div>
        ) : savedSearches.length === 0 ? (
          <div className="px-4 py-3 bg-card border border-border rounded-lg">
            <p className="text-xs text-muted-foreground">
              {savedSearchesLoading ? "Loading saved searches..." : "No saved searches found in Harmonic."}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {savedSearches.map((ss) => (
              <div
                key={ss.entity_urn}
                className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg"
              >
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ss.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ss.type.replace(/_/g, " ").toLowerCase()} · {ss.is_private ? "private" : "shared"}
                  </p>
                </div>
                {netNewCount[ss.entity_urn] != null && netNewCount[ss.entity_urn] > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-full">
                    {netNewCount[ss.entity_urn]} new
                  </span>
                )}
                <button
                  onClick={() => handlePollSearch(ss.entity_urn)}
                  disabled={pollingSearch === ss.entity_urn}
                  className="px-2 py-1 text-[10px] font-medium text-muted-foreground bg-secondary rounded hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {pollingSearch === ss.entity_urn ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Check new"
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Runs list */}
      {runs.length === 0 ? (
        <div className="py-12 text-center bg-card border border-border rounded-xl">
          <p className="text-sm text-muted-foreground">
            No intelligence runs yet. Start one above.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => {
            const config = STATUS_CONFIG[run.status];
            const StatusIcon = config.icon;
            const isExpanded = expandedRunId === run.id;
            const harmonicSummary =
              run.provider === "harmonic" && run.resultsSummary
                ? (run.resultsSummary as unknown as HarmonicRunSummary)
                : null;
            const hasResults = harmonicSummary && harmonicSummary.companies?.length > 0;

            return (
              <div key={run.id} className="bg-card border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => hasResults && setExpandedRunId(isExpanded ? null : run.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <StatusIcon
                    className={`w-4 h-4 shrink-0 ${config.color} ${run.status === "running" ? "animate-spin" : ""}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {PROVIDER_LABELS[run.provider]}
                      </span>
                      <span className="text-xs text-muted-foreground">{run.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {typeof run.queryParams === "object" && run.queryParams !== null
                        ? (run.queryParams as { query?: string }).query || JSON.stringify(run.queryParams)
                        : "No query"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-foreground">{run.resultsCount}</p>
                    <p className="text-xs text-muted-foreground">results</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(run.createdAt).toLocaleDateString()}
                  </span>
                  {hasResults && (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )
                  )}
                </button>

                {/* Expanded Harmonic results */}
                {isExpanded && harmonicSummary && (
                  <div className="px-4 pb-4 space-y-1.5 border-t border-border pt-3">
                    {harmonicSummary.companies.map((company, i) => (
                      <CompanyResultCard key={company.harmonicId || i} company={company} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
