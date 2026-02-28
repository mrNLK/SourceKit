import { useState, useCallback, useEffect } from 'react'
import type { Webset, WebsetItem } from '@/services/websets'
import { getWebset, getWebsetItems } from '@/services/websets'

const STORAGE_KEY = 'sourcekit_websets'

export interface WebsetRef {
  id: string
  query: string
  count: number
  status: string
  createdAt: string
}

function loadRefs(): WebsetRef[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function useWebsets() {
  const [websetRefs, setWebsetRefs] = useState<WebsetRef[]>(loadRefs)
  const [activeWebset, setActiveWebset] = useState<Webset | null>(null)
  const [items, setItems] = useState<WebsetItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Persist refs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(websetRefs))
    } catch (err) {
      console.error('Failed to save webset refs:', err)
    }
  }, [websetRefs])

  const addWebsetRef = useCallback((ref: WebsetRef) => {
    setWebsetRefs(prev => [ref, ...prev])
  }, [])

  const removeWebsetRef = useCallback((id: string) => {
    setWebsetRefs(prev => prev.filter(r => r.id !== id))
    if (activeWebset?.id === id) {
      setActiveWebset(null)
      setItems([])
    }
  }, [activeWebset])

  const setActiveWebsetId = useCallback(async (id: string, exaApiKey?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const [webset, websetItems] = await Promise.all([
        getWebset(id, exaApiKey),
        getWebsetItems(id, exaApiKey),
      ])
      setActiveWebset(webset)
      setItems(websetItems)
      setWebsetRefs(prev => prev.map(r =>
        r.id === id ? { ...r, status: webset.status } : r
      ))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load webset'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshActiveWebset = useCallback(async (exaApiKey?: string) => {
    if (!activeWebset) return
    setIsLoading(true)
    setError(null)
    try {
      const [webset, websetItems] = await Promise.all([
        getWebset(activeWebset.id, exaApiKey),
        getWebsetItems(activeWebset.id, exaApiKey),
      ])
      setActiveWebset(webset)
      setItems(websetItems)
      setWebsetRefs(prev => prev.map(r =>
        r.id === activeWebset.id ? { ...r, status: webset.status } : r
      ))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh webset'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [activeWebset])

  const clearAll = useCallback(() => {
    setWebsetRefs([])
    setActiveWebset(null)
    setItems([])
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
