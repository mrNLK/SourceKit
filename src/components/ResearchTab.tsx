import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UpgradeModal from "@/components/UpgradeModal";
import JDInput from "@/components/research/JDInput";
import StrategyBuilder from "@/components/research/StrategyBuilder";
import StrategyEditor from "@/components/research/StrategyEditor";
import ExampleRoles from "@/components/research/ExampleRoles";
import type { SearchStrategy } from "@/components/research/StrategyEditor";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ---------------------------------------------------------------------------
// Types (exported for child components)
// ---------------------------------------------------------------------------

export type InputMode = "manual" | "jd";

export interface ResearchState {
  jobTitle: string;
  companyName: string;
  research: string;
  error: string;
  strategy?: SearchStrategy;
  inputMode?: InputMode;
  jdUrl?: string;
  jdText?: string;
}

// P28: Structured strategy handoff
interface StrategyHandoff {
  targetRepos?: string[];
  skills?: string[];
}

interface ResearchTabProps {
  state: ResearchState;
  onStateChange: (state: ResearchState) => void;
  onSearchWithStrategy?: (query: string, expandedQuery: string, strategy?: StrategyHandoff) => void;
  onNavigateToWebsets?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ResearchTab = ({ state, onStateChange, onSearchWithStrategy, onNavigateToWebsets }: ResearchTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const inputMode = state.inputMode || "manual";

  const update = (partial: Partial<ResearchState>) => onStateChange({ ...state, ...partial });

  // -------------------------------------------------------------------------
  // Fetch JD from URL
  // -------------------------------------------------------------------------

  const fetchJdFromUrl = async (url: string): Promise<string> => {
    setLoadingStep("Fetching job description...");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || SUPABASE_KEY;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-jd`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed to fetch JD: HTTP ${res.status}`);
    return data.text;
  };

  // -------------------------------------------------------------------------
  // Research API call
  // -------------------------------------------------------------------------

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputMode === "manual") {
      const errors: Record<string, string> = {};
      if (!state.jobTitle.trim()) errors.jobTitle = "Job title is required";
      if (!state.companyName.trim()) errors.companyName = "Company name is required";
      if (Object.keys(errors).length > 0) { setValidationErrors(errors); toast({ title: "Please fill in required fields", variant: "destructive" }); return; }
    } else {
      if (!state.jdUrl?.trim() && !state.jdText?.trim()) { setValidationErrors({ jd: "Please provide a job description URL or paste the text" }); toast({ title: "Please provide a job description", variant: "destructive" }); return; }
    }
    setValidationErrors({});
    setIsLoading(true);
    update({ error: "", research: "", strategy: undefined });

    try {
      let jdContent = state.jdText?.trim() || "";
      if (inputMode === "jd" && state.jdUrl?.trim() && !jdContent) {
        jdContent = await fetchJdFromUrl(state.jdUrl.trim());
        update({ jdText: jdContent, error: "", research: "", strategy: undefined });
      }

      setLoadingStep("Building sourcing strategy...");
      const body: Record<string, string> = { action: "start" };
      if (inputMode === "jd" && jdContent) {
        body.job_description = jdContent;
        if (state.jobTitle.trim()) body.job_title = state.jobTitle;
        if (state.companyName.trim()) body.company_name = state.companyName;
      } else {
        body.job_title = state.jobTitle;
        body.company_name = state.companyName;
      }

      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/research-role`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authSession?.access_token || SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 || data.error === 'trial_limit_reached') { setShowUpgrade(true); return; }
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      if (data.strategy) {
        const updatedState: Partial<ResearchState> = { strategy: data.strategy, research: "" };
        if (data.job_title && !state.jobTitle) updatedState.jobTitle = data.job_title;
        if (data.company_name && !state.companyName) updatedState.companyName = data.company_name;
        update(updatedState);
      } else if (data.research) {
        update({ research: data.research });
      }
    } catch (err) {
      update({ error: err instanceof Error ? err.message : 'Research failed' });
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const s = state.strategy;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-foreground mb-1">Research & Strategy</h1>
        <p className="text-sm text-muted-foreground font-body">Generate a sourcing strategy from a role, or paste a job description. Edit anything, then search.</p>
      </div>

      <JDInput
        state={state}
        inputMode={inputMode}
        isLoading={isLoading}
        validationErrors={validationErrors}
        onUpdate={update}
        onClearValidation={(key) => setValidationErrors(prev => { const { [key]: _, ...rest } = prev; return rest; })}
        onModeChange={(mode) => { update({ inputMode: mode, strategy: undefined, research: "", error: "" }); setValidationErrors({}); }}
        onSubmit={handleResearch}
        onClear={() => {
          onStateChange({ jobTitle: "", companyName: "", research: "", error: "", strategy: undefined, inputMode: state.inputMode, jdUrl: "", jdText: "" });
          setValidationErrors({});
        }}
      />

      <StrategyBuilder isLoading={isLoading} loadingStep={loadingStep} inputMode={inputMode} error={state.error} />

      {s && !isLoading && (
        <StrategyEditor
          strategy={s}
          jobTitle={state.jobTitle}
          companyName={state.companyName}
          onStrategyChange={(strategy) => update({ strategy })}
          onSearch={(short, expanded, strategyData) => onSearchWithStrategy?.(short, expanded, strategyData)}
          onCopy={(text) => { navigator.clipboard.writeText(text); toast({ title: "Strategy copied to clipboard" }); }}
          onNavigateToWebsets={onNavigateToWebsets}
        />
      )}

      {!s && !isLoading && !state.error && !state.research && (
        <ExampleRoles inputMode={inputMode} onSelect={(title, company) => update({ jobTitle: title, companyName: company })} />
      )}

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
};

export default ResearchTab;
