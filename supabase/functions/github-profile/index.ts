import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GITHUB_API = "https://api.github.com";

async function githubFetch(url: string) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'SourceKit-App',
  };
  const token = Deno.env.get('GITHUB_TOKEN');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error(`GitHub API error: ${res.status} for ${url}`);
    return null;
  }
  return res.json();
}

const langColors: Record<string, string> = {
  JavaScript: "hsl(50, 90%, 50%)",
  TypeScript: "hsl(210, 80%, 55%)",
  Python: "hsl(55, 70%, 50%)",
  Rust: "hsl(20, 80%, 55%)",
  Go: "hsl(195, 60%, 50%)",
  Java: "hsl(15, 80%, 55%)",
  "C++": "hsl(240, 50%, 55%)",
  C: "hsl(200, 40%, 50%)",
  Ruby: "hsl(0, 60%, 50%)",
  PHP: "hsl(240, 40%, 55%)",
  Swift: "hsl(15, 90%, 55%)",
  Kotlin: "hsl(270, 60%, 55%)",
  Shell: "hsl(100, 40%, 50%)",
  HTML: "hsl(15, 80%, 55%)",
  CSS: "hsl(280, 60%, 55%)",
};

function getLangColor(lang: string): string {
  return langColors[lang] || `hsl(${Math.abs(lang.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 50%, 55%)`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');

    if (!username) {
      return new Response(JSON.stringify({ error: 'Parameter "username" is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch profile, repos, and recent events in parallel
    const [profile, repos, events] = await Promise.all([
      githubFetch(`${GITHUB_API}/users/${username}`),
      githubFetch(`${GITHUB_API}/users/${username}/repos?sort=stars&per_page=50`),
      githubFetch(`${GITHUB_API}/users/${username}/events/public?per_page=100`),
    ]);

    if (!profile) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allRepos = repos || [];
    const repoList = allRepos.filter((r: any) => !r.fork);
    const forkedRepos = allRepos.filter((r: any) => r.fork);
    const totalStars = repoList.reduce((sum: number, r: any) => sum + r.stargazers_count, 0);

    // Aggregate languages
    const langCount: Record<string, number> = {};
    for (const repo of repoList) {
      if (repo.language) {
        langCount[repo.language] = (langCount[repo.language] || 0) + 1;
      }
    }
    const totalLangRepos = Object.values(langCount).reduce((a, b) => a + b, 0) || 1;
    const topLanguages = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name,
        percentage: Math.round((count / totalLangRepos) * 100),
        color: getLangColor(name),
      }));

    // Recent activity from events - group push events by month
    const eventList = events || [];
    const pushEvents = eventList.filter((e: any) => e.type === 'PushEvent');
    const prEvents = eventList.filter((e: any) => e.type === 'PullRequestEvent');
    const issueEvents = eventList.filter((e: any) => e.type === 'IssuesEvent');
    const reviewEvents = eventList.filter((e: any) => e.type === 'PullRequestReviewEvent');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts: Record<string, number> = {};
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthCounts[key] = 0;
    }

    for (const event of pushEvents) {
      const d = new Date(event.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in monthCounts) {
        monthCounts[key] += (event.payload?.commits?.length || 1);
      }
    }

    const recentActivity = Object.entries(monthCounts).map(([key, commits]) => {
      const [, month] = key.split('-');
      return { month: monthNames[parseInt(month)], commits };
    });

    // Contribution breakdown
    const totalCommits = pushEvents.reduce((sum: number, e: any) => sum + (e.payload?.commits?.length || 1), 0);
    const contributionBreakdown = {
      commits: totalCommits || profile.public_repos * 50,
      pullRequests: prEvents.length || null,
      issues: issueEvents.length || null,
      reviews: reviewEvents.length || null,
    };

    // Score calculation
    const starScore = Math.min(totalStars / 100, 30);
    const repoScore = Math.min(profile.public_repos / 5, 20);
    const followerScore = Math.min(profile.followers / 50, 20);
    const contribScore = Math.min((profile.public_repos * 50) / 500, 30);
    const score = Math.min(Math.round(starScore + repoScore + followerScore + contribScore), 99);

    const hiddenGem = totalStars > 50 && profile.followers < 500;

    // Top repo highlights
    const highlights = repoList
      .filter((r: any) => r.stargazers_count > 0)
      .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
      .map((r: any) => `${r.name}: ${r.description || 'No description'} (${r.stargazers_count}⭐)`);

    const joinedYear = new Date(profile.created_at).getFullYear();

    // Derive skills from languages + repo topics/descriptions
    const skillSet = new Set<string>();
    for (const lang of Object.keys(langCount)) skillSet.add(lang);
    for (const repo of repoList) {
      if (repo.topics) repo.topics.forEach((t: string) => skillSet.add(t));
    }
    const skills = Array.from(skillSet).slice(0, 15);

    // Group forked repos by theme
    const forkGroups: Record<string, string[]> = {};
    for (const repo of forkedRepos) {
      const desc = repo.description || repo.name;
      const lang = repo.language || 'Other';
      // Simple grouping by language
      if (!forkGroups[lang]) forkGroups[lang] = [];
      forkGroups[lang].push(repo.full_name);
    }
    const interests = Object.entries(forkGroups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([theme, repos]) => ({ theme, count: repos.length, repos: repos.slice(0, 3) }));

    // Top repos with more detail
    const topRepos = repoList
      .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count)
      .slice(0, 6)
      .map((r: any) => ({
        name: r.name,
        fullName: r.full_name,
        description: r.description || '',
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
        languageColor: r.language ? getLangColor(r.language) : null,
        url: r.html_url,
        topics: r.topics || [],
      }));

    const result = {
      id: profile.login,
      username: profile.login,
      name: profile.name || profile.login,
      avatarUrl: profile.avatar_url,
      bio: profile.bio || `GitHub user with ${profile.public_repos} public repositories.`,
      location: profile.location || "",
      totalContributions: contributionBreakdown.commits,
      publicRepos: profile.public_repos,
      followers: profile.followers,
      following: profile.following,
      stars: totalStars,
      topLanguages,
      highlights: highlights.length ? highlights : [`${profile.public_repos} public repositories`],
      score,
      hiddenGem,
      joinedYear,
      recentActivity,
      githubUrl: profile.html_url,
      contributionBreakdown,
      skills,
      interests,
      topRepos,
      website: profile.blog || null,
      twitterUsername: profile.twitter_username || null,
      email: profile.email || null,
      company: profile.company || null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in github-profile:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
