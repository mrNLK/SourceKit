import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, GitFork, Users, MapPin, Calendar, ExternalLink, Gem, Zap } from "lucide-react";
import { mockDevelopers } from "@/data/mockDevelopers";
import { GitBranch } from "lucide-react";

const DeveloperProfile = () => {
  const { id } = useParams();
  const developer = mockDevelopers.find((d) => d.id === id);

  if (!developer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-display">Developer not found.</p>
      </div>
    );
  }

  const maxCommits = Math.max(...developer.recentActivity.map((a) => a.commits));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-sm font-semibold text-foreground hidden sm:inline">SourceKit</span>
          </Link>
          <Link to={-1 as any} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <img
              src={developer.avatarUrl}
              alt={developer.name}
              className="w-20 h-20 rounded-xl bg-secondary border border-border"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="font-display text-2xl font-bold text-foreground">{developer.name}</h1>
                {developer.hiddenGem && (
                  <span className="flex items-center gap-1.5 text-warning text-xs font-display bg-warning/10 border border-warning/20 px-2.5 py-1 rounded-full">
                    <Gem className="w-3.5 h-3.5" />
                    Hidden Gem
                  </span>
                )}
                <div className={`flex items-center gap-1.5 text-xs font-display px-2.5 py-1 rounded-full ${
                  developer.score >= 90 ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-secondary-foreground border border-border"
                }`}>
                  <Zap className="w-3 h-3" />
                  Score: {developer.score}
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-display mb-2">@{developer.username}</p>
              <p className="text-text-secondary mb-4">{developer.bio}</p>

              <div className="flex flex-wrap gap-4 text-sm text-text-dim">
                {developer.location && (
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{developer.location}</span>
                )}
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {developer.joinedYear}</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{developer.followers} followers</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Stars", value: developer.stars.toLocaleString(), icon: Star },
            { label: "Contributions", value: developer.totalContributions.toLocaleString(), icon: GitFork },
            { label: "Public Repos", value: developer.publicRepos, icon: ExternalLink },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4 text-center">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="font-display text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Languages */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Top Languages</h3>
            <div className="space-y-3">
              {developer.topLanguages.map((lang) => (
                <div key={lang.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-text-secondary">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color }} />
                      {lang.name}
                    </span>
                    <span className="font-display text-muted-foreground">{lang.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity chart */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
            <div className="flex items-end gap-2 h-32">
              {developer.recentActivity.map((activity) => (
                <div key={activity.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-colors relative group"
                    style={{ height: `${(activity.commits / maxCommits) * 100}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-display text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      {activity.commits}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-dim font-display">{activity.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">Key Highlights</h3>
          <div className="space-y-2">
            {developer.highlights.map((highlight, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {highlight}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeveloperProfile;
