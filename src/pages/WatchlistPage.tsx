import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, BookmarkX, MessageSquare, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCandidates } from '@/hooks/useCandidates'
import { useWatchlist } from '@/hooks/useWatchlist'

export function WatchlistPage() {
  const { allCandidates } = useCandidates()
  const { items, toggleWatchlist, updateNotes } = useWatchlist()
  const [editingNotes, setEditingNotes] = useState<string | null>(null)

  const watchlistedCandidates = items
    .map(item => {
      const candidate = allCandidates.find(c => c.id === item.candidate_id)
      return candidate ? { ...candidate, watchlistNotes: item.notes, watchlistId: item.id } : null
    })
    .filter(Boolean) as Array<ReturnType<typeof useCandidates>['allCandidates'][0] & { watchlistNotes: string; watchlistId: string }>

  if (watchlistedCandidates.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Bookmark}
          title="Watchlist is empty"
          description="Bookmark candidates from Search or Pipeline to add them here"
        />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Bookmark className="w-5 h-5 text-primary" />
        Watchlist
        <span className="text-sm text-muted-foreground font-normal">({watchlistedCandidates.length})</span>
      </h2>

      <div className="space-y-3">
        {watchlistedCandidates.map(candidate => (
          <Card key={candidate.id}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="shrink-0">
                  {candidate.avatar_url ? (
                    <img src={candidate.avatar_url} alt={candidate.name} className="w-10 h-10 rounded-full border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{candidate.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {candidate.role || 'Engineer'} {candidate.company && `@ ${candidate.company}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link to={`/profile/${candidate.id}`}>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs">
                          <ArrowUpRight className="w-3 h-3" />
                          Profile
                        </Button>
                      </Link>
                      <button
                        onClick={() => toggleWatchlist(candidate.id)}
                        className="p-1 text-primary hover:text-destructive transition-colors"
                        title="Remove from watchlist"
                      >
                        <BookmarkX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  {editingNotes === candidate.id ? (
                    <div className="mt-2">
                      <Textarea
                        defaultValue={candidate.watchlistNotes}
                        placeholder="Add notes..."
                        className="text-sm min-h-[60px]"
                        onBlur={(e) => {
                          updateNotes(candidate.id, e.target.value)
                          setEditingNotes(null)
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingNotes(candidate.id)}
                      className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      {candidate.watchlistNotes || 'Add notes'}
                    </button>
                  )}
                  {candidate.watchlistNotes && editingNotes !== candidate.id && (
                    <p className="text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => setEditingNotes(candidate.id)}>
                      {candidate.watchlistNotes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
