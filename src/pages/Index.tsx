import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout, { type ActiveTab } from "@/components/DashboardLayout";
import SearchTab from "@/components/SearchTab";
import PipelineTab from "@/components/PipelineTab";
import HistoryTab from "@/components/HistoryTab";
import WatchlistTab from "@/components/WatchlistTab";
import BulkActionsTab from "@/components/BulkActionsTab";
import SettingsTab from "@/components/SettingsTab";
import ResearchTab, { type ResearchState } from "@/components/ResearchTab";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>("research");
  const [rerunQuery, setRerunQuery] = useState<string | undefined>();
  const [rerunExpanded, setRerunExpanded] = useState<string | undefined>();
  const [rerunKey, setRerunKey] = useState(0);

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

  const handleRerun = useCallback((query: string, expandedQuery?: string) => {
    if (!query) {
      setActiveTab("search");
      return;
    }
    setRerunQuery(query);
    setRerunExpanded(expandedQuery);
    setRerunKey((k) => k + 1);
    setActiveTab("search");
  }, []);

  const handleSearchWithStrategy = useCallback((query: string, expandedQuery: string) => {
    setRerunQuery(query);
    setRerunExpanded(expandedQuery);
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
          autoSubmit={!!rerunQuery && rerunKey > 0}
          onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
        />
      </div>
      {activeTab === "research" && (
        <ResearchTab
          state={researchState}
          onStateChange={setResearchState}
          onSearchWithStrategy={handleSearchWithStrategy}
        />
      )}
      {activeTab === "history" && <HistoryTab onRerun={handleRerun} />}
      {activeTab === "pipeline" && <PipelineTab onNavigateToSearch={() => setActiveTab("search")} />}
      {activeTab === "watchlist" && <WatchlistTab onNavigateToSearch={() => setActiveTab("search")} />}
      {activeTab === "bulk" && <BulkActionsTab />}
      {activeTab === "settings" && <SettingsTab />}
    </DashboardLayout>
  );
};

export default Index;
