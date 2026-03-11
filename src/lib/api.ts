import { supabase } from '@/integrations/supabase/client';
import type { Developer } from '@/types/developer';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function invokeFunction(name: string, params?: Record<string, string>, body?: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required – please sign in.');
  }
  const token = session.access_token;

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
      const e = new Error('RATE_LIMITED');
      (e as any).retryAfterSeconds = err.retryAfterSeconds || 60;
      throw e;
    }
    if (res.status === 402 || err.error === 'trial_limit_reached') {
      throw new Error('TRIAL_LIMIT_REACHED');
    }
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface SearchResponse {
  results: Developer[];
  searchId?: string;
  parsedCriteria: {
    repos: { owner: string; name: string }[];
    skills: string[];
    location: string | null;
    seniority: string | null;
  };
  reposSearched: string[];
  creditCharged?: boolean;
}

export interface SearchOptions {
  targetRepos?: string[];
  skills?: string[];
  hideUngettable?: boolean;
}

export async function searchDevelopers(query: string, options?: SearchOptions): Promise<SearchResponse> {
  // P28: Use POST when any structured options are provided
  const hasOptions = options && (
    options.targetRepos?.length ||
    options.skills?.length ||
    options.hideUngettable !== undefined
  );
  if (hasOptions) {
    return invokeFunction('github-search', undefined, {
      query,
      targetRepos: options.targetRepos,
      skills: options.skills,
      hideUngettable: options.hideUngettable,
    });
  }
  return invokeFunction('github-search', { q: query });
}

// FEAT-008: Streaming search with real-time progress
export interface StreamProgress {
  step: string;
  detail?: string;
  elapsed?: number;
}

