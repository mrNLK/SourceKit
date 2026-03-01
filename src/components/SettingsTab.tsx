import { useState, useEffect, useRef } from "react";
import { Settings, Save, Loader2, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";

function isValidUrl(str: string): boolean {
  try { new URL(str); return true; } catch { return false; }
}

const SettingsTab = () => {
  const { invalidate: invalidateSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<Record<string, "saved" | "error" | "">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const statusTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [form, setForm] = useState({
    target_role: "",
    target_company: "",
    role_pitch: "",
    webhook_url: "",
    slack_webhook_url: "",
    exa_api_key: "",
    parallel_api_key: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      let query = (supabase as any).from("settings").select("key, value");
      if (userId) query = query.eq("user_id", userId);
      const { data } = await query;
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.key] = r.value; });
        setForm((prev) => ({
          target_role: map.target_role || prev.target_role,
          target_company: map.target_company || prev.target_company,
          role_pitch: map.role_pitch || prev.role_pitch,
          webhook_url: map.webhook_url || prev.webhook_url,
          slack_webhook_url: map.slack_webhook_url || prev.slack_webhook_url,
          exa_api_key: map.exa_api_key || prev.exa_api_key,
          parallel_api_key: map.parallel_api_key || prev.parallel_api_key,
        }));
      }
      setLoading(false);
    };
    load();
  }, []);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (form.webhook_url && !isValidUrl(form.webhook_url)) {
      errs.webhook_url = "Must be a valid URL";
    }
    if (form.slack_webhook_url && !isValidUrl(form.slack_webhook_url)) {
      errs.slack_webhook_url = "Must be a valid URL";
    }
    return errs;
  };

  const setFieldSaved = (key: string, status: "saved" | "error") => {
    setFieldStatus(prev => ({ ...prev, [key]: status }));
    clearTimeout(statusTimers.current[key]);
    statusTimers.current[key] = setTimeout(() => {
      setFieldStatus(prev => ({ ...prev, [key]: "" }));
    }, 2000);
  };

  const handleSave = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast({ title: "Fix validation errors before saving", variant: "destructive" });
      return;
    }

    setSaving(true);
    const entries = Object.entries(form);
    let hasError = false;
    for (const [key, value] of entries) {
      const { error } = await (supabase as any).from("settings").upsert({ key, value }, { onConflict: "key" });
      if (error) {
        setFieldSaved(key, "error");
        hasError = true;
      } else {
        setFieldSaved(key, "saved");
      }
    }
    invalidateSettings();
    setSaving(false);
    if (hasError) {
      toast({ title: "Some settings failed to save", variant: "destructive" });
    } else {
      toast({ title: "Settings saved" });
    }
  };

  const handleTestWebhook = async (key: string) => {
    const url = form[key as keyof typeof form];
    if (!url || !isValidUrl(url)) {
      toast({ title: "Enter a valid URL first", variant: "destructive" });
      return;
    }
    setTestingWebhook(key);
    try {
      const payload = key === "slack_webhook_url"
        ? { text: "SourceKit webhook test - connection successful!" }
        : { event: "test", message: "SourceKit webhook test", timestamp: new Date().toISOString() };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: "Webhook test successful" });
      } else {
        toast({ title: `Webhook returned ${res.status}`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Webhook test failed — network error", variant: "destructive" });
    } finally {
      setTestingWebhook(null);
    }
  };

  const update = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

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
    { key: "exa_api_key", label: "Exa API Key", type: "password", placeholder: "exa-...", group: "API Keys" },
    { key: "parallel_api_key", label: "Parallel API Key", type: "password", placeholder: "parallel-...", group: "API Keys" },
    { key: "webhook_url", label: "Webhook URL", type: "url", placeholder: "https://hooks.example.com/...", group: "Integrations", testable: true },
    { key: "slack_webhook_url", label: "Slack Webhook URL", type: "url", placeholder: "https://hooks.slack.com/services/...", group: "Integrations", testable: true },
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
            {fields.filter(f => f.group === group).map((f) => {
              const status = fieldStatus[f.key];
              const error = errors[f.key];
              return (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{f.label}</label>
                    {status === "saved" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                    {status === "error" && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type={f.type}
                      value={form[f.key as keyof typeof form]}
                      onChange={(e) => update(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        error ? "border-destructive" : "border-border"
                      }`}
                    />
                    {(f as any).testable && (
                      <button
                        onClick={() => handleTestWebhook(f.key)}
                        disabled={testingWebhook === f.key}
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-display px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-50"
                      >
                        {testingWebhook === f.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        Test
                      </button>
                    )}
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              );
            })}
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
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
};

export default SettingsTab;
