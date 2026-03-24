// SourceKit Recruiter OS — Reports Dashboard

import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { useRecruiterCandidates } from '../hooks/useRecruiterCandidates';
import { useAgentRuns } from '../hooks/useAgentRuns';
import { useRecruiterOutreach } from '../hooks/useRecruiterOutreach';
import { REPORT_CONFIG, TIER_CONFIG } from '../lib/constants';
import type { ReportType, RecruiterCandidate } from '../lib/types';
import { BarChart2, Download, Calendar, Filter } from 'lucide-react';

// --- Helpers ---

const REPORT_TYPES = Object.entries(REPORT_CONFIG) as Array<
  [ReportType, { label: string; description: string; icon: string }]
>;

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function formatPct(count: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}

// --- Bar chart (div-based) ---

function HorizontalBar({
  label,
  value,
  maxValue,
  color,
  displayValue,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  displayValue: string;
}) {
  const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0;
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-xs w-24 shrink-0 text-right"
        style={{ color: 'var(--ros-text-secondary)' }}
      >
        {label}
      </span>
      <div className="flex-1 h-5 rounded-sm overflow-hidden" style={{ background: 'var(--ros-bg-hover)' }}>
        <div
          className="h-full rounded-sm transition-all duration-500"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <span
        className="text-xs font-mono w-12 shrink-0"
        style={{ color: 'var(--ros-text-primary)' }}
      >
        {displayValue}
      </span>
    </div>
  );
}