export async function searchDevelopersStreaming(
  query: string,
  options: SearchOptions | undefined,
  onProgress: (p: StreamProgress) => void,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required – please sign in.');
  }
  const token = session.access_token;

  const body: Record<string, any> = { query, stream: true };
  if (options?.targetRepos?.length) body.targetRepos = options.targetRepos;
  if (options?.skills?.length) body.skills = options.skills;
  if (options?.hideUngettable !== undefined) body.hideUngettable = options.hideUngettable;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/github-search`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    if (res.status === 429 || err.rateLimited) {
      const e = new Error('RATE_LIMITED');
      (e as any).retryAfterSeconds = err.retryAfterSeconds || 60;
      throw e;
    }
    if (res.status === 402 || err.error === 'trial_limit_reached') {
      throw new Error('TRIAL_LIMIT_REACHED');
    }
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let result: SearchResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // keep incomplete last line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'progress') {
          onProgress({ step: event.step, detail: event.detail, elapsed: event.elapsed });
        } else if (event.type === 'result') {
          result = event.data;
        } else if (event.type === 'error') {
          throw new Error(event.error);
        }
      } catch (e) {
        if ((e as Error).message !== 'Unexpected end of JSON input') throw e;
      }
    }
  }

  if (!result) throw new Error('No result received from stream');
  return result;
}

// BUG-001: Load cached search results from junction table (history replay)
export async function loadSearchResults(searchId: string): Promise<SearchResponse> {
  const { data, error } = await supabase
    .from('search_results')
    .select(`
      rank,
      score,
      summary,
      about,
      candidate:candidate_id (
        id, github_username, name, avatar_url, bio, about, location,
        followers, public_repos, stars, top_languages, highlights,
        score, summary, is_hidden_gem, joined_year, contributed_repos,
        linkedin_url, twitter_username, email, github_url
      )
    `)
    .eq('search_id', searchId)
    .order('rank', { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    return { results: [], searchId, parsedCriteria: { repos: [], skills: [], location: null, seniority: null }, reposSearched: [] };
  }

  const results = data.map((row: any) => {
    const c = row.candidate;
    if (!c) return null;
    return {
      id: c.github_username,
      username: c.github_username,
      name: c.name,
      avatarUrl: c.avatar_url,
      bio: row.summary || c.summary || c.bio,
      about: row.about || c.about || '',
      location: c.location,
      totalContributions: Object.values(c.contributed_repos || {}).reduce((a: number, b: any) => a + (b as number), 0) as number,
      publicRepos: c.public_repos,
      followers: c.followers,
      stars: c.stars,
      topLanguages: c.top_languages || [],
      highlights: c.highlights || [],
      score: row.score ?? c.score ?? 0,
      hiddenGem: c.is_hidden_gem || false,
      joinedYear: c.joined_year,
      contributedRepos: c.contributed_repos || {},
      linkedinUrl: c.linkedin_url,
      twitterUsername: c.twitter_username,
      email: c.email,
      githubUrl: c.github_url,
    };
  }).filter(Boolean);

  return {
    results,
    searchId,
    parsedCriteria: { repos: [], skills: [], location: null, seniority: null },
    reposSearched: [],
  };
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

export async function notifyStageChange(params: {
  pipeline_id?: string;
  github_username: string;
  candidate_name?: string;
  from_stage?: string;
  to_stage: string;
}): Promise<void> {
  await invokeFunction('notify-pipeline-change', undefined, params);
}

// SPA-only settings cache, scoped to current session.
// Cleared on auth change (App.tsx) and settings save (SettingsTab).
let settingsCache: Record<string, string> | null = null;
let settingsCacheUserId: string | null = null;

export async function loadSettings(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;
  let query = supabase.from('settings').select('key, value');
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) console.error('Failed to load settings:', error.message);
  const map: Record<string, string> = {};
  if (data) {
    data.forEach((r) => { map[r.key] = r.value; });
  }
  settingsCache = map;
  settingsCacheUserId = userId;
  return map;
}

export function clearSettingsCache() {
  settingsCache = null;
  settingsCacheUserId = null;
}

export async function getSetting(key: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;
  if (!settingsCache || settingsCacheUserId !== userId) {
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
  return invokeFunction('search-candidates', undefined, { query, role, company });
}

import type { CodeQualityReport } from '@/types/code-quality';

export async function getCodeQuality(username: string): Promise<CodeQualityReport> {
  return invokeFunction('github-code-quality', { username });
}

// Company intelligence via Parallel Task API
export interface CompanyIntel {
  company: string;
  estimated_eng_headcount: number | null;
  tech_stack_signals: string[];
  recent_hiring_signal: string;
  attrition_signal: string;
  why_source_from: string;
  linkedin_search_url: string;
}

export async function getCompanyIntel(companies: string[], role: string): Promise<{ results: CompanyIntel[] }> {
  return invokeFunction('company-intel', undefined, { companies, role });
}

// Find similar candidates via Exa findSimilar
export interface SimilarCandidate {
  title: string;
  url: string;
  score: number;
  highlights: string[];
  github_username: string | null;
}

export async function findSimilarCandidates(githubUrl: string, numResults?: number): Promise<{ results: SimilarCandidate[] }> {
  return invokeFunction('find-similar-candidates', undefined, { github_url: githubUrl, num_results: numResults });
}

// Map company talent via Parallel FindAll
export interface EngineerProfile {
  name: string;
  title: string;
  linkedin_url: string | null;
  github_url: string | null;
  notable_work: string;
  company: string;
}

export async function mapCompanyTalent(company: string, role: string, maxResults?: number): Promise<{ engineers: EngineerProfile[] }> {
  return invokeFunction('map-company-talent', undefined, { company, role, max_results: maxResults });
}

// Import candidates via Exa Websets Import
export async function importCandidates(
  candidates: { name: string; url: string; metadata?: Record<string, string> }[],
  websetId?: string
): Promise<{ webset_id: string; import_id: string; items_submitted: number }> {
  return invokeFunction('import-candidates', undefined, { candidates, webset_id: websetId });
}
