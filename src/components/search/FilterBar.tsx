import { cn } from '@/lib/utils'
import type { SourceType } from '@/types'

interface FilterBarProps {
  activeFilter: SourceType | 'all'
  onFilterChange: (filter: SourceType | 'all') => void
  counts: Record<string, number>
}

const filters: Array<{ value: SourceType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'exa', label: 'Exa' },
  { value: 'web', label: 'Other' },
]

export function FilterBar({ activeFilter, onFilterChange, counts }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
      {filters.map(({ value, label }) => {
        const count = value === 'all'
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : counts[value] || 0

        return (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              activeFilter === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                'text-xs px-1.5 rounded-full',
                activeFilter === value ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-border text-muted-foreground'
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
