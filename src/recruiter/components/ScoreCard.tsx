import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getScoreColor, getScoreBgColor } from '../services/scoring';
import { SCORE_DIMENSIONS } from '../lib/constants';
import type { DimensionScore, ScoreDimension } from '../lib/types';

interface ScoreCardProps {
  dimension: ScoreDimension;
  score: DimensionScore | null;
  compact?: boolean;
}

export default function ScoreCard({ dimension, score, compact }: ScoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = SCORE_DIMENSIONS[dimension];
  const value = score?.score ?? 0;
  const color = getScoreColor(value);
  const bgColor = getScoreBgColor(value);

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: 'var(--ros-bg-card)' }}>
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--ros-text-muted)' }}>{config.label}</span>
        <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-3 transition-all duration-150" style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--ros-text-muted)' }}>
          {config.label}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 rounded hover:bg-white/5 transition-colors"
          style={{ color: 'var(--ros-text-muted)' }}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-mono font-bold ${color}`}>{value}</span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--ros-text-muted)' }}>/100</span>
      </div>

      {score?.reason && (
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ros-text-secondary)' }}>
          {score.reason}
        </p>
      )}

      {/* Confidence indicator */}
      {score && (
        <div className="flex items-center gap-1 mt-2">
          <div className="flex gap-0.5">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: i <= (score.confidence === 'high' ? 3 : score.confidence === 'medium' ? 2 : 1)
                    ? 'var(--ros-accent)' : 'var(--ros-border)',
                }}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono uppercase" style={{ color: 'var(--ros-text-muted)' }}>
            {score.confidence}
          </span>
        </div>
      )}

      {/* Evidence expansion */}
      {expanded && score?.evidence && score.evidence.length > 0 && (
        <div className="mt-3 pt-2 border-t space-y-2" style={{ borderColor: 'var(--ros-border)' }}>
          {score.evidence.map((ev, i) => (
            <div key={i} className="text-xs" style={{ color: 'var(--ros-text-secondary)' }}>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase px-1 py-0.5 rounded" style={{ background: 'var(--ros-bg-hover)', color: 'var(--ros-text-muted)' }}>
                  {ev.source}
                </span>
                <span className="font-medium">{ev.artifact}</span>
              </div>
              <p className="mt-0.5 pl-0.5" style={{ color: 'var(--ros-text-muted)' }}>{ev.detail}</p>
              {ev.url && (
                <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-[10px] hover:underline" style={{ color: 'var(--ros-accent)' }}>
                  {ev.url}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && (!score?.evidence || score.evidence.length === 0) && (
        <p className="text-[11px] mt-3 pt-2 border-t" style={{ borderColor: 'var(--ros-border)', color: 'var(--ros-text-muted)' }}>
          No evidence indexed yet. Run enrichment to surface artifacts.
        </p>
      )}
    </div>
  );
}
