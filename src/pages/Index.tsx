import { useState, useCallback } from "react";
import DashboardLayout, { type ActiveTab } from "@/components/DashboardLayout";
import SearchTab from "@/components/SearchTab";
import PipelineTab from "@/components/PipelineTab";
import HistoryTab from "@/components/HistoryTab";
import { Clock, Bookmark } from "lucide-react";

const PlaceholderTab = ({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <h2 className="font-display text-lg font-semibold text-foreground mb-1">{title}</h2>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
);

const SettingsTab = () => (
  <PlaceholderTab icon={Clock} title="Settings" subtitle="Settings coming soon" />
);

const Index = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("search");
  const [rerunQuery, setRerunQuery] = useState<string | undefined>();
  const [rerunExpanded, setRerunExpanded] = useState<string | undefined>();
  const [rerunKey, setRerunKey] = useState(0);

  const handleRerun = useCallback((query: string, expandedQuery?: string) => {
    if (!query) {
      setActiveTab("search");
      return;
    }
    setRerunQuery(query);
    setRerunExpanded(expandedQuery);
    setRerunKey(k => k + 1);
    setActiveTab("search");
  }, []);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "search" && (
        <SearchTab
          key={rerunKey}
          initialQuery={rerunQuery}
          initialExpandedQuery={rerunExpanded}
          autoSubmit={!!rerunQuery && rerunKey > 0}
        />
      )}
      {activeTab === "history" && <HistoryTab onRerun={handleRerun} />}
      {activeTab === "pipeline" && <PipelineTab />}
      {activeTab === "watchlist" && (
        <PlaceholderTab icon={Bookmark} title="Watchlist" subtitle="Watchlist coming soon" />
      )}
      {activeTab === "settings" && <SettingsTab />}
    </DashboardLayout>
  );
};

export default Index;
