import { useState } from "react";
import {
  X,
  Building2,
  MapPin,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Globe,
  Linkedin,
  Tag,
  Loader2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { CompanyContext, PoachabilityScore } from "@/types/harmonic";
import { useHarmonicCompany } from "@/hooks/useHarmonicCompany";

interface Props {
  companyName: string;
  domain?: string;
  onClose: () => void;
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-foreground">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground ml-1">{sub}</span>}
      </div>
    </div>
  );
}

function GrowthIndicator({ value, label }: { value: number | undefined | null; label: string }) {
  if (value == null) return null;
  const isPositive = value > 0;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {isPositive ? (
        <TrendingUp className="w-3 h-3 text-emerald-400" />
      ) : (
        <TrendingDown className="w-3 h-3 text-red-400" />
      )}
      <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
        {isPositive ? "+" : ""}{value.toFixed(1)}%
      </span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export default function CompanyDetailPanel({ companyName, domain, onClose }: Props) {
  const { company, poachability, isLoading, error } = useHarmonicCompany(domain || null);

  const quality = company?.company_quality as {
    highlights?: string[];
    employee_highlights?: string[];
    logo_url?: string;
    short_description?: string;
  } | null;

  const investors = company?.investors as { name: string; isLead: boolean }[] | null;
  const founders = company?.founders as { name: string; title: string; urn: string }[] | null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg h-full bg-background border-l border-border overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            {quality?.logo_url ? (
              <img src={quality.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
            )}
            <h2 className="text-lg font-semibold text-foreground truncate">{company?.name || companyName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Fetching company data...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Could not load company data{domain ? ` for ${domain}` : ""}.
              </p>
            </div>
          ) : company ? (
            <>
              {/* Description */}
              {quality?.short_description && (
                <p className="text-sm text-muted-foreground">{quality.short_description}</p>
              )}

              {/* Quick info */}
              <div className="space-y-1.5">
                {company.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {company.location}
                  </div>
                )}
                {company.domain && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{company.domain}</span>
                  </div>
                )}
                {company.linkedin_url && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Linkedin className="w-3.5 h-3.5" />
                    <a
                      href={company.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground flex items-center gap-1"
                    >
                      LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Poachability */}
              {poachability && (
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Poachability Score
                    </span>
                    <span
                      className={`text-xl font-bold ${
                        poachability.score >= 70
                          ? "text-emerald-400"
                          : poachability.score >= 40
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {poachability.score}
                    </span>
                  </div>
                  {poachability.signals.length > 0 && (
                    <ul className="space-y-1">
                      {poachability.signals.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <Sparkles className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Key Metrics */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Key Metrics
                </h3>
                <div className="space-y-1.5">
                  {company.funding_stage && (
                    <MetricRow label="Funding Stage" value={company.funding_stage.replace(/_/g, " ")} />
                  )}
                  {company.funding_total != null && (
                    <MetricRow label="Total Raised" value={`$${(company.funding_total / 1_000_000).toFixed(1)}M`} />
                  )}
                  {company.last_funding_total != null && (
                    <MetricRow
                      label="Last Round"
                      value={`$${(company.last_funding_total / 1_000_000).toFixed(1)}M`}
                      sub={company.last_funding_date ? new Date(company.last_funding_date).toLocaleDateString() : undefined}
                    />
                  )}
                  {company.headcount != null && (
                    <MetricRow label="Headcount" value={String(company.headcount)} />
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <GrowthIndicator value={company.headcount_growth_30d} label="30d HC" />
                  <GrowthIndicator value={company.headcount_growth_90d} label="90d HC" />
                </div>
              </div>

              {/* Founders */}
              {founders && founders.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Founders & Leadership
                  </h3>
                  <div className="space-y-1.5">
                    {founders.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-foreground">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{f.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Investors */}
              {investors && investors.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Investors
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {investors.map((inv, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 text-[10px] rounded ${
                          inv.isLead
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {inv.name}{inv.isLead ? " (Lead)" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {((company.industry_tags?.length ?? 0) > 0 || (company.technology_tags?.length ?? 0) > 0) && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(company.industry_tags || []).map((t) => (
                      <span key={t} className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 rounded">
                        <Tag className="w-2.5 h-2.5" /> {t}
                      </span>
                    ))}
                    {(company.technology_tags || []).map((t) => (
                      <span key={t} className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-purple-500/10 text-purple-400 rounded">
                        <Tag className="w-2.5 h-2.5" /> {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlights */}
              {quality?.highlights && quality.highlights.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Highlights
                  </h3>
                  <ul className="space-y-1">
                    {quality.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Sparkles className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {company.fetched_at && (
                <p className="text-[10px] text-muted-foreground">
                  Data fetched {new Date(company.fetched_at).toLocaleDateString()}
                </p>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No company data available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
