import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const STORAGE_KEY = 'sourcekit_watchlist'

export interface WatchlistItem {
  id: string
  candidate_id: string
  notes: string
  created_at: string
}

function loadFromCache(): WatchlistItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function useWatchlist() {
  const { user } = useAuth()
  const [items, setItems] = useState<WatchlistItem[]>(loadFromCache)

  // Sync from Supabase
  useEffect(() => {
    if (!user) return
    supabase
      .from('watchlist_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const mapped: WatchlistItem[] = data.map(row => ({
            id: row.id,
            candidate_id: row.candidate_id,
            notes: row.notes || '',
            created_at: row.created_at,
          }))
          setItems(mapped)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
        }
      })
  }, [user])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const isWatchlisted = useCallback((candidateId: string) => {
    return items.some(i => i.candidate_id === candidateId)
  }, [items])

  const toggleWatchlist = useCallback((candidateId: string) => {
    const existing = items.find(i => i.candidate_id === candidateId)
    if (existing) {
      setItems(prev => prev.filter(i => i.candidate_id !== candidateId))
      if (user) {
        supabase.from('watchlist_items').delete().eq('id', existing.id).eq('user_id', user.id).then(({ error }) => {
          if (error) console.error('Failed to remove from watchlist:', error)
        })
      }
    } else {
      const newItem: WatchlistItem = {
        id: crypto.randomUUID(),
        candidate_id: candidateId,
        notes: '',
        created_at: new Date().toISOString(),
      }
      setItems(prev => [newItem, ...prev])
      if (user) {
        supabase.from('watchlist_items').insert({
          id: newItem.id,
          candidate_id: candidateId,
          user_id: user.id,
          notes: '',
          created_at: newItem.created_at,
        }).then(({ error }) => {
          if (error) console.error('Failed to add to watchlist:', error)
        })
      }
    }
  }, [items, user])

  const updateNotes = useCallback((candidateId: string, notes: string) => {
    setItems(prev => prev.map(i => i.candidate_id === candidateId ? { ...i, notes } : i))
    const item = items.find(i => i.candidate_id === candidateId)
    if (user && item) {
      supabase.from('watchlist_items').update({ notes }).eq('id', item.id).eq('user_id', user.id).then(({ error }) => {
        if (error) console.error('Failed to update watchlist notes:', error)
      })
    }
  }, [items, user])

  return {
    items,
    watchlistCount: items.length,
    isWatchlisted,
    toggleWatchlist,
    updateNotes,
  }
}
