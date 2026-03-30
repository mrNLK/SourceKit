import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecruiterCandidates } from '../hooks/useRecruiterCandidates';
import PageHeader from '../components/PageHeader';
import TierBadge from '../components/TierBadge';
import { StageBadge, ContactBadge, PriorityBadge } from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { getScoreColor } from '../services/scoring';
import { TIER_CONFIG, STAGE_CONFIG } from '../lib/constants';
import { candidatesToCSV, downloadCSV } from '../services/export';
import type { CandidateTier, PipelineStage, RecruiterCandidate } from '../lib/types';
import {
  Users,
  Search,
  Filter,
  Download,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react';

// --- Sorting ---

type SortField = 'composite_score' | 'eea_score' | 'builder_score' | 'ai_recency_score';
type SortDir = 'asc' | 'desc';

function getSortValue(c: RecruiterCandidate, field: SortField): number {
  if (field === 'composite_score') return c.composite_score ?? 0;
  if (field === 'eea_score') return c.eea_score?.score ?? 0;
  if (field === 'builder_score') return c.builder_score?.score ?? 0;
  if (field === 'ai_recency_score') return c.ai_recency_score?.score ?? 0;
  return 0;
}

function compareCandidates(a: RecruiterCandidate, b: RecruiterCandidate, field: SortField, dir: SortDir): number {
  const av = getSortValue(a, field);
  const bv = getSortValue(b, field);
  return dir === 'asc' ? av - bv : bv - av;
}

// --- Component ---

export default function CandidateIntelList() {
  const navigate = useNavigate();

  // Filters
  const [searchText, setSearchText] = useState('');
  const [tierFilter, setTierFilter] = useState<CandidateTier | ''>('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('composite_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: candidates, isLoading } = useRecruiterCandidates({
    tier: tierFilter || undefined,
    stage: stageFilter || undefined,
  });

  // Client-side text filter
  const filtered = (candidates ?? []).filter((c) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.current_title ?? '').toLowerCase().includes(q) ||
      (c.current_company ?? '').toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => compareCandidates(a, b, sortField, sortDir));

  const hasFilters = searchText || tierFilter || stageFilter;

  function clearFilters() {
    setSearchText('');
    setTierFilter('');
    setStageFilter('');
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((c) => c.id)));
    }
  }

  function handleExportAll() {
    if (!candidates?.length) return;
    const csv = candidatesToCSV(candidates);
    downloadCSV(csv, 'candidates-all.csv');
  }

  function handleExportSelected() {
    const selected = sorted.filter((c) => selectedIds.has(c.id));
    if (!selected.length) return;
    const csv = candidatesToCSV(selected);
    downloadCSV(csv, 'candidates-selected.csv');
  }

  // Sort header helper
  function SortHeader({ label, field }: { label: string; field: SortField }) {
    const active = sortField === field;
    return (
      <button
        className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider select-none"
        style={{ color: active ? 'var(--ros-accent)' : 'var(--ros-text-muted)' }}
        onClick={() => toggleSort(field)}
      >
        {label}
        {active && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </button>
    );
  }

  // Score cell helper
  function ScoreCell({ value }: { value: number | null | undefined }) {
    const v = value ?? 0;
    return (
      <span className={`font-mono text-xs font-bold ${getScoreColor(v)}`}>
        {v}
      </span>
    );
  }

  // --- Skeleton ---
  function SkeletonRows() {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <tr key={i}>
            {Array.from({ length: 10 }).map((_, j) => (
              <td key={j} className="px-3 py-2">
                <div className="h-4 rounded animate-pulse" style={{ background: 'var(--ros-bg-hover)', width: j === 0 ? '16px' : '60px' }} />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Candidate Intel"
        subtitle="Sortable, filterable view of all pipeline candidates"
        actions={
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono px-2 py-1 rounded"
              style={{ background: 'var(--ros-bg-secondary)', color: 'var(--ros-text-muted)' }}
            >
              {filtered.length} candidate{filtered.length !== 1 ? 's' : ''}
            </span>
            <button
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border transition-colors"
              style={{
                borderColor: 'var(--ros-border)',
                color: 'var(--ros-text-secondary)',
                background: 'var(--ros-bg-card)',
              }}
              onClick={handleExportAll}
            >
              <Download className="w-3.5 h-3.5" />
              Export All
            </button>
          </div>
        }
      />

      {/* Sticky filter bar */}
      <div
        className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border"
        style={{
          background: 'var(--ros-bg-card)',
          borderColor: 'var(--ros-border)',
        }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--ros-text-muted)' }}
          />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, title, company, or tag..."
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded border outline-none transition-colors"
            style={{
              background: 'var(--ros-bg-secondary)',
              borderColor: 'var(--ros-border)',
              color: 'var(--ros-text-primary)',
            }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--ros-text-muted)' }} />
        </div>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as CandidateTier | '')}
          className="text-xs px-2 py-1.5 rounded border outline-none"
          style={{
            background: 'var(--ros-bg-secondary)',
            borderColor: 'var(--ros-border)',
            color: 'var(--ros-text-secondary)',
          }}
        >
          <option value="">All Tiers</option>
          {(Object.keys(TIER_CONFIG) as CandidateTier[]).map((t) => (
            <option key={t} value={t}>
              {TIER_CONFIG[t].label}
            </option>
          ))}
        </select>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as PipelineStage | '')}
          className="text-xs px-2 py-1.5 rounded border outline-none"
          style={{
            background: 'var(--ros-bg-secondary)',
            borderColor: 'var(--ros-border)',
            color: 'var(--ros-text-secondary)',
          }}
        >
          <option value="">All Stages</option>
          {(Object.keys(STAGE_CONFIG) as PipelineStage[]).map((s) => (
            <option key={s} value={s}>
              {STAGE_CONFIG[s].label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition-colors"
            style={{ color: 'var(--ros-accent)', background: 'var(--ros-accent-muted)' }}
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg border"
          style={{ background: 'var(--ros-accent-muted)', borderColor: 'var(--ros-accent)' }}
        >
          <span className="text-xs font-mono font-medium" style={{ color: 'var(--ros-accent)' }}>
            {selectedIds.size} selected
          </span>
          <button
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded transition-colors"
            style={{ background: 'var(--ros-accent)', color: '#fff' }}
            onClick={handleExportSelected}
          >
            <Download className="w-3.5 h-3.5" />
            Export Selected
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoading && sorted.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No candidates found"
          description="No candidates found. Run a search to populate your pipeline."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--ros-border)' }}>
          <table className="ros-table w-full text-left">
            <thead>
              <tr style={{ background: 'var(--ros-bg-secondary)' }}>
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={sorted.length > 0 && selectedIds.size === sorted.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--ros-text-muted)' }}>
                    Name
                  </span>
                </th>
                <th className="px-3 py-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--ros-text-muted)' }}>
                    Tier
                  </span>
                </th>
                <th className="px-3 py-2">
                  <SortHeader label="Composite" field="composite_score" />
                </th>
                <th className="px-3 py-2">
                  <SortHeader label="EEA" field="eea_score" />
                </th>
                <th className="px-3 py-2">
                  <SortHeader label="Builder" field="builder_score" />
                </th>
                <th className="px-3 py-2">
                  <SortHeader label="AI Recency" field="ai_recency_score" />
                </th>
                <th className="px-3 py-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--ros-text-muted)' }}>
                    Contact
                  </span>
                </th>
                <th className="px-3 py-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--ros-text-muted)' }}>
                    Priority
                  </span>
                </th>
                <th className="px-3 py-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--ros-text-muted)' }}>
                    Tags
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : (
                sorted.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid var(--ros-border)' }}
                    onClick={() => navigate(`/recruiter/candidates/${c.id}`)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--ros-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold font-mono"
                          style={{
                            background: 'var(--ros-accent-muted)',
                            color: 'var(--ros-accent)',
                          }}
                        >
                          {(c.name ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate" style={{ color: 'var(--ros-text-primary)' }}>
                            {c.name ?? 'Unknown'}
                          </div>
                          {c.current_company && (
                            <div className="text-[10px] truncate" style={{ color: 'var(--ros-text-muted)' }}>
                              {c.current_company}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <TierBadge tier={c.tier} />
                    </td>
                    <td className="px-3 py-2">
                      <ScoreCell value={c.composite_score} />
                    </td>
                    <td className="px-3 py-2">
                      <ScoreCell value={c.eea_score?.score} />
                    </td>
                    <td className="px-3 py-2">
                      <ScoreCell value={c.builder_score?.score} />
                    </td>
                    <td className="px-3 py-2">
                      <ScoreCell value={c.ai_recency_score?.score} />
                    </td>
                    <td className="px-3 py-2">
                      <ContactBadge status={c.contact_status} />
                    </td>
                    <td className="px-3 py-2">
                      <PriorityBadge priority={c.outreach_priority} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {c.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded truncate max-w-[80px]"
                            style={{
                              background: 'var(--ros-bg-secondary)',
                              color: 'var(--ros-text-muted)',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {c.tags.length > 3 && (
                          <span
                            className="text-[9px] font-mono px-1 py-0.5"
                            style={{ color: 'var(--ros-text-muted)' }}
                          >
                            +{c.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
