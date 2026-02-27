import { useState } from "react";
import {
  Loader2, Briefcase, Building2, ExternalLink, X, Plus,
  Search, GitBranch, Target, Sparkles, Shield, ArrowRight,
  Pencil, Check, ChevronDown, ChevronUp, Copy, FileText, Link
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UpgradeModal from "@/components/UpgradeModal";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TargetRepo {
  repo: string;
  reason: string;
}

interface PoachCompany {
  name: string;
  reason: string;
  category: "direct_competitor" | "adjacent" | "talent_hub";
}

interface EEASignal {
  signal: string;
  strength: "strong" | "moderate";
  criterion: string;
}

interface SearchStrategy {
  search_query: string;
  target_repos: TargetRepo[];
  poach_companies: PoachCompany[];
  skills: { must_have: string[]; nice_to_have: string[] };
  eea_signals: EEASignal[];
  role_overview: string;
}

export type InputMode = "manual" | "jd";

export interface ResearchState {
  jobTitle: string;
  companyName: string;
  research: string; // kept for backward compat
  error: string;
  strategy?: SearchStrategy;
  inputMode?: InputMode;
  jdUrl?: string;
  jdText?: string;
}

interface ResearchTabProps {
  state: ResearchState;
  onStateChange: (state: ResearchState) => void;
  onSearchWithStrategy?: (query: string, expandedQuery: string) => void;
}

// ---------------------------------------------------------------------------
// Category badge colors
// ---------------------------------------------------------------------------

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  direct_competitor: { label: "Competitor", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/25" },
  adjacent:         { label: "Adjacent",   bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/25" },
  talent_hub:       { label: "Talent Hub", bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/25" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ResearchTab = ({ state, onStateChange, onSearchWithStrategy }: ResearchTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [editingQuery, setEditingQuery] = useState(false);
  const [localQuery, setLocalQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["query", "repos", "companies", "skills", "eea", "overview"]));
  const [showUpgrade, setShowUpgrade] = useState(false);
  // B3 fix: form validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const inputMode = state.inputMode || "manual";

  const update = (partial: Partial<ResearchState>) =>
    onStateChange({ ...state, ...partial });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Fetch JD from URL (calls parse-jd edge function)
  // -------------------------------------------------------------------------

  const fetchJdFromUrl = async (url: string): Promise<string> => {
    setLoadingStep("Fetching job description...");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || SUPABASE_KEY;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-jd`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Failed to fetch JD: HTTP ${res.status}`);
    }
    return data.text;
  };

  // -------------------------------------------------------------------------
  // Research API call (handles both manual and JD modes)
  // -------------------------------------------------------------------------

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // B3 fix: validate form inputs with inline error messages
    if (inputMode === "manual") {
      const errors: Record<string, string> = {};
      if (!state.jobTitle.trim()) errors.jobTitle = "Job title is required";
      if (!state.companyName.trim()) errors.companyName = "Company name is required";
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        toast({ title: "Please fill in required fields", variant: "destructive" });
        return;
      }
    } else {
      if (!state.jdUrl?.trim() && !state.jdText?.trim()) {
        setValidationErrors({ jd: "Please provide a job description URL or paste the text" });
        toast({ title: "Please provide a job description", variant: "destructive" });
        return;
      }
    }
    setValidationErrors({});

    setIsLoading(true);
    update({ error: "", research: "", strategy: undefined });

    try {
      let jdContent = state.jdText?.trim() || "";

      // If URL is provided, fetch the JD text first
      if (inputMode === "jd" && state.jdUrl?.trim() && !jdContent) {
        jdContent = await fetchJdFromUrl(state.jdUrl.trim());
        // Save the fetched text so user can see/edit it
        update({ jdText: jdContent, error: "", research: "", strategy: undefined });
      }

      setLoadingStep("Building sourcing strategy...");

      const body: Record<string, string> = { action: "start" };

      if (inputMode === "jd" && jdContent) {
        body.job_description = jdContent;
        // Also pass title/company if user filled them in
        if (state.jobTitle.trim()) body.job_title = state.jobTitle;
        if (state.companyName.trim()) body.company_name = state.companyName;
      } else {
        body.job_title = state.jobTitle;
        body.company_name = state.companyName;
      }

      const { data: { session: authSession } } = await supabase.auth.getSession();
      const authToken = authSession?.access_token || SUPABASE_KEY;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/research-role`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402 || data.error === 'trial_limit_reached') {
          setShowUpgrade(true);
          return;
        }
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      if (data.strategy) {
        setLocalQuery(data.strategy.search_query || "");
        // If we came from JD mode, try to extract title from the role_overview
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
  // Strategy editors
  // -------------------------------------------------------------------------

  const s = state.strategy;

  const updateStrategy = (partial: Partial<SearchStrategy>) => {
    if (!s) return;
    update({ strategy: { ...s, ...partial } });
  };

  const removeRepo = (idx: number) => {
    if (!s) return;
    updateStrategy({ target_repos: s.target_repos.filter((_, i) => i !== idx) });
  };

  const addRepo = () => {
    if (!s) return;
    updateStrategy({ target_repos: [...s.target_repos, { repo: "", reason: "New target repo" }] });
  };

  const updateRepo = (idx: number, field: keyof TargetRepo, value: string) => {
    if (!s) return;
    const updated = [...s.target_repos];
    updated[idx] = { ...updated[idx], [field]: value };
    updateStrategy({ target_repos: updated });
  };

  const removeCompany = (idx: number) => {
    if (!s) return;
    updateStrategy({ poach_companies: s.poach_companies.filter((_, i) => i !== idx) });
  };

  const addCompany = () => {
    if (!s) return;
    updateStrategy({ poach_companies: [...s.poach_companies, { name: "", reason: "New target company", category: "adjacent" }] });
  };

  const updateCompany = (idx: number, field: keyof PoachCompany, value: string) => {
    if (!s) return;
    const updated = [...s.poach_companies];
    updated[idx] = { ...updated[idx], [field]: value } as PoachCompany;
    updateStrategy({ poach_companies: updated });
  };

  const removeSkill = (type: "must_have" | "nice_to_have", idx: number) => {
    if (!s) return;
    const updated = { ...s.skills };
    updated[type] = updated[type].filter((_, i) => i !== idx);
    updateStrategy({ skills: updated });
  };

  const addSkill = (type: "must_have" | "nice_to_have") => {
    if (!s) return;
    const updated = { ...s.skills };
    updated[type] = [...updated[type], ""];
    updateStrategy({ skills: updated });
  };

  const updateSkill = (type: "must_have" | "nice_to_have", idx: number, value: string) => {
    if (!s) return;
    const updated = { ...s.skills };
    updated[type] = [...updated[type]];
    updated[type][idx] = value;
    updateStrategy({ skills: updated });
  };

  // -------------------------------------------------------------------------
  // Build the final search query
  // -------------------------------------------------------------------------

  const buildFinalQuery = (): string => {
    if (!s) return "";

    const query = localQuery || s.search_query;
    const repoList = s.target_repos.filter(r => r.repo.trim()).map(r => r.repo).join(", ");
    const companyList = s.poach_companies.filter(c => c.name.trim()).map(c => c.name).join(", ");
    const mustHave = s.skills.must_have.filter(sk => sk.trim()).join(", ");
    const niceToHave = s.skills.nice_to_have.filter(sk => sk.trim()).join(", ");

    let expanded = query;
    if (repoList) expanded += `\n\nTarget GitHub repos to search for contributors: ${repoList}`;
    if (companyList) expanded += `\n\nCompanies to source from: ${companyList}`;
    if (mustHave) expanded += `\n\nMust-have skills: ${mustHave}`;
    if (niceToHave) expanded += `\n\nNice-to-have skills: ${niceToHave}`;

    return expanded;
  };

  const handleSearchWithStrategy = () => {
    if (!s || !onSearchWithStrategy) return;
    // Build a short label — use title+company if we have them, otherwise extract from the query
    const shortQuery = state.jobTitle && state.companyName
      ? `${state.jobTitle} at ${state.companyName}`
      : (localQuery || s.search_query).substring(0, 80);
    const expandedQuery = buildFinalQuery();
    onSearchWithStrategy(shortQuery, expandedQuery);
  };

  const copyStrategy = () => {
    const text = buildFinalQuery();
    navigator.clipboard.writeText(text);
    toast({ title: "Strategy copied to clipboard" });
  };

  // -------------------------------------------------------------------------
  // Section header helper
  // -------------------------------------------------------------------------

  const SectionHeader = ({ id, icon: Icon, title, count }: { id: string; icon: React.ElementType; title: string; count?: number }) => (
    <button onClick={() => toggleSection(id)} className="w-full flex items-center gap-2 py-2 group">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <span className="font-display text-sm font-semibold text-foreground flex-1 text-left">{title}</span>
      {count !== undefined && <span className="text-[10px] font-display text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">{count}</span>}
      {expandedSections.has(id) ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-foreground mb-1">Research & Strategy</h1>
        <p className="text-sm text-muted-foreground font-body">Generate a sourcing strategy from a role, or paste a job description. Edit anything, then search.</p>
      </div>

      {/* Input form */}
      <form onSubmit={handleResearch} className="glass rounded-xl p-5 mb-6">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary mb-4 w-fit">
          <button
            type="button"
            onClick={() => { update({ inputMode: "manual", strategy: undefined, research: "", error: "" }); setValidationErrors({}); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-colors ${
              inputMode === "manual"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Role + Company
          </button>
          <button
            type="button"
            onClick={() => { update({ inputMode: "jd", strategy: undefined, research: "", error: "" }); setValidationErrors({}); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-semibold transition-colors ${
              inputMode === "jd"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Job Description
          </button>
        </div>

        {/* Manual mode: job title + company */}
        {inputMode === "manual" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={state.jobTitle}
                  onChange={(e) => { update({ jobTitle: e.target.value }); if (validationErrors.jobTitle) setValidationErrors(prev => { const { jobTitle: _, ...rest } = prev; return rest; }); }}
                  placeholder="Job title (e.g. ML Engineer)"
                  className={`w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2.5 pl-10 pr-4 outline-none border transition-colors font-body ${validationErrors.jobTitle ? 'border-destructive' : 'border-border focus:border-primary/40'}`}
                />
              </div>
              {validationErrors.jobTitle && <p className="text-xs text-destructive mt-1 font-display">{validationErrors.jobTitle}</p>}
            </div>
            <div>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={state.companyName}
                  onChange={(e) => { update({ companyName: e.target.value }); if (validationErrors.companyName) setValidationErrors(prev => { const { companyName: _, ...rest } = prev; return rest; }); }}
                  placeholder="Company (e.g. Stripe)"
                  className={`w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2.5 pl-10 pr-4 outline-none border transition-colors font-body ${validationErrors.companyName ? 'border-destructive' : 'border-border focus:border-primary/40'}`}
                />
              </div>
              {validationErrors.companyName && <p className="text-xs text-destructive mt-1 font-display">{validationErrors.companyName}</p>}
            </div>
          </div>
        )}

        {/* JD mode: URL + paste */}
        {inputMode === "jd" && (
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="url"
                value={state.jdUrl || ""}
                onChange={(e) => update({ jdUrl: e.target.value })}
                placeholder="Paste job posting URL (Greenhouse, Lever, LinkedIn, etc.)"
                className="w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2.5 pl-10 pr-4 outline-none border border-border focus:border-primary/40 transition-colors font-body"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-display text-muted-foreground uppercase tracking-wider">or paste text</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <textarea
              value={state.jdText || ""}
              onChange={(e) => update({ jdText: e.target.value })}
              placeholder="Paste the full job description here..."
              rows={6}
              className="w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground p-3 outline-none border border-border focus:border-primary/40 transition-colors font-body resize-none leading-relaxed"
            />
            {state.jdText && (
              <p className="text-[10px] text-muted-foreground font-display">
                {state.jdText.length.toLocaleString()} characters
              </p>
            )}
            {validationErrors.jd && <p className="text-xs text-destructive mt-1 font-display">{validationErrors.jd}</p>}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isLoading ? 'Building strategy...' : 'Build Sourcing Strategy'}
          </button>
          {/* U8: Clear/reset button */}
          {(state.jobTitle || state.companyName || state.jdUrl || state.jdText || state.strategy) && !isLoading && (
            <button
              type="button"
              onClick={() => {
                onStateChange({
                  jobTitle: "",
                  companyName: "",
                  research: "",
                  error: "",
                  strategy: undefined,
                  inputMode: state.inputMode,
                  jdUrl: "",
                  jdText: "",
                });
                setValidationErrors({});
                setLocalQuery("");
                setEditingQuery(false);
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground font-display text-xs transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </form>

      {/* Loading state */}
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

      {/* Error */}
      {state.error && (
        <div className="glass rounded-xl p-4 mb-6">
          <p className="text-sm text-destructive font-display">{state.error}</p>
        </div>
      )}

      {/* Strategy output */}
      {s && !isLoading && (
        <div className="space-y-4">
          {/* ===== SEARCH QUERY (most important) ===== */}
          <div className="glass rounded-xl p-5 glow-border">
            <SectionHeader id="query" icon={Search} title="Search Query" />
            {expandedSections.has("query") && (
              <div className="mt-2">
                {editingQuery ? (
                  <div>
                    <textarea
                      value={localQuery}
                      onChange={(e) => setLocalQuery(e.target.value)}
                      rows={4}
                      className="w-full bg-secondary rounded-lg text-sm text-foreground p-3 outline-none border border-primary/40 font-body resize-none leading-relaxed"
                      autoFocus
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => setEditingQuery(false)}
                        className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                        <Check className="w-3 h-3" /> Done
                      </button>
                      <button onClick={() => { setLocalQuery(s.search_query); setEditingQuery(false); }}
                        className="text-xs font-display px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground">
                        Reset
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <p className="text-sm text-foreground font-body leading-relaxed bg-secondary/50 rounded-lg p-3 border border-border">
                      {localQuery || s.search_query}
                    </p>
                    <button onClick={() => { setLocalQuery(localQuery || s.search_query); setEditingQuery(true); }}
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-secondary border border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground font-display mt-2">This query drives the search. Edit it to refine your targeting.</p>
              </div>
            )}
          </div>

          {/* ===== TARGET REPOS ===== */}
          <div className="glass rounded-xl p-5">
            <SectionHeader id="repos" icon={GitBranch} title="Target Repositories" count={s.target_repos.length} />
            {expandedSections.has("repos") && (
              <div className="mt-2 space-y-2">
                {s.target_repos.map((repo, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border group">
                    <GitBranch className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={repo.repo}
                        onChange={(e) => updateRepo(idx, "repo", e.target.value)}
                        className="w-full bg-transparent text-sm text-foreground font-display font-medium outline-none"
                        placeholder="owner/repo"
                      />
                      <input
                        type="text"
                        value={repo.reason}
                        onChange={(e) => updateRepo(idx, "reason", e.target.value)}
                        className="w-full bg-transparent text-xs text-muted-foreground font-body outline-none mt-0.5"
                        placeholder="Why this repo matters"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {repo.repo && (
                        <a href={`https://github.com/${repo.repo}`} target="_blank" rel="noopener noreferrer"
                          className="p-1 rounded text-muted-foreground hover:text-primary">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button onClick={() => removeRepo(idx)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={addRepo}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                  <Plus className="w-3 h-3" /> Add Repository
                </button>
              </div>
            )}
          </div>

          {/* ===== POACH COMPANIES ===== */}
          <div className="glass rounded-xl p-5">
            <SectionHeader id="companies" icon={Target} title="Companies to Source From" count={s.poach_companies.length} />
            {expandedSections.has("companies") && (
              <div className="mt-2 space-y-2">
                {s.poach_companies.map((company, idx) => {
                  const style = CATEGORY_STYLES[company.category] || CATEGORY_STYLES.adjacent;
                  return (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={company.name}
                            onChange={(e) => updateCompany(idx, "name", e.target.value)}
                            className="bg-transparent text-sm text-foreground font-display font-medium outline-none flex-1"
                            placeholder="Company name"
                          />
                          <select
                            value={company.category}
                            onChange={(e) => updateCompany(idx, "category", e.target.value)}
                            className={`text-[10px] font-display font-semibold px-2 py-0.5 rounded-full border cursor-pointer outline-none ${style.bg} ${style.text} ${style.border}`}
                          >
                            <option value="direct_competitor">Competitor</option>
                            <option value="adjacent">Adjacent</option>
                            <option value="talent_hub">Talent Hub</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={company.reason}
                          onChange={(e) => updateCompany(idx, "reason", e.target.value)}
                          className="w-full bg-transparent text-xs text-muted-foreground font-body outline-none mt-0.5"
                          placeholder="Why this company"
                        />
                      </div>
                      <button onClick={() => removeCompany(idx)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                <button onClick={addCompany}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                  <Plus className="w-3 h-3" /> Add Company
                </button>
              </div>
            )}
          </div>

          {/* ===== SKILLS ===== */}
          <div className="glass rounded-xl p-5">
            <SectionHeader id="skills" icon={Sparkles} title="Skills" count={s.skills.must_have.length + s.skills.nice_to_have.length} />
            {expandedSections.has("skills") && (
              <div className="mt-2 space-y-4">
                {/* Must have */}
                <div>
                  <p className="text-xs font-display font-semibold text-emerald-400 mb-2">Must Have</p>
                  <div className="flex flex-wrap gap-2">
                    {s.skills.must_have.map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 group">
                        <input
                          type="text"
                          value={skill}
                          onChange={(e) => updateSkill("must_have", idx, e.target.value)}
                          className="bg-transparent text-xs text-emerald-400 font-display outline-none w-auto min-w-[60px]"
                          style={{ width: `${Math.max(60, skill.length * 7)}px` }}
                          placeholder="Skill"
                        />
                        <button onClick={() => removeSkill("must_have", idx)}
                          className="text-emerald-400/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addSkill("must_have")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-emerald-500/25 text-emerald-400/50 hover:text-emerald-400 hover:border-emerald-500/40 text-xs font-display transition-colors">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>

                {/* Nice to have */}
                <div>
                  <p className="text-xs font-display font-semibold text-amber-400 mb-2">Nice to Have</p>
                  <div className="flex flex-wrap gap-2">
                    {s.skills.nice_to_have.map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 group">
                        <input
                          type="text"
                          value={skill}
                          onChange={(e) => updateSkill("nice_to_have", idx, e.target.value)}
                          className="bg-transparent text-xs text-amber-400 font-display outline-none w-auto min-w-[60px]"
                          style={{ width: `${Math.max(60, skill.length * 7)}px` }}
                          placeholder="Skill"
                        />
                        <button onClick={() => removeSkill("nice_to_have", idx)}
                          className="text-amber-400/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addSkill("nice_to_have")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-amber-500/25 text-amber-400/50 hover:text-amber-400 hover:border-amber-500/40 text-xs font-display transition-colors">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== EEA SIGNALS ===== */}
          <div className="glass rounded-xl p-5">
            <SectionHeader id="eea" icon={Shield} title="EEA Signals to Look For" count={s.eea_signals.length} />
            {expandedSections.has("eea") && (
              <div className="mt-2 space-y-2">
                {s.eea_signals.map((signal, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${signal.strength === 'strong' ? 'bg-purple-400' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-body">{signal.signal}</p>
                      <p className="text-[10px] text-muted-foreground font-display mt-0.5">
                        <span className={signal.strength === 'strong' ? 'text-purple-400' : 'text-amber-400'}>
                          {signal.strength === 'strong' ? 'Strong' : 'Moderate'}
                        </span>
                        {' '}&middot; {signal.criterion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===== ROLE OVERVIEW ===== */}
          <div className="glass rounded-xl p-5">
            <SectionHeader id="overview" icon={Briefcase} title="Role Overview" />
            {expandedSections.has("overview") && (
              <div className="mt-2">
                <div className="text-sm text-secondary-foreground font-body leading-relaxed whitespace-pre-line">
                  {s.role_overview}
                </div>
              </div>
            )}
          </div>

          {/* ===== ACTION BAR ===== */}
          <div className="glass rounded-xl p-5 glow-border sticky bottom-6 z-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-sm font-semibold text-foreground">Ready to search?</p>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  {s.target_repos.length} repos &middot; {s.poach_companies.length} companies &middot; {s.skills.must_have.length + s.skills.nice_to_have.length} skills
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyStrategy}
                  className="flex items-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                {onSearchWithStrategy && (
                  <button onClick={handleSearchWithStrategy}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:bg-primary/90 transition-colors">
                    <Search className="w-3.5 h-3.5" />
                    Search with this strategy
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state with examples */}
      {!s && !isLoading && !state.error && !state.research && (
        <div className="glass rounded-xl p-8 text-center border border-dashed border-border">
          <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-display text-sm text-muted-foreground mb-1">
            {inputMode === "jd" ? "Paste a job description URL or text above" : "Enter a role and company above"}
          </p>
          <p className="text-xs text-muted-foreground/60 font-body mb-4">AI will build a complete sourcing strategy with target repos, companies to poach from, skills, and EEA signals</p>
          {inputMode === "manual" && (
            <div className="space-y-2">
              <p className="text-[10px] font-display text-muted-foreground/60 uppercase tracking-wider">Try an example</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { title: "Staff ML Engineer", company: "Anthropic" },
                  { title: "Founding Engineer", company: "Series A AI startup" },
                  { title: "Staff Backend Engineer", company: "Stripe" },
                ].map((ex) => (
                  <button
                    key={ex.title + ex.company}
                    onClick={() => {
                      update({ jobTitle: ex.title, companyName: ex.company });
                    }}
                    className="text-xs font-display px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    {ex.title} @ {ex.company}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
};

export default ResearchTab;
