import type { EEAStrengthRating } from '@/types/eea';
import { EEA_STRENGTH_COLORS } from '@/lib/eea-webset';

interface EEABadgeProps {
  strength: EEAStrengthRating;
  size?: 'sm' | 'md';
}

const EEABadge = ({ strength, size = 'sm' }: EEABadgeProps) => {
  const colors = EEA_STRENGTH_COLORS[strength];

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center font-display font-semibold rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses}`}>
      {strength}
    </span>
  );
};

export default EEABadge;
