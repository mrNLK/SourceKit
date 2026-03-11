import { X, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { ScoreExplanation as ScoreExplanationType } from '@/hooks/useScoreExplanation';

interface ScoreExplanationProps {
  explanation: ScoreExplanationType;
  onClose: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getProgressColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  if (pct >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

const ScoreExplanation = ({ explanation, onClose }: ScoreExplanationProps) => {
  const { developer, overall, categories, gaps } = explanation;

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] max-w-full z-50 glass border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {developer.avatarUrl && (
            <img src={developer.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
          )}
          <div>
            <h3 className="font-display text-sm font-semibold">{developer.name || developer.username}</h3>
            <p className="text-xs text-muted-foreground">Score Breakdown</p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Overall Score */}
        <div className="text-center py-3">
          <div className={`text-4xl font-display font-bold ${getScoreColor(overall)}`}>
            {overall}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Overall Score / 100</p>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.name} className="glass rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display font-semibold">{cat.name}</span>
                <span className="text-xs font-display font-bold text-muted-foreground">
                  {cat.score}/{cat.maxScore}
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(cat.score, cat.maxScore)}`}
                  style={{ width: `${(cat.score / cat.maxScore) * 100}%` }}
                />
              </div>
              {cat.evidence.length > 0 && (
                <ul className="space-y-1">
                  {cat.evidence.map((e, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      {e}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Gaps */}
        {gaps.length > 0 && (
          <div className="glass rounded-lg p-3">
            <h4 className="text-xs font-display font-semibold mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              What's Missing
            </h4>
            <ul className="space-y-1">
              {gaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-amber-400 mt-0.5">-</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreExplanation;

// Compact tooltip version for inline use
export function ScoreTooltip({ score }: { score: number }) {
  const color = getScoreColor(score);
  return (
    <span className="inline-flex items-center gap-0.5 cursor-help" title="Click for score breakdown">
      <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
    </span>
  );
}
