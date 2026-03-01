import { useState, useCallback, useEffect, useRef } from 'react'
import type { Webset, WebsetItem } from '@/services/websets'
import { getWebset, getWebsetItems } from '@/services/websets'
import { supabase } from '@/integrations/supabase/client'

const POLL_INTERVAL_MS = 15_000
const STORAGE_KEY = 'sourcekit_websets'

export interface WebsetRef {
  id: string
  query: string
  count: number
  status: string
  createdAt: string
  eeaSignals?: import('@/types/eea').WebsetEEASignal[]
}

// ---------------------------------------------------------------------------
// localStorage fallback (for unauthenticated / offline)
// ---------------------------------------------------------------------------

function loadLocalRefs(): WebsetRef[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveLocalRefs(refs: WebsetRef[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(refs)) } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function fetchSupabaseRefs(): Promise<WebsetRef[] | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('webset_refs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) { console.error('Failed to load webset refs:', error); return null }

  return (data || []).map((row: any) => ({
    id: row.id,
    query: row.query,
    count: row.count,
    status: row.status,
    createdAt: row.created_at,
    eeaSignals: row.eea_signals,
  }))
}

async function upsertSupabaseRef(ref: WebsetRef): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase.from('webset_refs').upsert({
    id: ref.id,
    user_id: user.id,
    query: ref.query,
    count: ref.count,
    status: ref.status,
    eea_signals: ref.eeaSignals || null,
    updated_at: new Date().toISOString(),
  } as any, { onConflict: 'id' })

  if (error) { console.error('Failed to upsert webset ref:', error); return false }
  return true
}

async function deleteSupabaseRef(id: string): Promise<boolean> {
  const { error } = await supabase.from('webset_refs').delete().eq('id', id)
  if (error) { console.error('Failed to delete webset ref:', error); return false }
  return true
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWebsets() {
  const [websetRefs, setWebsetRefs] = useState<WebsetRef[]>(loadLocalRefs)
  const [activeWebset, setActiveWebset] = useState<Webset | null>(null)
  const [items, setItems] = useState<WebsetItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hydrated = useRef(false)

  // Hydrate from Supabase on mount (merge with localStorage)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    ;(async () => {
      const remote = await fetchSupabaseRefs()
      if (remote) {
        // Merge: remote wins for matching IDs, keep local-only refs
        const remoteIds = new Set(remote.map(r => r.id))
        const localOnly = loadLocalRefs().filter(r => !remoteIds.has(r.id))
        const merged = [...remote, ...localOnly]
        setWebsetRefs(merged)
        saveLocalRefs(merged)
        // Push local-only refs to Supabase
        for (const ref of localOnly) { await upsertSupabaseRef(ref) }
      }
    })()
  }, [])

  // Sync to localStorage on every change
  useEffect(() => { saveLocalRefs(websetRefs) }, [websetRefs])

  const addWebsetRef = useCallback((ref: WebsetRef) => {
    setWebsetRefs(prev => [ref, ...prev])
    upsertSupabaseRef(ref)
  }, [])

  const removeWebsetRef = useCallback((id: string) => {
    setWebsetRefs(prev => prev.filter(r => r.id !== id))
    deleteSupabaseRef(id)
    if (activeWebset?.id === id) {
      setActiveWebset(null)
      setItems([])
    }
  }, [activeWebset])

  const updateWebsetRef = useCallback((id: string, partial: Partial<WebsetRef>) => {
    setWebsetRefs(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...partial } : r)
      const ref = updated.find(r => r.id === id)
      if (ref) upsertSupabaseRef(ref)
      return updated
    })
  }, [])

  const setActiveWebsetId = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const [webset, websetItems] = await Promise.all([
        getWebset(id),
        getWebsetItems(id),
      ])
      setActiveWebset(webset)
      setItems(websetItems)
      updateWebsetRef(id, { status: webset.status })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load webset'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [updateWebsetRef])

  const refreshActiveWebset = useCallback(async () => {
    if (!activeWebset) return
    setIsLoading(true)
    setError(null)
    try {
      const [webset, websetItems] = await Promise.all([
        getWebset(activeWebset.id),
        getWebsetItems(activeWebset.id),
      ])
      setActiveWebset(webset)
      setItems(websetItems)
      updateWebsetRef(activeWebset.id, { status: webset.status })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh webset'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [activeWebset, updateWebsetRef])

  const clearAll = useCallback(async () => {
    // Delete all from Supabase
    for (const ref of websetRefs) { await deleteSupabaseRef(ref.id) }
    setWebsetRefs([])
    setActiveWebset(null)
    setItems([])
    saveLocalRefs([])
  }, [websetRefs])

  // Auto-poll running websets
  const pollRef = useRef<ReturnType<typeof setInterval>>()
  useEffect(() => {
    const hasRunning = websetRefs.some(r => r.status === 'running')
    if (!hasRunning) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = undefined }
      return
    }

    const poll = async () => {
      const runningRefs = websetRefs.filter(r => r.status === 'running')
      for (const ref of runningRefs) {
        try {
          const ws = await getWebset(ref.id)
          if (ws.status !== ref.status) {
            updateWebsetRef(ref.id, { status: ws.status })
          }
        } catch {
          // silent
        }
      }
      if (activeWebset && runningRefs.some(r => r.id === activeWebset.id)) {
        try {
          const [ws, wi] = await Promise.all([getWebset(activeWebset.id), getWebsetItems(activeWebset.id)])
          setActiveWebset(ws)
          setItems(wi)
        } catch {
          // silent
        }
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [websetRefs, activeWebset, updateWebsetRef])

  return {
    websetRefs,
    activeWebset,
    items,
    isLoading,
    error,
    addWebsetRef,
    removeWebsetRef,
    updateWebsetRef,
    setActiveWebsetId,
    refreshActiveWebset,
    clearAll,
  }
}
