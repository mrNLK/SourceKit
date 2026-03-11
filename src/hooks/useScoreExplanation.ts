import { useState, useCallback } from 'react';
import type { Developer } from '@/types/developer';

export interface ScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  evidence: string[];
}

export interface ScoreExplanation {
  developer: Developer;
  overall: number;
  categories: ScoreCategory[];
  gaps: string[];
}

function deriveExplanation(dev: Developer): ScoreExplanation {
  const categories: ScoreCategory[] = [];

  // Technical Skills (0-25)
  const techScore = Math.min(25, Math.round(
    (dev.topLanguages?.length || 0) * 3 +
    Math.min(10, (dev.publicRepos || 0) / 5) +
    (dev.highlights?.length || 0) * 2
  ));
  const techEvidence: string[] = [];
  if (dev.topLanguages?.length) techEvidence.push(`Proficient in ${dev.topLanguages.slice(0, 3).map(l => l.name).join(', ')}`);
  if (dev.publicRepos > 20) techEvidence.push(`Maintains ${dev.publicRepos} public repositories`);
  if (dev.highlights?.length) techEvidence.push(`${dev.highlights.length} notable highlights identified`);
  categories.push({ name: 'Technical Skills', score: techScore, maxScore: 25, evidence: techEvidence });

  // Experience & Impact (0-25)
  const impactScore = Math.min(25, Math.round(
    Math.min(10, (dev.stars || 0) / 100) +
    Math.min(8, (dev.followers || 0) / 50) +
    Math.min(7, Object.keys(dev.contributedRepos || {}).length)
  ));
  const impactEvidence: string[] = [];
  if (dev.stars > 0) impactEvidence.push(`${dev.stars.toLocaleString()} total stars across repositories`);
  if (dev.followers > 0) impactEvidence.push(`${dev.followers.toLocaleString()} GitHub followers`);
  const contribCount = Object.keys(dev.contributedRepos || {}).length;
  if (contribCount > 0) impactEvidence.push(`Contributed to ${contribCount} external repositories`);
  categories.push({ name: 'Experience & Impact', score: impactScore, maxScore: 25, evidence: impactEvidence });

  // Activity & Engagement (0-25)
  const recentCommits = (dev.recentActivity || []).reduce((sum, m) => sum + m.commits, 0);
  const activityScore = Math.min(25, Math.round(
    Math.min(15, recentCommits / 20) +
    Math.min(5, (dev.publicRepos || 0) / 10) +
    (dev.hiddenGem ? 5 : 0)
  ));
  const activityEvidence: string[] = [];
  if (recentCommits > 0) activityEvidence.push(`${recentCommits} commits in recent months`);
  if (dev.hiddenGem) activityEvidence.push('Identified as a hidden gem (high quality, lower visibility)');
  if (dev.joinedYear) activityEvidence.push(`GitHub member since ${dev.joinedYear}`);
  categories.push({ name: 'Activity & Engagement', score: activityScore, maxScore: 25, evidence: activityEvidence });

  // Cultural Fit Signals (0-25)
  const fitScore = Math.min(25, Math.round(
    (dev.bio?.length > 50 ? 5 : dev.bio?.length > 0 ? 2 : 0) +
    (dev.location ? 5 : 0) +
    (dev.email ? 3 : 0) +
    (dev.linkedinUrl ? 3 : 0) +
    (dev.twitterUsername ? 2 : 0) +
    (dev.recruitable ? 7 : 0)
  ));
  const fitEvidence: string[] = [];
  if (dev.bio?.length > 50) fitEvidence.push('Detailed profile bio suggests active community presence');
  if (dev.location) fitEvidence.push(`Located in ${dev.location}`);
  if (dev.recruitable) fitEvidence.push('Profile signals openness to opportunities');
  if (dev.email || dev.linkedinUrl) fitEvidence.push('Contact information available');
  categories.push({ name: 'Cultural Fit Signals', score: fitScore, maxScore: 25, evidence: fitEvidence });

  // Gaps
  const gaps: string[] = [];
  if (techScore < 10) gaps.push('Limited public technical portfolio');
  if (impactScore < 10) gaps.push('Low community impact (few stars/followers)');
  if (activityScore < 10) gaps.push('Low recent activity');
  if (!dev.email && !dev.linkedinUrl) gaps.push('No public contact information available');
  if (dev.ungettable) gaps.push(dev.ungettableReason || 'Candidate may be hard to recruit');

  return {
    developer: dev,
    overall: dev.score,
    categories,
    gaps,
  };
}

export function useScoreExplanation() {
  const [explanation, setExplanation] = useState<ScoreExplanation | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openExplanation = useCallback((dev: Developer) => {
    setExplanation(deriveExplanation(dev));
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setExplanation(null);
  }, []);

  return { explanation, isOpen, openExplanation, close };
}
