import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecruiterCandidate, useUpdateCandidate } from '../hooks/useRecruiterCandidates';
import { useRecruiterOutreach } from '../hooks/useRecruiterOutreach';
import { useRecruiterNotes, useCreateNote } from '../hooks/useRecruiterNotes';
import ScoreCard from '../components/ScoreCard';
import TierBadge from '../components/TierBadge';
import { StageBadge, ContactBadge, ATSBadge, PriorityBadge } from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import { TIER_CONFIG, SCORE_DIMENSIONS, ARTIFACT_TYPE_CONFIG } from '../lib/constants';
import type { CandidateTier, ScoreDimension } from '../lib/types';
import {
  ArrowLeft,
  Github,
  Linkedin,
  Globe,
  Mail,
  Send,
  Tag,
  ExternalLink,
  Plus,
  FileText,
  Clock,
  MessageSquare,
  Activity,
} from 'lucide-react';

type Tab = 'evidence' | 'profile' | 'sourcing' | 'outreach' | 'notes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'evidence', label: 'Evidence' },
  { id: 'profile', label: 'Profile' },
  { id: 'sourcing', label: 'Sourcing' },
  { id: 'outreach', label: 'Outreach' },
  { id: 'notes', label: 'Notes' },
];

export default function CandidateIntelProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: candidate, isLoading, error } = useRecruiterCandidate(id);
  const updateCandidate = useUpdateCandidate();
  const { data: outreachMessages } = useRecruiterOutreach(id);
  const { data: notes } = useRecruiterNotes(id);
  const createNote = useCreateNote();

  const [activeTab, setActiveTab] = useState<Tab>('evidence');
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [noteText, setNoteText] = useState('');

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 rounded animate-pulse" style={{ background: 'var(--ros-bg-hover)' }} />
        <div className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--ros-bg-hover)' }} />
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 w-40 rounded-lg animate-pulse" style={{ background: 'var(--ros-bg-hover)' }} />
          ))}
        </div>
        <div className="h-64 rounded-lg animate-pulse" style={{ background: 'var(--ros-bg-hover)' }} />
      </div>
    );
  }

  // --- Missing candidate ---
  if (!candidate || error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/recruiter/candidates')}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
          style={{ color: 'var(--ros-accent)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Candidate Intel
        </button>
        <div
          className="rounded-lg border p-8 text-center"
          style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--ros-text-secondary)' }}>
            Candidate not found. It may have been removed or you may not have access.
          </p>
        </div>
      </div>
    );
  }

  // --- Handlers ---

  function handleTierChange(tier: CandidateTier) {
    updateCandidate.mutate({ id: candidate!.id, updates: { tier } });
    setShowTierDropdown(false);
  }

  function handleAddTag() {
    const tag = tagInput.trim();
    if (!tag || candidate!.tags.includes(tag)) {
      setTagInput('');
      return;
    }
    updateCandidate.mutate({
      id: candidate!.id,
      updates: { tags: [...candidate!.tags, tag] },
    });
    setTagInput('');
  }

  function handleSaveNote() {
    const content = noteText.trim();
    if (!content) return;
    createNote.mutate({ candidateId: candidate!.id, content });
    setNoteText('');
  }

  // --- Links ---
  const links = [
    { url: candidate.github_username ? `https://github.com/${candidate.github_username}` : null, icon: Github, label: 'GitHub' },
    { url: candidate.linkedin_url, icon: Linkedin, label: 'LinkedIn' },
    { url: candidate.portfolio_url, icon: Globe, label: 'Portfolio' },
    { url: candidate.blog_url, icon: FileText, label: 'Blog' },
    { url: candidate.personal_site_url, icon: Globe, label: 'Site' },
  ].filter((l) => l.url);

  // --- Score dimensions ---
  const scoreDimensions: { dimension: ScoreDimension; score: typeof candidate.eea_score }[] = [
    { dimension: 'eea', score: candidate.eea_score },
    { dimension: 'builder', score: candidate.builder_score },
    { dimension: 'ai_recency', score: candidate.ai_recency_score },
    { dimension: 'systems_depth', score: candidate.systems_depth_score },
    { dimension: 'product_instinct', score: candidate.product_instinct_score },
    { dimension: 'hidden_gem', score: candidate.hidden_gem_score },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Back + breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/recruiter/candidates')}
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: 'var(--ros-accent)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>
          Candidate Intel
        </span>
        <span className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>/</span>
        <span className="text-xs font-medium" style={{ color: 'var(--ros-text-secondary)' }}>
          {candidate.name ?? 'Unknown'}
        </span>
      </div>

      {/* 2. Header bar */}
      <div
        className="rounded-lg border p-4 space-y-3"
        style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold font-mono"
            style={{ background: 'var(--ros-accent-muted)', color: 'var(--ros-accent)' }}
          >
            {(candidate.name ?? '?')[0].toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold truncate" style={{ color: 'var(--ros-text-primary)' }}>
                {candidate.name ?? 'Unknown'}
              </h2>
              <TierBadge tier={candidate.tier} size="md" />
            </div>
            {(candidate.current_title || candidate.current_company) && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ros-text-secondary)' }}>
                {candidate.current_title}
                {candidate.current_title && candidate.current_company ? ' at ' : ''}
                {candidate.current_company}
              </p>
            )}
          </div>
        </div>

        {/* Quick actions row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors"
            style={{ background: 'var(--ros-accent)', color: '#fff' }}
            onClick={() => navigate('/recruiter/outreach')}
          >
            <Send className="w-3.5 h-3.5" />
            Send Outreach
          </button>

          {/* Tier dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border transition-colors"
              style={{
                borderColor: 'var(--ros-border)',
                color: 'var(--ros-text-secondary)',
                background: 'var(--ros-bg-secondary)',
              }}
              onClick={() => setShowTierDropdown(!showTierDropdown)}
            >
              Change Tier
            </button>
            {showTierDropdown && (
              <div
                className="absolute top-full left-0 mt-1 z-20 rounded-lg border shadow-lg py-1 min-w-[140px]"
                style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
              >
                {(Object.keys(TIER_CONFIG) as CandidateTier[]).map((t) => (
                  <button
                    key={t}
                    className="w-full text-left text-xs px-3 py-1.5 transition-colors"
                    style={{ color: 'var(--ros-text-secondary)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--ros-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                    onClick={() => handleTierChange(t)}
                  >
                    {TIER_CONFIG[t].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add tag */}
          <div className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" style={{ color: 'var(--ros-text-muted)' }} />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Add tag..."
              className="text-xs px-2 py-1 rounded border outline-none w-24"
              style={{
                background: 'var(--ros-bg-secondary)',
                borderColor: 'var(--ros-border)',
                color: 'var(--ros-text-primary)',
              }}
            />
            <button
              onClick={handleAddTag}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--ros-accent)' }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <ATSBadge status={candidate.ats_sync_status} />
        </div>

        {/* Links row */}
        {links.length > 0 && (
          <div className="flex items-center gap-3 pt-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-medium transition-colors"
                  style={{ color: 'var(--ros-text-muted)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--ros-accent)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--ros-text-muted)';
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </a>
              );
            })}
            {candidate.email && (
              <a
                href={`mailto:${candidate.email}`}
                className="flex items-center gap-1 text-[10px] font-medium transition-colors"
                style={{ color: 'var(--ros-text-muted)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--ros-accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--ros-text-muted)';
                }}
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </a>
            )}
          </div>
        )}
      </div>

      {/* 3. Score panel */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {scoreDimensions.map(({ dimension, score }) => (
          <div key={dimension} className="flex-shrink-0 w-40">
            <ScoreCard dimension={dimension} score={score} />
          </div>
        ))}
        <div
          className="flex-shrink-0 w-40 rounded-lg border p-3 flex flex-col items-center justify-center gap-2"
          style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
        >
          <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--ros-text-muted)' }}>
            Outreach Priority
          </span>
          <PriorityBadge priority={candidate.outreach_priority} />
        </div>
      </div>

      {/* 4. Tabbed content */}
      <div>
        {/* Tab bar */}
        <div className="flex gap-1 border-b pb-px mb-4" style={{ borderColor: 'var(--ros-border)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className="text-xs font-medium px-3 py-2 rounded-t transition-colors"
              style={{
                color: activeTab === tab.id ? 'var(--ros-accent)' : 'var(--ros-text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--ros-accent)' : '2px solid transparent',
                background: activeTab === tab.id ? 'var(--ros-accent-muted)' : 'transparent',
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          className="rounded-lg border p-4"
          style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
        >
          {/* Evidence tab */}
          {activeTab === 'evidence' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
                Strongest Artifacts
              </h3>
              {candidate.artifacts.length === 0 ? (
                <p className="text-xs py-6 text-center" style={{ color: 'var(--ros-text-muted)' }}>
                  No artifacts indexed yet. Run enrichment to surface this candidate's work.
                </p>
              ) : (
                candidate.artifacts.map((artifact) => {
                  const artConfig = ARTIFACT_TYPE_CONFIG[artifact.type];
                  return (
                    <div
                      key={artifact.id}
                      className="rounded-lg border p-3 space-y-1.5"
                      style={{ borderColor: 'var(--ros-border)', background: 'var(--ros-bg-secondary)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${artConfig.color}`} style={{ background: 'var(--ros-bg-hover)' }}>
                            {artConfig.label}
                          </span>
                          <span className="text-xs font-medium truncate" style={{ color: 'var(--ros-text-primary)' }}>
                            {artifact.title}
                          </span>
                        </div>
                        <a
                          href={artifact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-1 rounded transition-colors"
                          style={{ color: 'var(--ros-text-muted)' }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = 'var(--ros-accent)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = 'var(--ros-text-muted)';
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--ros-text-muted)' }}>
                        <span>{artifact.source}</span>
                        {artifact.date && (
                          <>
                            <span>-</span>
                            <span>{artifact.date}</span>
                          </>
                        )}
                        <span
                          className="font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--ros-bg-hover)', color: 'var(--ros-text-secondary)' }}
                        >
                          {artifact.relevance}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--ros-text-secondary)' }}>
                        {artifact.description}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Profile tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {candidate.bio && (
                <div>
                  <h4 className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>
                    Bio
                  </h4>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ros-text-secondary)' }}>
                    {candidate.bio}
                  </p>
                </div>
              )}
              {candidate.location && (
                <div>
                  <h4 className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>
                    Location
                  </h4>
                  <p className="text-xs" style={{ color: 'var(--ros-text-secondary)' }}>
                    {candidate.location}
                  </p>
                </div>
              )}
              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>
                  Skills / Tags
                </h4>
                {candidate.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono px-2 py-0.5 rounded"
                        style={{ background: 'var(--ros-bg-secondary)', color: 'var(--ros-text-secondary)', border: '1px solid var(--ros-border)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>No tags.</p>
                )}
              </div>
              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>
                  Links
                </h4>
                {links.length > 0 ? (
                  <div className="space-y-1">
                    {links.map((link) => {
                      const Icon = link.icon;
                      return (
                        <a
                          key={link.label}
                          href={link.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs transition-colors"
                          style={{ color: 'var(--ros-accent)' }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {link.url}
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>No links available.</p>
                )}
              </div>
            </div>
          )}

          {/* Sourcing tab */}
          {activeTab === 'sourcing' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>
                  Sourcing Rationale
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ros-text-secondary)' }}>
                  {candidate.sourcing_rationale ?? 'No sourcing rationale recorded.'}
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>
                  Hidden Gem Reasons
                </h4>
                {candidate.hidden_gem_reasons.length > 0 ? (
                  <ul className="space-y-1">
                    {candidate.hidden_gem_reasons.map((reason, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--ros-text-secondary)' }}>
                        <span style={{ color: 'var(--ros-accent)' }}>-</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>None identified.</p>
                )}
              </div>
              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>
                  Search IDs
                </h4>
                {candidate.search_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.search_ids.map((sid) => (
                      <span
                        key={sid}
                        className="text-[10px] font-mono px-2 py-0.5 rounded"
                        style={{ background: 'var(--ros-bg-secondary)', color: 'var(--ros-text-muted)', border: '1px solid var(--ros-border)' }}
                      >
                        {sid}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>No searches linked.</p>
                )}
              </div>
            </div>
          )}

          {/* Outreach tab */}
          {activeTab === 'outreach' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>
                  Outreach Messages
                </h3>
                <button
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors"
                  style={{ background: 'var(--ros-accent)', color: '#fff' }}
                  onClick={() => navigate('/recruiter/outreach')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Draft New
                </button>
              </div>
              {(!outreachMessages || outreachMessages.length === 0) ? (
                <p className="text-xs py-6 text-center" style={{ color: 'var(--ros-text-muted)' }}>
                  No outreach generated. Draft a message grounded in this candidate's evidence.
                </p>
              ) : (
                outreachMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg border p-3 space-y-2"
                    style={{ borderColor: 'var(--ros-border)', background: 'var(--ros-bg-secondary)' }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--ros-bg-hover)', color: 'var(--ros-text-muted)' }}
                      >
                        {msg.channel}
                      </span>
                      <span
                        className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--ros-bg-hover)', color: 'var(--ros-text-muted)' }}
                      >
                        {msg.tone}
                      </span>
                      <StageBadge stage={candidate.pipeline_stage} />
                      <span className="text-[10px]" style={{ color: 'var(--ros-text-muted)' }}>
                        {msg.status}
                      </span>
                      <span className="text-[10px] ml-auto flex items-center gap-1" style={{ color: 'var(--ros-text-muted)' }}>
                        <Clock className="w-3 h-3" />
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ros-text-secondary)' }}>
                      {msg.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Notes tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a note about this candidate..."
                  rows={3}
                  className="w-full text-xs px-3 py-2 rounded-lg border outline-none resize-none"
                  style={{
                    background: 'var(--ros-bg-secondary)',
                    borderColor: 'var(--ros-border)',
                    color: 'var(--ros-text-primary)',
                  }}
                />
                <button
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors disabled:opacity-40"
                  style={{ background: 'var(--ros-accent)', color: '#fff' }}
                  disabled={!noteText.trim() || createNote.isPending}
                  onClick={handleSaveNote}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {createNote.isPending ? 'Saving...' : 'Save Note'}
                </button>
              </div>

              {(!notes || notes.length === 0) ? (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--ros-text-muted)' }}>
                  No notes yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border p-3"
                      style={{ borderColor: 'var(--ros-border)', background: 'var(--ros-bg-secondary)' }}
                    >
                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ros-text-secondary)' }}>
                        {note.content}
                      </p>
                      <span className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--ros-text-muted)' }}>
                        <Clock className="w-3 h-3" />
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
