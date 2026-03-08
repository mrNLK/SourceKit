import { useState, useMemo } from "react";
import { Link2, Plus, Sparkles, TrendingUp } from "lucide-react";
import type { AiFundWorkspace, AssignmentRole } from "@/types/ai-fund";
import { scoreFit } from "@/lib/scoring";

export default function MatchingBoardTab({ workspace }: Props) {
  const { concepts, people, assignments, loading, addAssignment } = workspace;
  const [showForm, setShowForm] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedRole, setSelectedRole] = useState<AssignmentRole>("fir");
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedConcept || !selectedPerson) return;
    await addAssignment({
      conceptId: selectedConcept,
      personId: selectedPerson,
      role: selectedRole,
    });
    setSelectedConcept("");
    setSelectedPerson("");
    setShowForm(false);
  };

  // Pre-compute suggestions for each concept
  const suggestionsMap = useMemo(() => {
    const map: Record<string, ScoredCandidate[]> = {};
    for (const concept of concepts) {
      const assignedIds = new Set(
        assignments.filter((a) => a.conceptId === concept.id).map((a) => a.personId)
      );
      const candidates = people
        .filter((p) => !assignedIds.has(p.id))
        .map((p) => scoreFit(p, concept))
        .filter((s) => s.fitScore > 0)
        .sort((a, b) => b.fitScore - a.fitScore)
        .slice(0, 5);
      map[concept.id] = candidates;
    }
    return map;
  }, [concepts, people, assignments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground text-sm">Loading matching board...</div>
      </div>
    );
  }

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const personMap = new Map(people.map((p) => [p.id, p]));

  const assignmentsByConceptId = assignments.reduce(
    (acc, a) => {
      if (!acc[a.conceptId]) acc[a.conceptId] = [];
      acc[a.conceptId].push(a);
      return acc;
    },
    {} as Record<string, typeof assignments>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Matching Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign candidates to concepts as FIR or VE
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Assignment
        </button>
      </div>

      {/* Assignment form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <select
              value={selectedConcept}
              onChange={(e) => setSelectedConcept(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
            >
              <option value="">Select concept</option>
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
            >
              <option value="">Select person</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as AssignmentRole)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
            >
              <option value="fir">FIR</option>
              <option value="ve">VE</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAssign}
              disabled={!selectedConcept || !selectedPerson}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Assign
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

      {/* Matching grid */}
      {concepts.length === 0 ? (
        <div className="py-12 text-center bg-card border border-border rounded-xl">
          <p className="text-sm text-muted-foreground">
            No concepts yet. Create one in the Concept Pipeline tab first.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {concepts.map((concept) => {
            const conceptAssignments = assignmentsByConceptId[concept.id] || [];
            const suggestions = suggestionsMap[concept.id] || [];
            const isShowingSuggestions = showSuggestions === concept.id;

            return (
              <div key={concept.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{concept.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {conceptAssignments.length} assigned
                  </span>
                  {suggestions.length > 0 && (
                    <button
                      onClick={() => setShowSuggestions(isShowingSuggestions ? null : concept.id)}
                      className="ml-auto flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      {suggestions.length} suggested
                    </button>
                  )}
                </div>

                {conceptAssignments.length === 0 && !isShowingSuggestions ? (
                  <p className="text-xs text-muted-foreground py-2">No assignments yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {conceptAssignments.map((a) => {
                      const person = personMap.get(a.personId);
                      return (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 px-3 py-2 bg-background rounded-lg"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-semibold shrink-0">
                            {person?.fullName.charAt(0) || "?"}
                          </div>
                          <span className="text-sm text-foreground flex-1 truncate">
                            {person?.fullName || "Unknown"}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase">
                            {a.role}
                          </span>
                          <span className="text-xs text-muted-foreground">{a.status}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Intelligent suggestions */}
                {isShowingSuggestions && suggestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Suggested Candidates
                    </p>
                    {suggestions.map((s) => (
                      <div
                        key={s.person.id}
                        className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-semibold shrink-0">
                          {s.person.fullName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{s.person.fullName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {s.reasons.slice(0, 2).join(" · ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-400">{s.fitScore}</span>
                        </div>
                        <button
                          onClick={async () => {
                            await addAssignment({
                              conceptId: concept.id,
                              personId: s.person.id,
                              role: "fir",
                            });
                          }}
                          className="px-2 py-1 text-[10px] font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors shrink-0"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
