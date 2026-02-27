import { useState, useEffect } from "react";
import { Settings, Save, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    target_role: "",
    target_company: "",
    role_pitch: "",
    webhook_url: "",
    slack_webhook_url: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any).from("settings").select("key, value");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.key] = r.value; });
        setForm((prev) => ({
          target_role: map.target_role || prev.target_role,
          target_company: map.target_company || prev.target_company,
          role_pitch: map.role_pitch || prev.role_pitch,
          webhook_url: map.webhook_url || prev.webhook_url,
          slack_webhook_url: map.slack_webhook_url || prev.slack_webhook_url,
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
    { key: "target_role", label: "Default Target Role", type: "text", placeholder: "Senior Software Engineer", group: "Outreach" },
    { key: "target_company", label: "Default Target Company", type: "text", placeholder: "Acme Inc", group: "Outreach" },
    { key: "role_pitch", label: "Role Pitch (one-liner)", type: "text", placeholder: "Building the next-gen developer platform", group: "Outreach" },
    { key: "webhook_url", label: "Webhook URL", type: "url", placeholder: "https://hooks.example.com/...", group: "Integrations" },
    { key: "slack_webhook_url", label: "Slack Webhook URL", type: "url", placeholder: "https://hooks.slack.com/services/...", group: "Integrations" },
  ];

  const groups = [...new Set(fields.map(f => f.group))];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground">Configure outreach, integrations, and defaults</p>
        </div>
      </div>

      {groups.map(group => (
        <div key={group}>
          <h3 className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group}</h3>
          <div className="space-y-4">
            {fields.filter(f => f.group === group).map((f) => (
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
        </div>
      ))}

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

export default SettingsTab;