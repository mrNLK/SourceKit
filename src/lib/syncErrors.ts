import { useSyncExternalStore } from 'react'

/**
 * Global sync error tracker for surfacing Supabase/cloud sync failures to the user.
 * Hooks call addSyncError() when cloud operations fail; the SyncStatusBanner reads them.
 */

let _lastError: string | null = null
let _listeners: Array<() => void> = []

function notify() {
  _listeners.forEach(l => l())
}

export function addSyncError(msg: string) {
  _lastError = msg
  notify()
}

export function clearSyncError() {
  _lastError = null
  notify()
}

export function useSyncError(): string | null {
  return useSyncExternalStore(
    (cb) => {
      _listeners.push(cb)
      return () => {
        _listeners = _listeners.filter(l => l !== cb)
      }
    },
    () => _lastError,
  )
}
