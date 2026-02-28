import { useState, useEffect, useRef } from "react";
import { Loader2, Check, Search, GitFork, Users, Sparkles, CheckCircle2 } from "lucide-react";

interface SearchProgressProps {
  isLoading: boolean;
  hasTargetRepos: boolean;
  repoCount?: number;
}

const STEPS = [
  { id: "parse", label: "Expanding query with AI", activeLabel: "Expanding query with AI...", icon: Sparkles, delay: 0 },
  { id: "repos", label: "Searching repositories", activeLabel: "Searching repositories...", icon: Search, delay: 2000 },
  { id: "contributors", label: "Fetching contributors", activeLabel: "Fetching contributors...", icon: GitFork, delay: 4500 },
  { id: "enrich", label: "Enriching profiles", activeLabel: "Enriching candidate profiles...", icon: Users, delay: 7000 },
  { id: "score", label: "Scoring candidates", activeLabel: "Scoring and ranking candidates...", icon: Sparkles, delay: 9500 },
];

const DIRECT_STEPS = [
  { id: "repos", label: "Searching repositories", activeLabel: "Searching target repositories...", icon: Search, delay: 0 },
  { id: "contributors", label: "Fetching contributors", activeLabel: "Fetching contributors...", icon: GitFork, delay: 2000 },
  { id: "enrich", label: "Enriching profiles", activeLabel: "Enriching candidate profiles...", icon: Users, delay: 4500 },
  { id: "score", label: "Scoring candidates", activeLabel: "Scoring and ranking candidates...", icon: Sparkles, delay: 7000 },
];

const SearchProgress = ({ isLoading, hasTargetRepos, repoCount }: SearchProgressProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const steps = hasTargetRepos ? DIRECT_STEPS : STEPS;

  useEffect(() => {
    if (!isLoading) {
      setActiveStep(0);
      setElapsed(0);
      return;
    }

    setActiveStep(0);
    setElapsed(0);

    // Step progression timers
    const currentSteps = hasTargetRepos ? DIRECT_STEPS : STEPS;
    const stepTimers = currentSteps.map((step, idx) => {
      if (idx === 0) return null;
      return setTimeout(() => setActiveStep(idx), step.delay);
    });

    // Elapsed second counter
    const ticker = setInterval(() => setElapsed(prev => prev + 1), 1000);

    return () => {
      stepTimers.forEach(t => t && clearTimeout(t));
      clearInterval(ticker);
    };
  }, [isLoading, hasTargetRepos]);

  if (!isLoading) return null;

  return (
    <div className="glass rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="font-display text-sm font-semibold text-foreground">
            {steps[activeStep].activeLabel}
          </span>
        </div>
        <span className="text-[10px] font-display text-muted-foreground tabular-nums">
          {elapsed}s
        </span>
      </div>

      {/* Stepper */}
      <div className="space-y-1.5">
        {steps.map((step, idx) => {
          const isComplete = idx < activeStep;
          const isActive = idx === activeStep;
          const isPending = idx > activeStep;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-2.5 py-1 transition-all duration-300 ${
                isPending ? "opacity-30" : "opacity-100"
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : isActive ? (
                <div className="w-4 h-4 rounded-full border-2 border-primary shrink-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border border-border shrink-0" />
              )}
              <span className={`text-xs font-display ${
                isActive ? "text-foreground font-medium" :
                isComplete ? "text-muted-foreground" :
                "text-muted-foreground/50"
              }`}>
                {step.label}
                {step.id === "repos" && repoCount ? ` (${repoCount} repos)` : ""}
              </span>
              {isComplete && (
                <Check className="w-3 h-3 text-emerald-400 ml-auto" />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/60 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(((activeStep + 1) / steps.length) * 100, 95)}%` }}
        />
      </div>
    </div>
  );
};

export default SearchProgress;
