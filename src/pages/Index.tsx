import { useState, useCallback, useEffect } from "react";
import DashboardLayout, { type ActiveTab } from "@/components/DashboardLayout";
import SearchTab from "@/components/SearchTab";
import PipelineTab from "@/components/PipelineTab";
import HistoryTab from "@/components/HistoryTab";
import WatchlistTab from "@/components/WatchlistTab";
import BulkActionsTab from "@/components/BulkActionsTab";
import { Settings, Save, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    exa_api_key: "",
    parallel_api_key: "",
    target_role: "",
    target_company: "",
    webhook_url: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any).from("settings").select("key, value");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: any) => {
          map[r.key] = r.value;
        });
        setForm((prev) => ({
          exa_api_key: map.exa_api_key || prev.exa_api_key,
          parallel_api_key: map.parallel_api_key || prev.parallel_api_key,
          target_role: map.target_role || prev.target_role,
          target_company: map.target_company || prev.target_company,
          webhook_url: map.webhook_url || prev.webhook_url,
        }));
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const entries = Object.entries(form);
    for (const [key, value] of entries) {
      await (supabase as any).from("settings").upsert({ key, value }, { onConflict: "key" });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const fields = [
    { key: "exa_api_key", label: "Exa API Key", type: "password", placeholder: "exa-..." },
    { key: "parallel_api_key", label: "Parallel API Key", type: "password", placeholder: "par-..." },
    { key: "target_role", label: "Default Target Role", type: "text", placeholder: "Senior Software Engineer" },
    { key: "target_company", label: "Default Target Company", type: "text", placeholder: "Acme Inc" },
    { key: "webhook_url", label: "Webhook URL", type: "url", placeholder: "https://hooks.example.com/..." },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground">API keys and default configuration</p>
        </div>
      </div>
      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{f.label}</label>
            <input
              type={f.type}
              value={form[f.key as keyof typeof form]}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
      </button>
    </div>
  );
};

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
    setRerunKey((k) => k + 1);
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
      {activeTab === "watchlist" && <WatchlistTab onNavigateToSearch={() => setActiveTab("search")} />}
      {activeTab === "bulk" && <BulkActionsTab />}
      {activeTab === "settings" && <SettingsTab />}
    </DashboardLayout>
  );
};

export default Index;
