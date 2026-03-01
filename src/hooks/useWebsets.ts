import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Webset, WebsetItem } from '@/services/websets'
import { getWebset, getWebsetItems } from '@/services/websets'

export interface WebsetRef {
  id: string
  query: string
  count: number
  status: string
  createdAt: string
}

export function useWebsets() {
  const [websetRefs, setWebsetRefs] = useState<WebsetRef[]>([])
  const websetRefsRef = useRef(websetRefs)
  websetRefsRef.current = websetRefs
  const [activeWebset, setActiveWebset] = useState<Webset | null>(null)
  const [items, setItems] = useState<WebsetItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load refs from Supabase on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return
      supabase
        .from('webset_refs')
        .select('id, query, count, status, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setWebsetRefs(data.map(r => ({
              id: r.id,
              query: r.query,
              count: r.count,
              status: r.status,
              createdAt: r.created_at,
            })))
          }
        })
    })
  }, [])

  // supabase is a stable module-level singleton — safe to omit from deps
  const addWebsetRef = useCallback(async (ref: WebsetRef) => {
    setWebsetRefs(prev => [ref, ...prev])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const { error } = await supabase.from('webset_refs').upsert({
          id: ref.id,
          user_id: session.user.id,
          query: ref.query,
          count: ref.count,
          status: ref.status,
          created_at: ref.createdAt,
        }, { onConflict: 'id' })
        if (error) console.error('Failed to persist webset ref:', error.message)
      }
    } catch (err) {
      console.error('Failed to persist webset ref:', err)
    }
  }, [])

  const removeWebsetRef = useCallback(async (id: string) => {
    // Capture snapshot atomically inside the updater to avoid stale closures
    let snapshot: WebsetRef[] = []
    setWebsetRefs(prev => {
      snapshot = prev
      return prev.filter(r => r.id !== id)
    })
    if (activeWebset?.id === id) {
      setActiveWebset(null)
      setItems([])
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const { error } = await supabase.from('webset_refs').delete().eq('id', id).eq('user_id', session.user.id)
        if (error) { console.error('Failed to delete webset ref:', error.message); setWebsetRefs(snapshot) }
      }
    } catch (err) {
      console.error('Failed to delete webset ref:', err)
      setWebsetRefs(snapshot)
    }
  }, [activeWebset])

  // supabase, getWebset, getWebsetItems are stable module-level imports — safe to omit from deps
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
      setWebsetRefs(prev => prev.map(r =>
        r.id === id ? { ...r, status: webset.status } : r
      ))
      // Update status in DB
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await supabase.from('webset_refs').update({ status: webset.status }).eq('id', id).eq('user_id', session.user.id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load webset'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
      setWebsetRefs(prev => prev.map(r =>
        r.id === activeWebset.id ? { ...r, status: webset.status } : r
      ))
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await supabase.from('webset_refs').update({ status: webset.status }).eq('id', activeWebset.id).eq('user_id', session.user.id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh webset'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [activeWebset])

  const clearAll = useCallback(async () => {
    let snapshot: WebsetRef[] = []
    setWebsetRefs(prev => {
      snapshot = prev
      return []
    })
    setActiveWebset(null)
    setItems([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const { error } = await supabase.from('webset_refs').delete().eq('user_id', session.user.id)
        if (error) { console.error('Failed to clear webset refs:', error.message); setWebsetRefs(snapshot) }
      }
    } catch (err) {
      console.error('Failed to clear webset refs:', err)
      setWebsetRefs(snapshot)
    }
  }, [])

  return {
    websetRefs,
    activeWebset,
    items,
    isLoading,
    error,
    addWebsetRef,
    removeWebsetRef,
    setActiveWebsetId,
    refreshActiveWebset,
    clearAll,
  }
}
