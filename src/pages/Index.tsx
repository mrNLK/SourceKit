import { useState } from "react";
import DashboardLayout, { type ActiveTab } from "@/components/DashboardLayout";
import SearchTab from "@/components/SearchTab";
import PipelineTab from "@/components/PipelineTab";
import ResearchTab, { type ResearchState } from "@/components/ResearchTab";
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
  const [researchState, setResearchState] = useState<ResearchState>({
    jobTitle: "", companyName: "", research: "", error: "",
  });

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "search" && <SearchTab />}
      {activeTab === "history" && (
        <PlaceholderTab icon={Clock} title="Search History" subtitle="Search history coming soon" />
      )}
      {activeTab === "pipeline" && <PipelineTab />}
      {activeTab === "watchlist" && (
        <PlaceholderTab icon={Bookmark} title="Watchlist" subtitle="Watchlist coming soon" />
      )}
      {activeTab === "settings" && <SettingsTab />}
    </DashboardLayout>
  );
};

export default Index;
