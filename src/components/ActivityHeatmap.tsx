import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DayContribution {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  days: DayContribution[];
  compact?: boolean;
}

function getColor(count: number): string {
  if (count === 0) return 'bg-secondary/50';
  if (count <= 2) return 'bg-emerald-900/60';
  if (count <= 5) return 'bg-emerald-700/70';
  if (count <= 10) return 'bg-emerald-500/80';
  return 'bg-emerald-400';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ActivityHeatmap = ({ days, compact = false }: ActivityHeatmapProps) => {
  // In compact mode, only show last ~90 days (13 weeks)
  const displayDays = compact ? days.slice(-91) : days;

  // Group into weeks (7 days each)
  const weeks: DayContribution[][] = [];
  for (let i = 0; i < displayDays.length; i += 7) {
    weeks.push(displayDays.slice(i, i + 7));
  }

  const cellSize = compact ? 8 : 11;
  const gap = compact ? 1 : 2;

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div
          className="inline-flex gap-[1px]"
          style={{ gap: `${gap}px` }}
        >
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="flex flex-col"
              style={{ gap: `${gap}px` }}
            >
              {week.map((day) => (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div
                      className={`rounded-[2px] ${getColor(day.count)} transition-colors hover:ring-1 hover:ring-primary/50`}
                      style={{ width: cellSize, height: cellSize }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <span className="font-display font-semibold">{day.count}</span>
                    {' '}contribution{day.count !== 1 ? 's' : ''} on {formatDate(day.date)}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ActivityHeatmap;
