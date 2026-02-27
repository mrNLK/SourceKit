import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { Settings } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { addSyncError } from '@/lib/syncErrors'

const STORAGE_KEY = 'sourcekit_settings'

const DEFAULT_SETTINGS: Settings = {
  enrichment_api_url: '',
  slack_webhook_url: '',
  target_company: '',
  role_title: '',
  one_line_pitch: '',
  auto_enrich_github: true,
  github_token: '',
  results_per_search: 20,
  default_seniority: 'any',
  outreach_tone: 'professional',
  scoring_commit_weight: 50,
  scoring_star_weight: 50,
  scoring_follower_weight: 50,
  scoring_recency_weight: 50,
}

function loadSettings(): Settings {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

let _settingsSaveError = false
let _settingsSaveErrorListeners: Array<() => void> = []
function setSettingsSaveErrorExternal(val: boolean) {
  if (_settingsSaveError !== val) {
    _settingsSaveError = val
    _settingsSaveErrorListeners.forEach(l => l())
  }
}

export function useSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const saveError = useSyncExternalStore(
    (cb) => { _settingsSaveErrorListeners.push(cb); return () => { _settingsSaveErrorListeners = _settingsSaveErrorListeners.filter(l => l !== cb) } },
    () => _settingsSaveError,
  )
  const isInitialSync = useRef(true)

  // Sync from Supabase on mount
  useEffect(() => {
    if (!user) return
    supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const fromDb: Partial<Settings> = {}
          for (const row of data) {
            try {
              (fromDb as Record<string, unknown>)[row.key] = JSON.parse(row.value)
            } catch {
              (fromDb as Record<string, unknown>)[row.key] = row.value
            }
          }
          const merged = { ...DEFAULT_SETTINGS, ...fromDb }
          setSettings(merged)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
          isInitialSync.current = false
        } else {
          isInitialSync.current = false
        }
      })
  }, [user])

  // Save to localStorage cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      setSettingsSaveErrorExternal(false)
    } catch (err) {
      console.error('Failed to save settings to localStorage:', err)
      setSettingsSaveErrorExternal(true)
    }
  }, [settings])

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates }

      // Persist each changed key to Supabase
      if (user) {
        for (const [key, value] of Object.entries(updates)) {
          supabase.from('settings').upsert(
            { key, value: JSON.stringify(value), user_id: user.id },
            { onConflict: 'key,user_id' }
          ).then(({ error }) => {
            if (error) { console.error('Failed to save setting to Supabase:', error); addSyncError('Failed to sync settings to cloud') }
          })
        }
      }

      return next
    })
  }, [user])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)

    if (user) {
      supabase.from('settings').delete().eq('user_id', user.id).then(({ error }) => {
        if (error) { console.error('Failed to reset settings in Supabase:', error); addSyncError('Failed to sync settings reset to cloud') }
      })
    }
  }, [user])

  return { settings, updateSettings, resetSettings, saveError }
}
