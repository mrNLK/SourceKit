import { Trophy, MapPin, Star, Users, GitFork, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CompareCandidate {
  id: string;
  github_username: string;
  name?: string;
  avatar_url?: string;
  bio?: string;
  summary?: string;
  location?: string;
  score?: number;
  stars?: number;
  followers?: number;
  public_repos?: number;
  top_languages?: { name: string; percentage?: number; color?: string }[];
  highlights?: string[];
  linkedin_url?: string;
  github_url?: string;
  stage?: string;
}

interface CandidateCompareProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: CompareCandidate[];
}

function bestInRow(values: (number | undefined)[]): Set<number> {
  const best = new Set<number>();
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? 0;
    if (v > max) max = v;
  }
  if (max <= 0) return best;
  for (let i = 0; i < values.length; i++) {
    if ((values[i] ?? 0) === max) best.add(i);
  }
  return best;
}

function getScoreColor(score: number) {
  if (score >= 70) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 40) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (score >= 1) return "bg-red-500/15 text-red-400 border-red-500/30";
  return "bg-secondary text-secondary-foreground border-border";
}

const CandidateCompare = ({ open, onOpenChange, candidates }: CandidateCompareProps) => {
  if (candidates.length < 2) return null;

  const scores = candidates.map((c) => c.score ?? 0);
  const winnerIdx = scores.indexOf(Math.max(...scores));

  const starsBest = bestInRow(candidates.map((c) => c.stars));
  const followersBest = bestInRow(candidates.map((c) => c.followers));
  const reposBest = bestInRow(candidates.map((c) => c.public_repos));
  const scoreBest = bestInRow(candidates.map((c) => c.score));

  const colWidth = candidates.length === 2 ? "w-1/2" : "w-1/3";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-base">
            Candidate Comparison
          </DialogTitle>
          <DialogDescription className="text-xs">
            Side-by-side comparison of {candidates.length} candidates
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Header row: Avatar + Name */}
          <div className="flex gap-3 mb-4">
            {candidates.map((c, i) => (
              <div key={c.id} className={`${colWidth} text-center`}>
                <div className="relative inline-block">
                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      alt=""
                      className="w-14 h-14 rounded-full border-2 border-border object-cover mx-auto"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center font-display text-lg font-bold text-primary mx-auto">
                      {(c.name || c.github_username)?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  {i === winnerIdx && scores[winnerIdx] > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center" title="Highest score">
                      <Trophy className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
                <p className="font-display text-sm font-semibold text-foreground mt-2 truncate">
                  {c.name || c.github_username}
                </p>
                <p className="text-[10px] text-muted-foreground">@{c.github_username}</p>
              </div>
            ))}
          </div>

          {/* Comparison rows */}
          <div className="space-y-0 rounded-lg border border-border overflow-hidden">
            {/* Score */}
            <CompareRow label="Score">
              {candidates.map((c, i) => (
                <div key={c.id} className={colWidth}>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-md font-display font-bold text-sm border ${getScoreColor(c.score ?? 0)} ${
                      scoreBest.has(i) ? "ring-1 ring-emerald-500/40" : ""
                    }`}
                  >
                    {c.score ?? "–"}
                  </span>
                </div>
              ))}
            </CompareRow>

            {/* Location */}
            <CompareRow label="Location">
              {candidates.map((c) => (
                <div key={c.id} className={colWidth}>
                  {c.location ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {c.location}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>
              ))}
            </CompareRow>

            {/* Stars */}
            <CompareRow label="Stars">
              {candidates.map((c, i) => (
                <div key={c.id} className={colWidth}>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-display ${
                      starsBest.has(i) ? "text-emerald-400 font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    {(c.stars ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </CompareRow>

            {/* Followers */}
            <CompareRow label="Followers">
              {candidates.map((c, i) => (
                <div key={c.id} className={colWidth}>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-display ${
                      followersBest.has(i) ? "text-emerald-400 font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    {(c.followers ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </CompareRow>

            {/* Public Repos */}
            <CompareRow label="Repos">
              {candidates.map((c, i) => (
                <div key={c.id} className={colWidth}>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-display ${
                      reposBest.has(i) ? "text-emerald-400 font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    <GitFork className="w-3 h-3" />
                    {c.public_repos ?? 0}
                  </span>
                </div>
              ))}
            </CompareRow>

            {/* Languages */}
            <CompareRow label="Languages">
              {candidates.map((c) => (
                <div key={c.id} className={colWidth}>
                  <div className="flex flex-wrap gap-1">
                    {(c.top_languages || []).slice(0, 4).map((l: any) => (
                      <span
                        key={l.name}
                        className="text-[9px] font-display px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
                      >
                        {l.name}
                      </span>
                    ))}
                    {(!c.top_languages || c.top_languages.length === 0) && (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </div>
                </div>
              ))}
            </CompareRow>

            {/* Bio */}
            <CompareRow label="Bio">
              {candidates.map((c) => (
                <div key={c.id} className={colWidth}>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {c.summary || c.bio || "—"}
                  </p>
                </div>
              ))}
            </CompareRow>

            {/* Highlights */}
            <CompareRow label="Highlights">
              {candidates.map((c) => (
                <div key={c.id} className={colWidth}>
                  {(c.highlights || []).length > 0 ? (
                    <ul className="space-y-0.5">
                      {(c.highlights || []).slice(0, 3).map((h, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground leading-tight">
                          {h}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>
              ))}
            </CompareRow>

            {/* Links */}
            <CompareRow label="Links" last>
              {candidates.map((c) => (
                <div key={c.id} className={`${colWidth} flex flex-wrap gap-1.5`}>
                  <a
                    href={c.github_url || `https://github.com/${c.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-display text-primary hover:underline"
                  >
                    GitHub <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  {c.linkedin_url && (
                    <a
                      href={c.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-display text-info hover:underline"
                    >
                      LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              ))}
            </CompareRow>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function CompareRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 ${last ? "" : "border-b border-border/50"} even:bg-secondary/20`}>
      <div className="w-20 shrink-0">
        <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex-1 flex gap-3">{children}</div>
    </div>
  );
}

export default CandidateCompare;
