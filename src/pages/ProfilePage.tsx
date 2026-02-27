import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Github, Globe, MapPin, Calendar, Star, GitFork, Users, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreCircle } from '@/components/ui/ScoreCircle'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCandidates } from '@/hooks/useCandidates'
import { cn, formatDate } from '@/lib/utils'
import { getScoreColor } from '@/lib/scoring'
import { SIGNAL_COLORS } from '@/lib/signals'

export function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { allCandidates } = useCandidates()

  const candidate = allCandidates.find(c => c.id === id)

  if (!candidate) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <EmptyState
          icon={Users}
          title="Candidate not found"
          description="This candidate may have been removed from your pipeline"
        />
      </div>
    )
  }

  const gp = candidate.github_profile
  const sp = gp?.skill_profile

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div className="p-4 space-y-4 pb-8">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {candidate.avatar_url ? (
                <img src={candidate.avatar_url} alt={candidate.name} className="w-16 h-16 rounded-full border border-border" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border border-border">
                  <span className="text-xl font-bold text-muted-foreground">
                    {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-xl font-bold">{candidate.name}</h1>
                <p className="text-muted-foreground">{candidate.role || 'Engineer'} @ {candidate.company}</p>
                {candidate.location && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {candidate.location}
                  </div>
                )}
                {candidate.bio && (
                  <p className="mt-2 text-sm text-muted-foreground">{candidate.bio}</p>
                )}
              </div>
              <ScoreCircle score={candidate.score} size="lg" />
            </div>

            {/* Signals */}
            {candidate.signals.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {candidate.signals.map((signal, i) => {
                  const colors = SIGNAL_COLORS[signal.type]
                  return (
                    <span key={i} className={cn('px-2.5 py-1 rounded-full text-xs font-medium', colors.bg, colors.text)}>
                      {signal.label}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Links */}
            <div className="flex gap-2 mt-4">
              {candidate.github_handle && (
                <a
                  href={`https://github.com/${candidate.github_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="w-4 h-4" />
                  {candidate.github_handle}
                </a>
              )}
              {candidate.profile_url && (
                <a
                  href={candidate.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Profile
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skill Profile */}
        {sp && (
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" />
                Skill Profile
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall scores */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Overall', score: sp.overall_score },
                  { label: 'Depth', score: sp.depth_score },
                  { label: 'Breadth', score: sp.breadth_score },
                  { label: 'Collaboration', score: sp.collaboration_score },
                ].map(({ label, score }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                    <ScoreCircle score={score} size="sm" />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-semibold font-mono" style={{ color: getScoreColor(score) }}>{score}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Domains */}
              {sp.domains.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Domain Expertise</h3>
                  {sp.domains.map(domain => (
                    <div key={domain.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{domain.name}</span>
                        <span className="text-sm font-mono" style={{ color: getScoreColor(domain.score) }}>
                          {domain.score}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${domain.score}%`, backgroundColor: getScoreColor(domain.score) }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {domain.evidence.slice(0, 3).map((e, i) => (
                          <span key={i} className="text-xs text-muted-foreground font-mono">{e}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* GitHub Stats */}
        {gp && (
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Github className="w-5 h-5 text-primary" />
                GitHub Activity
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-secondary">
                  <p className="text-2xl font-bold font-mono text-foreground">{gp.public_repos}</p>
                  <p className="text-xs text-muted-foreground">Repos</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary">
                  <p className="text-2xl font-bold font-mono text-foreground">{gp.followers}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary">
                  <p className="text-2xl font-bold font-mono text-foreground">
                    {gp.repositories.reduce((s, r) => s + r.stars, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Stars</p>
                </div>
              </div>

              {/* Languages */}
              {gp.top_languages.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Top Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {gp.top_languages.map(lang => (
                      <Badge key={lang.language} variant="secondary" className="font-mono">
                        {lang.language} <span className="text-muted-foreground ml-1">{lang.percentage}%</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Contributed To — repos with contributions flagged */}
              {(() => {
                const contributedRepos = gp.repositories
                  .filter(r => (r.contributions || 0) > 0 && (r.is_fork || r.stars >= 100))
                  .sort((a, b) => (b.stars * (b.contributions || 1)) - (a.stars * (a.contributions || 1)))
                  .slice(0, 5)
                if (contributedRepos.length === 0) return null
                return (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Contributed To</h3>
                    <div className="space-y-2">
                      {contributedRepos.map(repo => (
                        <a
                          key={repo.full_name}
                          href={`https://github.com/${repo.full_name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-medium text-primary font-mono">{repo.full_name}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3" />
                                {repo.stars.toLocaleString()}
                              </span>
                              {repo.contributions && (
                                <span className="text-primary/80">{repo.contributions} commits</span>
                              )}
                            </div>
                          </div>
                          {repo.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{repo.description}</p>
                          )}
                        </a>
                      ))}
                    </div>
                    {candidate.github_handle && (
                      <a
                        href={`https://github.com/${candidate.github_handle}?tab=repositories&type=fork`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary/70 hover:text-primary mt-2 inline-block"
                      >
                        View all on GitHub
                      </a>
                    )}
                  </div>
                )
              })()}

              {/* Notable Repositories — own repos, filtered for quality */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Notable Repositories</h3>
                <div className="space-y-2">
                  {gp.repositories
                    .filter(r => !r.is_fork && (r.stars >= 5 || r.description))
                    .sort((a, b) => b.stars - a.stars)
                    .slice(0, 5)
                    .map(repo => (
                      <a
                        key={repo.full_name}
                        href={`https://github.com/${repo.full_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-sm font-medium text-primary font-mono">{repo.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3" />
                              {repo.stars}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <GitFork className="w-3 h-3" />
                              {repo.forks}
                            </span>
                          </div>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{repo.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {repo.language && (
                            <span className="text-xs text-muted-foreground font-mono">{repo.language}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 inline mr-0.5" />
                            {formatDate(repo.updated_at)}
                          </span>
                        </div>
                      </a>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {candidate.notes && (
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Notes</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
