import { Link } from 'react-router-dom'
import { MapPin, Bookmark, BookmarkCheck, ArrowUpRight, Zap, Github } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreCircle } from '@/components/ui/ScoreCircle'
import { cn, truncate } from '@/lib/utils'
import { SIGNAL_COLORS, SOURCE_COLORS } from '@/lib/signals'
import type { Candidate } from '@/types'

interface CandidateCardProps {
  candidate: Candidate
  onSave?: (candidate: Candidate) => void
  onEnrich?: (candidate: Candidate) => void
  onViewProfile?: (candidate: Candidate) => void
  onToggleWatchlist?: (candidate: Candidate) => void
  isWatchlisted?: boolean
  showScore?: boolean
  saved?: boolean
}

export function CandidateCard({
  candidate,
  onSave,
  onEnrich,
  onViewProfile,
  onToggleWatchlist,
  isWatchlisted = false,
  showScore = false,
  saved = false,
}: CandidateCardProps) {
  const sourceStyle = SOURCE_COLORS[candidate.source] || SOURCE_COLORS.web
  const initials = candidate.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="shrink-0">
            {candidate.avatar_url ? (
              <img
                src={candidate.avatar_url}
                alt={candidate.name}
                className="w-12 h-12 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center border border-border">
                <span className="text-sm font-medium text-muted-foreground">{initials}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                {saved ? (
                  <Link to={`/profile/${candidate.id}`} className="font-semibold text-foreground truncate hover:text-primary transition-colors">
                    {candidate.name}
                  </Link>
                ) : (
                  <h3 className="font-semibold text-foreground truncate">{candidate.name}</h3>
                )}
                <p className="text-sm text-muted-foreground truncate">
                  {candidate.role || candidate.title || 'Engineer'}
                  {candidate.company && <span className="text-foreground"> @ {candidate.company}</span>}
                </p>
              </div>
              {showScore && candidate.score > 0 && (
                <ScoreCircle score={candidate.score} size="sm" />
              )}
            </div>

            {/* Location */}
            {candidate.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{candidate.location}</span>
              </div>
            )}

            {/* Bio */}
            {candidate.bio && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {truncate(candidate.bio, 150)}
              </p>
            )}

            {/* Source + Signals */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge variant={candidate.source === 'linkedin' ? 'linkedin' : candidate.source === 'github' ? 'github' : 'web'}>
                {sourceStyle.label}
              </Badge>
              {candidate.github_handle && (
                <Badge variant="github" className="gap-1">
                  <Github className="w-3 h-3" />
                  {candidate.github_handle}
                </Badge>
              )}
              {candidate.signals.slice(0, 4).map((signal, i) => {
                const colors = SIGNAL_COLORS[signal.type]
                return (
                  <span
                    key={i}
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      colors.bg,
                      colors.text
                    )}
                  >
                    {signal.label}
                  </span>
                )
              })}
              {candidate.signals.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{candidate.signals.length - 4} more
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              {onEnrich && (
                <Button size="sm" variant="outline" onClick={() => onEnrich(candidate)} className="gap-1">
                  <Zap className="w-3 h-3" />
                  Enrich
                </Button>
              )}
              {onSave && (
                <Button
                  size="sm"
                  variant={saved ? 'secondary' : 'outline'}
                  onClick={() => onSave(candidate)}
                  className="gap-1"
                  disabled={saved}
                >
                  <Bookmark className="w-3 h-3" />
                  {saved ? 'Saved' : 'Save'}
                </Button>
              )}
              {onToggleWatchlist && saved && (
                <Button
                  size="sm"
                  variant={isWatchlisted ? 'secondary' : 'ghost'}
                  onClick={() => onToggleWatchlist(candidate)}
                  className="gap-1"
                >
                  {isWatchlisted ? <BookmarkCheck className="w-3 h-3 text-primary" /> : <Bookmark className="w-3 h-3" />}
                </Button>
              )}
              {onViewProfile && (
                <Button size="sm" variant="ghost" onClick={() => onViewProfile(candidate)} className="gap-1 ml-auto">
                  <ArrowUpRight className="w-3 h-3" />
                  Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
