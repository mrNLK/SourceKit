import { useState } from "react";
import {
  Search, GitBranch, Target, Sparkles, Shield, Briefcase,
  ExternalLink, X, Plus, Pencil, Check, ChevronDown, ChevronUp, Copy, ArrowRight
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (mirrors ResearchTab)
// ---------------------------------------------------------------------------

interface TargetRepo { repo: string; reason: string; }
interface PoachCompany { name: string; reason: string; category: "direct_competitor" | "adjacent" | "talent_hub"; }
interface EEASignal { signal: string; strength: "strong" | "moderate"; criterion: string; }

export interface SearchStrategy {
  search_query: string;
  target_repos: TargetRepo[];
  poach_companies: PoachCompany[];
  skills: { must_have: string[]; nice_to_have: string[] };
  eea_signals: EEASignal[];
  role_overview: string;
}

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  direct_competitor: { label: "Competitor", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/25" },
  adjacent: { label: "Adjacent", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/25" },
  talent_hub: { label: "Talent Hub", bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/25" },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StrategyEditorProps {
  strategy: SearchStrategy;
  jobTitle: string;
  companyName: string;
  onStrategyChange: (s: SearchStrategy) => void;
  onSearch: (shortQuery: string, expandedQuery: string, targetRepos?: string[]) => void;
  onCopy: (text: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const StrategyEditor = ({ strategy: s, jobTitle, companyName, onStrategyChange, onSearch, onCopy }: StrategyEditorProps) => {
  const [editingQuery, setEditingQuery] = useState(false);
  const [localQuery, setLocalQuery] = useState(s.search_query);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["query", "repos", "companies", "skills", "eea", "overview"]));

  const toggleSection = (id: string) => setExpandedSections(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const update = (partial: Partial<SearchStrategy>) => onStrategyChange({ ...s, ...partial });

  // Repo helpers
  const updateRepo = (idx: number, field: keyof TargetRepo, value: string) => { const updated = [...s.target_repos]; updated[idx] = { ...updated[idx], [field]: value }; update({ target_repos: updated }); };
  const removeRepo = (idx: number) => update({ target_repos: s.target_repos.filter((_, i) => i !== idx) });
  const addRepo = () => update({ target_repos: [...s.target_repos, { repo: "", reason: "New target repo" }] });

  // Company helpers
  const updateCompany = (idx: number, field: keyof PoachCompany, value: string) => { const updated = [...s.poach_companies]; updated[idx] = { ...updated[idx], [field]: value } as PoachCompany; update({ poach_companies: updated }); };
  const removeCompany = (idx: number) => update({ poach_companies: s.poach_companies.filter((_, i) => i !== idx) });
  const addCompany = () => update({ poach_companies: [...s.poach_companies, { name: "", reason: "New target company", category: "adjacent" }] });

  // Skill helpers
  const updateSkill = (type: "must_have" | "nice_to_have", idx: number, value: string) => { const updated = { ...s.skills }; updated[type] = [...updated[type]]; updated[type][idx] = value; update({ skills: updated }); };
  const removeSkill = (type: "must_have" | "nice_to_have", idx: number) => { const updated = { ...s.skills }; updated[type] = updated[type].filter((_, i) => i !== idx); update({ skills: updated }); };
  const addSkill = (type: "must_have" | "nice_to_have") => { const updated = { ...s.skills }; updated[type] = [...updated[type], ""]; update({ skills: updated }); };

  // Build final query
  const buildFinalQuery = (): string => {
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

  const handleSearch = () => {
    const shortQuery = jobTitle && companyName ? `${jobTitle} at ${companyName}` : (localQuery || s.search_query).substring(0, 80);
    // P28: Pass targetRepos directly so they route to Contributors API without re-parsing
    const targetRepos = s.target_repos.filter(r => r.repo.trim()).map(r => r.repo);
    onSearch(shortQuery, buildFinalQuery(), targetRepos.length > 0 ? targetRepos : undefined);
  };

  // Section header
  const SectionHeader = ({ id, icon: Icon, title, count }: { id: string; icon: React.ElementType; title: string; count?: number }) => (
    <button onClick={() => toggleSection(id)} className="w-full flex items-center gap-2 py-2 group">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <span className="font-display text-sm font-semibold text-foreground flex-1 text-left">{title}</span>
      {count !== undefined && <span className="text-[10px] font-display text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">{count}</span>}
      {expandedSections.has(id) ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Search Query */}
      <div className="glass rounded-xl p-5 glow-border">
        <SectionHeader id="query" icon={Search} title="Search Query" />
        {expandedSections.has("query") && (
          <div className="mt-2">
            {editingQuery ? (
              <div>
                <textarea value={localQuery} onChange={(e) => setLocalQuery(e.target.value)} rows={4} autoFocus
                  className="w-full bg-secondary rounded-lg text-sm text-foreground p-3 outline-none border border-primary/40 font-body resize-none leading-relaxed" />
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => setEditingQuery(false)} className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"><Check className="w-3 h-3" /> Done</button>
                  <button onClick={() => { setLocalQuery(s.search_query); setEditingQuery(false); }} className="text-xs font-display px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground">Reset</button>
                </div>
              </div>
            ) : (
              <div className="group relative">
                <p className="text-sm text-foreground font-body leading-relaxed bg-secondary/50 rounded-lg p-3 border border-border">{localQuery || s.search_query}</p>
                <button onClick={() => { setLocalQuery(localQuery || s.search_query); setEditingQuery(true); }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-secondary border border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3 h-3" /></button>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground font-display mt-2">This query drives the search. Edit it to refine your targeting.</p>
          </div>
        )}
      </div>

      {/* Target Repos */}
      <div className="glass rounded-xl p-5">
        <SectionHeader id="repos" icon={GitBranch} title="Target Repositories" count={s.target_repos.length} />
        {expandedSections.has("repos") && (
          <div className="mt-2 space-y-2">
            {s.target_repos.map((repo, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border group">
                <GitBranch className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <input type="text" value={repo.repo} onChange={(e) => updateRepo(idx, "repo", e.target.value)} className="w-full bg-transparent text-sm text-foreground font-display font-medium outline-none" placeholder="owner/repo" />
                  <input type="text" value={repo.reason} onChange={(e) => updateRepo(idx, "reason", e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground font-body outline-none mt-0.5" placeholder="Why this repo matters" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {repo.repo && <a href={`https://github.com/${repo.repo}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-muted-foreground hover:text-primary"><ExternalLink className="w-3 h-3" /></a>}
                  <button onClick={() => removeRepo(idx)} className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
            <button onClick={addRepo} className="w-full flex items-center justify-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"><Plus className="w-3 h-3" /> Add Repository</button>
          </div>
        )}
      </div>

      {/* Poach Companies */}
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
                      <input type="text" value={company.name} onChange={(e) => updateCompany(idx, "name", e.target.value)} className="bg-transparent text-sm text-foreground font-display font-medium outline-none flex-1" placeholder="Company name" />
                      <select value={company.category} onChange={(e) => updateCompany(idx, "category", e.target.value)}
                        className={`text-[10px] font-display font-semibold px-2 py-0.5 rounded-full border cursor-pointer outline-none ${style.bg} ${style.text} ${style.border}`}>
                        <option value="direct_competitor">Competitor</option>
                        <option value="adjacent">Adjacent</option>
                        <option value="talent_hub">Talent Hub</option>
                      </select>
                    </div>
                    <input type="text" value={company.reason} onChange={(e) => updateCompany(idx, "reason", e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground font-body outline-none mt-0.5" placeholder="Why this company" />
                  </div>
                  <button onClick={() => removeCompany(idx)} className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><X className="w-3 h-3" /></button>
                </div>
              );
            })}
            <button onClick={addCompany} className="w-full flex items-center justify-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"><Plus className="w-3 h-3" /> Add Company</button>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="glass rounded-xl p-5">
        <SectionHeader id="skills" icon={Sparkles} title="Skills" count={s.skills.must_have.length + s.skills.nice_to_have.length} />
        {expandedSections.has("skills") && (
          <div className="mt-2 space-y-4">
            <div>
              <p className="text-xs font-display font-semibold text-emerald-400 mb-2">Must Have</p>
              <div className="flex flex-wrap gap-2">
                {s.skills.must_have.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 group">
                    <input type="text" value={skill} onChange={(e) => updateSkill("must_have", idx, e.target.value)}
                      className="bg-transparent text-xs text-emerald-400 font-display outline-none w-auto min-w-[60px]" style={{ width: `${Math.max(60, skill.length * 7)}px` }} placeholder="Skill" />
                    <button onClick={() => removeSkill("must_have", idx)} className="text-emerald-400/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <button onClick={() => addSkill("must_have")} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-emerald-500/25 text-emerald-400/50 hover:text-emerald-400 hover:border-emerald-500/40 text-xs font-display transition-colors"><Plus className="w-3 h-3" /> Add</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-display font-semibold text-amber-400 mb-2">Nice to Have</p>
              <div className="flex flex-wrap gap-2">
                {s.skills.nice_to_have.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 group">
                    <input type="text" value={skill} onChange={(e) => updateSkill("nice_to_have", idx, e.target.value)}
                      className="bg-transparent text-xs text-amber-400 font-display outline-none w-auto min-w-[60px]" style={{ width: `${Math.max(60, skill.length * 7)}px` }} placeholder="Skill" />
                    <button onClick={() => removeSkill("nice_to_have", idx)} className="text-amber-400/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <button onClick={() => addSkill("nice_to_have")} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-amber-500/25 text-amber-400/50 hover:text-amber-400 hover:border-amber-500/40 text-xs font-display transition-colors"><Plus className="w-3 h-3" /> Add</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EEA Signals */}
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
                    <span className={signal.strength === 'strong' ? 'text-purple-400' : 'text-amber-400'}>{signal.strength === 'strong' ? 'Strong' : 'Moderate'}</span>
                    {' '}&middot; {signal.criterion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role Overview */}
      <div className="glass rounded-xl p-5">
        <SectionHeader id="overview" icon={Briefcase} title="Role Overview" />
        {expandedSections.has("overview") && (
          <div className="mt-2">
            <div className="text-sm text-secondary-foreground font-body leading-relaxed whitespace-pre-line">{s.role_overview}</div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="glass rounded-xl p-5 glow-border sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-sm font-semibold text-foreground">Ready to search?</p>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              {s.target_repos.length} repos &middot; {s.poach_companies.length} companies &middot; {s.skills.must_have.length + s.skills.nice_to_have.length} skills
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onCopy(buildFinalQuery())}
              className="flex items-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            <button onClick={handleSearch}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:bg-primary/90 transition-colors">
              <Search className="w-3.5 h-3.5" /> Search with this strategy <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyEditor;