// --- Stat card ---

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col items-center"
      style={{
        background: 'var(--ros-bg-card)',
        border: '1px solid var(--ros-border)',
      }}
    >
      <span className="text-xl font-semibold font-mono" style={{ color: 'var(--ros-text-primary)' }}>
        {value}
      </span>
      <span className="text-[11px] mt-1" style={{ color: 'var(--ros-text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

// --- Placeholder report ---

function PlaceholderReport({
  message,
  tableHeaders,
  tableRows,
}: {
  message: string;
  tableHeaders?: string[];
  tableRows?: string[][];
}) {
  return (
    <div>
      <p className="text-xs mb-4" style={{ color: 'var(--ros-text-muted)' }}>
        {message}
      </p>
      {tableHeaders && (
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: 'var(--ros-bg-card)',
            border: '1px solid var(--ros-border)',
          }}
        >
          <div
            className="grid text-[10px] font-mono uppercase tracking-wider px-3 py-2"
            style={{
              gridTemplateColumns: `repeat(${tableHeaders.length}, 1fr)`,
              color: 'var(--ros-text-muted)',
              borderBottom: '1px solid var(--ros-border)',
            }}
          >
            {tableHeaders.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          {(tableRows ?? []).map((row, i) => (
            <div
              key={i}
              className="grid text-xs px-3 py-2"
              style={{
                gridTemplateColumns: `repeat(${tableHeaders.length}, 1fr)`,
                color: 'var(--ros-text-secondary)',
                borderBottom: '1px solid var(--ros-border)',
              }}
            >
              {row.map((cell, j) => (
                <span key={j}>{cell}</span>
              ))}
            </div>
          ))}
          {(!tableRows || tableRows.length === 0) && (
            <div className="px-3 py-4 text-center text-xs" style={{ color: 'var(--ros-text-muted)' }}>
              Insufficient data
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Tier bar colors ---

const TIER_BAR_COLORS: Record<string, string> = {
  tier_1: '#34d399',
  tier_2: '#818cf8',
  borderline: '#fbbf24',
  below_bar: '#f87171',
  false_positive: '#a1a1aa',
  nurture: '#a78bfa',
  ats_synced: '#60a5fa',
  unclassified: '#71717a',
};

// --- Main Component ---

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>('candidate_volume_by_tier');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data: candidates } = useRecruiterCandidates();
  const { data: agentRuns } = useAgentRuns();
  const { data: outreach } = useRecruiterOutreach();

  const allCandidates = candidates ?? [];
  const allRuns = agentRuns ?? [];
  const allOutreach = outreach ?? [];

  // Date-filtered candidates
  const filteredCandidates = allCandidates.filter((c) => {
    if (dateFrom && new Date(c.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(c.created_at) > new Date(dateTo)) return false;
    return true;
  });

  // --- Report renderers ---

  function renderCandidateVolumeByTier() {
    const tierEntries = Object.entries(TIER_CONFIG) as Array<
      [string, { label: string; order: number }]
    >;
    tierEntries.sort((a, b) => a[1].order - b[1].order);

    const counts: Record<string, number> = {};
    tierEntries.forEach(([key]) => {
      counts[key] = filteredCandidates.filter((c) => c.tier === key).length;
    });
    const maxCount = Math.max(...Object.values(counts), 1);
    const total = filteredCandidates.length;

    const handleExport = () => {
      exportCsv(
        'candidate_volume_by_tier.csv',
        ['Tier', 'Count', 'Percentage'],
        tierEntries.map(([key, cfg]) => [cfg.label, String(counts[key]), formatPct(counts[key], total)]),
      );
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
            Candidate Volume by Tier
          </h3>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
            style={{ color: 'var(--ros-text-secondary)', background: 'var(--ros-bg-hover)' }}
          >
            <Download size={11} />
            Export CSV
          </button>
        </div>

        {total === 0 ? (
          <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>
            No candidates in the pipeline yet.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-6">
              {tierEntries.map(([key, cfg]) => (
                <HorizontalBar
                  key={key}
                  label={cfg.label}
                  value={counts[key]}
                  maxValue={maxCount}
                  color={TIER_BAR_COLORS[key] ?? '#71717a'}
                  displayValue={String(counts[key])}
                />
              ))}
            </div>

            {/* Table */}
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--ros-bg-card)',
                border: '1px solid var(--ros-border)',
              }}
            >
              <div
                className="grid text-[10px] font-mono uppercase tracking-wider px-3 py-2"
                style={{
                  gridTemplateColumns: '1fr 80px 80px',
                  color: 'var(--ros-text-muted)',
                  borderBottom: '1px solid var(--ros-border)',
                }}
              >
                <span>Tier</span>
                <span>Count</span>
                <span>Percentage</span>
              </div>
              {tierEntries.map(([key, cfg]) => (
                <div
                  key={key}
                  className="grid text-xs px-3 py-2"
                  style={{
                    gridTemplateColumns: '1fr 80px 80px',
                    color: 'var(--ros-text-secondary)',
                    borderBottom: '1px solid var(--ros-border)',
                  }}
                >
                  <span>{cfg.label}</span>
                  <span className="font-mono">{counts[key]}</span>
                  <span className="font-mono">{formatPct(counts[key], total)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderSourceQuality() {
    return (
      <PlaceholderReport
        message="Source quality analysis requires enrichment data. Run enrichment jobs to populate."
        tableHeaders={['Source', 'Candidates', 'Tier 1 %', 'Avg Score']}
        tableRows={[]}
      />
    );
  }

  function renderArtifactRecency() {
    return (
      <PlaceholderReport
        message="Artifact recency analysis requires enriched candidate data with artifact timestamps."
        tableHeaders={['Recency Bucket', 'Candidate Count', '% of Pipeline']}
        tableRows={[]}
      />
    );
  }

  function renderResponseRates() {
    return (
      <PlaceholderReport
        message="Response rate analysis requires outreach data with reply tracking enabled."
        tableHeaders={['Sequence Step', 'Sent', 'Replied', 'Rate']}
        tableRows={[]}
      />
    );
  }

  function renderHiddenGemYield() {
    const gems = filteredCandidates.filter(
      (c) => c.hidden_gem_score?.score != null && c.hidden_gem_score.score >= 70,
    );
    const total = filteredCandidates.length;
    const gemsByTier: Record<string, number> = {};
    gems.forEach((c) => {
      gemsByTier[c.tier] = (gemsByTier[c.tier] ?? 0) + 1;
    });

    const handleExport = () => {
      exportCsv(
        'hidden_gem_yield.csv',
        ['Metric', 'Value'],
        [
          ['Total Hidden Gems', String(gems.length)],
          ['Pipeline Percentage', formatPct(gems.length, total)],
          ...Object.entries(gemsByTier).map(([tier, count]) => [
            `Tier: ${TIER_CONFIG[tier as keyof typeof TIER_CONFIG]?.label ?? tier}`,
            String(count),
          ]),
        ],
      );
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
            Hidden Gem Yield
          </h3>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
            style={{ color: 'var(--ros-text-secondary)', background: 'var(--ros-bg-hover)' }}
          >
            <Download size={11} />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <StatBlock label="Total Hidden Gems" value={gems.length} />
          <StatBlock label="% of Pipeline" value={formatPct(gems.length, total)} />
          <StatBlock label="Total Candidates" value={total} />
        </div>

        {gems.length > 0 ? (
          <div>
            <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--ros-text-secondary)' }}>
              Hidden Gem Tier Distribution
            </h4>
            <div className="flex flex-col gap-2">
              {Object.entries(gemsByTier).map(([tier, count]) => (
                <HorizontalBar
                  key={tier}
                  label={TIER_CONFIG[tier as keyof typeof TIER_CONFIG]?.label ?? tier}
                  value={count}
                  maxValue={gems.length}
                  color={TIER_BAR_COLORS[tier] ?? '#71717a'}
                  displayValue={String(count)}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>
            No hidden gems detected yet. Candidates with a hidden gem score of 70+ will appear here.
          </p>
        )}
      </div>
    );
  }

  function renderRecruiterThroughput() {
    const candidatesThisWeek = filteredCandidates.filter((c) => isThisWeek(c.created_at)).length;
    const outreachThisWeek = allOutreach.filter(
      (o) => o.status === 'sent' && o.sent_at && isThisWeek(o.sent_at),
    ).length;

    const handleExport = () => {
      exportCsv(
        'recruiter_throughput.csv',
        ['Metric', 'Value'],
        [
          ['Candidates Added (This Week)', String(candidatesThisWeek)],
          ['Outreach Sent (This Week)', String(outreachThisWeek)],
        ],
      );
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
            Recruiter Throughput
          </h3>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
            style={{ color: 'var(--ros-text-secondary)', background: 'var(--ros-bg-hover)' }}
          >
            <Download size={11} />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBlock label="Candidates Added (This Week)" value={candidatesThisWeek} />
          <StatBlock label="Outreach Sent (This Week)" value={outreachThisWeek} />
        </div>
      </div>
    );
  }

  function renderAtsExportVolume() {
    const byStatus: Record<string, number> = {};
    filteredCandidates.forEach((c) => {
      byStatus[c.ats_sync_status] = (byStatus[c.ats_sync_status] ?? 0) + 1;
    });

    const statusLabels: Record<string, string> = {
      not_synced: 'Not Synced',
      synced: 'Synced',
      sync_failed: 'Sync Failed',
    };

    const entries = Object.entries(byStatus);
    const maxCount = Math.max(...entries.map(([, v]) => v), 1);

    const handleExport = () => {
      exportCsv(
        'ats_export_volume.csv',
        ['Status', 'Count'],
        entries.map(([key, count]) => [statusLabels[key] ?? key, String(count)]),
      );
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
            ATS Export Volume
          </h3>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
            style={{ color: 'var(--ros-text-secondary)', background: 'var(--ros-bg-hover)' }}
          >
            <Download size={11} />
            Export CSV
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>
            No candidates to analyze.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map(([key, count]) => (
              <HorizontalBar
                key={key}
                label={statusLabels[key] ?? key}
                value={count}
                maxValue={maxCount}
                color={key === 'synced' ? '#60a5fa' : key === 'sync_failed' ? '#f87171' : '#71717a'}
                displayValue={String(count)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderStaleCandidates() {
    const stale = filteredCandidates.filter((c) => daysSince(c.updated_at) > 14);
    stale.sort((a, b) => daysSince(b.updated_at) - daysSince(a.updated_at));

    const handleExport = () => {
      exportCsv(
        'stale_candidates.csv',
        ['Name', 'Tier', 'Days Since Update', 'Stage'],
        stale.map((c) => [
          c.name ?? 'Unknown',
          TIER_CONFIG[c.tier]?.label ?? c.tier,
          String(daysSince(c.updated_at)),
          c.pipeline_stage,
        ]),
      );
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
            Stale Candidates
          </h3>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
            style={{ color: 'var(--ros-text-secondary)', background: 'var(--ros-bg-hover)' }}
          >
            <Download size={11} />
            Export CSV
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--ros-text-muted)' }}>
          Candidates with no updates in 14+ days ({stale.length} found)
        </p>

        {stale.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>
            No stale candidates. All candidates have been updated recently.
          </p>
        ) : (
          <div
            className="rounded-lg overflow-hidden"
            style={{
              background: 'var(--ros-bg-card)',
              border: '1px solid var(--ros-border)',
            }}
          >
            <div
              className="grid text-[10px] font-mono uppercase tracking-wider px-3 py-2"
              style={{
                gridTemplateColumns: '1fr 100px 80px 100px',
                color: 'var(--ros-text-muted)',
                borderBottom: '1px solid var(--ros-border)',
              }}
            >
              <span>Name</span>
              <span>Tier</span>
              <span>Days</span>
              <span>Stage</span>
            </div>
            {stale.slice(0, 50).map((c) => (
              <div
                key={c.id}
                className="grid text-xs px-3 py-2"
                style={{
                  gridTemplateColumns: '1fr 100px 80px 100px',
                  color: 'var(--ros-text-secondary)',
                  borderBottom: '1px solid var(--ros-border)',
                }}
              >
                <span className="truncate" style={{ color: 'var(--ros-text-primary)' }}>
                  {c.name ?? 'Unknown'}
                </span>
                <span>{TIER_CONFIG[c.tier]?.label ?? c.tier}</span>
                <span className="font-mono" style={{ color: '#fbbf24' }}>
                  {daysSince(c.updated_at)}d
                </span>
                <span>{c.pipeline_stage}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Report router ---

  const REPORT_RENDERERS: Record<ReportType, () => React.ReactNode> = {
    candidate_volume_by_tier: renderCandidateVolumeByTier,
    source_quality: renderSourceQuality,
    artifact_recency: renderArtifactRecency,
    response_rates: renderResponseRates,
    hidden_gem_yield: renderHiddenGemYield,
    recruiter_throughput: renderRecruiterThroughput,
    ats_export_volume: renderAtsExportVolume,
    stale_candidates: renderStaleCandidates,
  };

  return (
    <div className="ros-fade-in">
      <PageHeader
        title="Reports"
        subtitle="Pipeline analytics and recruiter metrics"
      />

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar: report type selector */}
        <div className="lg:w-64 shrink-0">
          <div
            className="rounded-lg overflow-hidden"
            style={{
              background: 'var(--ros-bg-card)',
              border: '1px solid var(--ros-border)',
            }}
          >
            {REPORT_TYPES.map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setActiveReport(key)}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors"
                style={{
                  background: activeReport === key ? 'var(--ros-accent-muted)' : 'transparent',
                  borderBottom: '1px solid var(--ros-border)',
                  color: activeReport === key ? 'var(--ros-accent)' : 'var(--ros-text-secondary)',
                }}
              >
                <BarChart2 size={13} />
                <span className="text-xs font-medium">{cfg.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Top controls */}
          <div
            className="flex flex-wrap items-center gap-3 mb-5 p-3 rounded-lg"
            style={{
              background: 'var(--ros-bg-card)',
              border: '1px solid var(--ros-border)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Calendar size={12} style={{ color: 'var(--ros-text-muted)' }} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs px-2 py-1 rounded-md"
                style={{
                  background: 'var(--ros-bg-hover)',
                  border: '1px solid var(--ros-border)',
                  color: 'var(--ros-text-primary)',
                }}
              />
              <span className="text-[10px]" style={{ color: 'var(--ros-text-muted)' }}>
                to
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs px-2 py-1 rounded-md"
                style={{
                  background: 'var(--ros-bg-hover)',
                  border: '1px solid var(--ros-border)',
                  color: 'var(--ros-text-primary)',
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter size={12} style={{ color: 'var(--ros-text-muted)' }} />
              <input
                type="text"
                placeholder="Filter by role..."
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs px-2 py-1 rounded-md w-40"
                style={{
                  background: 'var(--ros-bg-hover)',
                  border: '1px solid var(--ros-border)',
                  color: 'var(--ros-text-primary)',
                }}
              />
            </div>
          </div>

          {/* Report content */}
          <div
            className="rounded-lg p-5"
            style={{
              background: 'var(--ros-bg-card)',
              border: '1px solid var(--ros-border)',
            }}
          >
            {REPORT_RENDERERS[activeReport]?.() ?? (
              <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>
                Report not available.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
