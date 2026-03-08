import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  MapPin,
  Briefcase,
  Github,
  Twitter,
  Globe,
  FileText,
  MessageSquare,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  AiFundPerson,
  AiFundEvaluationScore,
  AiFundEvidence,
  AiFundEngagement,
  ProcessStage,
  PersonType,
} from "@/types/ai-fund";
import {
  fetchScoresForPerson,
  fetchEvidence,
  fetchEngagements,
} from "@/lib/ai-fund";
import { scoreColor, scoreLabel } from "@/lib/aifund-scoring";

interface Props {
  person: AiFundPerson;
  onBack: () => void;
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

const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  fir: "Founder in Residence",
  ve: "Venture Engineer",
  both: "FIR + VE",
};

const EVIDENCE_TYPE_ICONS: Record<string, string> = {
  publication: "📄",
  patent: "📋",
  github_repo: "💻",
  conference_talk: "🎤",
  blog_post: "📝",
  product_launch: "🚀",
  award: "🏆",
  media_mention: "📰",
  huggingface_space: "🤗",
  arxiv_paper: "📑",
  other: "📌",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PersonDetail({ person, onBack }: Props) {
  const [scores, setScores] = useState<AiFundEvaluationScore[]>([]);
  const [evidence, setEvidence] = useState<AiFundEvidence[]>([]);
  const [engagements, setEngagements] = useState<AiFundEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllEngagements, setShowAllEngagements] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, ev, en] = await Promise.all([
          fetchScoresForPerson(person.id),
          fetchEvidence(person.id),
          fetchEngagements(person.id),
        ]);
        setScores(s);
        setEvidence(ev);
        setEngagements(en);
      } catch (err) {
        console.error("Failed to load person detail:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [person.id]);

  const latestScore = scores.length > 0 ? scores[0] : null;
  const displayedEngagements = showAllEngagements ? engagements : engagements.slice(0, 5);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
          {person.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{person.fullName}</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase">
              {person.personType}
            </span>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              {PROCESS_STAGE_LABELS[person.processStage]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {[person.currentRole, person.currentCompany].filter(Boolean).join(" @ ") || "No role info"}
          </p>
        </div>
        {latestScore && latestScore.compositeScore !== null && (
          <div className="text-right shrink-0">
            <p className={`text-lg font-bold ${scoreColor(latestScore.compositeScore)}`}>
              {latestScore.compositeScore.toFixed(1)}
            </p>
            <p className={`text-xs font-medium ${scoreColor(latestScore.compositeScore)}`}>
              {scoreLabel(latestScore.compositeScore)}
            </p>
          </div>
        )}
      </div>

      {/* Profile links */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {person.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <a href={`mailto:${person.email}`} className="text-primary hover:underline">
                  {person.email}
                </a>
              </div>
            )}
            {person.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {person.location}
              </div>
            )}
            {person.currentRole && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5" />
                {person.currentRole}{person.currentCompany ? ` @ ${person.currentCompany}` : ""}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {person.linkedinUrl && (
              <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
              </a>
            )}
            {person.githubUrl && (
              <a href={person.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Github className="w-3.5 h-3.5" /> GitHub
              </a>
            )}
            {person.twitterUrl && (
              <a href={person.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Twitter className="w-3.5 h-3.5" /> Twitter
              </a>
            )}
            {person.websiteUrl && (
              <a href={person.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Globe className="w-3.5 h-3.5" /> Website
              </a>
            )}
          </div>
        </div>
        {person.bio && (
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
            {person.bio}
          </p>
        )}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</span>
          <span className="text-xs text-foreground">{PERSON_TYPE_LABELS[person.personType]}</span>
          {person.sourceChannel && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Source</span>
              <span className="text-xs text-foreground">{person.sourceChannel}</span>
            </>
          )}
          {person.tags.length > 0 && (
            <>
              <span className="text-muted-foreground">|</span>
              {person.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                  {tag}
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-pulse text-muted-foreground text-sm">Loading details...</div>
        </div>
      ) : (
        <>
          {/* Scores */}
          {latestScore && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Award className="w-3.5 h-3.5" /> Evaluation Scores
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "AI Excellence", value: latestScore.aiExcellence, weight: "40%" },
                  { label: "Technical Ability", value: latestScore.technicalAbility, weight: "25%" },
                  { label: "Product Instinct", value: latestScore.productInstinct, weight: "20%" },
                  { label: "Leadership", value: latestScore.leadershipPotential, weight: "15%" },
                ].map((dim) => (
                  <div key={dim.label} className="text-center">
                    <p className={`text-lg font-bold ${dim.value !== null ? scoreColor(dim.value) : "text-muted-foreground"}`}>
                      {dim.value !== null ? dim.value.toFixed(1) : "-"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{dim.label}</p>
                    <p className="text-[9px] text-muted-foreground/60">{dim.weight}</p>
                  </div>
                ))}
              </div>
              {latestScore.notes && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                  {latestScore.notes}
                </p>
              )}
            </div>
          )}

          {/* Evidence */}
          {evidence.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Evidence ({evidence.length})
              </h2>
              <div className="space-y-2">
                {evidence.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-background border border-border/50">
                    <span className="text-sm shrink-0 mt-0.5">
                      {EVIDENCE_TYPE_ICONS[ev.evidenceType] || "📌"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                        {ev.url && (
                          <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary shrink-0">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{ev.evidenceType.replace(/_/g, " ")}</span>
                        {ev.signalStrength !== null && (
                          <span className={`text-[10px] font-medium ${scoreColor(ev.signalStrength)}`}>
                            Signal: {ev.signalStrength.toFixed(1)}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">{formatDate(ev.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Engagements */}
          {engagements.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> Engagements ({engagements.length})
              </h2>
              <div className="space-y-2">
                {displayedEngagements.map((eng) => (
                  <div key={eng.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-background border border-border/50">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${eng.direction === "outbound" ? "bg-blue-400" : "bg-emerald-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase">
                          {eng.channel}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {eng.direction === "outbound" ? "Sent" : "Received"}
                        </span>
                        {eng.sentAt && (
                          <span className="text-[10px] text-muted-foreground/60">{formatDate(eng.sentAt)}</span>
                        )}
                      </div>
                      {eng.subject && (
                        <p className="text-sm font-medium text-foreground mt-0.5 truncate">{eng.subject}</p>
                      )}
                      {eng.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{eng.body}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {engagements.length > 5 && (
                <button
                  onClick={() => setShowAllEngagements(!showAllEngagements)}
                  className="flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
                >
                  {showAllEngagements ? (
                    <>
                      <ChevronUp className="w-3 h-3" /> Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" /> Show all {engagements.length} engagements
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Empty states */}
          {!latestScore && evidence.length === 0 && engagements.length === 0 && (
            <div className="py-12 text-center bg-card border border-border rounded-xl">
              <p className="text-sm text-muted-foreground">
                No scores, evidence, or engagements recorded yet.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
