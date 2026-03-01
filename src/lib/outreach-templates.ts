import type { Developer } from "@/types/developer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Template {
  id: string;
  name: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Template variable definitions
// ---------------------------------------------------------------------------

export const TEMPLATE_VARIABLES = [
  { key: "name", label: "Name", example: "Alice Chen" },
  { key: "username", label: "Username", example: "alicechen" },
  { key: "top_language", label: "Top Language", example: "TypeScript" },
  { key: "location", label: "Location", example: "San Francisco" },
  { key: "bio_snippet", label: "Bio (100 chars)", example: "Full-stack developer..." },
  { key: "score", label: "Score", example: "72" },
  { key: "highlights", label: "Highlights", example: "Built X, Contributed to Y" },
  { key: "github_url", label: "GitHub URL", example: "https://github.com/..." },
  { key: "followers", label: "Followers", example: "1,200" },
  { key: "repos", label: "Repos", example: "45" },
] as const;

// ---------------------------------------------------------------------------
// Built-in starter templates
// ---------------------------------------------------------------------------

export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: "intro",
    name: "Intro",
    body: `Hi {{name}},

I came across your GitHub profile (@{{username}}) and was impressed by your work — especially in {{top_language}}. {{highlights}}

I'd love to chat about an opportunity that aligns with your experience. Would you be open to a quick conversation?

Best regards`,
  },
  {
    id: "follow-up",
    name: "Follow-up",
    body: `Hi {{name}},

Just following up on my previous message. I noticed your recent contributions and thought our {{top_language}} role might be a great fit for your skills.

Would you have 15 minutes this week for a quick call?

Thanks!`,
  },
  {
    id: "technical",
    name: "Technical",
    body: `Hey {{name}},

I was looking through contributions on GitHub and your work in {{top_language}} caught my attention. With {{repos}} public repos and a community of {{followers}} followers, your profile stands out.

We're working on some challenging problems that I think would interest you. Would you be open to hearing more?

Cheers`,
  },
];

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = "sourcekit-outreach-templates";

export function loadCustomTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplates(templates: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

export function interpolate(template: string, dev: Developer): string {
  const vars: Record<string, string> = {
    name: dev.name || dev.username || "",
    username: dev.username || "",
    top_language: dev.topLanguages?.[0]?.name || "your primary language",
    location: dev.location || "your area",
    bio_snippet: (dev.bio || "").slice(0, 100),
    score: String(dev.score || 0),
    highlights: dev.highlights?.slice(0, 3).join(", ") || "",
    github_url: dev.githubUrl || `https://github.com/${dev.username}`,
    followers: (dev.followers || 0).toLocaleString(),
    repos: String(dev.publicRepos || 0),
  };

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}

/**
 * Interpolate a template using a partial developer-like object (e.g. pipeline candidate).
 * Falls back gracefully for missing fields.
 */
export function interpolatePartial(
  template: string,
  data: {
    name?: string;
    username?: string;
    github_username?: string;
    avatar_url?: string;
    score?: number;
    [key: string]: any;
  },
): string {
  const dev: Developer = {
    id: data.github_username || data.username || "",
    username: data.github_username || data.username || "",
    name: data.name || data.github_username || data.username || "",
    avatarUrl: data.avatar_url || "",
    bio: data.bio || "",
    location: data.location || "",
    totalContributions: 0,
    publicRepos: data.public_repos || 0,
    followers: data.followers || 0,
    stars: data.stars || 0,
    topLanguages: data.top_languages || [],
    highlights: data.highlights || [],
    score: data.score || 0,
    hiddenGem: false,
    joinedYear: data.joined_year || 0,
  };
  return interpolate(template, dev);
}
