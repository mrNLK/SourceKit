import { CloudOff, X } from 'lucide-react'
import { useSyncError, clearSyncError } from '@/lib/syncErrors'

export function SyncStatusBanner() {
  const syncError = useSyncError()

  if (!syncError) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs">
      <CloudOff className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1">{syncError} — changes are saved locally and will retry on next action.</span>
      <button
        onClick={clearSyncError}
        className="p-0.5 hover:text-amber-300 transition-colors"
        aria-label="Dismiss sync error"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
