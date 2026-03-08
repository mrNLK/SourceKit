import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  DollarSign,
  ExternalLink,
  UserPlus,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { AiFundIntelligenceRun } from "@/types/ai-fund";
import {
  fetchIntelligenceRunById,
  fetchHarmonicCompaniesByIds,
  createPerson,
  type HarmonicCompanyRow,
} from "@/lib/ai-fund";

interface Props {
  runId: string;
  onBack: () => void;
  onPersonCreated?: () => void;
}

interface ResultsCompany {
  harmonicCompanyId: string;
  name: string;
  domain: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  location: string | null;
  fundingStage: string | null;
  fundingTotal: number | null;
  lastFundingDate: string | null;
  lastFundingTotal: number | null;
  headcount: number | null;
  headcountGrowth30d: number | null;
  headcountGrowth90d: number | null;
  tags: string[];
  founders: { name: string; title: string; linkedinUrl: string | null }[];
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "N/A";
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function formatStage(stage: string | null): string {
  if (!stage) return "Unknown";
  return stage
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function IntelligenceRunDetail({ runId, onBack, onPersonCreated }: Props) {
  const [run, setRun] = useState<AiFundIntelligenceRun | null>(null);
  const [companies, setCompanies] = useState<(ResultsCompany | HarmonicCompanyRow)[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [importingFounder, setImportingFounder] = useState<string | null>(null);
  const [importedFounders, setImportedFounders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const runData = await fetchIntelligenceRunById(runId);
        if (!runData) return;
        setRun(runData);

        const summary = runData.resultsSummary as {
          companies?: ResultsCompany[];
        } | null;

        if (summary?.companies && summary.companies.length > 0) {
          // Try to get fresh data from DB
          const harmonicIds = summary.companies.map((c) => c.harmonicCompanyId);
          const dbCompanies = await fetchHarmonicCompaniesByIds(harmonicIds);

          if (dbCompanies.length > 0) {
            // Merge: use DB data where available, fall back to summary
            const dbMap = new Map(dbCompanies.map((c) => [c.harmonic_company_id, c]));
            const merged = summary.companies.map((c) => dbMap.get(c.harmonicCompanyId) || c);
            setCompanies(merged);
          } else {
            setCompanies(summary.companies);
          }
        }
      } catch (err) {
        console.error("Failed to load run detail:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [runId]);

  const getCompanyName = (c: ResultsCompany | HarmonicCompanyRow): string =>
    "name" in c ? c.name : "";

  const getCompanyDomain = (c: ResultsCompany | HarmonicCompanyRow): string | null =>
    "domain" in c ? c.domain : null;

  const getCompanyLocation = (c: ResultsCompany | HarmonicCompanyRow): string | null =>
    "location" in c ? c.location : null;

  const getCompanyHeadcount = (c: ResultsCompany | HarmonicCompanyRow): number | null =>
    "headcount" in c ? c.headcount : null;

  const getCompanyFundingStage = (c: ResultsCompany | HarmonicCompanyRow): string | null =>
    "funding_stage" in c ? c.funding_stage : "fundingStage" in c ? (c as ResultsCompany).fundingStage : null;

  const getCompanyFundingTotal = (c: ResultsCompany | HarmonicCompanyRow): number | null =>
    "funding_total" in c ? c.funding_total : "fundingTotal" in c ? (c as ResultsCompany).fundingTotal : null;

  const getCompanyFounders = (
    c: ResultsCompany | HarmonicCompanyRow
  ): { name: string; title: string; linkedinUrl: string | null }[] =>
    "founders" in c ? (c.founders as { name: string; title: string; linkedinUrl: string | null }[]) || [] : [];

  const getCompanyId = (c: ResultsCompany | HarmonicCompanyRow): string =>
    "harmonic_company_id" in c ? c.harmonic_company_id : "harmonicCompanyId" in c ? (c as ResultsCompany).harmonicCompanyId : "";

  const getCompanyLinkedin = (c: ResultsCompany | HarmonicCompanyRow): string | null =>
    "linkedin_url" in c ? c.linkedin_url : "linkedinUrl" in c ? (c as ResultsCompany).linkedinUrl : null;

  const getCompanyWebsite = (c: ResultsCompany | HarmonicCompanyRow): string | null =>
    "website_url" in c ? c.website_url : "websiteUrl" in c ? (c as ResultsCompany).websiteUrl : null;

  const handleImportFounder = async (
    founder: { name: string; title: string; linkedinUrl: string | null },
    companyName: string
  ) => {
    const founderKey = `${founder.name}-${founder.title}-${companyName}`;
    if (importedFounders.has(founderKey) || founder.name === "Unknown founder") return;

    setImportingFounder(founderKey);
    try {
      await createPerson({
        fullName: founder.name,
        linkedinUrl: founder.linkedinUrl,
        currentRole: founder.title,
        currentCompany: companyName,
        personType: "fir",
        processStage: "identified",
        sourceChannel: "harmonic",
        tags: ["harmonic-import"],
      });
      setImportedFounders((prev) => new Set(prev).add(founderKey));
      onPersonCreated?.();
    } catch (err) {
      console.error("Failed to import founder:", err);
    } finally {
      setImportingFounder(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground text-sm">Loading run details...</div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Run not found.</p>
        <button onClick={onBack} className="mt-2 text-sm text-primary hover:underline">
          Back to runs
        </button>
      </div>
    );
  }

  const query = typeof run.queryParams === "object" && run.queryParams !== null
    ? (run.queryParams as { query?: string }).query || JSON.stringify(run.queryParams)
    : "No query";

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
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">Intelligence Run</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {query} &middot; {run.resultsCount} companies &middot; {new Date(run.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            run.status === "completed"
              ? "bg-emerald-500/10 text-emerald-400"
              : run.status === "failed"
              ? "bg-destructive/10 text-destructive"
              : "bg-yellow-500/10 text-yellow-400"
          }`}
        >
          {run.status}
        </span>
      </div>

      {/* Companies grid */}
      {companies.length === 0 ? (
        <div className="py-12 text-center bg-card border border-border rounded-xl">
          <p className="text-sm text-muted-foreground">No companies in this run.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((company) => {
            const companyId = getCompanyId(company);
            const name = getCompanyName(company);
            const isExpanded = expandedCompany === companyId;
            const founders = getCompanyFounders(company);
            const validFounders = founders.filter((f) => f.name && f.name !== "Unknown founder");

            return (
              <div
                key={companyId}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Company summary row */}
                <button
                  onClick={() => setExpandedCompany(isExpanded ? null : companyId)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[getCompanyDomain(company), getCompanyLocation(company)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {getCompanyHeadcount(company) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {getCompanyHeadcount(company)}
                      </div>
                    )}
                    {getCompanyFundingStage(company) && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {formatStage(getCompanyFundingStage(company))}
                      </span>
                    )}
                    {getCompanyFundingTotal(company) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(getCompanyFundingTotal(company))}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {validFounders.length} founder{validFounders.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-4">
                    {/* Links */}
                    <div className="flex items-center gap-3">
                      {getCompanyLinkedin(company) && (
                        <a
                          href={getCompanyLinkedin(company)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> LinkedIn
                        </a>
                      )}
                      {getCompanyWebsite(company) && (
                        <a
                          href={
                            getCompanyWebsite(company)!.startsWith("http")
                              ? getCompanyWebsite(company)!
                              : `https://${getCompanyWebsite(company)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Website
                        </a>
                      )}
                      {getCompanyDomain(company) && (
                        <span className="text-xs text-muted-foreground">{getCompanyDomain(company)}</span>
                      )}
                    </div>

                    {/* Location & headcount */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {getCompanyLocation(company) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {getCompanyLocation(company)}
                        </span>
                      )}
                    </div>

                    {/* Founders */}
                    {founders.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                          People ({founders.length})
                        </h3>
                        <div className="space-y-1.5">
                          {founders.map((founder, idx) => {
                            const founderKey = `${founder.name}-${founder.title}-${name}`;
                            const isImported = importedFounders.has(founderKey);
                            const isImporting = importingFounder === founderKey;
                            const isUnknown = founder.name === "Unknown founder";

                            return (
                              <div
                                key={`${companyId}-founder-${idx}`}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background border border-border/50"
                              >
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-semibold shrink-0">
                                  {isUnknown ? "?" : founder.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">
                                    {founder.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {founder.title}
                                  </p>
                                </div>
                                {founder.linkedinUrl && (
                                  <a
                                    href={founder.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary shrink-0"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {!isUnknown && (
                                  <button
                                    onClick={() => handleImportFounder(founder, name)}
                                    disabled={isImported || isImporting}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors shrink-0 ${
                                      isImported
                                        ? "bg-emerald-500/10 text-emerald-400 cursor-default"
                                        : "bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                                    }`}
                                  >
                                    {isImported ? (
                                      <>
                                        <CheckCircle className="w-3 h-3" /> Added
                                      </>
                                    ) : isImporting ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin" /> Adding...
                                      </>
                                    ) : (
                                      <>
                                        <UserPlus className="w-3 h-3" /> Import
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
