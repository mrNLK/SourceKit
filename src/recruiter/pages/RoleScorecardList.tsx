// SourceKit Recruiter OS — Role Scorecard List

import { useNavigate } from 'react-router-dom';
import {
  useRecruiterScorecards,
  useCreateScorecard,
  useDeleteScorecard,
} from '../hooks/useRecruiterScorecard';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import type { RoleScorecard } from '../lib/types';
import { ClipboardList, Plus, Search, Trash2, Edit, Rocket } from 'lucide-react';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  draft: { label: 'Draft', bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  active: { label: 'Active', bg: 'rgba(52,211,153,0.12)', text: '#34d399', border: 'rgba(52,211,153,0.3)' },
  archived: { label: 'Archived', bg: 'rgba(161,161,170,0.12)', text: '#a1a1aa', border: 'rgba(161,161,170,0.3)' },
};

function signalSummary(scorecard: RoleScorecard): string {
  const must = scorecard.must_have_signals?.length ?? 0;
  const nice = scorecard.nice_to_have_signals?.length ?? 0;
  return `${must} must-have${must !== 1 ? 's' : ''}, ${nice} nice-to-have${nice !== 1 ? 's' : ''}`;
}

export default function RoleScorecardList() {
  const navigate = useNavigate();
  const { data: scorecards, isLoading } = useRecruiterScorecards();
  const createScorecard = useCreateScorecard();
  const deleteScorecard = useDeleteScorecard();

  const handleCreate = async () => {
    const result = await createScorecard.mutateAsync({ name: 'New Scorecard' });
    navigate(`/recruiter/scorecards/${result.id}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete scorecard "${name}"? This cannot be undone.`)) {
      deleteScorecard.mutate(id);
    }
  };

  const list = scorecards ?? [];

  return (
    <div className="ros-fade-in">
      <PageHeader
        title="Role Scorecards"
        subtitle="Define your ideal candidate profile for each role"
        actions={
          <button
            onClick={handleCreate}
            disabled={createScorecard.isPending}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
            style={{
              background: 'var(--ros-accent)',
              color: '#fff',
              opacity: createScorecard.isPending ? 0.6 : 1,
            }}
          >
            <Plus size={14} />
            Create Scorecard
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-lg"
              style={{ background: 'var(--ros-bg-card)' }}
            />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={32} />}
          title="No scorecards created"
          description="Create a role scorecard to define your ideal candidate profile."
          action={
            <button
              onClick={handleCreate}
              disabled={createScorecard.isPending}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md"
              style={{ background: 'var(--ros-accent)', color: '#fff' }}
            >
              <Plus size={14} />
              Create Scorecard
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ros-stagger">
          {list.map((sc) => {
            const statusStyle = STATUS_STYLES[sc.status] ?? STATUS_STYLES.draft;
            return (
              <div
                key={sc.id}
                className="rounded-lg p-4 flex flex-col gap-3"
                style={{
                  background: 'var(--ros-bg-card)',
                  border: '1px solid var(--ros-border)',
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--ros-text-primary)' }}
                  >
                    {sc.name}
                  </h3>
                  <span
                    className="shrink-0 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded"
                    style={{
                      background: statusStyle.bg,
                      color: statusStyle.text,
                      border: `1px solid ${statusStyle.border}`,
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* Talent thesis excerpt */}
                {sc.talent_thesis ? (
                  <p
                    className="text-xs leading-relaxed line-clamp-2"
                    style={{ color: 'var(--ros-text-secondary)' }}
                  >
                    {sc.talent_thesis}
                  </p>
                ) : (
                  <p className="text-xs italic" style={{ color: 'var(--ros-text-muted)' }}>
                    No talent thesis defined
                  </p>
                )}

                {/* Signal count */}
                <p className="text-[11px] font-mono" style={{ color: 'var(--ros-text-muted)' }}>
                  {signalSummary(sc)}
                </p>

                {/* Created date */}
                <p className="text-[10px]" style={{ color: 'var(--ros-text-muted)' }}>
                  Created {formatDate(sc.created_at)}
                </p>

                {/* Actions */}
                <div
                  className="flex items-center gap-2 pt-2 mt-auto"
                  style={{ borderTop: '1px solid var(--ros-border)' }}
                >
                  <button
                    onClick={() => navigate(`/recruiter/scorecards/${sc.id}`)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition-colors"
                    style={{
                      color: 'var(--ros-accent)',
                      background: 'var(--ros-accent-muted)',
                    }}
                  >
                    <Edit size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => navigate('/recruiter/search')}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition-colors"
                    style={{
                      color: 'var(--ros-text-secondary)',
                      background: 'var(--ros-bg-hover)',
                    }}
                  >
                    <Rocket size={12} />
                    Launch Search
                  </button>
                  <button
                    onClick={() => handleDelete(sc.id, sc.name)}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition-colors hover:opacity-80"
                    style={{ color: '#f87171' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
