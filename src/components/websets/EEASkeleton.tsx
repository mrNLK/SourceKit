/**
 * Skeleton loading states for WebsetEEAView.
 * Shimmer placeholders shown while enrichments are processing.
 */

const shimmer = 'animate-pulse bg-muted-foreground/10 rounded';

export function EEAItemSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden p-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded ${shimmer}`} />
        <div className="flex-1 space-y-1.5">
          <div className={`h-4 w-3/5 ${shimmer}`} />
          <div className={`h-3 w-2/5 ${shimmer}`} />
        </div>
        <div className={`h-6 w-16 rounded-md ${shimmer}`} />
      </div>
    </div>
  );
}

export function EEAStatsBarSkeleton() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`h-6 w-20 rounded-full ${shimmer}`} />
      ))}
      <div className="flex-1" />
      <div className={`h-6 w-16 rounded-full ${shimmer}`} />
    </div>
  );
}

export function EEAViewSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <EEAStatsBarSkeleton />
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <EEAItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default EEAViewSkeleton;
