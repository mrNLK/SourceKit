// SourceKit Recruiter OS — Command Center (Home Screen)

import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Star,
  Gem,
  Mail,
  Database,
  AlertCircle,
  ChevronRight,
  Plus,
  FileText,
  Send,
  Download,
  Activity,
  ClipboardList,
} from 'lucide-react';
import { useRecruiterPipelineStats, useRecruiterCandidates } from '../hooks/useRecruiterCandidates';
import { useAgentRuns } from '../hooks/useAgentRuns';
import { useRecruiterScorecards } from '../hooks/useRecruiterScorecard';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import TierBadge from '../components/TierBadge';
import { RunStatusBadge } from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { AGENT_RUN_TYPE_CONFIG, TIER_CONFIG } from '../lib/constants';
import type { CandidateTier } from '../lib/types';

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: 'var(--ros-bg-secondary)' }}
    />
  );
}

const TIER_BAR_COLORS: Record<string, string> = {
  tier_1: '#34d399',
  tier_2: '#818cf8',
  borderline: '#fbbf24',
  below_bar: '#f87171',
};

export default function CommandCenter() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useRecruiterPipelineStats();
  const { data: reviewCandidates, isLoading: reviewLoading } = useRecruiterCandidates({ needs_review: true });
  const { data: agentRuns, isLoading: runsLoading } = useAgentRuns({ limit: 5 });
  const { data: scorecards, isLoading: scorecardsLoading } = useRecruiterScorecards();

  const reviewQueue = (reviewCandidates ?? []).slice(0, 10);
  const topScorecards = (scorecards ?? []).slice(0, 5);

  return (
    <div className="ros-fade-in">
      <PageHeader
        title="Command Center"
        subtitle="Your recruiting pipeline at a glance"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6 ros-stagger">
        {statsLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))
        ) : (
          <>
            <StatCard label="Searches This Week" value={0} sublabel="searches run" />
            <StatCard label="Candidates Added" value={stats?.total ?? 0} sublabel="total" />
            <StatCard label="Tier 1" value={stats?.tier_1 ?? 0} sublabel="top candidates" />
            <StatCard label="Tier 2" value={stats?.tier_2 ?? 0} sublabel="strong candidates" />
            <StatCard label="Hidden Gems" value={stats?.hidden_gems ?? 0} sublabel="underrecognized" />
            <StatCard label="Outreach Queued" value={stats?.outreach_sent ?? 0} sublabel="in pipeline" />
            <StatCard label="ATS Synced" value={stats?.ats_synced ?? 0} sublabel="exported" />
            <StatCard label="Needs Review" value={stats?.needs_review ?? 0} sublabel="awaiting action" accent />
          </>
        )}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Review Queue */}
        <div
          className="rounded-lg border p-4 ros-fade-in"
          style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
                Review Queue
              </h2>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: 'var(--ros-accent-muted)', color: 'var(--ros-accent)' }}
              >
                {reviewQueue.length}
              </span>
            </div>
          </div>

          {reviewLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-10" />
              ))}
            </div>
          ) : reviewQueue.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={24} />}
              title="All clear"
              description="No candidates awaiting review."
            />
          ) : (
            <div className="space-y-1">
              {reviewQueue.map((candidate) => {
                const initial = (candidate.name ?? 'U')[0].toUpperCase();
                return (
                  <div
                    key={candidate.id}
                    className="flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--ros-border)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'var(--ros-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    }}
                    onClick={() => navigate(`/recruiter/candidates/${candidate.id}`)}
                  >
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0"
                      style={{
                        background: 'var(--ros-accent-muted)',
                        color: 'var(--ros-accent)',
                      }}
                    >
                      {initial}
                    </div>

                    {/* Name & title */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--ros-text-primary)' }}>
                        {candidate.name ?? 'Unknown'}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--ros-text-muted)' }}>
                        {candidate.current_title ?? 'No title'}
                      </p>
                    </div>

                    {/* Tier badge */}
                    <TierBadge tier={candidate.tier} size="sm" />

                    {/* Review button */}
                    <button
                      className="text-[10px] font-mono font-medium px-2 py-1 rounded border transition-colors shrink-0"
                      style={{
                        color: 'var(--ros-accent)',
                        borderColor: 'var(--ros-accent)',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--ros-accent-muted)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/recruiter/candidates/${candidate.id}`);
                      }}
                    >
                      Review
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Recent Agent Runs */}
          <div
            className="rounded-lg border p-4 ros-fade-in"
            style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
                Recent Agent Runs
              </h2>
              <button
                className="text-[10px] font-mono flex items-center gap-1 transition-colors"
                style={{ color: 'var(--ros-accent)' }}
                onClick={() => navigate('/recruiter/agents')}
              >
                View all <ChevronRight size={12} />
              </button>
            </div>

            {runsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-8" />
                ))}
              </div>
            ) : (agentRuns ?? []).length === 0 ? (
              <EmptyState
                icon={<Activity size={24} />}
                title="No runs"
                description="No agent runs yet."
              />
            ) : (
              <div className="space-y-1">
                {(agentRuns ?? []).map((run) => {
                  const typeConfig = AGENT_RUN_TYPE_CONFIG[run.type];
                  return (
                    <div
                      key={run.id}
                      className="flex items-center gap-3 p-2 rounded-md"
                      style={{ borderColor: 'var(--ros-border)' }}
                    >
                      <span className="text-xs font-mono flex-1" style={{ color: 'var(--ros-text-secondary)' }}>
                        {typeConfig?.label ?? run.type}
                      </span>
                      <RunStatusBadge status={run.status} />
                      <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--ros-text-muted)' }}>
                        {timeAgo(run.started_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Role Scorecards */}
          <div
            className="rounded-lg border p-4 ros-fade-in"
            style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
                Role Scorecards
              </h2>
              <button
                className="text-[10px] font-mono flex items-center gap-1 transition-colors"
                style={{ color: 'var(--ros-accent)' }}
                onClick={() => navigate('/recruiter/scorecards')}
              >
                View all <ChevronRight size={12} />
              </button>
            </div>

            {scorecardsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-8" />
                ))}
              </div>
            ) : topScorecards.length === 0 ? (
              <EmptyState
                icon={<FileText size={24} />}
                title="No scorecards"
                description="No scorecards created."
              />
            ) : (
              <div className="space-y-1">
                {topScorecards.map((sc) => {
                  const statusColors: Record<string, { color: string; bg: string }> = {
                    draft: { color: 'text-zinc-400', bg: 'bg-zinc-500/15' },
                    active: { color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
                    archived: { color: 'text-amber-400', bg: 'bg-amber-500/15' },
                  };
                  const st = statusColors[sc.status] ?? statusColors.draft;
                  return (
                    <div
                      key={sc.id}
                      className="flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = 'var(--ros-bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                      }}
                      onClick={() => navigate(`/recruiter/scorecards`)}
                    >
                      <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--ros-text-primary)' }}>
                        {sc.name}
                      </span>
                      <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${st.color} ${st.bg}`}>
                        {sc.status}
                      </span>
                      <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--ros-text-muted)' }}>
                        {formatDate(sc.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Snapshot */}
      {stats && stats.total > 0 && (
        <div
          className="rounded-lg border p-4 mb-6 ros-fade-in"
          style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--ros-text-primary)' }}>
            Pipeline Snapshot
          </h2>
          <div className="flex rounded overflow-hidden h-6 mb-2">
            {(
              [
                { key: 'tier_1' as CandidateTier, count: stats.tier_1 },
                { key: 'tier_2' as CandidateTier, count: stats.tier_2 },
                { key: 'borderline' as CandidateTier, count: stats.borderline },
                { key: 'below_bar' as CandidateTier, count: stats.below_bar },
              ] as const
            )
              .filter((seg) => seg.count > 0)
              .map((seg) => {
                const pct = (seg.count / stats.total) * 100;
                return (
                  <div
                    key={seg.key}
                    className="flex items-center justify-center text-[10px] font-mono font-bold transition-all"
                    style={{
                      width: `${pct}%`,
                      background: TIER_BAR_COLORS[seg.key],
                      color: '#000',
                      minWidth: pct > 0 ? '24px' : '0',
                    }}
                    title={`${TIER_CONFIG[seg.key].label}: ${seg.count}`}
                  >
                    {pct >= 8 ? seg.count : ''}
                  </div>
                );
              })}
          </div>
          <div className="flex gap-4 flex-wrap">
            {(
              [
                { key: 'tier_1' as CandidateTier, count: stats.tier_1 },
                { key: 'tier_2' as CandidateTier, count: stats.tier_2 },
                { key: 'borderline' as CandidateTier, count: stats.borderline },
                { key: 'below_bar' as CandidateTier, count: stats.below_bar },
              ] as const
            )
              .filter((seg) => seg.count > 0)
              .map((seg) => (
                <div key={seg.key} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: TIER_BAR_COLORS[seg.key] }}
                  />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--ros-text-muted)' }}>
                    {TIER_CONFIG[seg.key].label} ({seg.count})
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div
        className="rounded-lg border p-4 ros-fade-in"
        style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--ros-text-primary)' }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Search', icon: <Search size={16} />, to: '/recruiter/search' },
            { label: 'Create Scorecard', icon: <Plus size={16} />, to: '/recruiter/scorecards' },
            { label: 'Generate Outreach', icon: <Send size={16} />, to: '/recruiter/outreach' },
            { label: 'Export Pipeline', icon: <Download size={16} />, to: null },
          ].map((action) => (
            <button
              key={action.label}
              className="flex items-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors"
              style={{
                color: 'var(--ros-text-secondary)',
                borderColor: 'var(--ros-border)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = 'var(--ros-accent)';
                el.style.color = 'var(--ros-accent)';
                el.style.background = 'var(--ros-bg-hover)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = 'var(--ros-border)';
                el.style.color = 'var(--ros-text-secondary)';
                el.style.background = 'transparent';
              }}
              onClick={() => {
                if (action.to) navigate(action.to);
              }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
