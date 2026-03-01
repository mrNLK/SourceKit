import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout, { type ActiveTab } from "@/components/DashboardLayout";
import SearchTab from "@/components/SearchTab";
import PipelineTab from "@/components/PipelineTab";
import HistoryTab from "@/components/HistoryTab";
import WatchlistTab from "@/components/WatchlistTab";
import BulkActionsTab from "@/components/BulkActionsTab";
import WebsetsTab from "@/components/WebsetsTab";
import SettingsTab from "@/components/SettingsTab";
import ResearchTab, { type ResearchState } from "@/components/ResearchTab";
import { toast } from "@/hooks/use-toast";

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
      if (saved && ["search", "research", "history", "pipeline", "watchlist", "bulk", "websets", "settings"].includes(saved)) {
        return saved as ActiveTab;
      }
    } catch {}
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
      <div style={{ display: activeTab === "watchlist" ? undefined : "none" }}>
        <WatchlistTab onNavigateToSearch={() => setActiveTab("search")} />
      </div>
      {activeTab === "bulk" && <BulkActionsTab />}
      {activeTab === "websets" && <WebsetsTab />}
      {activeTab === "settings" && <SettingsTab />}
    </DashboardLayout>
  );
};

export default Index;
