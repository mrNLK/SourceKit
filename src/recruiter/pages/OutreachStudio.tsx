// SourceKit Recruiter OS — Outreach Studio

import { useState } from 'react';
import { useRecruiterCandidates } from '../hooks/useRecruiterCandidates';
import {
  useRecruiterOutreach,
  useCreateOutreach,
  useUpdateOutreach,
} from '../hooks/useRecruiterOutreach';
import PageHeader from '../components/PageHeader';
import TierBadge from '../components/TierBadge';
import { PriorityBadge } from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { OUTREACH_TONES, SEQUENCE_STEPS } from '../lib/constants';
import type { OutreachMessage, RecruiterCandidate } from '../lib/types';
import {
  Mail,
  Send,
  Pause,
  Copy,
  Edit3,
  ChevronRight,
  Sparkles,
  FileText,
  User,
  X,
  Check,
  Clock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  draft: '#a1a1aa',
  ready: '#34d399',
  personalize: '#818cf8',
  hold: '#fbbf24',
  sent: '#60a5fa',
  replied: '#34d399',
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function truncateMsg(msg: string, max = 80): string {
  return msg.length > max ? msg.slice(0, max) + '...' : msg;
}

function buildDraftMessage(c: RecruiterCandidate): string {
  const name = c.name ?? '[Name]';
  const artifacts =
    c.artifacts.length > 0
      ? c.artifacts
          .slice(0, 2)
          .map((a) => a.title)
          .join(' and ')
      : '[notable projects]';
  const reason =
    c.sourcing_rationale ?? 'your technical depth and shipping velocity';
  const role = c.current_title ?? '[this role]';
  const company = c.current_company ?? '[our company]';
  const skills =
    c.tags.length > 0 ? c.tags.slice(0, 3).join(', ') : '[relevant skills]';

  return `Hi ${name},

I came across your work on ${artifacts} and was impressed by ${reason}.

We're building ${role} at ${company} and your background in ${skills} stands out.

Would you be open to a brief conversation?

Best,
[Your name]`;
}

const SCORE_DIMENSIONS: {
  key: string;
  label: string;
  field: keyof RecruiterCandidate;
}[] = [
  { key: 'eea', label: 'EEA', field: 'eea_score' },
  { key: 'builder', label: 'Builder', field: 'builder_score' },
  { key: 'ai_recency', label: 'AI Recency', field: 'ai_recency_score' },
  { key: 'systems', label: 'Systems', field: 'systems_depth_score' },
  { key: 'product', label: 'Product', field: 'product_instinct_score' },
  { key: 'gem', label: 'Hidden Gem', field: 'hidden_gem_score' },
];

function scoreColor(v: number): string {
  if (v >= 80) return '#34d399';
  if (v >= 50) return '#fbbf24';
  return '#f87171';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutreachStudio() {
  const { data: allCandidates = [], isLoading: candidatesLoading } =
    useRecruiterCandidates();
  const createOutreach = useCreateOutreach();
  const updateOutreach = useUpdateOutreach();

  // State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<
    'all' | 'draft' | 'ready' | 'hold'
  >('all');
  const [tone, setTone] = useState(OUTREACH_TONES[0].id);
  const [sequenceStep, setSequenceStep] = useState(SEQUENCE_STEPS[0].id);
  const [message, setMessage] = useState('');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Queue: high/medium priority or outreach_sent stage
  const queue = allCandidates.filter(
    (c) =>
      c.outreach_priority === 'high' ||
      c.outreach_priority === 'medium' ||
      c.pipeline_stage === 'outreach_sent',
  );

  const selectedCandidate = selectedId
    ? allCandidates.find((c) => c.id === selectedId) ?? null
    : null;

  // Outreach history for selected candidate
  const { data: outreachHistory = [] } = useRecruiterOutreach(
    selectedCandidate?.id,
  );

  // Filter queue for left column status filter
  const filteredQueue =
    queueFilter === 'all'
      ? queue
      : queue.filter((c) => {
          const latest = outreachHistory.find(
            (o) => o.candidate_id === c.id,
          );
          if (queueFilter === 'draft')
            return !latest || latest.status === 'draft';
          if (queueFilter === 'ready') return latest?.status === 'ready';
          if (queueFilter === 'hold') return latest?.status === 'hold';
          return true;
        });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function selectCandidate(c: RecruiterCandidate) {
    setSelectedId(c.id);
    setMessage('');
    setEvidenceOpen(false);
    setCopied(false);
  }

  function handleDraftFromEvidence() {
    if (!selectedCandidate) return;
    setMessage(buildDraftMessage(selectedCandidate));
  }

  function handleSendNow() {
    if (!selectedCandidate || !message.trim()) return;
    createOutreach.mutate({
      candidate_id: selectedCandidate.id,
      message,
      tone,
      sequence_step: sequenceStep as OutreachMessage['sequence_step'],
      channel: 'email',
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
    setMessage('');
  }

  function handlePersonalize() {
    if (!selectedCandidate || !message.trim()) return;
    createOutreach.mutate({
      candidate_id: selectedCandidate.id,
      message,
      tone,
      sequence_step: sequenceStep as OutreachMessage['sequence_step'],
      channel: 'email',
      status: 'personalize',
    });
  }

  function handleHold() {
    if (!selectedCandidate || !message.trim()) return;
    createOutreach.mutate({
      candidate_id: selectedCandidate.id,
      message,
      tone,
      sequence_step: sequenceStep as OutreachMessage['sequence_step'],
      channel: 'email',
      status: 'hold',
    });
  }

  function handleCopy() {
    if (!message.trim()) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ---------------------------------------------------------------------------
  // Style helpers
  // ---------------------------------------------------------------------------

  const colStyle = (flex: string): React.CSSProperties => ({
    flex,
    minWidth: 0,
  });

  const panelStyle: React.CSSProperties = {
    background: 'var(--ros-bg-card)',
    border: '1px solid var(--ros-border)',
    borderRadius: 10,
  };

  const btnBase: React.CSSProperties = {
    border: 'none',
    cursor: 'pointer',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="ros-fade-in">
      <PageHeader
        title="Outreach Studio"
        subtitle="Draft and send personalized outreach"
      />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ---- LEFT: Candidate Queue ---- */}
        <div style={{ ...colStyle('0 0 25%'), ...panelStyle }} className="flex flex-col">
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: '1px solid var(--ros-border)' }}
          >
            <span
              className="text-xs font-semibold"
              style={{ color: 'var(--ros-text-primary)' }}
            >
              Queue
            </span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--ros-bg-tertiary)',
                color: 'var(--ros-text-muted)',
              }}
            >
              {queue.length}
            </span>
          </div>

          {/* Filter tabs */}
          <div
            className="flex px-2 pt-2 gap-1"
            style={{ borderBottom: '1px solid var(--ros-border)' }}
          >
            {(['all', 'draft', 'ready', 'hold'] as const).map((f) => (
              <button
                key={f}
                className="text-[10px] font-medium px-2 py-1 rounded-t"
                style={{
                  background:
                    queueFilter === f
                      ? 'var(--ros-accent-muted)'
                      : 'transparent',
                  color:
                    queueFilter === f
                      ? 'var(--ros-accent)'
                      : 'var(--ros-text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
                onClick={() => setQueueFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Queue list */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 560 }}>
            {candidatesLoading ? (
              <div
                className="text-[10px] text-center py-8"
                style={{ color: 'var(--ros-text-muted)' }}
              >
                Loading...
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="px-3 py-6">
                <EmptyState
                  icon={<Mail size={24} />}
                  title="No candidates queued"
                  description="Add candidates from Search Lab or Team Pipeline."
                />
              </div>
            ) : (
              filteredQueue.map((c) => {
                const isActive = selectedId === c.id;
                return (
                  <div
                    key={c.id}
                    className="px-3 py-2 cursor-pointer transition-colors"
                    style={{
                      background: isActive
                        ? 'var(--ros-accent-muted)'
                        : 'transparent',
                      borderBottom: '1px solid var(--ros-border)',
                    }}
                    onClick={() => selectCandidate(c)}
                  >
                    <div
                      className="text-xs font-medium truncate"
                      style={{
                        color: isActive
                          ? 'var(--ros-accent)'
                          : 'var(--ros-text-primary)',
                      }}
                    >
                      {c.name ?? 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TierBadge tier={c.tier} size="sm" />
                      <PriorityBadge priority={c.outreach_priority} />
                      {c.pipeline_stage === 'outreach_sent' && (
                        <span
                          className="text-[9px] font-mono"
                          style={{ color: '#60a5fa' }}
                        >
                          sent
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ---- CENTER: Message Editor ---- */}
        <div
          style={{ ...colStyle('1 1 45%'), ...panelStyle }}
          className="flex flex-col"
        >
          {!selectedCandidate ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={<Edit3 size={28} />}
                title="Select a candidate"
                description="Select a candidate from the queue to draft outreach."
              />
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              {/* Header */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ borderBottom: '1px solid var(--ros-border)' }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--ros-text-primary)' }}
                >
                  {selectedCandidate.name ?? 'Unknown'}
                </span>
                <TierBadge tier={selectedCandidate.tier} />
              </div>

              <div className="px-4 py-3 flex-1 overflow-y-auto space-y-4">
                {/* Tone selector */}
                <div>
                  <div
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--ros-text-muted)' }}
                  >
                    Tone
                  </div>
                  <div className="flex gap-1.5">
                    {OUTREACH_TONES.map((t) => (
                      <button
                        key={t.id}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-md"
                        style={{
                          background:
                            tone === t.id
                              ? 'var(--ros-accent-muted)'
                              : 'var(--ros-bg-secondary)',
                          color:
                            tone === t.id
                              ? 'var(--ros-accent)'
                              : 'var(--ros-text-secondary)',
                          border:
                            tone === t.id
                              ? '1px solid var(--ros-accent)'
                              : '1px solid var(--ros-border)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setTone(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sequence step */}
                <div>
                  <div
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--ros-text-muted)' }}
                  >
                    Sequence Step
                  </div>
                  <select
                    value={sequenceStep}
                    onChange={(e) => setSequenceStep(e.target.value)}
                    style={{
                      background: 'var(--ros-bg-secondary)',
                      border: '1px solid var(--ros-border)',
                      color: 'var(--ros-text-secondary)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {SEQUENCE_STEPS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Draft from evidence */}
                <button
                  className="flex items-center gap-1.5"
                  style={{
                    ...btnBase,
                    background: 'var(--ros-accent)',
                    color: '#000',
                  }}
                  onClick={handleDraftFromEvidence}
                >
                  <Sparkles size={14} /> Draft from Evidence
                </button>

                {/* Textarea */}
                <textarea
                  rows={10}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your outreach message..."
                  className="w-full text-xs font-mono resize-y rounded-lg px-3 py-2"
                  style={{
                    background: 'var(--ros-bg-secondary)',
                    border: '1px solid var(--ros-border)',
                    color: 'var(--ros-text-primary)',
                    outline: 'none',
                    lineHeight: 1.6,
                  }}
                />

                {/* Why this message */}
                {selectedCandidate.artifacts.length > 0 && (
                  <div>
                    <button
                      className="flex items-center gap-1 text-[11px] font-medium"
                      style={{
                        color: 'var(--ros-text-secondary)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => setEvidenceOpen(!evidenceOpen)}
                    >
                      <ChevronRight
                        size={12}
                        style={{
                          transform: evidenceOpen
                            ? 'rotate(90deg)'
                            : 'rotate(0deg)',
                          transition: 'transform 0.15s',
                        }}
                      />
                      Why this message
                    </button>
                    {evidenceOpen && (
                      <div
                        className="mt-1.5 px-3 py-2 rounded-lg space-y-1"
                        style={{
                          background: 'var(--ros-bg-secondary)',
                          border: '1px solid var(--ros-border)',
                        }}
                      >
                        {selectedCandidate.artifacts.slice(0, 3).map((a) => (
                          <div key={a.id} className="flex items-start gap-2">
                            <FileText
                              size={11}
                              style={{ color: 'var(--ros-text-muted)', marginTop: 2 }}
                            />
                            <div>
                              <div
                                className="text-[11px] font-medium"
                                style={{ color: 'var(--ros-text-primary)' }}
                              >
                                {a.title}
                              </div>
                              <div
                                className="text-[10px]"
                                style={{ color: 'var(--ros-text-muted)' }}
                              >
                                {a.source} &middot; {a.relevance}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    style={{
                      ...btnBase,
                      background: 'var(--ros-accent)',
                      color: '#000',
                      opacity: message.trim() ? 1 : 0.4,
                    }}
                    disabled={!message.trim()}
                    onClick={handleSendNow}
                  >
                    <Send size={13} /> Send Now
                  </button>
                  <button
                    style={{
                      ...btnBase,
                      background: 'var(--ros-bg-secondary)',
                      color: 'var(--ros-text-secondary)',
                      border: '1px solid var(--ros-border)',
                      opacity: message.trim() ? 1 : 0.4,
                    }}
                    disabled={!message.trim()}
                    onClick={handlePersonalize}
                  >
                    <Edit3 size={13} /> Personalize
                  </button>
                  <button
                    style={{
                      ...btnBase,
                      background: 'var(--ros-bg-secondary)',
                      color: 'var(--ros-text-muted)',
                      border: '1px solid var(--ros-border)',
                      opacity: message.trim() ? 1 : 0.4,
                    }}
                    disabled={!message.trim()}
                    onClick={handleHold}
                  >
                    <Pause size={13} /> Hold
                  </button>
                  <button
                    style={{
                      ...btnBase,
                      background: 'transparent',
                      color: copied
                        ? 'var(--ros-accent)'
                        : 'var(--ros-text-muted)',
                      border: 'none',
                      padding: '6px 8px',
                    }}
                    onClick={handleCopy}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Outreach history */}
              <div
                className="px-4 py-3"
                style={{ borderTop: '1px solid var(--ros-border)' }}
              >
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Outreach History
                </div>
                {outreachHistory.length === 0 ? (
                  <div
                    className="text-[10px] py-2"
                    style={{ color: 'var(--ros-text-muted)' }}
                  >
                    No previous outreach for this candidate.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {outreachHistory.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px]"
                        style={{
                          background: 'var(--ros-bg-secondary)',
                          border: '1px solid var(--ros-border)',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{
                            background:
                              STATUS_COLORS[o.status] ?? 'var(--ros-text-muted)',
                          }}
                        />
                        <span
                          className="flex-1 truncate"
                          style={{ color: 'var(--ros-text-secondary)' }}
                        >
                          {truncateMsg(o.message)}
                        </span>
                        <span
                          className="font-mono flex-shrink-0"
                          style={{ color: 'var(--ros-text-muted)' }}
                        >
                          {o.tone}
                        </span>
                        <span
                          className="font-mono flex-shrink-0"
                          style={{ color: 'var(--ros-text-muted)' }}
                        >
                          {o.channel}
                        </span>
                        <span
                          className="font-mono flex-shrink-0"
                          style={{ color: 'var(--ros-text-muted)' }}
                        >
                          {formatDate(o.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ---- RIGHT: Candidate Evidence ---- */}
        <div
          style={{ ...colStyle('0 0 30%'), ...panelStyle }}
          className="flex flex-col"
        >
          {!selectedCandidate ? (
            <div className="flex-1" />
          ) : (
            <div className="flex flex-col flex-1 overflow-y-auto">
              {/* Identity */}
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--ros-border)' }}
              >
                <div
                  className="text-sm font-semibold"
                  style={{ color: 'var(--ros-text-primary)' }}
                >
                  {selectedCandidate.name ?? 'Unknown'}
                </div>
                <div
                  className="text-[11px] mt-0.5"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  {selectedCandidate.current_title ?? ''}
                  {selectedCandidate.current_company
                    ? ` @ ${selectedCandidate.current_company}`
                    : ''}
                </div>
              </div>

              {/* Score summary */}
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--ros-border)' }}
              >
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Scores
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SCORE_DIMENSIONS.map(({ key, label, field }) => {
                    const dimScore = selectedCandidate[field] as {
                      score: number;
                    } | null;
                    const val = dimScore?.score ?? 0;
                    return (
                      <div
                        key={key}
                        className="rounded-md px-2 py-1.5 text-center"
                        style={{
                          background: 'var(--ros-bg-secondary)',
                          border: '1px solid var(--ros-border)',
                        }}
                      >
                        <div
                          className="text-[9px] font-medium uppercase"
                          style={{ color: 'var(--ros-text-muted)' }}
                        >
                          {label}
                        </div>
                        <div
                          className="text-sm font-mono font-bold"
                          style={{ color: scoreColor(val) }}
                        >
                          {val}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Artifacts */}
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--ros-border)' }}
              >
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Top Artifacts
                </div>
                {selectedCandidate.artifacts.length === 0 ? (
                  <div
                    className="text-[10px]"
                    style={{ color: 'var(--ros-text-muted)' }}
                  >
                    No artifacts found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCandidate.artifacts.slice(0, 5).map((a) => (
                      <div key={a.id} className="flex items-start gap-2">
                        <FileText
                          size={12}
                          className="flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--ros-text-muted)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium truncate block"
                            style={{
                              color: 'var(--ros-accent)',
                              textDecoration: 'none',
                            }}
                          >
                            {a.title}
                          </a>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[9px] font-mono px-1 py-0.5 rounded"
                              style={{
                                background: 'var(--ros-bg-tertiary)',
                                color: 'var(--ros-text-muted)',
                              }}
                            >
                              {a.source}
                            </span>
                            {a.date && (
                              <span
                                className="text-[9px]"
                                style={{ color: 'var(--ros-text-muted)' }}
                              >
                                {formatDate(a.date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="px-4 py-3">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--ros-text-muted)' }}
                >
                  Links
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.github_username && (
                    <a
                      href={`https://github.com/${selectedCandidate.github_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium px-2 py-1 rounded-md"
                      style={{
                        background: 'var(--ros-bg-secondary)',
                        color: 'var(--ros-text-secondary)',
                        border: '1px solid var(--ros-border)',
                        textDecoration: 'none',
                      }}
                    >
                      GitHub
                    </a>
                  )}
                  {selectedCandidate.linkedin_url && (
                    <a
                      href={selectedCandidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium px-2 py-1 rounded-md"
                      style={{
                        background: 'var(--ros-bg-secondary)',
                        color: 'var(--ros-text-secondary)',
                        border: '1px solid var(--ros-border)',
                        textDecoration: 'none',
                      }}
                    >
                      LinkedIn
                    </a>
                  )}
                  {selectedCandidate.portfolio_url && (
                    <a
                      href={selectedCandidate.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium px-2 py-1 rounded-md"
                      style={{
                        background: 'var(--ros-bg-secondary)',
                        color: 'var(--ros-text-secondary)',
                        border: '1px solid var(--ros-border)',
                        textDecoration: 'none',
                      }}
                    >
                      Portfolio
                    </a>
                  )}
                  {!selectedCandidate.github_username &&
                    !selectedCandidate.linkedin_url &&
                    !selectedCandidate.portfolio_url && (
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--ros-text-muted)' }}
                      >
                        No links available.
                      </span>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
