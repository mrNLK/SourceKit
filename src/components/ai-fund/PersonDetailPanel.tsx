import { useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award,
  MapPin,
  Mail,
  Globe,
  Linkedin,
  Github,
  Twitter,
  Loader2,
  TrendingDown,
  TrendingUp,
  Building2,
  Sparkles,
} from "lucide-react";
import type { AiFundPerson, HarmonicPersonMetadata } from "@/types/ai-fund";
import type { PoachabilityScore } from "@/types/harmonic";
import { useHarmonicCompany } from "@/hooks/useHarmonicCompany";
import { companyNameToDomain } from "@/services/harmonic";

interface Props {
  person: AiFundPerson;
  onClose: () => void;
}

function scoreColorClass(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function PoachabilityBadge({ poachability }: { poachability: PoachabilityScore }) {
  const colorClass = scoreColorClass(poachability.score);
  return (
    <div className="bg-background border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{poachability.name}</span>
        </div>
        <span className={`text-lg font-bold ${colorClass}`}>{poachability.score}</span>
      </div>
      {poachability.signals.length > 0 && (
        <div className="space-y-1">
          {poachability.signals.map((signal, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              {signal.includes("shrinking") || signal.includes("declining") || signal.includes("layoff") ? (
                <TrendingDown className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
              ) : signal.includes("growing") || signal.includes("surging") || signal.includes("funded") ? (
                <TrendingUp className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
              ) : (
                <Sparkles className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <span>{signal}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {poachability.funding_stage && (
          <span className="px-1.5 py-0.5 bg-secondary rounded">{poachability.funding_stage.replace(/_/g, " ")}</span>
        )}
        {poachability.headcount != null && (
          <span className="px-1.5 py-0.5 bg-secondary rounded">{poachability.headcount} employees</span>
        )}
        {poachability.funding_total != null && (
          <span className="px-1.5 py-0.5 bg-secondary rounded">
            ${(poachability.funding_total / 1_000_000).toFixed(1)}M raised
          </span>
        )}
      </div>
    </div>
  );
}

export default function PersonDetailPanel({ person, onClose }: Props) {
  const harmonic = (person.metadata as Record<string, unknown> | null)?.harmonic as
    | HarmonicPersonMetadata
    | undefined;

  // Try to get company domain for poachability
  const companyDomain = person.currentCompany
    ? companyNameToDomain(person.currentCompany)
    : null;
  const { poachability, isLoading: companyLoading } = useHarmonicCompany(companyDomain);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg h-full bg-background border-l border-border overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-foreground truncate">{person.fullName}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Basic info */}
          <div className="space-y-2">
            {person.currentRole && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                <span>
                  {person.currentRole}
                  {person.currentCompany && <span className="text-muted-foreground"> @ {person.currentCompany}</span>}
                </span>
              </div>
            )}
            {person.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{person.location}</span>
              </div>
            )}
            {person.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span>{person.email}</span>
              </div>
            )}
            {harmonic?.headline && (
              <p className="text-xs text-muted-foreground italic">{harmonic.headline}</p>
            )}
          </div>

          {/* Social links */}
          <div className="flex items-center gap-2">
            {person.linkedinUrl && (
              <a
                href={person.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-secondary rounded hover:text-foreground transition-colors"
              >
                <Linkedin className="w-3 h-3" /> LinkedIn
              </a>
            )}
            {person.githubUrl && (
              <a
                href={person.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-secondary rounded hover:text-foreground transition-colors"
              >
                <Github className="w-3 h-3" /> GitHub
              </a>
            )}
            {person.twitterUrl && (
              <a
                href={person.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-secondary rounded hover:text-foreground transition-colors"
              >
                <Twitter className="w-3 h-3" /> Twitter
              </a>
            )}
            {person.websiteUrl && (
              <a
                href={person.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-secondary rounded hover:text-foreground transition-colors"
              >
                <Globe className="w-3 h-3" /> Website
              </a>
            )}
          </div>

          {/* Poachability */}
          {person.currentCompany && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Company Poachability
              </h3>
              {companyLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analyzing {person.currentCompany}...
                </div>
              ) : poachability ? (
                <PoachabilityBadge poachability={poachability} />
              ) : (
                <p className="text-xs text-muted-foreground">No company data available</p>
              )}
            </div>
          )}

          {/* Harmonic enrichment data */}
          {harmonic ? (
            <>
              {/* Experience */}
              {harmonic.experience.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Experience
                  </h3>
                  <div className="space-y-2">
                    {harmonic.experience.slice(0, 5).map((exp, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-3 py-2 bg-card border border-border rounded-lg"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{exp.title}</p>
                          <p className="text-xs text-muted-foreground">{exp.company}</p>
                          {(exp.startDate || exp.endDate) && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {exp.startDate || "?"} — {exp.isCurrent ? "Present" : exp.endDate || "?"}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {harmonic.education.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Education
                  </h3>
                  <div className="space-y-2">
                    {harmonic.education.map((edu, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-3 py-2 bg-card border border-border rounded-lg"
                      >
                        <GraduationCap className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{edu.school}</p>
                          {(edu.degree || edu.field) && (
                            <p className="text-xs text-muted-foreground">
                              {[edu.degree, edu.field].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlights */}
              {harmonic.highlights.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Highlights
                  </h3>
                  <ul className="space-y-1">
                    {harmonic.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Sparkles className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Awards */}
              {harmonic.awards.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Awards
                  </h3>
                  <div className="space-y-2">
                    {harmonic.awards.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-3 py-2 bg-card border border-border rounded-lg"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.title}</p>
                          {a.description && (
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {harmonic.languages && harmonic.languages.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {harmonic.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-0.5 text-[10px] bg-secondary text-muted-foreground rounded"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                Enriched via Harmonic on {new Date(harmonic.enrichedAt).toLocaleDateString()}
              </p>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground">
                {person.linkedinUrl
                  ? "Harmonic enrichment pending — data will appear after processing."
                  : "Add a LinkedIn URL to enable Harmonic enrichment."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
