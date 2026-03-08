import { useState, useEffect } from "react";
import {
  FileCheck, DollarSign, CheckCircle, XCircle, Clock, AlertTriangle,
  Building2, TrendingUp, TrendingDown, Loader2,
} from "lucide-react";
import type { AiFundWorkspace, AiFundConcept, AiFundDecisionMemo, DecisionOutcome } from "@/types/ai-fund";
import { fetchDecisionMemos, createDecisionMemo } from "@/lib/ai-fund";
import { useHarmonicCompany } from "@/hooks/useHarmonicCompany";
import { companyNameToDomain } from "@/services/harmonic";

interface Props {
  workspace: AiFundWorkspace;
}

const OUTCOME_CONFIG: Record<DecisionOutcome, { label: string; icon: React.ElementType; color: string }> = {
  invest: { label: "Invest", icon: CheckCircle, color: "text-emerald-400" },
  pass: { label: "Pass", icon: XCircle, color: "text-destructive" },
  defer: { label: "Defer", icon: Clock, color: "text-yellow-400" },
  conditional: { label: "Conditional", icon: AlertTriangle, color: "text-orange-400" },
};

function extractDomainFromConcept(concept: AiFundConcept): string | null {
  const meta = concept.metadata as Record<string, unknown> | null;
  if (meta?.companyDomain) return meta.companyDomain as string;
  const atMatch = concept.name.match(/@\s*(.+)/);
  if (atMatch) return companyNameToDomain(atMatch[1].trim());
  return null;
}

function CompanyContextBadge({ domain }: { domain: string }) {
  const { company, poachability, isLoading } = useHarmonicCompany(domain);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Loading context...
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
      {company.funding_stage && (
        <span className="px-1.5 py-0.5 bg-secondary rounded">
          {company.funding_stage.replace(/_/g, " ")}
        </span>
      )}
      {company.funding_total != null && (
        <span className="flex items-center gap-0.5">
          <DollarSign className="w-2.5 h-2.5" />
          ${(company.funding_total / 1_000_000).toFixed(1)}M raised
        </span>
      )}
      {company.headcount != null && (
        <span>{company.headcount} employees</span>
      )}
      {company.headcount_growth_90d != null && (
        <span className="flex items-center gap-0.5">
          {company.headcount_growth_90d > 0 ? (
            <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5 text-red-400" />
          )}
          {company.headcount_growth_90d > 0 ? "+" : ""}
          {company.headcount_growth_90d.toFixed(0)}% 90d
        </span>
      )}
      {poachability && (
        <span
          className={`font-semibold ${
            poachability.score >= 70 ? "text-emerald-400" : poachability.score >= 40 ? "text-amber-400" : "text-red-400"
          }`}
        >
          Poach: {poachability.score}
        </span>
      )}
    </div>
  );
}

export default function InvestmentReviewTab({ workspace }: Props) {
  const { concepts, loading: workspaceLoading } = workspace;
  const [memos, setMemos] = useState<AiFundDecisionMemo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [formConcept, setFormConcept] = useState("");
  const [formOutcome, setFormOutcome] = useState<DecisionOutcome>("defer");
  const [formAmount, setFormAmount] = useState("");
  const [formValuation, setFormValuation] = useState("");
  const [formRationale, setFormRationale] = useState("");

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const all: AiFundDecisionMemo[] = [];
      for (const concept of concepts) {
        try {
          const m = await fetchDecisionMemos(concept.id);
          all.push(...m);
        } catch { /* skip */ }
      }
      all.sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime());
      setMemos(all);
      setLoading(false);
    };
    if (concepts.length > 0) loadAll();
  }, [concepts]);

  const handleCreate = async () => {
    if (!formConcept) return;
    const memo = await createDecisionMemo({
      conceptId: formConcept,
      outcome: formOutcome,
      investmentAmount: formAmount ? parseFloat(formAmount) : null,
      valuation: formValuation ? parseFloat(formValuation) : null,
      rationale: formRationale.trim() || null,
    });
    setMemos((prev) => [memo, ...prev]);
    setFormConcept("");
    setFormOutcome("defer");
    setFormAmount("");
    setFormValuation("");
    setFormRationale("");
    setShowForm(false);
  };

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  if (workspaceLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground text-sm">Loading investment reviews...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Investment Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {memos.length} decision memo{memos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <FileCheck className="w-4 h-4" />
          New Decision
        </button>
      </div>

      {/* Decision form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select
              value={formConcept}
              onChange={(e) => setFormConcept(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
            >
              <option value="">Select concept *</option>
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={formOutcome}
              onChange={(e) => setFormOutcome(e.target.value as DecisionOutcome)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
            >
              <option value="invest">Invest</option>
              <option value="pass">Pass</option>
              <option value="defer">Defer</option>
              <option value="conditional">Conditional</option>
            </select>
            <input
              type="number"
              placeholder="Investment amount ($)"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="number"
              placeholder="Valuation ($)"
              value={formValuation}
              onChange={(e) => setFormValuation(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <textarea
            placeholder="Rationale"
            value={formRationale}
            onChange={(e) => setFormRationale(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!formConcept}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Record Decision
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

      {/* Memo list */}
      {memos.length === 0 ? (
        <div className="py-12 text-center bg-card border border-border rounded-xl">
          <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memos.map((memo) => {
            const concept = conceptMap.get(memo.conceptId);
            const config = OUTCOME_CONFIG[memo.outcome];
            const OutcomeIcon = config.icon;
            const conceptDomain = concept ? extractDomainFromConcept(concept) : null;
            return (
              <div
                key={memo.id}
                className="flex items-start gap-3 px-4 py-3 bg-card border border-border rounded-lg"
              >
                <OutcomeIcon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {concept?.name || "Unknown Concept"}
                    </span>
                    <span className={`text-[10px] font-semibold ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  {(memo.investmentAmount || memo.valuation) && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {memo.investmentAmount && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${(memo.investmentAmount / 1000000).toFixed(1)}M check
                        </span>
                      )}
                      {memo.valuation && (
                        <span>@ ${(memo.valuation / 1000000).toFixed(1)}M valuation</span>
                      )}
                    </div>
                  )}
                  {memo.rationale && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{memo.rationale}</p>
                  )}
                  {conceptDomain && <CompanyContextBadge domain={conceptDomain} />}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(memo.decidedAt).toLocaleDateString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
