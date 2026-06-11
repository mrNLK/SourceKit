// SourceKit Recruiter OS — Team Pipeline

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useRecruiterCandidates,
  useUpdateCandidate,
} from '../hooks/useRecruiterCandidates';
import PageHeader from '../components/PageHeader';
import TierBadge from '../components/TierBadge';
import { StageBadge, ContactBadge } from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { getScoreColor } from '../services/scoring';
import { candidatesToCSV, downloadCSV } from '../services/export';
import { TIER_CONFIG, STAGE_CONFIG, PIPELINE_TIERS } from '../lib/constants';
import type {
  CandidateTier,
  PipelineStage,
  RecruiterCandidate,
} from '../lib/types';
import {
  Kanban,
  Table2,
  Filter,
  Download,
  ChevronDown,
  Users,
  Search,
  X,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_BORDER_COLORS: Record<string, string> = {
  tier_1: '#34d399',
  tier_2: '#818cf8',
  borderline: '#fbbf24',
  below_bar: '#f87171',
};

const STALE_DAYS = 14;

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function isStale(c: RecruiterCandidate): boolean {
  return daysSince(c.updated_at) >= STALE_DAYS;
}

function truncate(text: string | null, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

const ALL_STAGES = Object.keys(STAGE_CONFIG) as PipelineStage[];
const ALL_TIERS = Object.keys(TIER_CONFIG) as CandidateTier[];
const CONTACT_STATUSES = [
  'not_contacted',
  'contacted',
  'replied',
  'not_interested',
  'scheduled',
] as const;

type ViewMode = 'board' | 'table';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamPipeline() {
  const navigate = useNavigate();
  const { data: candidates = [], isLoading } = useRecruiterCandidates();
  const updateCandidate = useUpdateCandidate();

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  // Filters
  const [tierFilter, setTierFilter] = useState<CandidateTier | ''>('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');
  const [contactFilter, setContactFilter] = useState<string>('');
  const [tagSearch, setTagSearch] = useState('');
  const [staleOnly, setStaleOnly] = useState(false);

  // Table state
  const [scoreSortDir, setScoreSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const hasFilters =
    !!tierFilter || !!stageFilter || !!contactFilter || !!tagSearch || staleOnly;

  function clearFilters() {
    setTierFilter('');
    setStageFilter('');
    setContactFilter('');
    setTagSearch('');
    setStaleOnly(false);
  }

  // Apply filters
  const filtered = candidates.filter((c) => {
    if (tierFilter && c.tier !== tierFilter) return false;
    if (stageFilter && c.pipeline_stage !== stageFilter) return false;
    if (contactFilter && c.contact_status !== contactFilter) return false;
    if (tagSearch) {
      const q = tagSearch.toLowerCase();
      if (!c.tags.some((t) => t.toLowerCase().includes(q))) return false;
    }
    if (staleOnly && !isStale(c)) return false;
    return true;
  });

  // ---------------------------------------------------------------------------
  // Batch actions
  // ---------------------------------------------------------------------------

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  function batchChangeTier(tier: CandidateTier) {
    selected.forEach((id) => {
      updateCandidate.mutate({ id, updates: { tier } });
    });
    setSelected(new Set());
  }

  function exportSelected() {
    const rows = candidates.filter((c) => selected.has(c.id));
    if (!rows.length) return;
    downloadCSV(candidatesToCSV(rows), 'pipeline-export.csv');
  }

  function exportAll() {
    if (!filtered.length) return;
    downloadCSV(candidatesToCSV(filtered), 'pipeline-export.csv');
  }

  // ---------------------------------------------------------------------------
  // Card actions (board)
  // ---------------------------------------------------------------------------

  function handleCardAction(
    action: string,
    candidate: RecruiterCandidate,
    tier?: CandidateTier,
  ) {
    setOpenMenuId(null);
    switch (action) {
      case 'review':
        navigate(`/recruiter/candidates/${candidate.id}`);
        break;
      case 'outreach':
        navigate(`/recruiter/candidates/${candidate.id}`);
        break;
      case 'change_tier':
        if (tier) updateCandidate.mutate({ id: candidate.id, updates: { tier } });
        break;
      case 'hold':
        updateCandidate.mutate({
          id: candidate.id,
          updates: { pipeline_stage: 'hold' },
        });
        break;
      case 'suppress':
        updateCandidate.mutate({
          id: candidate.id,
          updates: { pipeline_stage: 'suppressed' },
        });
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const selectBtnStyle: React.CSSProperties = {
    background: 'var(--ros-bg-secondary)',
    border: '1px solid var(--ros-border)',
    color: 'var(--ros-text-secondary)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
  };

  // Board view: group candidates per tier, then per stage within each tier
  function renderBoard() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PIPELINE_TIERS.map((tier) => {
          const tierCandidates = filtered.filter((c) => c.tier === tier);
          const grouped = ALL_STAGES.reduce<Record<PipelineStage, RecruiterCandidate[]>>(
            (acc, stage) => {
              const matches = tierCandidates.filter((c) => c.pipeline_stage === stage);
              if (matches.length) acc[stage] = matches;
              return acc;
            },
            {} as Record<PipelineStage, RecruiterCandidate[]>,
          );

          return (
            <div
              key={tier}
              className="rounded-lg flex flex-col"
              style={{
                background: 'var(--ros-bg-secondary)',
                border: '1px solid var(--ros-border)',
                borderTop: `2px solid ${TIER_BORDER_COLORS[tier] ?? 'var(--ros-border)'}`,
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--ros-text-primary)' }}
                >
                  {TIER_CONFIG[tier].label}
                </span>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--ros-bg-tertiary)',
                    color: 'var(--ros-text-muted)',
                  }}
                >
                  {tierCandidates.length}
                </span>
              </div>

              {/* Scrollable body */}
              <div
                className="flex-1 overflow-y-auto px-2 pb-2 space-y-3"
                style={{ maxHeight: 640 }}
              >
                {Object.entries(grouped).map(([stage, group]) => (
                  <div key={stage}>
                    <div
                      className="text-[10px] font-mono uppercase tracking-wider px-1 mb-1"
                      style={{ color: 'var(--ros-text-muted)' }}
                    >
                      {STAGE_CONFIG[stage as PipelineStage].label}
                    </div>
                    <div className="space-y-2">
                      {group.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-lg p-2.5 cursor-pointer transition-colors relative group"
                          style={{
                            background: 'var(--ros-bg-card)',
                            border: `1px solid ${isStale(c) ? '#f59e0b55' : 'var(--ros-border)'}`,
                          }}
                          onClick={() => navigate(`/recruiter/candidates/${c.id}`)}
                        >
                          {/* Action menu trigger */}
                          <button
                            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5"
                            style={{
                              background: 'var(--ros-bg-secondary)',
                              color: 'var(--ros-text-muted)',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 14,
                              lineHeight: 1,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === c.id ? null : c.id);
                            }}
                          >
                            ...
                          </button>

                          {/* Action dropdown */}
                          {openMenuId === c.id && (
                            <div
                              className="absolute top-7 right-1.5 z-20 rounded-lg py-1 text-xs min-w-[160px]"
                              style={{
                                background: 'var(--ros-bg-card)',
                                border: '1px solid var(--ros-border)',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="block w-full text-left px-3 py-1.5 hover:opacity-80"
                                style={{ color: 'var(--ros-text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                onClick={() => handleCardAction('review', c)}
                              >
                                Review
                              </button>
                              <button
                                className="block w-full text-left px-3 py-1.5 hover:opacity-80"
                                style={{ color: 'var(--ros-text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                onClick={() => handleCardAction('outreach', c)}
                              >
                                Send Outreach
                              </button>
                              {/* Change tier submenu */}
                              <div
                                className="px-3 py-1.5"
                                style={{ color: 'var(--ros-text-muted)' }}
                              >
                                <span className="text-[10px] uppercase tracking-wider">
                                  Change Tier
                                </span>
                              </div>
                              {ALL_TIERS.filter((t) => t !== c.tier).map((t) => (
                                <button
                                  key={t}
                                  className="block w-full text-left px-5 py-1 hover:opacity-80"
                                  style={{ color: 'var(--ros-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}
                                  onClick={() => handleCardAction('change_tier', c, t)}
                                >
                                  {TIER_CONFIG[t].label}
                                </button>
                              ))}
                              <div
                                style={{
                                  borderTop: '1px solid var(--ros-border)',
                                  margin: '4px 0',
                                }}
                              />
                              <button
                                className="block w-full text-left px-3 py-1.5 hover:opacity-80"
                                style={{ color: 'var(--ros-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                onClick={() => handleCardAction('hold', c)}
                              >
                                Hold
                              </button>
                              <button
                                className="block w-full text-left px-3 py-1.5 hover:opacity-80"
                                style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
                                onClick={() => handleCardAction('suppress', c)}
                              >
                                Suppress
                              </button>
                            </div>
                          )}

                          {/* Card body */}
                          <div
                            className="text-xs font-medium truncate mb-0.5"
                            style={{ color: 'var(--ros-text-primary)' }}
                          >
                            {c.name ?? 'Unknown'}
                          </div>
                          <div
                            className="text-[10px] truncate mb-1.5"
                            style={{ color: 'var(--ros-text-muted)' }}
                          >
                            {truncate(c.current_title, 30)}
                            {c.current_company ? ` @ ${truncate(c.current_company, 20)}` : ''}
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className={`font-mono text-xs font-semibold ${getScoreColor(c.composite_score ?? 0)}`}
                            >
                              {c.composite_score ?? '--'}
                            </span>
                            <span
                              className="text-[10px]"
                              style={{ color: 'var(--ros-text-muted)' }}
                            >
                              {daysSince(c.updated_at)}d in stage
                            </span>
                            <ContactBadge status={c.contact_status} />
                          </div>
                          {c.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {c.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                                  style={{
                                    background: 'var(--ros-bg-tertiary)',
                                    color: 'var(--ros-text-muted)',
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {tierCandidates.length === 0 && (
                  <div
                    className="text-[10px] text-center py-6"
                    style={{ color: 'var(--ros-text-muted)' }}
                  >
                    No candidates
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Table view
  function renderTable() {
    const sorted = [...filtered].sort((a, b) => {
      const diff = (a.composite_score ?? 0) - (b.composite_score ?? 0);
      return scoreSortDir === 'asc' ? diff : -diff;
    });

    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--ros-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full ros-table" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: 'var(--ros-bg-secondary)',
                  borderBottom: '1px solid var(--ros-border)',
                }}
              >
                <th className="px-3 py-2 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    style={{ accentColor: 'var(--ros-accent)' }}
                  />
                </th>
                <th
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Name
                </th>
                <th
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Tier
                </th>
                <th
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Stage
                </th>
                <th
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none"
                  style={{ color: 'var(--ros-text-muted)' }}
                  onClick={() =>
                    setScoreSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                  }
                >
                  Score {scoreSortDir === 'asc' ? '\u2191' : '\u2193'}
                </th>
                <th
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Contact
                </th>
                <th
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Tags
                </th>
                <th
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Days
                </th>
                <th
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid var(--ros-border)',
                    background: isStale(c)
                      ? 'rgba(245, 158, 11, 0.04)'
                      : 'transparent',
                  }}
                  onClick={() => navigate(`/recruiter/candidates/${c.id}`)}
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      style={{ accentColor: 'var(--ros-accent)' }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className="text-xs font-medium"
                      style={{ color: 'var(--ros-text-primary)' }}
                    >
                      {c.name ?? 'Unknown'}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: 'var(--ros-text-muted)' }}
                    >
                      {truncate(c.current_title, 28)}
                      {c.current_company ? ` @ ${truncate(c.current_company, 18)}` : ''}
                    </div>
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={c.tier}
                      onChange={(e) =>
                        updateCandidate.mutate({
                          id: c.id,
                          updates: { tier: e.target.value as CandidateTier },
                        })
                      }
                      style={{
                        ...selectBtnStyle,
                        padding: '2px 6px',
                        fontSize: 10,
                      }}
                    >
                      {ALL_TIERS.map((t) => (
                        <option key={t} value={t}>
                          {TIER_CONFIG[t].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={c.pipeline_stage}
                      onChange={(e) =>
                        updateCandidate.mutate({
                          id: c.id,
                          updates: {
                            pipeline_stage: e.target.value as PipelineStage,
                          },
                        })
                      }
                      style={{
                        ...selectBtnStyle,
                        padding: '2px 6px',
                        fontSize: 10,
                      }}
                    >
                      {ALL_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_CONFIG[s].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`font-mono text-xs font-semibold ${getScoreColor(c.composite_score ?? 0)}`}
                    >
                      {c.composite_score ?? '--'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <ContactBadge status={c.contact_status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                          style={{
                            background: 'var(--ros-bg-tertiary)',
                            color: 'var(--ros-text-muted)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td
                    className="px-3 py-2 text-[10px] font-mono"
                    style={{ color: 'var(--ros-text-muted)' }}
                  >
                    {daysSince(c.created_at)}
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="text-[10px] font-medium"
                      style={{
                        color: 'var(--ros-accent)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/recruiter/candidates/${c.id}`)}
                    >
                      View <ArrowRight size={10} className="inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="ros-fade-in">
        <PageHeader title="Team Pipeline" subtitle="Loading pipeline..." />
        <div className="flex items-center justify-center py-20">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--ros-accent)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    );
  }

  if (!candidates.length) {
    return (
      <div className="ros-fade-in">
        <PageHeader title="Team Pipeline" />
        <EmptyState
          icon={<Users size={32} />}
          title="No candidates in pipeline"
          description="Search for candidates to build your pipeline."
          action={
            <button
              className="text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{
                background: 'var(--ros-accent)',
                color: '#000',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/recruiter/search')}
            >
              Go to Search Lab
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="ros-fade-in">
      <PageHeader
        title="Team Pipeline"
        subtitle={`${filtered.length} candidate${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--ros-border)' }}
            >
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium"
                style={{
                  background:
                    viewMode === 'board'
                      ? 'var(--ros-accent-muted)'
                      : 'var(--ros-bg-secondary)',
                  color:
                    viewMode === 'board'
                      ? 'var(--ros-accent)'
                      : 'var(--ros-text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setViewMode('board')}
              >
                <Kanban size={13} /> Board
              </button>
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium"
                style={{
                  background:
                    viewMode === 'table'
                      ? 'var(--ros-accent-muted)'
                      : 'var(--ros-bg-secondary)',
                  color:
                    viewMode === 'table'
                      ? 'var(--ros-accent)'
                      : 'var(--ros-text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setViewMode('table')}
              >
                <Table2 size={13} /> Table
              </button>
            </div>
            {/* Export */}
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
              style={{
                background: 'var(--ros-bg-secondary)',
                color: 'var(--ros-text-secondary)',
                border: '1px solid var(--ros-border)',
                cursor: 'pointer',
              }}
              onClick={exportAll}
            >
              <Download size={13} /> Export
            </button>
          </div>
        }
      />

      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg"
        style={{
          background: 'var(--ros-bg-secondary)',
          border: '1px solid var(--ros-border)',
        }}
      >
        <Filter size={13} style={{ color: 'var(--ros-text-muted)' }} />

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as CandidateTier | '')}
          style={selectBtnStyle}
        >
          <option value="">All Tiers</option>
          {ALL_TIERS.map((t) => (
            <option key={t} value={t}>
              {TIER_CONFIG[t].label}
            </option>
          ))}
        </select>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as PipelineStage | '')}
          style={selectBtnStyle}
        >
          <option value="">All Stages</option>
          {ALL_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_CONFIG[s].label}
            </option>
          ))}
        </select>

        <select
          value={contactFilter}
          onChange={(e) => setContactFilter(e.target.value)}
          style={selectBtnStyle}
        >
          <option value="">All Contact</option>
          {CONTACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--ros-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search tags..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className="text-xs pl-6 pr-2 py-1 rounded-md"
            style={{
              background: 'var(--ros-bg-card)',
              border: '1px solid var(--ros-border)',
              color: 'var(--ros-text-primary)',
              outline: 'none',
              width: 130,
            }}
          />
        </div>

        <label
          className="flex items-center gap-1.5 text-[11px] cursor-pointer"
          style={{ color: 'var(--ros-text-secondary)' }}
        >
          <input
            type="checkbox"
            checked={staleOnly}
            onChange={(e) => setStaleOnly(e.target.checked)}
            style={{ accentColor: '#f59e0b' }}
          />
          Stale (14+ days)
        </label>

        {hasFilters && (
          <button
            className="flex items-center gap-1 text-[11px] font-medium ml-auto"
            style={{
              color: 'var(--ros-accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={clearFilters}
          >
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Filter size={28} />}
          title="No matching candidates"
          description="Try adjusting your filters."
        />
      ) : viewMode === 'board' ? (
        renderBoard()
      ) : (
        renderTable()
      )}

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-xl z-30"
          style={{
            background: 'var(--ros-bg-card)',
            border: '1px solid var(--ros-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--ros-text-primary)' }}
          >
            {selected.size} selected
          </span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) batchChangeTier(e.target.value as CandidateTier);
              e.target.value = '';
            }}
            style={{ ...selectBtnStyle, fontSize: 11 }}
          >
            <option value="" disabled>
              Move to Tier...
            </option>
            {ALL_TIERS.map((t) => (
              <option key={t} value={t}>
                {TIER_CONFIG[t].label}
              </option>
            ))}
          </select>
          <button
            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md"
            style={{
              background: 'var(--ros-bg-secondary)',
              color: 'var(--ros-text-secondary)',
              border: '1px solid var(--ros-border)',
              cursor: 'pointer',
            }}
            onClick={exportSelected}
          >
            <Download size={12} /> Export Selected
          </button>
          <button
            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md"
            style={{
              background: 'var(--ros-accent-muted)',
              color: 'var(--ros-accent)',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => {
              /* placeholder for generate outreach */
            }}
          >
            Generate Outreach
          </button>
          <button
            style={{
              color: 'var(--ros-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => setSelected(new Set())}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
