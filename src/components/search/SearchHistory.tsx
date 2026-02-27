import { useNavigate } from 'react-router-dom'
import { Clock, RotateCcw, X, Trash2, FlaskConical, Building2, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SearchHistoryEntry, SearchQuery } from '@/types'

interface SearchHistoryProps {
  history: SearchHistoryEntry[]
  onRerun: (query: SearchQuery) => void
  onDelete: (id: string) => void
  onClear: () => void
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function querySummary(q: SearchQuery): string {
  const parts: string[] = []
  if (q.capability_query) parts.push(`"${q.capability_query}"`)
  if (q.name) parts.push(q.name)
  if (q.company) parts.push(`@ ${q.company}`)
  if (q.role) parts.push(q.role)
  if (q.github_handle) parts.push(`gh:${q.github_handle}`)
  return parts.join(' ') || 'Empty search'
}

function ResearchStrategyEntry({
  entry,
  onDelete,
}: {
  entry: SearchHistoryEntry
  onDelete: (id: string) => void
}) {
  const navigate = useNavigate()
  const meta = entry.metadata!
  const strategy = meta.strategy!

  return (
    <div className="px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <FlaskConical className="w-3.5 h-3.5" />
          Research Strategy
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="p-1 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-3 text-sm">
          {meta.role && (
            <span className="flex items-center gap-1 text-foreground">
              <Briefcase className="w-3 h-3 text-muted-foreground" />
              {meta.role}
            </span>
          )}
          {meta.company && (
            <span className="flex items-center gap-1 text-foreground">
              <Building2 className="w-3 h-3 text-muted-foreground" />
              {meta.company}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{strategy.targetRepos.length} repos</span>
          <span>{strategy.targetCompanies.length} companies</span>
          <span>{entry.result_count} results</span>
          <span>{formatTimeAgo(entry.created_at)}</span>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="mt-2 gap-1 text-xs h-7 border-primary/30 text-primary hover:bg-primary/20"
        onClick={() => navigate('/research', { state: { strategy } })}
      >
        <RotateCcw className="w-3 h-3" />
        Re-run Strategy
      </Button>
    </div>
  )
}

export function SearchHistory({ history, onRerun, onDelete, onClear }: SearchHistoryProps) {
  if (history.length === 0) return null

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Recent Searches</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs text-muted-foreground gap-1">
          <Trash2 className="w-3 h-3" />
          Clear
        </Button>
      </div>
      <div className="space-y-1">
        {history.map(entry =>
          entry.metadata?.type === 'research_strategy' && entry.metadata.strategy ? (
            <ResearchStrategyEntry key={entry.id} entry={entry} onDelete={onDelete} />
          ) : (
            <div
              key={entry.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{querySummary(entry.query_params)}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.result_count} results &middot; {formatTimeAgo(entry.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onRerun(entry.query_params)}
                  className="p-1.5 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
