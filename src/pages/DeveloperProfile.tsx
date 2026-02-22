import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, GitFork, Users, MapPin, Calendar, ExternalLink, Gem, Zap, Loader2, Linkedin, GitCommit, GitPullRequest, CircleDot, Eye, Globe, Twitter, Building2, Code2, Sparkles, TrendingUp } from "lucide-react";
import { GitBranch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDeveloperProfile } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const DeveloperProfile = () => {
  const { id } = useParams();

  const { data: developer, isLoading, error } = useQuery({
    queryKey: ["github-profile", id],
    queryFn: () => getDeveloperProfile(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
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
  const maxCommits = recentActivity.length ? Math.max(...recentActivity.map((a: any) => a.commits), 1) : 1;
  const breakdown = developer.contributionBreakdown || {};
  const skills: string[] = developer.skills || [];
  const interests: any[] = developer.interests || [];
  const topRepos: any[] = developer.topRepos || [];

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
  ].filter(Boolean) as { label: string; url: string; icon: any }[];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* ── HERO / PROFILE HEADER ── */}
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

              {/* Contact Links */}
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
              {recentActivity.map((a: any, i: number) => (
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
          {/* ── SKILLS ── */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" /> Skills
            </h3>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="text-xs font-display">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">--</p>
            )}
          </div>

          {/* ── TOP LANGUAGES ── */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Top Languages</h3>
            <div className="space-y-2.5">
              {developer.topLanguages.map((lang: any) => (
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

        {/* ── INTERESTS (from forked repos) ── */}
        {interests.length > 0 && (
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Interests
              <span className="text-xs text-muted-foreground font-normal ml-1">(from forked repositories)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {interests.map((g: any) => (
                <div key={g.theme} className="rounded-lg bg-secondary/50 border border-border p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-display font-semibold text-foreground">{g.theme}</span>
                    <Badge variant="outline" className="text-[10px]">{g.count} repos</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {g.repos.map((r: string) => (
                      <a key={r} href={`https://github.com/${r}`} target="_blank" rel="noopener noreferrer" className="block truncate hover:text-primary transition-colors">
                        {r}
                      </a>
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

        {/* ── TOP REPOSITORIES (rich cards) ── */}
        {topRepos.length > 0 && (
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Top Repositories</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topRepos.map((repo: any) => (
                <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg bg-secondary/40 border border-border p-4 hover:border-primary/30 hover:bg-secondary/60 transition-colors group">
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{repo.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 ml-2">
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3" />{repo.stars}</span>
                      <span className="flex items-center gap-0.5"><GitFork className="w-3 h-3" />{repo.forks}</span>
                    </div>
                  </div>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{repo.description}</p>
                  )}
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

        {/* ── LEGACY HIGHLIGHTS (fallback) ── */}
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
      </main>
    </div>
  );
};

export default DeveloperProfile;
