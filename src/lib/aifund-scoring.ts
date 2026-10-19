/**
 * AI Fund Scoring Engine
 *
 * Weighted composite scoring for FIR/VE candidates.
 * Weights: AI excellence 40%, technical ability 25%, product instinct 20%, leadership potential 15%
 */

import {
  SCORING_WEIGHTS,
  type ScoringDimension,
  type AiFundEvaluationScore,
} from "@/types/ai-fund";

// ---------------------------------------------------------------------------
// Composite Score Calculation
// ---------------------------------------------------------------------------

export function computeCompositeScore(scores: {
  aiExcellence: number | null;
  technicalAbility: number | null;
  productInstinct: number | null;
  leadershipPotential: number | null;
}): number | null {
  const dims: { key: ScoringDimension; val: number | null }[] = [
    { key: "aiExcellence", val: scores.aiExcellence },
    { key: "technicalAbility", val: scores.technicalAbility },
    { key: "productInstinct", val: scores.productInstinct },
    { key: "leadershipPotential", val: scores.leadershipPotential },
  ];

  const scored = dims.filter((d) => d.val !== null && d.val !== undefined);
  if (scored.length === 0) return null;

  // If partial scores, re-normalize weights to sum to 1
  const totalWeight = scored.reduce((sum, d) => sum + SCORING_WEIGHTS[d.key], 0);
  const weighted = scored.reduce(
    (sum, d) => sum + (d.val! * SCORING_WEIGHTS[d.key]) / totalWeight,
    0
  );

  return Math.round(weighted * 100) / 100;
}

// ---------------------------------------------------------------------------
// Score Label / Color
// ---------------------------------------------------------------------------

export function scoreLabel(score: number | null): string {
  if (score === null || score === undefined) return "Unscored";
  if (score >= 4.5) return "Exceptional";
  if (score >= 3.5) return "Strong";
  if (score >= 2.5) return "Moderate";
  if (score >= 1.5) return "Below Bar";
  return "No Hire";
}

export function scoreColor(score: number | null): string {
  if (score === null || score === undefined) return "text-muted-foreground";
  if (score >= 4.5) return "text-emerald-400";
  if (score >= 3.5) return "text-primary";
  if (score >= 2.5) return "text-yellow-400";
  if (score >= 1.5) return "text-orange-400";
  return "text-destructive";
}

export function scoreBadgeVariant(
  score: number | null
): "default" | "secondary" | "destructive" | "outline" {
  if (score === null) return "outline";
  if (score >= 3.5) return "default";
  if (score >= 2.5) return "secondary";
  return "destructive";
}

// ---------------------------------------------------------------------------
// FIR vs VE Scoring Adjustments
// ---------------------------------------------------------------------------

/**
 * FIR candidates weight product instinct higher.
 * VE candidates weight technical ability higher.
 * Returns an adjusted composite using role-specific weights.
 */
export function roleAdjustedScore(
  scores: {
    aiExcellence: number | null;
    technicalAbility: number | null;
    productInstinct: number | null;
    leadershipPotential: number | null;
  },
  role: "fir" | "ve"
): number | null {
  const firWeights = {
    aiExcellence: 0.35,
    technicalAbility: 0.15,
    productInstinct: 0.30,
    leadershipPotential: 0.20,
  };

  const veWeights = {
    aiExcellence: 0.35,
    technicalAbility: 0.35,
    productInstinct: 0.15,
    leadershipPotential: 0.15,
  };

  const weights = role === "fir" ? firWeights : veWeights;

  const dims: { key: ScoringDimension; val: number | null }[] = [
    { key: "aiExcellence", val: scores.aiExcellence },
    { key: "technicalAbility", val: scores.technicalAbility },
    { key: "productInstinct", val: scores.productInstinct },
    { key: "leadershipPotential", val: scores.leadershipPotential },
  ];

  const scored = dims.filter((d) => d.val !== null && d.val !== undefined);
  if (scored.length === 0) return null;

  const totalWeight = scored.reduce((sum, d) => sum + weights[d.key], 0);
  const weighted = scored.reduce(
    (sum, d) => sum + (d.val! * weights[d.key]) / totalWeight,
    0
  );

  return Math.round(weighted * 100) / 100;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export function rankCandidates<T extends { latestScore: AiFundEvaluationScore | null }>(
  candidates: T[],
  role?: "fir" | "ve"
): (T & { rank: number; adjustedScore: number | null })[] {
  const withScores = candidates.map((c) => {
    const s = c.latestScore;
    const base = s
      ? {
          aiExcellence: s.aiExcellence,
          technicalAbility: s.technicalAbility,
          productInstinct: s.productInstinct,
          leadershipPotential: s.leadershipPotential,
        }
      : {
          aiExcellence: null,
          technicalAbility: null,
          productInstinct: null,
          leadershipPotential: null,
        };

    const adjustedScore = role
      ? roleAdjustedScore(base, role)
      : computeCompositeScore(base);

    return { ...c, adjustedScore };
  });

  withScores.sort((a, b) => {
    if (a.adjustedScore === null && b.adjustedScore === null) return 0;
    if (a.adjustedScore === null) return 1;
    if (b.adjustedScore === null) return -1;
    return b.adjustedScore - a.adjustedScore;
  });

  return withScores.map((c, i) => ({ ...c, rank: i + 1 }));
}

export function comparePriorityScores(
  left: AiFundEvaluationScore | null,
  right: AiFundEvaluationScore | null
): number {
  const leftEv = left?.expectedValue ?? null;
  const rightEv = right?.expectedValue ?? null;
  if (leftEv === null && rightEv === null) {
    const leftComposite = left?.compositeScore ?? null;
    const rightComposite = right?.compositeScore ?? null;
    if (leftComposite === null && rightComposite === null) return 0;
    if (leftComposite === null) return 1;
    if (rightComposite === null) return -1;
    return rightComposite - leftComposite;
  }
  if (leftEv === null) return 1;
  if (rightEv === null) return -1;
  if (rightEv !== leftEv) return rightEv - leftEv;

  const leftProbability = left?.closabilityProbabilityPct ?? null;
  const rightProbability = right?.closabilityProbabilityPct ?? null;
  if (leftProbability === null && rightProbability === null) return 0;
  if (leftProbability === null) return 1;
  if (rightProbability === null) return -1;
  if (rightProbability !== leftProbability) return rightProbability - leftProbability;

  const leftComposite = left?.compositeScore ?? null;
  const rightComposite = right?.compositeScore ?? null;
  if (leftComposite === null && rightComposite === null) return 0;
  if (leftComposite === null) return 1;
  if (rightComposite === null) return -1;
  return rightComposite - leftComposite;
}
