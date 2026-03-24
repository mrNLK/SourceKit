// SourceKit Recruiter OS — Client-side scoring utilities
// Structured to be replaceable by backend-calculated values

import type { RecruiterScores, DimensionScore, ScoringWeights, CandidateTier, OutreachPriority } from '../lib/types';
import { DEFAULT_SCORING_WEIGHTS, SCORE_THRESHOLDS } from '../lib/constants';

/**
 * Compute composite score from dimension scores using weights.
 * Returns 0-100.
 */
export function computeCompositeScore(
  scores: Partial<RecruiterScores>,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0;

  let weightedSum = 0;
  const dimensions = Object.keys(weights) as (keyof ScoringWeights)[];

  for (const dim of dimensions) {
    const dimScore = scores[dim];
    if (dimScore) {
      weightedSum += dimScore.score * (weights[dim] / totalWeight);
    }
  }

  return Math.round(weightedSum);
}

/**
 * Auto-assign tier based on composite score.
 * Thresholds: Tier 1 >= 80, Tier 2 >= 60, Borderline >= 40, Below Bar < 40
 */
export function assignTier(compositeScore: number): CandidateTier {
  if (compositeScore >= 80) return 'tier_1';
  if (compositeScore >= 60) return 'tier_2';
  if (compositeScore >= 40) return 'borderline';
  return 'below_bar';
}

/**
 * Compute outreach priority from tier and hidden gem status.
 */
export function computeOutreachPriority(
  tier: CandidateTier,
  hiddenGemScore: number
): OutreachPriority {
  if (tier === 'tier_1') return 'high';
  if (tier === 'tier_2' && hiddenGemScore >= 70) return 'high';
  if (tier === 'tier_2') return 'medium';
  return 'low';
}

/**
 * Get score color class based on value.
 */
export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.high) return 'text-emerald-400';
  if (score >= SCORE_THRESHOLDS.medium) return 'text-amber-400';
  return 'text-red-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.high) return 'bg-emerald-500/15';
  if (score >= SCORE_THRESHOLDS.medium) return 'bg-amber-500/15';
  return 'bg-red-500/15';
}

/**
 * Create a placeholder dimension score for display scaffolding.
 * TODO: Replace with backend-calculated scores from recruiter-scoring edge function
 */
export function placeholderDimensionScore(score: number, reason: string): DimensionScore {
  return {
    score,
    evidence: [],
    confidence: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
    reason,
  };
}
