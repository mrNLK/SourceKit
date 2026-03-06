import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, FileText, TestTube2, Wrench, Activity, Users,
  GitCommit, Brain, Zap, Cpu, Terminal,
} from "lucide-react";
import { getCodeQuality } from "@/lib/api";
import type { CodeQualityReport as Report, RepoQuality } from "@/types/code-quality";

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-emerald-500/15 border-emerald-500/30";
  if (score >= 40) return "bg-amber-500/15 border-amber-500/30";
  return "bg-red-500/15 border-red-500/30";
}

function scoreBarColor(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function DimensionRow({ icon: Icon, label, score }: { icon: any; label: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-display text-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-display font-semibold w-8 text-right ${scoreColor(score)}`}>
        {score}
      </span>
    </div>
  );
}

function RepoCard({ repo }: { repo: RepoQuality }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-2.5 rounded-lg bg-secondary/50 border border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-display text-foreground font-medium">{repo.name}</span>
          <span className={`text-[10px] font-display font-bold px-1.5 py-0.5 rounded border ${scoreBg(repo.score)} ${scoreColor(repo.score)}`}>
            {repo.score}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {repo.signals.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {repo.signals.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 text-[10px] font-display px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-2.5 h-2.5" />{s}
                </span>
              ))}
            </div>
          )}
          {repo.concerns.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {repo.concerns.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 text-[10px] font-display px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-2.5 h-2.5" />{c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CodeQualityReportProps {
  username: string;
}

const CodeQualityReportComponent = ({ username }: CodeQualityReportProps) => {
  const [expanded, setExpanded] = useState(false);

  const { data: report, isLoading, error, refetch, isFetched } = useQuery<Report>({
    queryKey: ["code-quality", username],
    queryFn: () => getCodeQuality(username),
    enabled: false,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleRun = () => {
    refetch();
  };

  if (!isFetched && !isLoading) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
            <h3 className="font-display text-xs font-semibold text-foreground">Builder Score</h3>
          </div>
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 text-[11px] font-display font-semibold px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
          >
            Analyze
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground font-display mt-2">
          Evaluate GenAI building capability across this developer's GitHub repos.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="font-display text-xs font-semibold text-foreground">Builder Score</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-display">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Scanning repos for AI signals...
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="font-display text-xs font-semibold text-foreground">Builder Score</h3>
        </div>
        <p className="text-xs text-red-400 font-display mb-2">
          {(error as Error)?.message || "Analysis unavailable"}
        </p>
        <button
          onClick={handleRun}
          className="text-[11px] font-display px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="font-display text-xs font-semibold text-foreground">Builder Score</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${scoreBg(report.overallScore)}`}>
          <span className={`font-display text-sm font-bold ${scoreColor(report.overallScore)}`}>
            {report.overallScore}
          </span>
          <span className="text-[10px] text-muted-foreground font-display">/100</span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-secondary-foreground leading-relaxed">{report.summary}</p>

      {/* AI Signals badges */}
      {report.aiSignals && (
        <div className="flex flex-wrap gap-1">
          {report.aiSignals.claudeCodeUsage && (
            <span className="inline-flex items-center gap-1 text-[10px] font-display px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Terminal className="w-2.5 h-2.5" />Claude Code
            </span>
          )}
          {report.aiSignals.aiFrameworksDetected.slice(0, 5).map((f) => (
            <span key={f} className="inline-flex items-center gap-1 text-[10px] font-display px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Brain className="w-2.5 h-2.5" />{f}
            </span>
          ))}
          {report.aiSignals.aiCodingTools.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 text-[10px] font-display px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Zap className="w-2.5 h-2.5" />{t}
            </span>
          ))}
          {report.aiSignals.genaiRepoCount > 0 && (
            <span className="text-[10px] font-display px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground border border-border">
              {report.aiSignals.genaiRepoCount} GenAI repos
            </span>
          )}
        </div>
      )}

      {/* Dimension Bars */}
      <div className="space-y-2">
        <DimensionRow icon={Brain} label="AI Mastery" score={report.dimensions.aiMastery} />
        <DimensionRow icon={Zap} label="Build Velocity" score={report.dimensions.buildVelocity} />
        <DimensionRow icon={Wrench} label="Tooling" score={report.dimensions.tooling} />
        <DimensionRow icon={TestTube2} label="Testing" score={report.dimensions.testing} />
        <DimensionRow icon={FileText} label="Documentation" score={report.dimensions.documentation} />
        <DimensionRow icon={Users} label="Community" score={report.dimensions.communityHealth} />
      </div>

      {/* Commit Quality */}
      {report.commitQuality.total > 0 && (
        <div className="p-2 rounded-lg bg-secondary/50 border border-border space-y-1">
          <div className="flex items-center gap-2">
            <GitCommit className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-display text-foreground">
              {report.commitQuality.withGoodMessages}/{report.commitQuality.total} well-structured commits
            </span>
            <span className="text-[10px] text-muted-foreground font-display ml-auto">
              avg {report.commitQuality.averageMessageLength} chars
            </span>
          </div>
          {(report.commitQuality.claudeCodeCommits > 0 || report.commitQuality.aiAssistedCommits > 0) && (
            <div className="flex items-center gap-3 pl-5">
              {report.commitQuality.claudeCodeCommits > 0 && (
                <span className="text-[10px] font-display text-violet-400">
                  {report.commitQuality.claudeCodeCommits} via Claude Code
                </span>
              )}
              {report.commitQuality.aiAssistedCommits > report.commitQuality.claudeCodeCommits && (
                <span className="text-[10px] font-display text-blue-400">
                  {report.commitQuality.aiAssistedCommits} AI-assisted
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[10px] font-display font-semibold text-emerald-400">Strengths</span>
          {report.strengths.map((s) => (
            <div key={s} className="flex items-start gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-[11px] text-secondary-foreground">{s}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-display font-semibold text-amber-400">Gaps</span>
          {report.improvements.map((i) => (
            <div key={i} className="flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-[11px] text-secondary-foreground">{i}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Repo Breakdown */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-display text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {report.repoBreakdown.length} repos analyzed
        </button>
        {expanded && (
          <div className="mt-2 space-y-1.5">
            {report.repoBreakdown
              .sort((a, b) => b.score - a.score)
              .map((repo) => (
                <RepoCard key={repo.name} repo={repo} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeQualityReportComponent;
