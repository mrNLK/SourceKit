import { ArrowRight } from "lucide-react";

interface FunnelCounts {
  total: number;
  afterFiltered: number;
  afterLocation: number;
  final: number;
}

interface SearchFunnelProps {
  counts: FunnelCounts;
  locationFilter: string;
}

const SearchFunnel = ({ counts, locationFilter }: SearchFunnelProps) => (
  <div className="flex items-center gap-1.5 text-[10px] font-display text-muted-foreground overflow-x-auto py-1">
    <div className="flex items-center gap-1 px-2 py-1 rounded bg-secondary border border-border shrink-0">
      <span className="font-bold text-foreground">{counts.total}</span> found
    </div>
    <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground/50" />
    <div className="flex items-center gap-1 px-2 py-1 rounded bg-secondary border border-border shrink-0">
      <span className="font-bold text-foreground">{counts.afterFiltered}</span> filtered
    </div>
    {locationFilter && (
      <>
        <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground/50" />
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-secondary border border-border shrink-0">
          <span className="font-bold text-foreground">{counts.afterLocation}</span> location
        </div>
      </>
    )}
    <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground/50" />
    <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 border border-primary/20 text-primary shrink-0">
      <span className="font-bold">{counts.final}</span> results
    </div>
  </div>
);

export default SearchFunnel;
