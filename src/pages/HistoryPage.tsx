import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Search, Trash2, RefreshCw, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSearchHistory } from '@/hooks/useSearchHistory'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function getQueryText(entry: ReturnType<typeof useSearchHistory>['history'][0]): string {
  const q = entry.query_params
  const parts: string[] = []
  if (q.capability_query) parts.push(q.capability_query)
  if (q.name) parts.push(q.name)
  if (q.company) parts.push(`@ ${q.company}`)
  if (q.role) parts.push(`(${q.role})`)
  if (q.github_handle) parts.push(`gh:${q.github_handle}`)
  return parts.join(' ') || 'Search'
}

const PAGE_SIZE = 50

export function HistoryPage() {
  const navigate = useNavigate()
  const { history, removeEntry, clearHistory } = useSearchHistory()
  const [page, setPage] = useState(0)
  const [confirmClear, setConfirmClear] = useState(false)

  const totalPages = Math.ceil(history.length / PAGE_SIZE)
  const pageEntries = history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleRerun = (entry: typeof history[0]) => {
    if (entry.metadata?.type === 'research_strategy' && entry.metadata.strategy) {
      navigate('/research', { state: { strategy: entry.metadata.strategy } })
    } else {
      navigate('/search', { state: { query: entry.query_params } })
    }
  }

  if (history.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Clock}
          title="No search history"
          description="Your past searches will appear here"
        />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Search History
          <span className="text-sm text-muted-foreground font-normal">({history.length})</span>
        </h2>
        {!confirmClear ? (
          <Button size="sm" variant="ghost" onClick={() => setConfirmClear(true)} className="text-muted-foreground text-xs gap-1">
            <Trash2 className="w-3 h-3" />
            Clear All
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" onClick={() => { clearHistory(); setConfirmClear(false) }} className="text-xs">
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)} className="text-xs">
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {pageEntries.map(entry => {
          const isStrategy = entry.metadata?.type === 'research_strategy'
          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
            >
              <div className="shrink-0">
                {isStrategy ? (
                  <FlaskConical className="w-4 h-4 text-primary" />
                ) : (
                  <Search className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate" title={getQueryText(entry)}>
                  {getQueryText(entry)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.result_count} result{entry.result_count !== 1 ? 's' : ''} &middot; {relativeTime(entry.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => handleRerun(entry)} className="gap-1 text-xs px-2">
                  <RefreshCw className="w-3 h-3" />
                  Re-run
                </Button>
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
