import { useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Star, GitFork, Users, MapPin, Calendar, ExternalLink, Gem, Zap, Loader2, Linkedin, GitCommit, GitPullRequest, CircleDot, Eye, Globe, Twitter, Building2, Code2, Sparkles, TrendingUp, ChevronDown, ChevronRight, Search } from "lucide-react";
import { GitBranch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDeveloperProfile } from "@/lib/api";
import { CompanyContext } from "@/components/CompanyContext";
import type { Developer, Language } from "@/types/developer";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DeveloperInterest {
  theme: string;
  count: number;
  repos: string[];
}

interface DeveloperRepo {
  name: string;
  url: string;
  stars: number;
  forks: number;
  description?: string;
  language?: string;
  languageColor?: string;
  topics?: string[];
}

const DeveloperProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routeStateDeveloper = (location.state as { developer?: Developer } | null)?.developer ?? null;
  const [lookupUsername, setLookupUsername] = useState("");
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});
  const [skillTab, setSkillTab] = useState<"technical" | "domain">("technical");

  const { data: fetchedDeveloper, isLoading, error } = useQuery({
    queryKey: ["github-profile", id],
    queryFn: () => getDeveloperProfile(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const developer = fetchedDeveloper || routeStateDeveloper;

  if (isLoading && !developer) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border glass sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                <GitBranch className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display text-sm font-semibold text-foreground hidden sm:inline">SourceKit</span>
            </Link>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground font-display text-sm">Loading profile from GitHub...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !developer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive font-display mb-2">Failed to load profile</p>
          <p className="text-muted-foreground text-sm">{(error as Error)?.message || 'User not found'}</p>
          <Link to="/" className="text-primary text-sm mt-4 inline-block hover:underline">← Back to search</Link>
        </div>
      </div>
    );
  }

  const recentActivity = developer.recentActivity || [];
  const maxCommits = recentActivity.length ? Math.max(...recentActivity.map((a: { month: string; commits: number }) => a.commits), 1) : 1;
  const breakdown = developer.contributionBreakdown || {};
  const skills: string[] = developer.skills || [];
  const interests: DeveloperInterest[] = developer.interests || [];
  const topRepos: DeveloperRepo[] = developer.topRepos || [];

  // Working style quadrant
  const repoCount = developer.publicRepos || 0;
  const totalContribs = breakdown.commits ?? developer.totalContributions ?? 0;
  const contribPerRepo = repoCount > 0 ? totalContribs / repoCount : 0;
  const isBroad = repoCount > 15;
  const isExecution = contribPerRepo > 30;
  const quadrant = isBroad
    ? (isExecution ? "broad-execution" : "broad-exploration")
    : (isExecution ? "narrow-execution" : "narrow-exploration");

  // Categorize skills
  const techLangs = ["javascript", "typescript", "python", "rust", "go", "java", "c++", "c", "ruby", "php", "swift", "kotlin", "shell", "html", "css", "scala", "elixir", "haskell", "lua", "dart", "r", "perl", "zig", "c#", "objective-c"];
  const technicalSkills = skills.filter(s => techLangs.includes(s.toLowerCase()));
  const domainSkills = skills.filter(s => !techLangs.includes(s.toLowerCase()));

  const techCategories: { title: string; tags: string[]; indicators: string[] }[] = [];
  if (technicalSkills.length > 0) {
    techCategories.push({
      title: "Languages & Frameworks",
      tags: technicalSkills,
      indicators: [`Proficient in ${technicalSkills.length} technologies`, `Primary: ${technicalSkills.slice(0, 3).join(", ")}`],
    });
  }
  const domainCategories: { title: string; tags: string[]; indicators: string[] }[] = [];
  if (domainSkills.length > 0) {
    for (let i = 0; i < domainSkills.length; i += 5) {
      const chunk = domainSkills.slice(i, i + 5);
      domainCategories.push({
        title: i === 0 ? "Core Domains" : "Additional Domains",
        tags: chunk,
        indicators: ["Derived from repository topics and descriptions"],
      });
    }
  }

  const activeCategories = skillTab === "technical" ? techCategories : domainCategories;

  const contribStats = [
    { label: "Commits", value: breakdown.commits ?? developer.totalContributions, icon: GitCommit },
    { label: "PRs", value: breakdown.pullRequests, icon: GitPullRequest },
    { label: "Issues", value: breakdown.issues, icon: CircleDot },
    { label: "Reviews", value: breakdown.reviews, icon: Eye },
  ];

  const contactLinks = [
    developer.githubUrl && { label: "github", url: developer.githubUrl, icon: GitBranch },
    developer.website && { label: "website", url: developer.website.startsWith("http") ? developer.website : `https://${developer.website}`, icon: Globe },
    developer.linkedinUrl && { label: "linkedin", url: developer.linkedinUrl, icon: Linkedin },
    developer.twitterUsername && { label: "twitter", url: `https://twitter.com/${developer.twitterUsername}`, icon: Twitter },
  ].filter(Boolean) as { label: string; url: string; icon: React.ComponentType<{ className?: string }> }[];

  const toggleSkillExpand = (key: string) => {
    setExpandedSkills(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLookup = () => {
    const u = lookupUsername.trim();
    if (u) navigate(`/developer/${u}`);
  };

  const quadrantLabel: Record<string, string> = {
    "narrow-exploration": "Deep Explorer",
    "narrow-execution": "Focused Builder",
    "broad-exploration": "Wide Tinkerer",
    "broad-execution": "Prolific Generalist",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-sm font-semibold text-foreground hidden sm:inline">SourceKit</span>
          </Link>
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* ── HERO ── */}
        <div className="glass rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <img src={developer.avatarUrl} alt={developer.name} className="w-24 h-24 rounded-xl bg-secondary border border-border" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="font-display text-2xl font-bold text-foreground">{developer.name}</h1>
                {developer.hiddenGem && (
                  <span className="flex items-center gap-1.5 text-warning text-xs font-display bg-warning/10 border border-warning/20 px-2.5 py-1 rounded-full">
                    <Gem className="w-3.5 h-3.5" /> Hidden Gem
                  </span>
                )}
                <div className={`flex items-center gap-1.5 text-xs font-display px-2.5 py-1 rounded-full ${
                  developer.score >= 90 ? "bg-primary/10 text-primary border border-primary/20" :
                  developer.score >= 70 ? "bg-accent/10 text-accent border border-accent/20" :
                  "bg-secondary text-secondary-foreground border border-border"
                }`}>
                  <Zap className="w-3 h-3" /> Score: {developer.score}
                </div>
              </div>
              <p className="text-secondary-foreground mb-3">{developer.bio}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {developer.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{developer.location}</span>}
                {developer.company && <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{developer.company}</span>}
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {developer.joinedYear}</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{developer.followers} followers · {developer.following ?? '--'} following</span>
              </div>
              {contactLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {contactLinks.map(link => (
                    <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
                      <link.icon className="w-3 h-3" />
                      {link.label}
                      <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── COMPANY INTEL (Harmonic) ── */}
        <CompanyContext bio={developer.bio} about={developer.about} />

        {/* ── CONTRIBUTION BREAKDOWN ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {contribStats.map(stat => (
            <div key={stat.label} className="glass rounded-xl p-4 text-center">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="font-display text-xl font-bold text-foreground">
                {stat.value != null ? stat.value.toLocaleString() : '--'}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Stars", value: developer.stars?.toLocaleString(), icon: Star },
            { label: "Public Repos", value: developer.publicRepos, icon: GitFork },
            { label: "Followers", value: developer.followers?.toLocaleString(), icon: Users },
          ].map(stat => (
            <div key={stat.label} className="glass rounded-xl p-4 text-center">
              <stat.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
              <div className="font-display text-lg font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── ACTIVITY CHART ── */}
        {recentActivity.length > 0 && (
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Recent Activity
            </h3>
            <div className="flex items-end gap-2 h-24">
              {recentActivity.map((a: { month: string; commits: number }, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/60 hover:bg-primary transition-colors min-h-[2px]"
                    style={{ height: `${(a.commits / maxCommits) * 100}%` }}
                    title={`${a.commits} commits`}
                  />
                  <span className="text-[10px] text-muted-foreground">{a.month}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── SKILLS (upgraded with tabs + expandable cards) ── */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" /> Skills
            </h3>
            {/* Tabs */}
            <div className="flex gap-1 mb-4">
              <button
                onClick={() => setSkillTab("technical")}
                className={`text-xs font-display px-3 py-1.5 rounded-lg transition-colors ${skillTab === "technical" ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground border border-border hover:text-foreground"}`}
              >
                Technical Expertise
              </button>
              <button
                onClick={() => setSkillTab("domain")}
                className={`text-xs font-display px-3 py-1.5 rounded-lg transition-colors ${skillTab === "domain" ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground border border-border hover:text-foreground"}`}
              >
                Domain Expertise
              </button>
            </div>
            {activeCategories.length > 0 ? (
              <div className="space-y-3">
                {activeCategories.map((cat, idx) => {
                  const key = `${skillTab}-${idx}`;
                  const isExpanded = expandedSkills[key];
                  return (
                    <div key={key} className="rounded-lg bg-secondary/50 border border-border p-3">
                      <button onClick={() => toggleSkillExpand(key)} className="flex items-center justify-between w-full text-left mb-2">
                        <span className="text-xs font-display font-semibold text-foreground">{cat.title}</span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {cat.tags.map(t => (
                          <Badge key={t} variant="secondary" className="text-[10px] font-display">{t}</Badge>
                        ))}
                      </div>
                      {isExpanded && (
                        <div className="border-t border-border pt-2 mt-1 space-y-1">
                          <p className="text-[10px] font-display text-muted-foreground uppercase tracking-wider">Indicators</p>
                          {cat.indicators.map((ind, j) => (
                            <p key={j} className="text-xs text-secondary-foreground">• {ind}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">--</p>
            )}
          </div>

          {/* ── TOP LANGUAGES ── */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Top Languages</h3>
            <div className="space-y-2.5">
              {(developer.topLanguages || []).map((lang: Language) => (
                <div key={lang.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-secondary-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color }} />
                      {lang.name}
                    </span>
                    <span className="font-display text-muted-foreground text-xs">{lang.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── INTERESTS ── */}
        {interests.length > 0 && (
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Interests
              <span className="text-xs text-muted-foreground font-normal ml-1">(from forked repositories)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {interests.map((g: DeveloperInterest) => (
                <div key={g.theme} className="rounded-lg bg-secondary/50 border border-border p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-display font-semibold text-foreground">{g.theme}</span>
                    <Badge variant="outline" className="text-[10px]">{g.count} repos</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {g.repos.map((r: string) => (
                      <a key={r} href={`https://github.com/${r}`} target="_blank" rel="noopener noreferrer" className="block truncate hover:text-primary transition-colors">{r}</a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ABOUT ── */}
        {developer.about && (
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">About</h3>
            <p className="text-sm text-secondary-foreground leading-relaxed">{developer.about}</p>
          </div>
        )}

        {/* ── CONTRIBUTED TO ── */}
        {developer.contributedRepos && Object.keys(developer.contributedRepos).length > 0 && (
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Contributed To</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(developer.contributedRepos).map(([repo, count]) => (
                <a key={repo} href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg bg-primary/8 text-primary/90 border border-primary/15 hover:bg-primary/15 hover:border-primary/30 transition-colors">
                  <GitFork className="w-3 h-3" /> {repo} · {count as number} commits
                  <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── TOP REPOSITORIES ── */}
        {topRepos.length > 0 && (
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Top Repositories</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topRepos.map((repo: DeveloperRepo) => (
                <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg bg-secondary/40 border border-border p-4 hover:border-primary/30 hover:bg-secondary/60 transition-colors group">
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{repo.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 ml-2">
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3" />{repo.stars}</span>
                      <span className="flex items-center gap-0.5"><GitFork className="w-3 h-3" />{repo.forks}</span>
                    </div>
                  </div>
                  {repo.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{repo.description}</p>}
                  <div className="flex items-center gap-2">
                    {repo.language && (
                      <span className="flex items-center gap-1 text-[10px] text-secondary-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: repo.languageColor }} />
                        {repo.language}
                      </span>
                    )}
                    {repo.topics?.slice(0, 3).map((t: string) => (
                      <Badge key={t} variant="outline" className="text-[10px] py-0 h-4">{t}</Badge>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── LEGACY HIGHLIGHTS ── */}
        {topRepos.length === 0 && developer.highlights?.length > 0 && (
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Highlights</h3>
            <div className="space-y-2">
              {developer.highlights.map((h: string, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm text-secondary-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {h}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ── NEW SECTION 1: WORKING STYLES QUADRANT ── */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Working Styles</h3>
          <div className="flex items-center justify-center mb-2">
            <Badge variant="outline" className="text-xs font-display">{quadrantLabel[quadrant]}</Badge>
          </div>
          <div className="relative max-w-xs mx-auto">
            {/* Axis labels */}
            <div className="flex justify-between text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-1">
              <span>Exploration Focus</span>
              <span>Execution Focus</span>
            </div>
            <div className="grid grid-cols-2 gap-0.5">
              {[
                { id: "narrow-exploration", label: "Deep Explorer" },
                { id: "narrow-execution", label: "Focused Builder" },
                { id: "broad-exploration", label: "Wide Tinkerer" },
                { id: "broad-execution", label: "Prolific Generalist" },
              ].map(q => (
                <div
                  key={q.id}
                  className={`rounded-lg p-3 text-center text-xs font-display transition-colors ${
                    quadrant === q.id
                      ? "bg-warning/20 border-2 border-warning text-warning"
                      : "bg-secondary/40 border border-border text-muted-foreground"
                  }`}
                >
                  {q.label}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-display uppercase tracking-wider mt-1">
              <span>Narrow Scope</span>
              <span>Broad Scope</span>
            </div>
          </div>
        </div>

        {/* ── NEW SECTION 2: LINKS DIVIDER ── */}
        {contactLinks.length > 0 && (
          <div className="py-4">
            <div className="border-t border-border mb-6" />
            <div className="flex justify-center gap-3 flex-wrap">
              {contactLinks.map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-display px-4 py-2 rounded-full bg-secondary text-secondary-foreground border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label} · <span className="text-muted-foreground truncate max-w-[120px]">{(() => { try { return new URL(link.url).hostname; } catch { return link.url; } })()}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── NEW SECTION 3: LOOKUP ANOTHER CONTRIBUTOR ── */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Lookup Another Contributor</h3>
          <div className="flex gap-2 max-w-md">
            <Input
              placeholder="Enter GitHub username..."
              value={lookupUsername}
              onChange={e => setLookupUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLookup()}
              className="text-sm"
            />
            <Button size="sm" onClick={handleLookup} disabled={!lookupUsername.trim()}>
              <Search className="w-3.5 h-3.5 mr-1.5" />
              try now
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeveloperProfile;
