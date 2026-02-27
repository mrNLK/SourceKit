import { useState } from 'react'
import { X, Copy, Check, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Candidate, OutreachEntry } from '@/types'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface OutreachModalProps {
  candidate: Candidate
  message: string | null
  isLoading: boolean
  history: OutreachEntry[]
  onClose: () => void
  onRegenerate: () => void
}

export function OutreachModal({ candidate, message, isLoading, history, onClose, onRegenerate }: OutreachModalProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const [copyError, setCopyError] = useState(false)

  const handleCopy = async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyError(false)
      setCopied(id || 'current')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopyError(true)
      setTimeout(() => setCopyError(false), 3000)
    }
  }

  // Past messages excluding the current one (which is shown at the top)
  const pastMessages = history.filter(e => e.message !== message)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Outreach to {candidate.name}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {copyError && (
          <p className="text-xs text-destructive mb-2">Could not copy to clipboard. Try selecting the text manually.</p>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">Generating outreach message...</p>
          </div>
        ) : message ? (
          <>
            <div className="bg-secondary rounded-lg p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono">
              {message}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => handleCopy(message)} variant="outline" size="sm" className="gap-1">
                {copied === 'current' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === 'current' ? 'Copied' : 'Copy'}
              </Button>
              <Button onClick={onRegenerate} variant="ghost" size="sm" className="gap-1">
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4">Failed to generate message. Try again.</p>
        )}

        {/* Past outreach history */}
        {pastMessages.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">
                Past messages ({pastMessages.length})
              </p>
            </div>
            <div className="space-y-3">
              {pastMessages.map(entry => (
                <div key={entry.id} className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted-foreground">{relativeTime(entry.created_at)}</span>
                    <button
                      onClick={() => handleCopy(entry.message, entry.id)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied === entry.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === entry.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3 font-mono">
                    {entry.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
