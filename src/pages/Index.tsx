import { Skeleton } from "@/components/ui/skeleton";
import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import DashboardLayout, { type ActiveTab } from "@/components/DashboardLayout";
import SearchTab from "@/components/SearchTab";
import WatchlistTab from "@/components/WatchlistTab";
import type { ResearchState } from "@/components/ResearchTab";
import { toast } from "@/hooks/use-toast";

// Lazy-loaded tabs (conditionally rendered — only loaded when active)
const PipelineTab = lazy(() => import("@/components/PipelineTab"));
const HistoryTab = lazy(() => import("@/components/HistoryTab"));
const BulkActionsTab = lazy(() => import("@/components/BulkActionsTab"));
const WebsetsTab = lazy(() => import("@/components/WebsetsTab"));
const SettingsTab = lazy(() => import("@/components/SettingsTab"));
const ResearchTab = lazy(() => import("@/components/ResearchTab"));
const GuideTab = lazy(() => import("@/components/GuideTab"));
const loadPeopleSearchTab = () => import("@/components/PeopleSearchTab");
const PeopleSearchTab = lazy(loadPeopleSearchTab);
// Warm the People Search chunk once the app is idle so switching tabs doesn't flash a blank area.
if (typeof window !== "undefined") {
  const warm = () => { void loadPeopleSearchTab(); };
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (ric) ric(warm); else setTimeout(warm, 2000);
}

const PeopleSearchSkeleton = () => (
  <div className="max-w-5xl mx-auto p-6 space-y-6" data-testid="people-search-skeleton" aria-busy="true">
    <div className="space-y-2">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
    <div className="space-y-3 rounded-lg border border-border p-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
      <Skeleton className="h-4 w-72" />
    </div>
    <div className="space-y-3 rounded-lg border border-border p-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-9 w-full" />
    </div>
  </div>
);

const TabFallback = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

// P28: Structured strategy data passed through to SearchTab
export interface StrategyHandoff {
  targetRepos?: string[];
  skills?: string[];
}

const Index = () => {
  const [searchParams] = useSearchParams();
  // BUG-005: Persist active tab across page refreshes
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const saved = localStorage.getItem("sourcekit-active-tab");
      if (saved && ["search", "people", "research", "history", "pipeline", "watchlist", "bulk", "websets", "settings", "guide"].includes(saved)) {
        return saved as ActiveTab;
      }
    } catch {
      return "research";
    }
    return "research";
  });
  const [rerunQuery, setRerunQuery] = useState<string | undefined>();
  const [rerunExpanded, setRerunExpanded] = useState<string | undefined>();
  const [rerunStrategy, setRerunStrategy] = useState<StrategyHandoff | undefined>();
  const [rerunSearchId, setRerunSearchId] = useState<string | undefined>();
  const [rerunKey, setRerunKey] = useState(0);

  // BUG-005: Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem("sourcekit-active-tab", activeTab);
  }, [activeTab]);

  // Handle payment success/cancelled URL params
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      toast({ title: "Welcome to SourceKit Pro!", description: "You now have unlimited searches." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (payment === "cancelled") {
      toast({ title: "Payment cancelled", description: "You can upgrade anytime." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  // Research tab state (lifted here so it persists across tab switches)
  const [researchState, setResearchState] = useState<ResearchState>({
    jobTitle: "",
    companyName: "",
    research: "",
    error: "",
  });

  const handleRerun = useCallback((query: string, expandedQuery?: string, searchId?: string) => {
    if (!query) {
      setActiveTab("search");
      return;
    }
    setRerunQuery(query);
    setRerunExpanded(expandedQuery);
    setRerunSearchId(searchId);
    setRerunKey((k) => k + 1);
    setActiveTab("search");
  }, []);

  const handleSearchWithStrategy = useCallback((query: string, expandedQuery: string, strategy?: StrategyHandoff) => {
    setRerunQuery(query);
    setRerunExpanded(expandedQuery);
    setRerunStrategy(strategy);
    setRerunSearchId(undefined);
    setRerunKey((k) => k + 1);
    setActiveTab("search");
  }, []);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* Keep SearchTab always mounted to preserve results across tab switches (B1 fix) */}
      <div style={{ display: activeTab === "search" ? undefined : "none" }}>
        <SearchTab
          key={rerunKey}
          initialQuery={rerunQuery}
          initialExpandedQuery={rerunExpanded}
          initialStrategy={rerunStrategy}
          initialSearchId={rerunSearchId}
          autoSubmit={!!rerunQuery && rerunKey > 0}
          onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
        />
      </div>
      <Suspense fallback={<TabFallback />}>
        {activeTab === "research" && (
          <ResearchTab
            state={researchState}
            onStateChange={setResearchState}
            onSearchWithStrategy={handleSearchWithStrategy}
            onNavigateToWebsets={() => setActiveTab("websets")}
          />
        )}
        {activeTab === "history" && <HistoryTab onRerun={handleRerun} />}
        {activeTab === "pipeline" && <PipelineTab onNavigateToSearch={() => setActiveTab("search")} />}
      </Suspense>
      <div style={{ display: activeTab === "watchlist" ? undefined : "none" }}>
        <WatchlistTab onNavigateToSearch={() => setActiveTab("search")} />
      </div>
      <Suspense fallback={<TabFallback />}>
        {activeTab === "bulk" && <BulkActionsTab />}
        {activeTab === "websets" && <WebsetsTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab === "guide" && <GuideTab />}
      </Suspense>
      <Suspense fallback={<PeopleSearchSkeleton />}>
        {activeTab === "people" && <PeopleSearchTab />}
      </Suspense>
    </DashboardLayout>
  );
};

export default Index;
