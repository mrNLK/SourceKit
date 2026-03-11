import { Settings, Key, Globe, Bell, Building2, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { searchCompaniesNaturalLanguage } from "@/services/harmonic";

export default function AiFundSettingsTab() {
  const [harmonicStatus, setHarmonicStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  useEffect(() => {
    // Quick health check: try a minimal search to see if Harmonic API key is configured
    searchCompaniesNaturalLanguage("test")
      .then(() => setHarmonicStatus("connected"))
      .catch(() => setHarmonicStatus("disconnected"));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI Fund Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure integrations, API keys, and notification preferences
        </p>
      </div>

      {/* Harmonic Integration */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Harmonic</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg">
            <span className="text-sm text-foreground">API Connection</span>
            {harmonicStatus === "checking" ? (
              <span className="text-xs text-muted-foreground">Checking...</span>
            ) : harmonicStatus === "connected" ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <XCircle className="w-3 h-3" /> Not configured
              </span>
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg">
            <span className="text-sm text-foreground">Company cache TTL</span>
            <span className="text-xs text-muted-foreground">7 days</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg">
            <span className="text-sm text-foreground">Auto-enrich on person add</span>
            <span className="text-xs text-primary">Enabled</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Harmonic API key is managed server-side via the HARMONIC_API_KEY environment variable.
            Company data is cached for 7 days. Person enrichment triggers automatically when a LinkedIn URL is provided.
          </p>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">API Keys</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Exa API Key</label>
            <input
              type="password"
              placeholder="exa-..."
              disabled
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Configured in main Settings tab</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">GitHub Token</label>
            <input
              type="password"
              placeholder="ghp_..."
              disabled
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground"
            />
            <p className="text-[10px] text-muted-foreground mt-1">For GitHub profile fetching</p>
          </div>
        </div>
      </div>

      {/* Sourcing Channels */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Sourcing Channels</h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg">
            <span>HuggingFace Spaces</span>
            <span className="text-xs text-primary">Active</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg">
            <span>arXiv (applied AI)</span>
            <span className="text-xs text-primary">Active</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg">
            <span>Conference Rosters</span>
            <span className="text-xs text-muted-foreground">Not configured</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg">
            <span>YC Alumni</span>
            <span className="text-xs text-primary">Active</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg">
            <span>"Built in Public" accounts</span>
            <span className="text-xs text-muted-foreground">Not configured</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Notification preferences will be available in a future update.
        </p>
      </div>
    </div>
  );
}
