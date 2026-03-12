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

function extractApiErrorMessage(data: any): string {
  const err = data?.error
  return (
    (typeof err === 'string' ? err : undefined) ||
    err?.message ||
    data?.message ||
    JSON.stringify(err || data)
  )
}

function isInvalidJwtError(message: string): boolean {
  return /invalid jwt/i.test(message)
}

async function getValidAccessToken(): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) {
    throw new Error('Authentication required – please sign in.')
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!userError && user) {
    const { data: { session: latestSession } } = await supabase.auth.getSession()
    return latestSession?.access_token || session.access_token
  }

  const isAuthError = Boolean(userError?.message && /jwt|token|session/i.test(userError.message))
  if (userError && !isAuthError) {
    throw new Error(userError.message)
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
  const refreshedToken = refreshData.session?.access_token
  if (!refreshError && refreshedToken) {
    return refreshedToken
  }

  const isRefreshAuthError = Boolean(refreshError?.message && /jwt|token|session|refresh/i.test(refreshError.message))
  if (refreshError && !isRefreshAuthError) {
    throw new Error(refreshError.message)
  }

  await supabase.auth.signOut()
  throw new Error('Session expired – please sign in again.')
}

async function executeWebsetsApiRequest(
  action: string,
  params: Record<string, unknown>,
  userToken: string,
) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/exa-websets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      // Authenticate Edge Function at gateway with anon key, pass user JWT separately.
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'x-user-jwt': `Bearer ${userToken}`,
    },
    body: JSON.stringify({ action, ...params }),
  })

  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(extractApiErrorMessage(data))
  }

  return data
}

async function callWebsetsApi(action: string, params: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase not configured')

  // Validate and refresh token before invoking Edge Functions.
  const initialToken = await getValidAccessToken()

  try {
    return await executeWebsetsApiRequest(action, params, initialToken)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!isInvalidJwtError(message)) {
      throw error
    }

    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    const refreshedToken = refreshData.session?.access_token
    if (refreshError || !refreshedToken) {
      await supabase.auth.signOut()
      throw new Error('Session expired – please sign in again.')
    }

    try {
      return await executeWebsetsApiRequest(action, params, refreshedToken)
    } catch (retryError) {
      const retryMessage = retryError instanceof Error ? retryError.message : String(retryError)
      if (isInvalidJwtError(retryMessage)) {
        await supabase.auth.signOut()
        throw new Error('Session expired – please sign in again.')
      }
      throw retryError
    }
  }
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
