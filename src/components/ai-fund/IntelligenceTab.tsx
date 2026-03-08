import { useState, useEffect } from "react";
import { Zap, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { AiFundIntelligenceRun, IntelligenceProvider, IntelligenceRunStatus } from "@/types/ai-fund";
import { fetchIntelligenceRuns, createIntelligenceRun, dispatchHarmonicIntelligence } from "@/lib/ai-fund";

interface Props {}

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
  manual: "Manual Import",
  harmonic: "Harmonic",
};

export default function IntelligenceTab({}: Props) {
  const [runs, setRuns] = useState<AiFundIntelligenceRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [formProvider, setFormProvider] = useState<IntelligenceProvider>("exa");
  const [formQuery, setFormQuery] = useState("");

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

  const handleCreate = async () => {
    if (!formQuery.trim()) return;
    const run = await createIntelligenceRun({
      provider: formProvider,
      queryParams: { query: formQuery.trim() },
    });
    setRuns((prev) => [run, ...prev]);
    setFormQuery("");
    setShowForm(false);

    // Dispatch to harmonic-intelligence edge function
    if (formProvider === "harmonic") {
      try {
        const result = await dispatchHarmonicIntelligence(run.id, formQuery.trim());
        const updatedRun = result.run as AiFundIntelligenceRun | undefined;
        if (updatedRun) {
          setRuns((prev) =>
            prev.map((r) => (r.id === run.id ? { ...r, status: "completed" as const, resultsCount: (updatedRun as Record<string, unknown>).results_count as number ?? 0 } : r))
          );
        }
      } catch (err) {
        console.error("Harmonic intelligence dispatch failed:", err);
        setRuns((prev) =>
          prev.map((r) => (r.id === run.id ? { ...r, status: "failed" as const } : r))
        );
      }
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
            External sourcing runs via Exa, Parallel, GitHub, and Harmonic
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
              <option value="exa">Exa Websets</option>
              <option value="parallel">Parallel Deep Research</option>
              <option value="github">GitHub API</option>
              <option value="manual">Manual Import</option>
              <option value="harmonic">Harmonic</option>
            </select>
            <input
              type="text"
              placeholder="Search query *"
              value={formQuery}
              onChange={(e) => setFormQuery(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!formQuery.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
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
            return (
              <div
                key={run.id}
                className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg"
              >
                <StatusIcon className={`w-4 h-4 shrink-0 ${config.color} ${run.status === "running" ? "animate-spin" : ""}`} />
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
