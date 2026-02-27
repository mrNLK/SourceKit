import { useState, useCallback, useEffect, useSyncExternalStore } from 'react'
import type { Candidate, CandidateStage } from '@/types'
import { calculateScore } from '@/lib/scoring'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { addSyncError } from '@/lib/syncErrors'

const STORAGE_KEY = 'sourcekit_candidates'

function loadCandidatesFromCache(): Candidate[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveCandidatesToCache(candidates: Candidate[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates))
    return true
  } catch (err) {
    console.error('Failed to save candidates to localStorage:', err)
    return false
  }
}

let _saveError = false
let _saveErrorListeners: Array<() => void> = []
function setSaveErrorExternal(val: boolean) {
  if (_saveError !== val) {
    _saveError = val
    _saveErrorListeners.forEach(l => l())
  }
}

export function useCandidates() {
  const { user } = useAuth()
  const [candidates, setCandidates] = useState<Candidate[]>(loadCandidatesFromCache)
  const [stageFilter, setStageFilter] = useState<CandidateStage | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [sortByScore, setSortByScore] = useState(false)
  const saveError = useSyncExternalStore(
    (cb) => { _saveErrorListeners.push(cb); return () => { _saveErrorListeners = _saveErrorListeners.filter(l => l !== cb) } },
    () => _saveError,
  )

  // Sync from Supabase on mount when authenticated
  useEffect(() => {
    if (!user) return
    supabase
      .from('candidates')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mapped = data.map(mapDbToCandidate)
          setCandidates(mapped)
          saveCandidatesToCache(mapped)
        }
      })
  }, [user])

  // Save to localStorage cache whenever candidates change
  useEffect(() => {
    const ok = saveCandidatesToCache(candidates)
    setSaveErrorExternal(!ok)
  }, [candidates])

  const addCandidate = useCallback((candidate: Omit<Candidate, 'id' | 'created_at' | 'stage' | 'score' | 'notes' | 'tags'>) => {
    const isDuplicate = candidates.some(
      c => (candidate.github_handle && c.github_handle === candidate.github_handle) ||
           (c.name.toLowerCase() === candidate.name.toLowerCase() &&
            c.company.toLowerCase() === candidate.company.toLowerCase())
    )
    if (isDuplicate) {
      return { success: false, error: 'Duplicate candidate: same name and company already exists' }
    }

    const newCandidate: Candidate = {
      ...candidate,
      id: crypto.randomUUID(),
      stage: 'sourced',
      score: 0,
      notes: '',
      tags: [],
      created_by: user?.id,
      created_at: new Date().toISOString(),
    }
    newCandidate.score = calculateScore(newCandidate)
    setCandidates(prev => [newCandidate, ...prev])

    if (user) {
      supabase.from('candidates').insert(mapCandidateToDb(newCandidate, user.id)).then(({ error }) => {
        if (error) { console.error('Failed to save candidate to Supabase:', error); addSyncError('Failed to sync candidate to cloud') }
      })
    }

    return { success: true, candidate: newCandidate }
  }, [candidates, user])

  const updateCandidate = useCallback((id: string, updates: Partial<Candidate>) => {
    setCandidates(prev => prev.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, ...updates, updated_at: new Date().toISOString() }
      if (updates.signals || updates.github_profile || updates.enrichment_data) {
        updated.score = calculateScore(updated)
      }
      return updated
    }))

    if (user) {
      const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const [key, value] of Object.entries(updates)) {
        dbUpdates[key] = value
      }
      supabase.from('candidates').update(dbUpdates).eq('id', id).eq('created_by', user.id).then(({ error }) => {
        if (error) { console.error('Failed to update candidate in Supabase:', error); addSyncError('Failed to sync candidate update to cloud') }
      })
    }
  }, [user])

  const deleteCandidate = useCallback((id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id))

    if (user) {
      supabase.from('candidates').delete().eq('id', id).eq('created_by', user.id).then(({ error }) => {
        if (error) { console.error('Failed to delete candidate from Supabase:', error); addSyncError('Failed to sync deletion to cloud') }
      })
    }
  }, [user])

  const updateStage = useCallback((id: string, stage: CandidateStage) => {
    updateCandidate(id, { stage })
  }, [updateCandidate])

  const updateNotes = useCallback((id: string, notes: string) => {
    updateCandidate(id, { notes })
  }, [updateCandidate])

  const addTag = useCallback((id: string, tag: string) => {
    const normalized = tag.toLowerCase().replace(/^#/, '')
    setCandidates(prev => prev.map(c => {
      if (c.id !== id || c.tags.includes(normalized)) return c
      const updated = { ...c, tags: [...c.tags, normalized] }
      if (user) {
        supabase.from('candidates').update({ tags: updated.tags }).eq('id', id).eq('created_by', user.id).then(({ error }) => {
          if (error) { console.error('Failed to update tags in Supabase:', error); addSyncError('Failed to sync tags to cloud') }
        })
      }
      return updated
    }))
  }, [user])

  const removeTag = useCallback((id: string, tag: string) => {
    setCandidates(prev => prev.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, tags: c.tags.filter(t => t !== tag) }
      if (user) {
        supabase.from('candidates').update({ tags: updated.tags }).eq('id', id).eq('created_by', user.id).then(({ error }) => {
          if (error) { console.error('Failed to update tags in Supabase:', error); addSyncError('Failed to sync tags to cloud') }
        })
      }
      return updated
    }))
  }, [user])

  const filteredCandidates = candidates
    .filter(c => stageFilter === 'all' || c.stage === stageFilter)
    .filter(c => tagFilter.length === 0 || tagFilter.some(t => c.tags.includes(t)))
    .sort((a, b) => {
      if (sortByScore) return b.score - a.score
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const stageCounts = candidates.reduce((acc, c) => {
    acc[c.stage] = (acc[c.stage] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const allTags = [...new Set(candidates.flatMap(c => c.tags))].sort()

  return {
    candidates: filteredCandidates,
    allCandidates: candidates,
    stageCounts,
    allTags,
    stageFilter,
    setStageFilter,
    tagFilter,
    setTagFilter,
    sortByScore,
    setSortByScore,
    saveError,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    updateStage,
    updateNotes,
    addTag,
    removeTag,
  }
}

function mapDbToCandidate(row: Record<string, unknown>): Candidate {
  return {
    id: row.id as string,
    name: row.name as string,
    company: (row.company as string) || '',
    role: (row.role as string) || '',
    title: row.title as string | undefined,
    location: row.location as string | undefined,
    bio: row.bio as string | undefined,
    avatar_url: row.avatar_url as string | undefined,
    profile_url: row.profile_url as string | undefined,
    github_handle: row.github_handle as string | undefined,
    source: (row.source as Candidate['source']) || 'web',
    enrichment_data: row.enrichment_data as Candidate['enrichment_data'],
    github_profile: row.github_profile as Candidate['github_profile'],
    stage: (row.stage as CandidateStage) || 'sourced',
    score: (row.score as number) || 0,
    notes: (row.notes as string) || '',
    tags: (row.tags as string[]) || [],
    signals: (row.signals as Candidate['signals']) || [],
    created_by: row.created_by as string | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string | undefined,
  }
}

function mapCandidateToDb(c: Candidate, userId: string): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    role: c.role,
    title: c.title,
    location: c.location,
    bio: c.bio,
    avatar_url: c.avatar_url,
    profile_url: c.profile_url,
    github_handle: c.github_handle,
    source: c.source,
    enrichment_data: c.enrichment_data,
    github_profile: c.github_profile,
    stage: c.stage,
    score: c.score,
    notes: c.notes,
    tags: c.tags,
    signals: c.signals,
    created_by: userId,
    created_at: c.created_at,
  }
}
