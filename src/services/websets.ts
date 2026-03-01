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

import { supabase } from '@/integrations/supabase/client'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callWebsetsApi(action: string, params: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase not configured')

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || SUPABASE_KEY

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
    enrichments?: { description: string; format: string }[]
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
