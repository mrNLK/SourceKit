import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, ExternalLink, Filter, Sparkles, Users, Loader2, Zap } from "lucide-react";
import type { AiFundWorkspace, AiFundPerson, ProcessStage, PersonType, HarmonicPersonMetadata } from "@/types/ai-fund";
import { scoreColor, scoreLabel } from "@/lib/aifund-scoring";
import { fetchScoresForPerson, updatePerson as updatePersonDb, createEvidence } from "@/lib/ai-fund";
import { enrichPersonByLinkedIn } from "@/services/harmonic";
import { toast } from "@/hooks/use-toast";
import PersonDetailPanel from "./PersonDetailPanel";

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
  const [selectedPerson, setSelectedPerson] = useState<AiFundPerson | null>(null);
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  // People eligible for bulk enrichment: have LinkedIn URL but no Harmonic metadata
  const enrichable = useMemo(
    () =>
      people.filter(
        (p) =>
          p.linkedinUrl &&
          !(p.metadata as Record<string, unknown> | null)?.harmonic
      ),
    [people]
  );

  const handleBulkEnrich = useCallback(async () => {
    if (enrichable.length === 0) return;
    setBulkEnriching(true);
    setBulkProgress({ done: 0, total: enrichable.length });
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < enrichable.length; i++) {
      const person = enrichable[i];
      // Throttle: 1 second between API calls to avoid rate limits
      if (i > 0) await new Promise((r) => setTimeout(r, 1000));
      try {
        const hp = await enrichPersonByLinkedIn(person.linkedinUrl!);
        const harmonicMeta: HarmonicPersonMetadata = {
          entityUrn: hp.entity_urn,
          profilePictureUrl: hp.profile_picture_url,
          headline: hp.linkedin_headline,
          education: (hp.education || []).map((e) => ({
            school: e.school || "Unknown",
            degree: e.degree,
            field: e.field_of_study,
          })),
          experience: (hp.experience || []).map((e) => ({
            title: e.title || "Unknown",
            company: e.company_name || "Unknown",
            companyUrn: e.company,
            startDate: e.start_date,
            endDate: e.end_date,
            isCurrent: e.is_current_position,
          })),
          highlights: (hp.highlights || []).map((h) => h.text),
          awards: (hp.awards__beta || []).map((a) => ({
            title: a.title,
            description: a.description,
          })),
          languages: hp.languages,
          enrichedAt: new Date().toISOString(),
        };
        const updatedMeta = { ...(person.metadata || {}), harmonic: harmonicMeta };
        await updatePersonDb(person.id, { metadata: updatedMeta });

        // Auto-create evidence from highlights and awards
        const evidencePromises = [];
        for (const highlight of harmonicMeta.highlights.slice(0, 5)) {
          evidencePromises.push(
            createEvidence({
              personId: person.id,
              evidenceType: "media_mention",
              title: highlight.length > 120 ? highlight.slice(0, 117) + "..." : highlight,
              description: highlight,
              signalStrength: 60,
              metadata: { source: "harmonic", type: "highlight" },
            })
          );
        }
        for (const award of harmonicMeta.awards.slice(0, 5)) {
          evidencePromises.push(
            createEvidence({
              personId: person.id,
              evidenceType: "award",
              title: award.title,
              description: award.description || null,
              signalStrength: 80,
              metadata: { source: "harmonic", type: "award" },
            })
          );
        }
        await Promise.allSettled(evidencePromises);
        succeeded++;
      } catch {
        failed++;
      }
      setBulkProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    setBulkEnriching(false);
    toast({
      title: "Bulk enrichment complete",
      description: `${succeeded} enriched, ${failed} failed out of ${enrichable.length} candidates`,
    });
    // Refresh workspace to show new metadata
    workspace.refresh();
  }, [enrichable, workspace]);

  // Compute same-company network counts
  const companyPeers = useMemo(() => {
    const companyCounts: Record<string, number> = {};
    for (const p of people) {
      if (p.currentCompany) {
        const key = p.currentCompany.toLowerCase().trim();
        companyCounts[key] = (companyCounts[key] || 0) + 1;
      }
    }
    // Only return counts where there are 2+ people from same company
    const result: Record<string, number> = {};
    for (const p of people) {
      if (p.currentCompany) {
        const key = p.currentCompany.toLowerCase().trim();
        if (companyCounts[key] > 1) {
          result[p.id] = companyCounts[key] - 1; // "N others"
        }
      }
    }
    return result;
  }, [people]);

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
        <div className="flex items-center gap-2">
          {enrichable.length > 0 && (
            <button
              onClick={handleBulkEnrich}
              disabled={bulkEnriching}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors"
              title={`Enrich ${enrichable.length} people with LinkedIn URLs via Harmonic`}
            >
              {bulkEnriching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {bulkProgress.done}/{bulkProgress.total}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Enrich {enrichable.length}
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Person
          </button>
        </div>
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
          {filtered.map((person) => {
            const harmonicMeta = (person.metadata as Record<string, unknown> | null)?.harmonic as
              | HarmonicPersonMetadata
              | undefined;
            return (
              <button
                key={person.id}
                onClick={() => setSelectedPerson(person)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                  {person.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{person.fullName}</p>
                    {harmonicMeta && (
                      <Sparkles className="w-3 h-3 text-primary shrink-0" title="Harmonic enriched" />
                    )}
                    {companyPeers[person.id] != null && (
                      <span
                        className="flex items-center gap-0.5 text-[10px] text-muted-foreground"
                        title={`${companyPeers[person.id]} other${companyPeers[person.id] > 1 ? "s" : ""} from ${person.currentCompany}`}
                      >
                        <Users className="w-3 h-3" />
                        +{companyPeers[person.id]}
                      </span>
                    )}
                    {person.linkedinUrl && (
                      <a
                        href={person.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
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
            );
          })}
        </div>
      )}

      {/* Person detail panel */}
      {selectedPerson && (
        <PersonDetailPanel
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
}
