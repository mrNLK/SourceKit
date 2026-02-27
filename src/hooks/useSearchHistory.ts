import { useState, useCallback, useEffect } from 'react'
import type { SearchHistoryEntry, SearchQuery, SearchHistoryMetadata } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { addSyncError } from '@/lib/syncErrors'

const STORAGE_KEY = 'sourcekit_search_history'
const MAX_HISTORY = 50

function loadHistory(): SearchHistoryEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function useSearchHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadHistory)

  // Sync from Supabase on mount
  useEffect(() => {
    if (!user) return
    supabase
      .from('search_history')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mapped: SearchHistoryEntry[] = data.map(row => {
            // metadata is stored inside query_params in Supabase — extract it cleanly
            const rawParams = row.query_params as Record<string, unknown>
            const { metadata: rawMeta, ...cleanQuery } = rawParams
            return {
              id: row.id,
              query_params: cleanQuery as SearchQuery,
              result_count: row.result_count,
              metadata: rawMeta as SearchHistoryMetadata | undefined,
              created_by: row.created_by,
              created_at: row.created_at,
            }
          })
          setHistory(mapped)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
        }
      })
  }, [user])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }, [history])

  const addEntry = useCallback((query: SearchQuery, resultCount: number, metadata?: SearchHistoryMetadata) => {
    const entry: SearchHistoryEntry = {
      id: crypto.randomUUID(),
      query_params: query,
      result_count: resultCount,
      metadata,
      created_by: user?.id,
      created_at: new Date().toISOString(),
    }
    setHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY))

    if (user) {
      supabase.from('search_history').insert({
        id: entry.id,
        query_params: { ...query, metadata },
        result_count: resultCount,
        created_by: user.id,
        created_at: entry.created_at,
      }).then(({ error }) => {
        if (error) { console.error('Failed to save search history to Supabase:', error); addSyncError('Failed to sync search history to cloud') }
      })
    }
  }, [user])

  const removeEntry = useCallback((id: string) => {
    setHistory(prev => prev.filter(e => e.id !== id))

    if (user) {
      supabase.from('search_history').delete().eq('id', id).eq('created_by', user.id).then(({ error }) => {
        if (error) { console.error('Failed to delete search history from Supabase:', error); addSyncError('Failed to sync history deletion to cloud') }
      })
    }
  }, [user])

  const clearHistory = useCallback(() => {
    setHistory([])

    if (user) {
      supabase.from('search_history').delete().eq('created_by', user.id).then(({ error }) => {
        if (error) { console.error('Failed to clear search history from Supabase:', error); addSyncError('Failed to sync history clear to cloud') }
      })
    }
  }, [user])

  return { history, addEntry, removeEntry, clearHistory }
}
