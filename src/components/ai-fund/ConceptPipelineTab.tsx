import { useState } from "react";
import { Plus, ChevronRight, Briefcase, Building2 } from "lucide-react";
import type { AiFundWorkspace, AiFundConcept, ConceptStage } from "@/types/ai-fund";
import { companyNameToDomain } from "@/services/harmonic";
import CompanyDetailPanel from "./CompanyDetailPanel";

interface Props {
  workspace: AiFundWorkspace;
}

const STAGE_ORDER: ConceptStage[] = [
  "ideation",
  "validation",
  "prototyping",
  "recruiting",
  "residency",
  "investment_review",
  "funded",
  "archived",
];

const STAGE_LABELS: Record<ConceptStage, string> = {
  ideation: "Ideation",
  validation: "Validation",
  prototyping: "Prototyping",
  recruiting: "Recruiting",
  residency: "Residency",
  investment_review: "Investment Review",
  funded: "Funded",
  archived: "Archived",
};

const STAGE_COLORS: Record<ConceptStage, string> = {
  ideation: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  validation: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  prototyping: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  recruiting: "bg-primary/15 text-primary border-primary/20",
  residency: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  investment_review: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  funded: "bg-green-500/15 text-green-400 border-green-500/20",
  archived: "bg-secondary text-muted-foreground border-border",
};

function extractCompanyFromConcept(concept: AiFundConcept): { name: string; domain: string } | null {
  const meta = concept.metadata as Record<string, unknown> | null;
  if (meta?.companyName && meta?.companyDomain) {
    return { name: meta.companyName as string, domain: meta.companyDomain as string };
  }
  // Try concept name pattern: "AI Diagnostics @ Acme Health"
  const atMatch = concept.name.match(/@\s*(.+)/);
  if (atMatch) {
    const companyName = atMatch[1].trim();
    return { name: companyName, domain: companyNameToDomain(companyName) };
  }
  return null;
}

export default function ConceptPipelineTab({ workspace }: Props) {
  const { concepts, loading, addConcept, updateConcept } = workspace;
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newThesis, setNewThesis] = useState("");
  const [newSector, setNewSector] = useState("");
  const [companyLookup, setCompanyLookup] = useState<{ name: string; domain: string } | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await addConcept({
      name: newName.trim(),
      thesis: newThesis.trim() || null,
      sector: newSector.trim() || null,
    });
    setNewName("");
    setNewThesis("");
    setNewSector("");
    setShowForm(false);
  };

  const handleAdvanceStage = async (concept: AiFundConcept) => {
    const idx = STAGE_ORDER.indexOf(concept.stage);
    if (idx < STAGE_ORDER.length - 2) {
      await updateConcept(concept.id, { stage: STAGE_ORDER[idx + 1] });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground text-sm">Loading concepts...</div>
      </div>
    );
  }

  const grouped = STAGE_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = concepts.filter((c) => c.stage === stage);
      return acc;
    },
    {} as Record<ConceptStage, AiFundConcept[]>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Concept Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {concepts.length} concept{concepts.length !== 1 ? "s" : ""} across {STAGE_ORDER.length} stages
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Concept
        </button>
      </div>

      {/* Add concept form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <input
            type="text"
            placeholder="Concept name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            placeholder="Thesis (optional)"
            value={newThesis}
            onChange={(e) => setNewThesis(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            placeholder="Sector (optional)"
            value={newSector}
            onChange={(e) => setNewSector(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Create
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

      {/* Pipeline stages */}
      <div className="space-y-4">
        {STAGE_ORDER.filter((s) => s !== "archived" || grouped[s].length > 0).map((stage) => (
          <div key={stage}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STAGE_COLORS[stage]}`}>
                {STAGE_LABELS[stage]}
              </span>
              <span className="text-xs text-muted-foreground">{grouped[stage].length}</span>
            </div>

            {grouped[stage].length === 0 ? (
              <div className="py-3 px-4 bg-card/50 border border-border/50 rounded-lg">
                <p className="text-xs text-muted-foreground">No concepts in this stage</p>
              </div>
            ) : (
              <div className="space-y-2">
                {grouped[stage].map((concept) => {
                  const companyInfo = extractCompanyFromConcept(concept);
                  return (
                    <div
                      key={concept.id}
                      className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                    >
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{concept.name}</p>
                        {concept.thesis && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{concept.thesis}</p>
                        )}
                      </div>
                      {concept.sector && (
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded shrink-0">
                          {concept.sector}
                        </span>
                      )}
                      {companyInfo && (
                        <button
                          onClick={() => setCompanyLookup(companyInfo)}
                          title={`View ${companyInfo.name} intelligence`}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                        >
                          <Building2 className="w-4 h-4" />
                        </button>
                      )}
                      {stage !== "funded" && stage !== "archived" && (
                        <button
                          onClick={() => handleAdvanceStage(concept)}
                          title="Advance to next stage"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Company detail panel */}
      {companyLookup && (
        <CompanyDetailPanel
          companyName={companyLookup.name}
          domain={companyLookup.domain}
          onClose={() => setCompanyLookup(null)}
        />
      )}
    </div>
  );
}
