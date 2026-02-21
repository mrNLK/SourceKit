const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function invokeFunction(name: string, params?: Record<string, string>, body?: Record<string, any>) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}${query}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    if (res.status === 429 || err.rateLimited) {
      throw new Error('RATE_LIMITED');
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
}

export async function searchDevelopers(query: string): Promise<SearchResponse> {
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
