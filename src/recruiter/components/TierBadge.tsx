import { TIER_CONFIG } from '../lib/constants';
import type { CandidateTier } from '../lib/types';

interface TierBadgeProps {
  tier: CandidateTier;
  size?: 'sm' | 'md';
}

export default function TierBadge({ tier, size = 'sm' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span className={`inline-flex items-center font-mono font-semibold rounded border ${config.color} ${config.bgColor} ${config.borderColor} ${sizeClasses}`}>
      {config.label}
    </span>
  );
}
