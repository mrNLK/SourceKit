import { Briefcase, Building2, FileText, Link, X, Sparkles, Loader2 } from "lucide-react";
import type { InputMode, ResearchState } from "@/components/ResearchTab";

interface JDInputProps {
  state: ResearchState;
  inputMode: InputMode;
  isLoading: boolean;
  validationErrors: Record<string, string>;
  onUpdate: (partial: Partial<ResearchState>) => void;
  onClearValidation: (key: string) => void;
  onModeChange: (mode: InputMode) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
}

const JDInput = ({ state, inputMode, isLoading, validationErrors, onUpdate, onClearValidation, onModeChange, onSubmit, onClear }: JDInputProps) => {
  const hasContent = !!(state.jobTitle || state.companyName || state.jdUrl || state.jdText || state.strategy);

  return (
    <form onSubmit={onSubmit} className="glass rounded-xl p-5 mb-6">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary mb-4 w-fit">
        <button type="button" onClick={() => onModeChange("manual")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-colors ${inputMode === "manual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <Briefcase className="w-3.5 h-3.5" /> Role + Company
        </button>
        <button type="button" onClick={() => onModeChange("jd")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-colors ${inputMode === "jd" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <FileText className="w-3.5 h-3.5" /> Job Description
        </button>
      </div>

      {inputMode === "manual" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input id="job-title" name="jobTitle" type="text" value={state.jobTitle}
                onChange={(e) => { onUpdate({ jobTitle: e.target.value }); if (validationErrors.jobTitle) onClearValidation("jobTitle"); }}
                placeholder="Job title (e.g. ML Engineer)"
                className={`w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2.5 pl-10 pr-4 outline-none border transition-colors font-body ${validationErrors.jobTitle ? 'border-destructive' : 'border-border focus:border-primary/40'}`} />
            </div>
            {validationErrors.jobTitle && <p className="text-xs text-destructive mt-1 font-display">{validationErrors.jobTitle}</p>}
          </div>
          <div>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input id="company-name" name="companyName" type="text" value={state.companyName}
                onChange={(e) => { onUpdate({ companyName: e.target.value }); if (validationErrors.companyName) onClearValidation("companyName"); }}
                placeholder="Company (e.g. Stripe)"
                className={`w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2.5 pl-10 pr-4 outline-none border transition-colors font-body ${validationErrors.companyName ? 'border-destructive' : 'border-border focus:border-primary/40'}`} />
            </div>
            {validationErrors.companyName && <p className="text-xs text-destructive mt-1 font-display">{validationErrors.companyName}</p>}
          </div>
        </div>
      )}

      {inputMode === "jd" && (
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input id="job-description-url" name="jobDescriptionUrl" type="url" value={state.jdUrl || ""}
              onChange={(e) => onUpdate({ jdUrl: e.target.value })}
              placeholder="Paste job posting URL (Greenhouse, Lever, LinkedIn, etc.)"
              className="w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2.5 pl-10 pr-4 outline-none border border-border focus:border-primary/40 transition-colors font-body" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-display text-muted-foreground uppercase tracking-wider">or paste text</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <textarea id="job-description-text" name="jobDescriptionText" value={state.jdText || ""} onChange={(e) => onUpdate({ jdText: e.target.value })}
            placeholder="Paste the full job description here..." rows={6}
            className="w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground p-3 outline-none border border-border focus:border-primary/40 transition-colors font-body resize-none leading-relaxed" />
          {state.jdText && <p className="text-[10px] text-muted-foreground font-display">{state.jdText.length.toLocaleString()} characters</p>}
          {validationErrors.jd && <p className="text-xs text-destructive mt-1 font-display">{validationErrors.jd}</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isLoading ? 'Building strategy...' : 'Build Sourcing Strategy'}
        </button>
        {hasContent && !isLoading && (
          <button type="button" onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground font-display text-xs transition-colors">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>
    </form>
  );
};

export default JDInput;
