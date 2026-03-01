import type { EEAStrengthRating, EEAEnrichmentResult } from '@/types/eea';
import EEABadge from '@/components/websets/EEABadge';

interface EEAMetadataProps {
  strength?: EEAStrengthRating;
  enrichments?: EEAEnrichmentResult[];
  compact?: boolean;
}

const EEAMetadata = ({ strength, enrichments, compact = true }: EEAMetadataProps) => {
  if (!strength && (!enrichments || enrichments.length === 0)) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {strength && <EEABadge strength={strength} size="sm" />}
        {enrichments && enrichments.filter(e => e.verified).length > 0 && (
          <span className="text-[9px] font-display text-muted-foreground">
            {enrichments.filter(e => e.verified).length} verified
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {strength && <EEABadge strength={strength} size="md" />}
      {enrichments && enrichments.length > 0 && (
        <div className="space-y-1">
          {enrichments.filter(e => e.verified).map((e, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
              <div>
                <p className="text-[10px] font-display text-muted-foreground">{e.signal_name}</p>
                <p className="text-xs text-foreground font-body">{e.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EEAMetadata;
