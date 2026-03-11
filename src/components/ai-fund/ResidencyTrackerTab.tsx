import { useState, useEffect } from "react";
import { Home, Calendar, DollarSign, Briefcase, Sparkles } from "lucide-react";
import type { AiFundWorkspace, AiFundResidency, AiFundPerson, ResidencyStatus, HarmonicPersonMetadata } from "@/types/ai-fund";
import { fetchResidencies } from "@/lib/ai-fund";

interface Props {
  workspace: AiFundWorkspace;
}

const STATUS_COLORS: Record<ResidencyStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  extended: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  terminated: "bg-destructive/15 text-destructive border-destructive/20",
  paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
};

export default function ResidencyTrackerTab({ workspace }: Props) {
  const { assignments, people, loading: workspaceLoading } = workspace;
  const [residencies, setResidencies] = useState<AiFundResidency[]>([]);
  const [loading, setLoading] = useState(false);

  // Build lookup: assignmentId → person
  const personByAssignment = new Map<string, AiFundPerson>();
  const personMap = new Map(people.map((p) => [p.id, p]));
  for (const a of assignments) {
    const person = personMap.get(a.personId);
    if (person) personByAssignment.set(a.id, person);
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetchResidencies();
        setResidencies(r);
      } catch (err) {
        console.error("Failed to load residencies:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (workspaceLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground text-sm">Loading residencies...</div>
      </div>
    );
  }

  const active = residencies.filter((r) => r.status === "active");
  const completed = residencies.filter((r) => r.status !== "active");

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Residency Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {active.length} active, {completed.length} completed/other
        </p>
      </div>

      {residencies.length === 0 ? (
        <div className="py-12 text-center bg-card border border-border rounded-xl">
          <p className="text-sm text-muted-foreground">
            No residencies yet. Create them via the Matching Board after assigning a candidate.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Active</h2>
              <div className="space-y-2">
                {active.map((r) => (
                  <ResidencyCard key={r.id} residency={r} person={personByAssignment.get(r.assignmentId)} />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Completed / Other</h2>
              <div className="space-y-2">
                {completed.map((r) => (
                  <ResidencyCard key={r.id} residency={r} person={personByAssignment.get(r.assignmentId)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResidencyCard({ residency, person }: { residency: AiFundResidency; person?: AiFundPerson }) {
  const start = new Date(residency.startDate);
  const end = residency.endDate ? new Date(residency.endDate) : null;
  const weeks = end
    ? Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : Math.ceil((Date.now() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));

  const harmonic = person
    ? ((person.metadata as Record<string, unknown> | null)?.harmonic as HarmonicPersonMetadata | undefined)
    : undefined;

  // Find most recent previous role from Harmonic experience (not current)
  const previousRole = harmonic?.experience.find((e) => !e.isCurrent);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3">
        <Home className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[residency.status]}`}>
              {residency.status}
            </span>
            {person && (
              <span className="text-sm font-medium text-foreground truncate">{person.fullName}</span>
            )}
            {harmonic && (
              <Sparkles className="w-3 h-3 text-primary shrink-0" title="Harmonic enriched" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {start.toLocaleDateString()} {end ? `- ${end.toLocaleDateString()}` : "(ongoing)"}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${residency.stipendMonthly.toLocaleString()}/mo
            </span>
            <span>{weeks} weeks</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">{residency.milestones.length} milestones</p>
          <p className="text-xs text-muted-foreground">{residency.weeklyCheckIns.length} check-ins</p>
        </div>
      </div>

      {/* Harmonic person context */}
      {(person || previousRole) && (
        <div className="px-4 pb-3 border-t border-border pt-2">
          <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
            {person?.currentRole && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-2.5 h-2.5" />
                {person.currentRole}
                {person.currentCompany && ` @ ${person.currentCompany}`}
              </span>
            )}
            {previousRole && (
              <span className="px-1.5 py-0.5 bg-secondary rounded">
                Previously: {previousRole.title} @ {previousRole.company}
              </span>
            )}
            {harmonic && harmonic.highlights.length > 0 && (
              <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                {harmonic.highlights.length} highlight{harmonic.highlights.length > 1 ? "s" : ""}
              </span>
            )}
            {harmonic && harmonic.education.length > 0 && (
              <span className="px-1.5 py-0.5 bg-secondary rounded">
                {harmonic.education[0].school}
                {harmonic.education[0].degree ? ` (${harmonic.education[0].degree})` : ""}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
