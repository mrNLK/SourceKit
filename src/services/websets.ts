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

async function callWebsetsApi(action: string, params: Record<string, unknown>, exaApiKey?: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase not configured')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/exa-websets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ action, exa_api_key: exaApiKey, ...params }),
  })

  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function createWebset(
  query: string,
  count: number,
  exaApiKey?: string,
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
  }, exaApiKey)
}

export async function listWebsets(exaApiKey?: string): Promise<Webset[]> {
  const data = await callWebsetsApi('list', {}, exaApiKey)
  return data.data || data || []
}

export async function getWebset(websetId: string, exaApiKey?: string): Promise<Webset> {
  return callWebsetsApi('get', { webset_id: websetId }, exaApiKey)
}

export async function getWebsetItems(websetId: string, exaApiKey?: string): Promise<WebsetItem[]> {
  const data = await callWebsetsApi('items', { webset_id: websetId }, exaApiKey)
  return data.data || data || []
}

export async function addEnrichment(
  websetId: string,
  description: string,
  format: string,
  exaApiKey?: string
) {
  return callWebsetsApi('enrich', { webset_id: websetId, description, format }, exaApiKey)
}

export async function deleteWebset(websetId: string, exaApiKey?: string) {
  return callWebsetsApi('delete', { webset_id: websetId }, exaApiKey)
}
