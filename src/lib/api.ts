import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function invokeFunction(name: string, params?: Record<string, string>, body?: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_KEY;

  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}${query}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    if (res.status === 429 || err.rateLimited) {
      throw new Error('RATE_LIMITED');
    }
    if (res.status === 402 || err.error === 'trial_limit_reached') {
      throw new Error('TRIAL_LIMIT_REACHED');
    }
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface SearchResponse {
  results: any[];
  parsedCriteria: {
    repos: { owner: string; name: string }[];
    skills: string[];
    location: string | null;
    seniority: string | null;
  };
  reposSearched: string[];
  creditCharged?: boolean;
}

export async function searchDevelopers(query: string, targetRepos?: string[]): Promise<SearchResponse> {
  if (targetRepos && targetRepos.length > 0) {
    return invokeFunction('github-search', undefined, { query, targetRepos });
  }
  return invokeFunction('github-search', { q: query });
}

export async function getDeveloperProfile(username: string) {
  return invokeFunction('github-profile', { username });
}

export async function enrichLinkedIn(username: string, name: string, location: string, bio: string) {
  return invokeFunction('enrich-linkedin', undefined, { username, name, location, bio });
}

export async function generateOutreach(githubUsername: string, candidateName?: string, roleContext?: string) {
  return invokeFunction('generate-outreach', undefined, { github_username: githubUsername, candidate_name: candidateName, role_context: roleContext });
}

let settingsCache: Record<string, string> | null = null;

export async function loadSettings(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  let query = (supabase as any).from('settings').select('key, value');
  if (userId) query = query.eq('user_id', userId);
  const { data } = await query;
  const map: Record<string, string> = {};
  if (data) {
    data.forEach((r: any) => { map[r.key] = r.value; });
  }
  settingsCache = map;
  return map;
}

export function clearSettingsCache() {
  settingsCache = null;
}

export async function getSetting(key: string): Promise<string> {
  if (!settingsCache) {
    await loadSettings();
  }
  return settingsCache?.[key] || '';
}

export interface ExaCandidateResult {
  name: string;
  bio: string;
  profile_url: string;
  source: string;
  highlights: string[];
}

export async function searchCandidates(query: string, role?: string, company?: string): Promise<{ candidates: ExaCandidateResult[]; sources: Record<string, number> }> {
  const exaKey = await getSetting('exa_api_key');
  const parallelKey = await getSetting('parallel_api_key');
  return invokeFunction('search-candidates', undefined, {
    query,
    role,
    company,
    exa_api_key: exaKey || undefined,
    parallel_api_key: parallelKey || undefined,
  });
}
