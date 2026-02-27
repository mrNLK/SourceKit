import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, MessageSquare, Trash2, Hash, X, Send, ArrowUpRight, Bookmark, BookmarkCheck, GripVertical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AvailabilityBadge } from '@/components/ui/AvailabilityBadge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Candidate, CandidateStage } from '@/types'

const STAGES: Array<{ value: CandidateStage; label: string; color: string }> = [
  { value: 'sourced', label: 'Sourced', color: 'text-blue-400' },
  { value: 'contacted', label: 'Contacted', color: 'text-violet-400' },
  { value: 'responded', label: 'Responded', color: 'text-amber-400' },
  { value: 'screen', label: 'Screen', color: 'text-orange-400' },
  { value: 'offer', label: 'Offer', color: 'text-green-400' },
]

interface PipelineCardProps {
  candidate: Candidate
  onUpdateStage: (id: string, stage: CandidateStage) => void
  onUpdateNotes: (id: string, notes: string) => void
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onDelete: (id: string) => void
  onGenerateOutreach: (candidate: Candidate) => void
  onToggleWatchlist?: (id: string) => void
  isWatchlisted?: boolean
}

export function PipelineCard({
  candidate,
  onUpdateStage,
  onUpdateNotes,
  onAddTag,
  onRemoveTag,
  onDelete,
  onGenerateOutreach,
  onToggleWatchlist,
  isWatchlisted = false,
}: PipelineCardProps) {
  const [showStages, setShowStages] = useState(false)
  const [notes, setNotes] = useState(candidate.notes)
  const [tagInput, setTagInput] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const currentStage = STAGES.find(s => s.value === candidate.stage) || STAGES[0]

  const handleNotesBlur = () => {
    if (notes !== candidate.notes) {
      onUpdateNotes(candidate.id, notes)
    }
  }

  const handleTagSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const sanitized = tagInput.trim().replace(/[<>"'&]/g, '').slice(0, 30)
      if (sanitized) onAddTag(candidate.id, sanitized)
      setTagInput('')
    }
  }

  const initials = candidate.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card className="cursor-grab active:cursor-grabbing">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Drag handle */}
          <div className="shrink-0 flex items-start pt-2 text-muted-foreground/50">
            <GripVertical className="w-4 h-4" />
          </div>
          {/* Avatar */}
          <div className="shrink-0">
            {candidate.avatar_url ? (
              <img
                src={candidate.avatar_url}
                alt={candidate.name}
                className="w-10 h-10 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">{initials}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-foreground">{candidate.name}</h3>
                  {candidate.score > 0 && (
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold font-mono',
                        candidate.score >= 80
                          ? 'bg-green-500/20 text-green-400'
                          : candidate.score >= 60
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-zinc-500/20 text-zinc-400'
                      )}
                    >
                      {candidate.score}
                    </span>
                  )}
                  <AvailabilityBadge candidate={candidate} compact />
                </div>
                <p className="text-sm text-muted-foreground">
                  {candidate.role || 'Engineer'} @ {candidate.company}
                </p>
                {/* Top languages */}
                {candidate.github_profile?.top_languages && candidate.github_profile.top_languages.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {candidate.github_profile.top_languages.slice(0, 2).map(lang => (
                      <span
                        key={lang.language}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-500/20 text-indigo-400"
                      >
                        {lang.language}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowStages(!showStages)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary',
                    currentStage.color
                  )}
                >
                  {currentStage.label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showStages && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-10">
                    {STAGES.map(stage => (
                      <button
                        key={stage.value}
                        onClick={() => {
                          onUpdateStage(candidate.id, stage.value)
                          setShowStages(false)
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2.5 text-sm hover:bg-secondary transition-colors first:rounded-t-lg last:rounded-b-lg',
                          stage.value === candidate.stage ? stage.color : 'text-foreground'
                        )}
                      >
                        {stage.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {candidate.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono"
                >
                  #{tag}
                  <button
                    onClick={() => onRemoveTag(candidate.id, tag)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="relative">
                <Hash className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  ref={tagInputRef}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagSubmit}
                  placeholder="add tag"
                  className="w-20 pl-5 pr-1 py-0.5 text-xs bg-transparent border-b border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Notes toggle + textarea */}
            <div className="mt-2">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                {candidate.notes ? 'Edit notes' : 'Add notes'}
              </button>
              {showNotes && (
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add notes about this candidate..."
                  className="mt-2 text-sm min-h-[60px]"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => onGenerateOutreach(candidate)} className="gap-1">
                <Send className="w-3 h-3" />
                Outreach
              </Button>
              <Link to={`/profile/${candidate.id}`}>
                <Button size="sm" variant="ghost" className="gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  Profile
                </Button>
              </Link>
              {onToggleWatchlist && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToggleWatchlist(candidate.id)}
                  className="gap-1"
                >
                  {isWatchlisted ? <BookmarkCheck className="w-3 h-3 text-primary" /> : <Bookmark className="w-3 h-3" />}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onDelete(candidate.id)} className="gap-1 text-muted-foreground hover:text-destructive ml-auto">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
