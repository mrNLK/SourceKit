import { useState, useEffect } from "react";
import { Plus, ExternalLink, Filter } from "lucide-react";
import type { AiFundWorkspace, AiFundPerson, ProcessStage, PersonType } from "@/types/ai-fund";
import { scoreColor, scoreLabel } from "@/lib/aifund-scoring";
import { fetchScoresForPerson } from "@/lib/ai-fund";
import PersonDetail from "./PersonDetail";

interface Props {
  workspace: AiFundWorkspace;
}

const PROCESS_STAGE_LABELS: Record<ProcessStage, string> = {
  identified: "Identified",
  researched: "Researched",
  contacted: "Contacted",
  engaged: "Engaged",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  accepted: "Accepted",
  declined: "Declined",
  residency: "Residency",
  graduated: "Graduated",
  archived: "Archived",
};

export default function TalentPoolTab({ workspace }: Props) {
  const { people, loading, addPerson, updatePerson } = workspace;
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<PersonType | "all">("all");
  const [filterStage, setFilterStage] = useState<ProcessStage | "all">("all");
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formLinkedin, setFormLinkedin] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formType, setFormType] = useState<PersonType>("fir");

  // Load latest composite scores
  useEffect(() => {
    const loadScores = async () => {
      const scoreMap: Record<string, number | null> = {};
      for (const person of people) {
        try {
          const personScores = await fetchScoresForPerson(person.id);
          scoreMap[person.id] = personScores.length > 0 ? personScores[0].compositeScore : null;
        } catch {
          scoreMap[person.id] = null;
        }
      }
      setScores(scoreMap);
    };
    if (people.length > 0) loadScores();
  }, [people]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    await addPerson({
      fullName: formName.trim(),
      email: formEmail.trim() || null,
      linkedinUrl: formLinkedin.trim() || null,
      currentRole: formRole.trim() || null,
      currentCompany: formCompany.trim() || null,
      personType: formType,
    });
    setFormName("");
    setFormEmail("");
    setFormLinkedin("");
    setFormRole("");
    setFormCompany("");
    setFormType("fir");
    setShowForm(false);
  };

  const filtered = people.filter((p) => {
    if (filterType !== "all" && p.personType !== filterType) return false;
    if (filterStage !== "all" && p.processStage !== filterStage) return false;
    return true;
  });

  // Detail view
  const selectedPerson = selectedPersonId ? people.find((p) => p.id === selectedPersonId) : null;
  if (selectedPerson) {
    return (
      <PersonDetail
        person={selectedPerson}
        onBack={() => setSelectedPersonId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground text-sm">Loading talent pool...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Talent Pool</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {people.length} candidate{people.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Person
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as PersonType | "all")}
          className="px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground"
        >
          <option value="all">All Types</option>
          <option value="fir">FIR</option>
          <option value="ve">VE</option>
          <option value="both">Both</option>
        </select>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value as ProcessStage | "all")}
          className="px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground"
        >
          <option value="all">All Stages</option>
          {Object.entries(PROCESS_STAGE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Add person form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Full name *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="email"
              placeholder="Email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="url"
              placeholder="LinkedIn URL"
              value={formLinkedin}
              onChange={(e) => setFormLinkedin(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Current role"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Current company"
              value={formCompany}
              onChange={(e) => setFormCompany(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as PersonType)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
            >
              <option value="fir">FIR</option>
              <option value="ve">VE</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!formName.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Add
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

      {/* People list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center bg-card border border-border rounded-xl">
          <p className="text-sm text-muted-foreground">
            {people.length === 0 ? "No candidates yet. Add your first person above." : "No matches for current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((person) => (
            <button
              key={person.id}
              onClick={() => setSelectedPersonId(person.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/30 cursor-pointer transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                {person.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{person.fullName}</p>
                  {person.linkedinUrl && (
                    <a
                      href={person.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[person.currentRole, person.currentCompany].filter(Boolean).join(" @ ") || "No role info"}
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase shrink-0">
                {person.personType}
              </span>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded shrink-0">
                {PROCESS_STAGE_LABELS[person.processStage]}
              </span>
              {scores[person.id] !== undefined && (
                <span className={`text-xs font-semibold shrink-0 ${scoreColor(scores[person.id])}`}>
                  {scores[person.id] !== null ? `${scores[person.id]?.toFixed(1)} - ${scoreLabel(scores[person.id])}` : "Unscored"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
