import { Loader2 } from "lucide-react";
import type { InputMode } from "@/components/ResearchTab";

interface StrategyBuilderProps {
  isLoading: boolean;
  loadingStep: string;
  inputMode: InputMode;
  error: string;
}

const StrategyBuilder = ({ isLoading, loadingStep, inputMode, error }: StrategyBuilderProps) => {
  if (!isLoading && !error) return null;

  return (
    <>
      {isLoading && (
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="font-display text-sm font-semibold text-foreground">{loadingStep || "Building your sourcing strategy..."}</span>
          </div>
          <div className="space-y-2">
            {(inputMode === "jd"
              ? ["Parsing job description...", "Extracting requirements & skills...", "Identifying target repositories...", "Mapping competitor landscape...", "Evaluating EEA signals..."]
              : ["Analyzing role requirements...", "Identifying target repositories...", "Mapping competitor landscape...", "Evaluating EEA signals..."]
            ).map(l => (
              <div key={l} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-display text-foreground">{l}</span>
              </div>
            ))}
          </div>
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
