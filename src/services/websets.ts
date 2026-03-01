import { supabase } from "@/integrations/supabase/client"

export interface WebsetItem {
  id: string
  url: string
  title: string
  description?: string
  properties?: Record<string, { value: string; state: string }>
}

export interface Webset {
  id: string
  status: 'idle' | 'running' | 'paused'
  object: string
  itemCount: number
  searches: unknown[]
  enrichments: unknown[]
  createdAt: string
  updatedAt: string
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callWebsetsApi(action: string, params: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase not configured')

  // Use the user's session token for multi-tenant isolation
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Authentication required – please sign in.')
  }
  const token = session.access_token

  const res = await fetch(`${SUPABASE_URL}/functions/v1/exa-websets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...params }),
  })

  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function createWebset(
  query: string,
  count: number,
  options?: {
    criteria?: { description: string }[]
    enrichments?: { description: string; format: string; options?: { label: string }[] }[]
  }
): Promise<{ id: string; status: string }> {
  return callWebsetsApi('create', {
    query,
    count,
    ...(options?.criteria ? { criteria: options.criteria } : {}),
    ...(options?.enrichments ? { enrichments: options.enrichments } : {}),
  })
}

export async function listWebsets(): Promise<Webset[]> {
  const data = await callWebsetsApi('list', {})
  return data.data || data || []
}

export async function getWebset(websetId: string): Promise<Webset> {
  return callWebsetsApi('get', { webset_id: websetId })
}

export async function getWebsetItems(websetId: string): Promise<WebsetItem[]> {
  const data = await callWebsetsApi('items', { webset_id: websetId })
  return data.data || data || []
}

export async function addEnrichment(
  websetId: string,
  description: string,
  format: string,
) {
  return callWebsetsApi('enrich', { webset_id: websetId, description, format })
}

export async function deleteWebset(websetId: string) {
  return callWebsetsApi('delete', { webset_id: websetId })
}

// ---------------------------------------------------------------------------
// Monitor management
// ---------------------------------------------------------------------------

export interface WebsetMonitor {
  id: string
  websetId: string
  cron: string
  status: 'active' | 'paused'
  query?: string
  count?: number
  behavior: 'append' | 'override'
  lastRunAt?: string
  nextRunAt?: string
}

export async function createMonitor(
  websetId: string,
  cron: string,
  options?: {
    query?: string
    entity?: { type: string }
    criteria?: { description: string }[]
    count?: number
    behavior?: 'append' | 'override'
  }
): Promise<WebsetMonitor> {
  return callWebsetsApi('create_monitor', {
    webset_id: websetId,
    cron,
    ...options,
  })
}

export async function pauseMonitor(websetId: string, monitorId: string) {
  return callWebsetsApi('pause_monitor', { webset_id: websetId, monitor_id: monitorId })
}

export async function resumeMonitor(websetId: string, monitorId: string) {
  return callWebsetsApi('resume_monitor', { webset_id: websetId, monitor_id: monitorId })
}

export async function getMonitors(websetId: string): Promise<WebsetMonitor[]> {
  const data = await callWebsetsApi('list_monitors', { webset_id: websetId })
  return data.data || data || []
}

// ---------------------------------------------------------------------------
// Batch pipeline import
// ---------------------------------------------------------------------------

export async function batchAddToPipeline(
  items: { id: string; title: string; url: string; eea_data?: Record<string, unknown> }[]
): Promise<{ added: number; skipped: number }> {
  return callWebsetsApi('batch_pipeline', { items })
}
