// SourceKit Recruiter OS — Role Scorecard Detail / Edit

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useRecruiterScorecard,
  useUpdateScorecard,
} from '../hooks/useRecruiterScorecard';
import PageHeader from '../components/PageHeader';
import { DEFAULT_SCORING_WEIGHTS, OUTREACH_TONES } from '../lib/constants';
import type {
  RoleScorecard,
  ScorecardSignal,
  ScoringWeights,
  EvaluationQuestion,
} from '../lib/types';
import { ArrowLeft, Save, Rocket, Plus, Trash2, GripVertical } from 'lucide-react';

// --- Helpers ---

function newSignal(): ScorecardSignal {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    weight: 50,
    evidence_type: 'github',
  };
}

function newQuestion(): EvaluationQuestion {
  return {
    id: crypto.randomUUID(),
    text: '',
    dimension: '',
    good_answer: '',
    bad_answer: '',
  };
}

const EVIDENCE_TYPES = ['github', 'linkedin', 'publication', 'web', 'other'];
const STATUS_OPTIONS: Array<{ value: RoleScorecard['status']; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const WEIGHT_KEYS: Array<{ key: keyof ScoringWeights; label: string }> = [
  { key: 'eea', label: 'EEA Score' },
  { key: 'builder', label: 'Builder Score' },
  { key: 'ai_recency', label: 'AI Recency' },
  { key: 'systems_depth', label: 'Systems Depth' },
  { key: 'product_instinct', label: 'Product Instinct' },
  { key: 'hidden_gem', label: 'Hidden Gem' },
];

// --- Section Card wrapper ---

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: 'var(--ros-bg-card)',
        border: '1px solid var(--ros-border)',
      }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-4"
        style={{ color: 'var(--ros-text-muted)' }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// --- Signal List ---

function SignalList({
  signals,
  onChange,
}: {
  signals: ScorecardSignal[];
  onChange: (signals: ScorecardSignal[]) => void;
}) {
  const update = (idx: number, patch: Partial<ScorecardSignal>) => {
    const next = signals.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  };
  const remove = (idx: number) => onChange(signals.filter((_, i) => i !== idx));
  const add = () => onChange([...signals, newSignal()]);

  return (
    <div className="flex flex-col gap-3">
      {signals.map((sig, idx) => (
        <div
          key={sig.id}
          className="flex items-start gap-2 p-3 rounded-md"
          style={{ background: 'var(--ros-bg-hover)' }}
        >
          <GripVertical
            size={14}
            className="mt-2 shrink-0 cursor-grab"
            style={{ color: 'var(--ros-text-muted)' }}
          />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Signal name"
              value={sig.name}
              onChange={(e) => update(idx, { name: e.target.value })}
              className="text-xs px-2 py-1.5 rounded-md w-full"
              style={{
                background: 'var(--ros-bg-card)',
                border: '1px solid var(--ros-border)',
                color: 'var(--ros-text-primary)',
              }}
            />
            <input
              type="text"
              placeholder="Description"
              value={sig.description}
              onChange={(e) => update(idx, { description: e.target.value })}
              className="text-xs px-2 py-1.5 rounded-md w-full"
              style={{
                background: 'var(--ros-bg-card)',
                border: '1px solid var(--ros-border)',
                color: 'var(--ros-text-primary)',
              }}
            />
            <div className="flex items-center gap-2">
              <label className="text-[10px] shrink-0" style={{ color: 'var(--ros-text-muted)' }}>
                Weight
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={sig.weight}
                onChange={(e) => update(idx, { weight: Number(e.target.value) })}
                className="flex-1 h-1 accent-current"
                style={{ accentColor: 'var(--ros-accent)' }}
              />
              <span
                className="text-[10px] font-mono w-7 text-right"
                style={{ color: 'var(--ros-text-secondary)' }}
              >
                {sig.weight}
              </span>
            </div>
            <select
              value={sig.evidence_type}
              onChange={(e) => update(idx, { evidence_type: e.target.value })}
              className="text-xs px-2 py-1.5 rounded-md"
              style={{
                background: 'var(--ros-bg-card)',
                border: '1px solid var(--ros-border)',
                color: 'var(--ros-text-primary)',
              }}
            >
              {EVIDENCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => remove(idx)}
            className="mt-1.5 shrink-0 p-1 rounded hover:opacity-70"
            style={{ color: '#f87171' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md self-start"
        style={{ color: 'var(--ros-accent)', background: 'var(--ros-accent-muted)' }}
      >
        <Plus size={12} />
        Add Signal
      </button>
    </div>
  );
}

// --- Main Component ---

export default function RoleScorecardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: scorecard, isLoading } = useRecruiterScorecard(id);
  const updateScorecard = useUpdateScorecard();

  // Form state
  const [name, setName] = useState('');
  const [status, setStatus] = useState<RoleScorecard['status']>('draft');
  const [talentThesis, setTalentThesis] = useState('');
  const [mustHaves, setMustHaves] = useState<ScorecardSignal[]>([]);
  const [niceToHaves, setNiceToHaves] = useState<ScorecardSignal[]>([]);
  const [suppressionsText, setSuppressionsText] = useState('');
  const [weights, setWeights] = useState<ScoringWeights>({ ...DEFAULT_SCORING_WEIGHTS });
  const [outreachTone, setOutreachTone] = useState('professional');
  const [evalQuestions, setEvalQuestions] = useState<EvaluationQuestion[]>([]);

  // Seed form from loaded scorecard
  useEffect(() => {
    if (!scorecard) return;
    setName(scorecard.name);
    setStatus(scorecard.status);
    setTalentThesis(scorecard.talent_thesis ?? '');
    setMustHaves(scorecard.must_have_signals ?? []);
    setNiceToHaves(scorecard.nice_to_have_signals ?? []);
    setSuppressionsText((scorecard.suppressions ?? []).join('\n'));
    setWeights(scorecard.scoring_weights ?? { ...DEFAULT_SCORING_WEIGHTS });
    setOutreachTone(scorecard.outreach_tone ?? 'professional');
    setEvalQuestions(scorecard.evaluation_questions ?? []);
  }, [scorecard]);

  const handleSave = () => {
    if (!id) return;
    updateScorecard.mutate({
      id,
      updates: {
        name,
        status,
        talent_thesis: talentThesis,
        must_have_signals: mustHaves,
        nice_to_have_signals: niceToHaves,
        suppressions: suppressionsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        scoring_weights: weights,
        outreach_tone: outreachTone,
        evaluation_questions: evalQuestions,
      },
    });
  };

  const updateWeight = (key: keyof ScoringWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const weightsTotal = Object.values(weights).reduce((a, b) => a + b, 0);

  // Question helpers
  const updateQuestion = (idx: number, patch: Partial<EvaluationQuestion>) => {
    setEvalQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    );
  };
  const removeQuestion = (idx: number) => {
    setEvalQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Loading
  if (isLoading) {
    return (
      <div className="ros-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="h-8 w-48 animate-pulse rounded"
            style={{ background: 'var(--ros-bg-card)' }}
          />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg mb-4"
            style={{ background: 'var(--ros-bg-card)' }}
          />
        ))}
      </div>
    );
  }

  // Not found
  if (!scorecard) {
    return (
      <div className="ros-fade-in py-16 text-center">
        <p className="text-sm" style={{ color: 'var(--ros-text-muted)' }}>
          Scorecard not found.
        </p>
        <button
          onClick={() => navigate('/recruiter/scorecards')}
          className="mt-4 text-xs font-medium px-3 py-1.5 rounded-md"
          style={{ color: 'var(--ros-accent)', background: 'var(--ros-accent-muted)' }}
        >
          Back to Scorecards
        </button>
      </div>
    );
  }

  return (
    <div className="ros-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate('/recruiter/scorecards')}
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors"
          style={{ color: 'var(--ros-text-secondary)', background: 'var(--ros-bg-hover)' }}
        >
          <ArrowLeft size={13} />
          Scorecards
        </button>
        <span className="text-[10px]" style={{ color: 'var(--ros-text-muted)' }}>
          /
        </span>
        <span className="text-xs" style={{ color: 'var(--ros-text-primary)' }}>
          {name || 'Untitled'}
        </span>
      </div>

      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-lg font-semibold bg-transparent outline-none flex-1 w-full"
          style={{
            color: 'var(--ros-text-primary)',
            borderBottom: '1px solid var(--ros-border)',
          }}
          placeholder="Role name..."
        />
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RoleScorecard['status'])}
            className="text-xs px-2 py-1.5 rounded-md"
            style={{
              background: 'var(--ros-bg-card)',
              border: '1px solid var(--ros-border)',
              color: 'var(--ros-text-primary)',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={updateScorecard.isPending}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
            style={{
              background: 'var(--ros-accent)',
              color: '#fff',
              opacity: updateScorecard.isPending ? 0.6 : 1,
            }}
          >
            <Save size={13} />
            {updateScorecard.isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => navigate('/recruiter/search')}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
            style={{
              color: 'var(--ros-text-secondary)',
              background: 'var(--ros-bg-hover)',
            }}
          >
            <Rocket size={13} />
            Launch Search from Scorecard
          </button>
        </div>
      </div>

      {/* Save success indicator */}
      {updateScorecard.isSuccess && (
        <div
          className="text-[11px] font-medium mb-4 px-3 py-1.5 rounded-md inline-block"
          style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}
        >
          Saved successfully
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Talent Thesis */}
        <SectionCard title="Talent Thesis">
          <textarea
            rows={6}
            value={talentThesis}
            onChange={(e) => setTalentThesis(e.target.value)}
            placeholder="Describe your ideal candidate profile, what makes someone exceptional for this role..."
            className="w-full text-xs leading-relaxed px-3 py-2 rounded-md resize-y"
            style={{
              background: 'var(--ros-bg-hover)',
              border: '1px solid var(--ros-border)',
              color: 'var(--ros-text-primary)',
            }}
          />
        </SectionCard>

        {/* Must-Have Signals */}
        <SectionCard title="Must-Have Signals">
          <SignalList signals={mustHaves} onChange={setMustHaves} />
        </SectionCard>

        {/* Nice-to-Have Signals */}
        <SectionCard title="Nice-to-Have Signals">
          <SignalList signals={niceToHaves} onChange={setNiceToHaves} />
        </SectionCard>

        {/* Suppressions */}
        <SectionCard title="Suppressions">
          <p className="text-[11px] mb-2" style={{ color: 'var(--ros-text-muted)' }}>
            One suppression per line (companies, domains, or keywords to exclude)
          </p>
          <textarea
            rows={4}
            value={suppressionsText}
            onChange={(e) => setSuppressionsText(e.target.value)}
            placeholder={"example-company.com\ncompetitor-name\nrecruiter-keyword"}
            className="w-full text-xs font-mono leading-relaxed px-3 py-2 rounded-md resize-y"
            style={{
              background: 'var(--ros-bg-hover)',
              border: '1px solid var(--ros-border)',
              color: 'var(--ros-text-primary)',
            }}
          />
        </SectionCard>

        {/* Scoring Weights */}
        <SectionCard title="Scoring Weights">
          <div className="flex flex-col gap-3">
            {WEIGHT_KEYS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <span
                  className="text-xs w-32 shrink-0"
                  style={{ color: 'var(--ros-text-secondary)' }}
                >
                  {label}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights[key]}
                  onChange={(e) => updateWeight(key, Number(e.target.value))}
                  className="flex-1 h-1"
                  style={{ accentColor: 'var(--ros-accent)' }}
                />
                <span
                  className="text-xs font-mono w-8 text-right"
                  style={{ color: 'var(--ros-text-primary)' }}
                >
                  {weights[key]}
                </span>
              </div>
            ))}
            <div
              className="flex items-center justify-between pt-3 mt-1"
              style={{ borderTop: '1px solid var(--ros-border)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--ros-text-muted)' }}>
                Total
              </span>
              <span
                className="text-xs font-mono font-medium"
                style={{
                  color: weightsTotal === 100 ? '#34d399' : '#fbbf24',
                }}
              >
                {weightsTotal} / 100
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Outreach Tone */}
        <SectionCard title="Outreach Tone">
          <select
            value={outreachTone}
            onChange={(e) => setOutreachTone(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-md"
            style={{
              background: 'var(--ros-bg-hover)',
              border: '1px solid var(--ros-border)',
              color: 'var(--ros-text-primary)',
            }}
          >
            {OUTREACH_TONES.map((tone) => (
              <option key={tone.id} value={tone.id}>
                {tone.label}
              </option>
            ))}
          </select>
        </SectionCard>

        {/* Evaluation Questions */}
        <SectionCard title="Evaluation Questions">
          <div className="flex flex-col gap-3">
            {evalQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="flex items-start gap-2 p-3 rounded-md"
                style={{ background: 'var(--ros-bg-hover)' }}
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Question text"
                    value={q.text}
                    onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                    className="text-xs px-2 py-1.5 rounded-md w-full sm:col-span-2"
                    style={{
                      background: 'var(--ros-bg-card)',
                      border: '1px solid var(--ros-border)',
                      color: 'var(--ros-text-primary)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Dimension (e.g. builder)"
                    value={q.dimension}
                    onChange={(e) => updateQuestion(idx, { dimension: e.target.value })}
                    className="text-xs px-2 py-1.5 rounded-md w-full"
                    style={{
                      background: 'var(--ros-bg-card)',
                      border: '1px solid var(--ros-border)',
                      color: 'var(--ros-text-primary)',
                    }}
                  />
                  <div />
                  <input
                    type="text"
                    placeholder="What a good answer looks like"
                    value={q.good_answer}
                    onChange={(e) => updateQuestion(idx, { good_answer: e.target.value })}
                    className="text-xs px-2 py-1.5 rounded-md w-full"
                    style={{
                      background: 'var(--ros-bg-card)',
                      border: '1px solid var(--ros-border)',
                      color: 'var(--ros-text-primary)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="What a bad answer looks like"
                    value={q.bad_answer}
                    onChange={(e) => updateQuestion(idx, { bad_answer: e.target.value })}
                    className="text-xs px-2 py-1.5 rounded-md w-full"
                    style={{
                      background: 'var(--ros-bg-card)',
                      border: '1px solid var(--ros-border)',
                      color: 'var(--ros-text-primary)',
                    }}
                  />
                </div>
                <button
                  onClick={() => removeQuestion(idx)}
                  className="mt-1.5 shrink-0 p-1 rounded hover:opacity-70"
                  style={{ color: '#f87171' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setEvalQuestions((prev) => [...prev, newQuestion()])}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md self-start"
              style={{ color: 'var(--ros-accent)', background: 'var(--ros-accent-muted)' }}
            >
              <Plus size={12} />
              Add Question
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
