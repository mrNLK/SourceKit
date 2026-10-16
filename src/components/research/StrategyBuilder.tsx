import { Loader2, Check } from "lucide-react";
import type { InputMode } from "@/components/ResearchTab";
import type { StrategyProgressStep } from "@/lib/strategy-stream";

interface StrategyBuilderProps {
  isLoading: boolean;
  loadingStep: string;
  inputMode: InputMode;
  error: string;
  progressSteps?: StrategyProgressStep[];
}

/** Ordered milestones streamed by research-role. Core and signals run in parallel, so either may finish first. */
const MILESTONES: { id: string; label: string }[] = [
  { id: "analyzing", label: "Analyzing the role and requirements" },
  { id: "core", label: "Identifying target repos, companies and skills" },
  { id: "signals", label: "Drafting EEA signals and role overview" },
  { id: "companies", label: "Enriching target companies" },
];

const StrategyBuilder = ({ isLoading, loadingStep, inputMode, error, progressSteps = [] }: StrategyBuilderProps) => {
  if (!isLoading && !error) return null;
  const seen = new Set(progressSteps.map((s) => s.step));
  // A step is done once a later milestone (or its own completion event) has arrived.
  const isDone = (id: string) => {
    if (id === "analyzing") return seen.has("core") || seen.has("signals");
    if (id === "companies") return false;
    return seen.has(id);
  };
  const elapsed = progressSteps.length ? Math.round((progressSteps[progressSteps.length - 1].elapsed || 0) / 1000) : null;

  return (
    <>
      {isLoading && (
        <div className="glass rounded-xl p-6 mb-6" data-testid="strategy-progress">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="font-display text-sm font-semibold text-foreground">{loadingStep || (inputMode === "jd" ? "Reading the job description..." : "Building your sourcing strategy...")}</span>
            {elapsed !== null && <span className="ml-auto text-[11px] text-muted-foreground font-display">{elapsed}s</span>}
          </div>
          <div className="space-y-2">
            {MILESTONES.map((m) => {
              const done = isDone(m.id);
              const active = !done && (seen.has(m.id) || (m.id === "analyzing" && progressSteps.length === 0) || (m.id !== "analyzing" && m.id !== "companies" && seen.has("analyzing")));
              return (
                <div key={m.id} className={`flex items-center gap-2 transition-opacity ${done || active ? "opacity-100" : "opacity-40"}`}>
                  {done ? <Check className="w-3 h-3 text-green-500" /> : <div className={`w-2 h-2 rounded-full ${active ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />}
                  <span className={`text-xs font-display ${done ? "text-green-600" : "text-foreground"}`}>{m.label}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground font-display">Usually 30–60 seconds.</p>
        </div>
      )}

      {error && (
        <div className="glass rounded-xl p-4 mb-6">
          <p className="text-sm text-destructive font-display">{error}</p>
        </div>
      )}
    </>
  );
};

export default StrategyBuilder;
