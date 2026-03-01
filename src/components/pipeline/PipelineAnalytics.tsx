import { useMemo } from "react";
import { ArrowRight, AlertCircle, TrendingUp, Users, Clock, BarChart3 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stage {
  id: string;
  label: string;
  color: string;
}

interface PipelineCandidate {
  id: string;
  stage: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface PipelineAnalyticsProps {
  candidates: PipelineCandidate[];
  stages: readonly Stage[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(a: string, b: string | Date = new Date()): number {
  const d1 = new Date(a);
  const d2 = typeof b === "string" ? new Date(b) : b;
  return Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / 86400000));
}

function timeColor(days: number): string {
  if (days <= 3) return "text-emerald-400";
  if (days <= 7) return "text-emerald-400";
  if (days <= 14) return "text-amber-400";
  return "text-red-400";
}

function timeBgColor(days: number): string {
  if (days <= 7) return "bg-emerald-400";
  if (days <= 14) return "bg-amber-400";
  return "bg-red-400";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PipelineAnalytics = ({ candidates, stages }: PipelineAnalyticsProps) => {
  // Stage counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    stages.forEach(s => { counts[s.id] = 0; });
    candidates.forEach(c => { counts[c.stage] = (counts[c.stage] || 0) + 1; });
    return counts;
  }, [candidates, stages]);

  const maxCount = Math.max(1, ...Object.values(stageCounts));

  // Conversion rates between adjacent stages
  const conversions = useMemo(() => {
    const result: { from: string; to: string; fromLabel: string; toLabel: string; rate: number }[] = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const fromCount = stageCounts[stages[i].id];
      const toCount = stageCounts[stages[i + 1].id];
      // Conversion = candidates who made it to next stage / candidates who were in this stage (cumulative)
      const cumFrom = stages.slice(i).reduce((sum, s) => sum + stageCounts[s.id], 0);
      result.push({
        from: stages[i].id,
        to: stages[i + 1].id,
        fromLabel: stages[i].label,
        toLabel: stages[i + 1].label,
        rate: cumFrom > 0 ? Math.round(((cumFrom - stageCounts[stages[i].id]) / cumFrom) * 100) : 0,
      });
    }
    return result;
  }, [stageCounts, stages]);

  // Time-in-stage metrics (using updated_at as proxy)
  const timeInStage = useMemo(() => {
    const result: Record<string, { avg: number; max: number; staleCount: number }> = {};
    stages.forEach(s => {
      const inStage = candidates.filter(c => c.stage === s.id);
      if (inStage.length === 0) {
        result[s.id] = { avg: 0, max: 0, staleCount: 0 };
        return;
      }
      const days = inStage.map(c => daysBetween(c.updated_at));
      const avg = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
      const max = Math.max(...days);
      const staleCount = days.filter(d => d > 14).length;
      result[s.id] = { avg, max, staleCount };
    });
    return result;
  }, [candidates, stages]);

  // Pipeline health
  const health = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    const addedThisWeek = candidates.filter(c => new Date(c.created_at) >= weekAgo).length;
    const addedThisMonth = candidates.filter(c => new Date(c.created_at) >= monthAgo).length;

    // Find bottleneck: stage with highest average time (excluding empty stages)
    let bottleneck = { stage: "", avgDays: 0 };
    stages.forEach(s => {
      const tis = timeInStage[s.id];
      if (tis && tis.avg > bottleneck.avgDays && stageCounts[s.id] > 0) {
        bottleneck = { stage: s.label, avgDays: tis.avg };
      }
    });

    const totalStale = Object.values(timeInStage).reduce((sum, t) => sum + t.staleCount, 0);

    return { total: candidates.length, addedThisWeek, addedThisMonth, bottleneck, totalStale };
  }, [candidates, stages, timeInStage, stageCounts]);

  if (candidates.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4 mb-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Pipeline Analytics</h2>
      </div>

      {/* Health summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-lg p-3 text-center">
          <Users className="w-4 h-4 text-primary mx-auto mb-1" />
          <div className="font-display text-lg font-bold text-foreground">{health.total}</div>
          <div className="text-[10px] text-muted-foreground font-display">Total Active</div>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="font-display text-lg font-bold text-foreground">{health.addedThisWeek}</div>
          <div className="text-[10px] text-muted-foreground font-display">Added This Week</div>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="font-display text-lg font-bold text-foreground">{health.bottleneck.avgDays}d</div>
          <div className="text-[10px] text-muted-foreground font-display truncate" title={`${health.bottleneck.stage} has longest avg time`}>
            {health.bottleneck.stage || "—"} Bottleneck
          </div>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <AlertCircle className={`w-4 h-4 mx-auto mb-1 ${health.totalStale > 0 ? "text-red-400" : "text-emerald-400"}`} />
          <div className={`font-display text-lg font-bold ${health.totalStale > 0 ? "text-red-400" : "text-foreground"}`}>{health.totalStale}</div>
          <div className="text-[10px] text-muted-foreground font-display">Stale (&gt;14d)</div>
        </div>
      </div>

      {/* Stage funnel */}
      <div>
        <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">Stage Funnel</span>
        <div className="mt-2 space-y-2">
          {stages.map((stage, idx) => {
            const count = stageCounts[stage.id];
            const widthPct = Math.max(4, (count / maxCount) * 100);
            const tis = timeInStage[stage.id];
            const conversion = conversions[idx];

            return (
              <div key={stage.id}>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-display font-medium text-foreground w-20 shrink-0">{stage.label}</span>
                  <div className="flex-1 h-5 bg-secondary/50 rounded-md overflow-hidden relative">
                    <div
                      className={`h-full rounded-md transition-all duration-700 ${stage.color.split(" ")[0]}`}
                      style={{ width: `${widthPct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] font-display font-bold text-foreground">
                      {count}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 w-20 shrink-0">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className={`text-[10px] font-display font-semibold ${timeColor(tis.avg)}`}>
                      {tis.avg}d avg
                    </span>
                  </div>
                  {tis.staleCount > 0 && (
                    <span className="text-[9px] font-display text-red-400 shrink-0" title={`${tis.staleCount} candidates stuck >14 days`}>
                      ⚠ {tis.staleCount}
                    </span>
                  )}
                </div>
                {conversion && count > 0 && (
                  <div className="ml-20 pl-3 flex items-center gap-1 py-0.5">
                    <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/50" />
                    <span className="text-[9px] font-display text-muted-foreground/60">
                      {conversion.rate}% → {conversion.toLabel}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PipelineAnalytics;
