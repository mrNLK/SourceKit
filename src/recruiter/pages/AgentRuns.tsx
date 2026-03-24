// SourceKit Recruiter OS — Agent Runs Log

import { useState } from 'react';
import { useAgentRuns } from '../hooks/useAgentRuns';
import PageHeader from '../components/PageHeader';
import { RunStatusBadge } from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { AGENT_RUN_TYPE_CONFIG, AGENT_RUN_STATUS_CONFIG } from '../lib/constants';
import type { AgentRunType, AgentRunStatus, AgentRun } from '../lib/types';
import {
  Bot,
  Filter,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Clock,
  AlertTriangle,
} from 'lucide-react';

// --- Formatters ---

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '--';
  if (ms < 1000) return '< 1s';
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec}s`;
}

function formatDateTime(date: string | null): string {
  if (!date) return '--';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ' ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateJson(obj: Record<string, unknown>, maxLen = 80): string {
  const str = JSON.stringify(obj);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

// --- Type filter options ---

const ALL_TYPES = Object.entries(AGENT_RUN_TYPE_CONFIG) as Array<
  [AgentRunType, { label: string; icon: string }]
>;

const ALL_STATUSES = Object.entries(AGENT_RUN_STATUS_CONFIG) as Array<
  [AgentRunStatus, { label: string; color: string; bgColor: string }]
>;

export default function AgentRuns() {
  const [typeFilter, setTypeFilter] = useState<AgentRunType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AgentRunStatus | ''>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: runs, isLoading, dataUpdatedAt } = useAgentRuns({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const list = runs ?? [];

  return (
    <div className="ros-fade-in">
      <PageHeader
        title="Agent Runs"
        subtitle="Track search, enrichment, scoring, and outreach jobs"
        actions={
          <div className="flex items-center gap-2">
            {dataUpdatedAt > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono"
                style={{ color: 'var(--ros-text-muted)' }}
              >
                <RefreshCw size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
                Auto-refreshing
              </span>
            )}
          </div>
        }
      />

      {/* Filter bar */}
      <div
        className="flex items-center gap-3 mb-4 p-3 rounded-lg"
        style={{
          background: 'var(--ros-bg-card)',
          border: '1px solid var(--ros-border)',
        }}
      >
        <Filter size={13} style={{ color: 'var(--ros-text-muted)' }} />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AgentRunType | '')}
          className="text-xs px-2 py-1 rounded-md"
          style={{
            background: 'var(--ros-bg-hover)',
            border: '1px solid var(--ros-border)',
            color: 'var(--ros-text-primary)',
          }}
        >
          <option value="">All Types</option>
          {ALL_TYPES.map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AgentRunStatus | '')}
          className="text-xs px-2 py-1 rounded-md"
          style={{
            background: 'var(--ros-bg-hover)',
            border: '1px solid var(--ros-border)',
            color: 'var(--ros-text-primary)',
          }}
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md"
              style={{ background: 'var(--ros-bg-card)' }}
            />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Bot size={32} />}
          title="No agent runs yet"
          description="Runs are created when you search, enrich, score, or generate outreach."
        />
      ) : (
        <div
          className="rounded-lg overflow-hidden ros-table"
          style={{
            background: 'var(--ros-bg-card)',
            border: '1px solid var(--ros-border)',
          }}
        >
          {/* Table header */}
          <div
            className="grid items-center text-[10px] font-mono uppercase tracking-wider px-3 py-2"
            style={{
              gridTemplateColumns: '24px 120px 90px 110px 70px 1fr 1fr 60px 50px',
              color: 'var(--ros-text-muted)',
              borderBottom: '1px solid var(--ros-border)',
            }}
          >
            <span />
            <span>Type</span>
            <span>Status</span>
            <span>Started</span>
            <span>Duration</span>
            <span>Input Summary</span>
            <span>Output Summary</span>
            <span>Cands</span>
            <span>Errors</span>
          </div>

          {/* Rows */}
          {list.map((run) => {
            const isExpanded = expandedIds.has(run.id);
            const typeCfg = AGENT_RUN_TYPE_CONFIG[run.type];
            const errorCount = run.errors?.length ?? 0;

            return (
              <div key={run.id}>
                {/* Row */}
                <div
                  className="grid items-center text-xs px-3 py-2 cursor-pointer transition-colors"
                  style={{
                    gridTemplateColumns: '24px 120px 90px 110px 70px 1fr 1fr 60px 50px',
                    borderBottom: '1px solid var(--ros-border)',
                    background: isExpanded ? 'var(--ros-bg-hover)' : 'transparent',
                  }}
                  onClick={() => toggleExpand(run.id)}
                >
                  <span style={{ color: 'var(--ros-text-muted)' }}>
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </span>
                  <span
                    className="font-medium truncate"
                    style={{ color: 'var(--ros-text-primary)' }}
                  >
                    {typeCfg?.label ?? run.type}
                  </span>
                  <span>
                    <RunStatusBadge status={run.status} />
                  </span>
                  <span className="font-mono" style={{ color: 'var(--ros-text-secondary)' }}>
                    {formatDateTime(run.started_at)}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--ros-text-secondary)' }}>
                    {formatDuration(run.duration_ms)}
                  </span>
                  <span
                    className="truncate font-mono"
                    style={{ color: 'var(--ros-text-muted)' }}
                  >
                    {truncateJson(run.inputs ?? {})}
                  </span>
                  <span
                    className="truncate font-mono"
                    style={{ color: 'var(--ros-text-muted)' }}
                  >
                    {truncateJson(run.outputs ?? {})}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--ros-text-secondary)' }}>
                    {run.candidate_ids?.length ?? 0}
                  </span>
                  <span
                    className="font-mono font-medium"
                    style={{ color: errorCount > 0 ? '#f87171' : 'var(--ros-text-muted)' }}
                  >
                    {errorCount}
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    className="px-6 py-4 flex flex-col gap-4"
                    style={{
                      background: 'var(--ros-bg-hover)',
                      borderBottom: '1px solid var(--ros-border)',
                    }}
                  >
                    {/* Input params */}
                    <div>
                      <h4
                        className="text-[10px] font-mono uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--ros-text-muted)' }}
                      >
                        Input Parameters
                      </h4>
                      <pre
                        className="text-[11px] font-mono p-3 rounded-md overflow-x-auto"
                        style={{
                          background: 'var(--ros-bg-card)',
                          border: '1px solid var(--ros-border)',
                          color: 'var(--ros-text-secondary)',
                        }}
                      >
                        <code>{JSON.stringify(run.inputs, null, 2)}</code>
                      </pre>
                    </div>

                    {/* Output summary */}
                    <div>
                      <h4
                        className="text-[10px] font-mono uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--ros-text-muted)' }}
                      >
                        Output Summary
                      </h4>
                      <pre
                        className="text-[11px] font-mono p-3 rounded-md overflow-x-auto"
                        style={{
                          background: 'var(--ros-bg-card)',
                          border: '1px solid var(--ros-border)',
                          color: 'var(--ros-text-secondary)',
                        }}
                      >
                        <code>{JSON.stringify(run.outputs, null, 2)}</code>
                      </pre>
                    </div>

                    {/* Errors */}
                    {errorCount > 0 && (
                      <div>
                        <h4
                          className="text-[10px] font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1"
                          style={{ color: '#f87171' }}
                        >
                          <AlertTriangle size={11} />
                          Errors ({errorCount})
                        </h4>
                        <div className="flex flex-col gap-1.5">
                          {run.errors.map((err, i) => (
                            <div
                              key={i}
                              className="text-[11px] font-mono p-2 rounded-md"
                              style={{
                                background: 'rgba(248,113,113,0.08)',
                                border: '1px solid rgba(248,113,113,0.2)',
                                color: '#fca5a5',
                              }}
                            >
                              <span>{err.message}</span>
                              {err.timestamp && (
                                <span
                                  className="ml-2 text-[10px]"
                                  style={{ color: 'var(--ros-text-muted)' }}
                                >
                                  {formatDateTime(err.timestamp)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4">
                      <span className="text-[11px]" style={{ color: 'var(--ros-text-muted)' }}>
                        Affected candidates: {run.candidate_ids?.length ?? 0}
                      </span>
                      <button
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
                        style={{
                          color: 'var(--ros-text-secondary)',
                          background: 'var(--ros-bg-card)',
                          border: '1px solid var(--ros-border)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Placeholder: re-run action
                        }}
                      >
                        <RefreshCw size={11} />
                        Re-run
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
