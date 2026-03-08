import { useState, useEffect, useCallback } from "react";
import {
  X, Star, MapPin, Clock, MessageSquare, Loader2, Sparkles, Copy, ClipboardCheck,
  ExternalLink, UserPlus, Check, Bookmark, BookmarkCheck, Github, Mail, Twitter,
  Linkedin, ChevronDown, Tag, StickyNote, Plus, History,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWatchlist } from "@/hooks/useWatchlist";
import { EEAFull } from "@/components/EEASignals";
import { notifyStageChange } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import OutreachTemplateEditor from "@/components/OutreachTemplateEditor";
import CodeQualityReport from "@/components/CodeQualityReport";
import type { Developer, Language } from "@/types/developer";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const OUTREACH_TONES = [
  { id: 'professional', label: 'Professional', prompt: 'concise, warm, and professional' },
  { id: 'casual', label: 'Casual', prompt: 'friendly, casual, and genuine — like a peer reaching out' },
  { id: 'technical', label: 'Technical', prompt: 'technically specific, referencing their actual projects and contributions' },
] as const;

import { PIPELINE_STAGES as STAGES } from "@/lib/constants";

interface CandidateSlideOutProps {
  developer: Developer;
  onClose: () => void;
}

function getScoreColor(score: number) {
  if (score >= 70) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 40) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (score >= 1) return "bg-red-500/15 text-red-400 border-red-500/30";
  return "bg-secondary text-secondary-foreground border-border";
}

const CandidateSlideOut = ({ developer, onClose }: CandidateSlideOutProps) => {
  const queryClient = useQueryClient();
  const { isWatched, toggle: toggleWatchlist } = useWatchlist();
  const [addedToPipeline, setAddedToPipeline] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [outreachMsg, setOutreachMsg] = useState<string | null>(null);
  const [outreachEditing, setOutreachEditing] = useState(false);
  const [outreachDraft, setOutreachDraft] = useState("");
  const [outreachTone, setOutreachTone] = useState<string>("professional");
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [outreachMode, setOutreachMode] = useState<"ai" | "template">("ai");
  const [stageOpen, setStageOpen] = useState(false);
  const [localStage, setLocalStage] = useState<string>("contacted");
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  // FEAT-004: Notes and tags
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const dev = developer;

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Check if already in pipeline (fetch notes + tags + stage)
  const { data: pipelineRow } = useQuery({
    queryKey: ["pipeline-check", dev.username],
    queryFn: async () => {
      const { data } = await supabase.from("pipeline").select("id, notes, tags, stage").eq("github_username", dev.username).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (pipelineRow) {
      setAddedToPipeline(true);
      setNotes(pipelineRow.notes || "");
      setTags(pipelineRow.tags || []);
      setLocalStage(pipelineRow.stage || "contacted");
    }
  }, [pipelineRow]);

  // Outreach history
  const { data: outreachHistory = [] } = useQuery({
    queryKey: ["outreach-history", pipelineRow?.id],
    queryFn: async () => {
      if (!pipelineRow?.id) return [];
      const { data, error } = await supabase
        .from("outreach_history")
        .select("*")
        .eq("pipeline_id", pipelineRow.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!pipelineRow?.id,
  });

  // Fetch enriched candidate data
  const { data: candidate } = useQuery({
    queryKey: ["candidate-detail", dev.username],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidates").select("*").eq("github_username", dev.username).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Load settings for role context
  const { data: settings } = useQuery({
    queryKey: ["settings-for-outreach"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("key, value");
      const map: Record<string, string> = {};
      if (data) data.forEach((r: any) => { map[r.key] = r.value; });
      return map;
    },
    staleTime: 60_000,
  });

  const handleAddToPipeline = async () => {
    if (addedToPipeline || pipelineLoading) return;
    setPipelineLoading(true);
    try {
      // Migrate pre-pipeline notes if any
      const prePipelineNotes = notes.trim() || localStorage.getItem(`sourcekit-notes:${dev.username}`) || "";
      await supabase.from("pipeline").upsert({
        github_username: dev.username,
        name: dev.name,
        avatar_url: dev.avatarUrl,
        stage: "contacted",
        ...(prePipelineNotes ? { notes: prePipelineNotes } : {}),
      }, { onConflict: "user_id,github_username" });
      // Clean up localStorage notes after migration
      localStorage.removeItem(`sourcekit-notes:${dev.username}`);
      setAddedToPipeline(true);
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-usernames"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-check", dev.username] });
      toast({ title: `Added ${dev.name || dev.username} to pipeline` });
    } catch (err) {
      console.error("Failed to add to pipeline:", err);
      toast({ title: "Failed to add to pipeline", variant: "destructive" });
    } finally {
      setPipelineLoading(false);
    }
  };

  // Stage change handler
  const handleStageChange = async (newStage: string) => {
    if (!pipelineRow?.id) return;
    const fromStage = localStage;
    setLocalStage(newStage);
    setStageOpen(false);
    await supabase.from("pipeline").update({ stage: newStage }).eq("id", pipelineRow.id);
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["pipeline-check", dev.username] });
    notifyStageChange({
      pipeline_id: pipelineRow.id,
      github_username: dev.username,
      candidate_name: dev.name || dev.username,
      from_stage: fromStage,
      to_stage: newStage,
    });
    toast({ title: `Moved to ${STAGES.find(s => s.id === newStage)?.label || newStage}` });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setOutreachMsg(null);
    setOutreachEditing(false);
    try {
      const tone = OUTREACH_TONES.find(t => t.id === outreachTone) || OUTREACH_TONES[0];
      const roleContext = [
        settings?.target_role && `Role: ${settings.target_role}`,
        settings?.target_company && `Company: ${settings.target_company}`,
        `Tone: ${tone.prompt}`,
      ].filter(Boolean).join('. ');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-outreach`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: dev.name,
          github_username: dev.username,
          role_context: roleContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOutreachMsg(data.message);
      setOutreachDraft(data.message);
      toast({ title: "Outreach message generated" });
    } catch (e) {
      console.error("Outreach generation failed:", e);
      toast({ title: "Outreach generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveOutreach = async () => {
    if (!outreachDraft.trim()) return;
    // Save to outreach_history if the candidate has a pipeline entry
    if (pipelineRow?.id) {
      await supabase.from("outreach_history").insert({ pipeline_id: pipelineRow.id, message: outreachDraft });
      queryClient.invalidateQueries({ queryKey: ["outreach-history", pipelineRow.id] });
    }
    setOutreachMsg(outreachDraft);
    setOutreachEditing(false);
  };

  const handleCopyOutreach = () => {
    navigator.clipboard.writeText(outreachEditing ? outreachDraft : (outreachMsg || ""));
    setCopiedMsg(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedMsg(false), 1500);
  };

  // Load pre-pipeline notes from localStorage if not in pipeline
  useEffect(() => {
    if (!pipelineRow && dev.username) {
      const saved = localStorage.getItem(`sourcekit-notes:${dev.username}`);
      if (saved) setNotes(saved);
    }
  }, [pipelineRow, dev.username]);

  // FEAT-004: Save notes (pipeline or localStorage)
  const handleSaveNotes = useCallback(async () => {
    setNotesSaving(true);
    if (pipelineRow?.id) {
      await supabase.from("pipeline").update({ notes }).eq("id", pipelineRow.id);
    } else {
      // Pre-pipeline: save to localStorage
      if (notes.trim()) {
        localStorage.setItem(`sourcekit-notes:${dev.username}`, notes);
      } else {
        localStorage.removeItem(`sourcekit-notes:${dev.username}`);
      }
    }
    setNotesSaving(false);
    toast({ title: "Notes saved" });
  }, [notes, pipelineRow, dev.username]);

  // FEAT-004: Add tag
  const handleAddTag = useCallback(async () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || !pipelineRow?.id || tags.includes(tag)) { setTagInput(""); return; }
    const newTags = [...tags, tag];
    setTags(newTags);
    setTagInput("");
    await supabase.from("pipeline").update({ tags: newTags }).eq("id", pipelineRow.id);
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
  }, [tagInput, tags, pipelineRow, queryClient]);

  // FEAT-004: Remove tag
  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!pipelineRow?.id) return;
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    await supabase.from("pipeline").update({ tags: newTags }).eq("id", pipelineRow.id);
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
  }, [tags, pipelineRow, queryClient]);

  const topLanguages = (candidate?.top_languages as Language[]) || dev.topLanguages || [];
  const highlights = (candidate?.highlights as string[]) || dev.highlights || [];
  const contributedRepos = (candidate?.contributed_repos as Record<string, number>) || dev.contributedRepos || {};
  const about = candidate?.about || dev.about || null;
  const linkedinUrl = candidate?.linkedin_url || dev.linkedinUrl || null;
  const enrichedDev = { ...dev, ...candidate, topLanguages: topLanguages, highlights, contributedRepos, about };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-card border-l border-border z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="p-6 space-y-6">
          {/* Close button */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-display px-1.5 py-0.5 rounded bg-secondary border border-border">ESC</span>
            <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ===== HEADER ===== */}
          <div className="flex items-start gap-4">
            <img
              src={dev.avatarUrl}
              alt={dev.name}
              className="w-16 h-16 rounded-xl bg-secondary border border-border object-cover shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-xl font-bold text-foreground truncate">{dev.name}</h2>
                {dev.score > 0 && (
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-display text-sm font-bold border ${getScoreColor(dev.score)}`}>
                    {dev.score}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-display mb-1">@{dev.username}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {dev.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{dev.location}</span>}
                {dev.followers > 0 && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{dev.followers.toLocaleString()} followers</span>}
                {dev.joinedYear && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Since {dev.joinedYear}</span>}
              </div>
            </div>
          </div>

          {/* ===== ACTIONS ===== */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAddToPipeline}
              className={`flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-2 rounded-lg border transition-colors ${
                addedToPipeline ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
              }`}
            >
              {pipelineLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : addedToPipeline ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              {addedToPipeline ? "In Pipeline" : "Add to Pipeline"}
            </button>

            <button
              onClick={() => toggleWatchlist(dev.username, dev.name, dev.avatarUrl)}
              className={`flex items-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border transition-colors ${
                isWatched(dev.username) ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {isWatched(dev.username) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              {isWatched(dev.username) ? "Watchlisted" : "Watchlist"}
            </button>

            {/* Social links */}
            <a href={dev.githubUrl || `https://github.com/${dev.username}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-display px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-3.5 h-3.5" /> GitHub
            </a>
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-display px-3 py-2 rounded-lg border border-info/20 bg-info/5 text-info hover:bg-info/10 transition-colors">
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn
              </a>
            )}
            {dev.email && (
              <a href={`mailto:${dev.email}`}
                className="flex items-center gap-1 text-xs font-display px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-3.5 h-3.5" /> Email
              </a>
            )}
            {dev.twitterUsername && (
              <a href={`https://twitter.com/${dev.twitterUsername}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-display px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-3.5 h-3.5" /> @{dev.twitterUsername}
              </a>
            )}

            {/* Stage changer (pipeline only) */}
            {addedToPipeline && pipelineRow && (
              <div className="relative">
                <button
                  onClick={() => setStageOpen(!stageOpen)}
                  className={`flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-2 rounded-lg border ${
                    (STAGES.find(s => s.id === localStage) || STAGES[0]).color
                  } transition-colors`}
                >
                  {(STAGES.find(s => s.id === localStage) || STAGES[0]).label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {stageOpen && (
                  <div className="absolute top-full mt-1 left-0 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[140px]">
                    {STAGES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleStageChange(s.id)}
                        className={`w-full text-left text-xs font-display px-3 py-2 hover:bg-accent transition-colors ${
                          s.id === localStage ? "text-primary font-semibold" : "text-foreground"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== NOTES & TAGS (FEAT-004) ===== */}
          <div className="glass rounded-xl p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="font-display text-xs font-semibold text-foreground">
                  Notes
                  {!addedToPipeline && <span className="text-muted-foreground/60 font-normal ml-1">(saved locally)</span>}
                </h3>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                rows={3}
                placeholder="Add notes about this candidate..."
                className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-xs text-foreground font-body outline-none resize-none focus:border-primary/30 placeholder:text-muted-foreground"
              />
              {notesSaving && <span className="text-[10px] text-muted-foreground font-display">Saving...</span>}
            </div>
            {/* Tags (pipeline-only) */}
            {addedToPipeline && pipelineRow && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <h3 className="font-display text-xs font-semibold text-foreground">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[10px] font-display px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-primary/60 hover:text-primary transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {tags.length === 0 && !tagInput && (
                    <span className="text-[10px] text-muted-foreground/60 font-display">No tags yet</span>
                  )}
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleAddTag(); }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag..."
                    className="flex-1 bg-secondary/50 border border-border rounded-lg py-1.5 px-2.5 text-[11px] text-foreground font-body outline-none focus:border-primary/30 placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    disabled={!tagInput.trim()}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* ===== ABOUT ===== */}
          {about && (
            <div className="glass rounded-xl p-4">
              <h3 className="font-display text-xs font-semibold text-foreground mb-2">About</h3>
              <p className="text-sm text-secondary-foreground leading-relaxed">{about}</p>
            </div>
          )}

          {/* ===== EEA SIGNALS ===== */}
          <div className="glass rounded-xl p-5">
            <EEAFull developer={enrichedDev} />
          </div>

          {/* ===== SKILLS / LANGUAGES ===== */}
          {topLanguages.length > 0 && (
            <div className="glass rounded-xl p-4">
              <h3 className="font-display text-xs font-semibold text-foreground mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {topLanguages.map((lang: any) => (
                  <span key={lang.name} className="text-xs font-display px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {lang.name}
                  </span>
                ))}
              </div>
              <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                {topLanguages.map((lang: any) => (
                  <div key={lang.name} style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }} className="rounded-full" />
                ))}
              </div>
            </div>
          )}

          {/* ===== NOTABLE WORK (P26: merged contributed + authored, ranked by impact) ===== */}
          {(highlights.length > 0 || Object.keys(contributedRepos).length > 0) && (
            <div className="glass rounded-xl p-4">
              <h3 className="font-display text-xs font-semibold text-foreground mb-2">Notable Work</h3>

              {/* Contributed repos (shown first with commit counts) */}
              {Object.keys(contributedRepos).length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {Object.entries(contributedRepos).map(([repo, count]) => (
                    <a key={repo} href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-colors group/repo">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-display text-foreground group-hover/repo:text-primary transition-colors">{repo}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover/repo:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-[11px] font-display text-muted-foreground">{count as number} commits</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Highlights (authored repos / other achievements) */}
              {highlights.length > 0 && (
                <ul className="space-y-1.5">
                  {highlights.map((h: string, i: number) => (
                    <li key={i} className="text-sm text-secondary-foreground flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ===== BUILDER SCORE ===== */}
          <CodeQualityReport username={dev.username} />

          {/* ===== OUTREACH ===== */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xs font-semibold text-foreground">Outreach</h3>
              {/* Mode switcher */}
              <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-0.5">
                <button
                  onClick={() => setOutreachMode("ai")}
                  className={`text-[10px] font-display px-2.5 py-1 rounded-md transition-colors ${
                    outreachMode === "ai" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  AI Generate
                </button>
                <button
                  onClick={() => setOutreachMode("template")}
                  className={`text-[10px] font-display px-2.5 py-1 rounded-md transition-colors ${
                    outreachMode === "template" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Templates
                </button>
              </div>
            </div>

            {outreachMode === "template" ? (
              <OutreachTemplateEditor
                developer={dev}
                onUseMessage={(msg) => {
                  setOutreachMsg(msg);
                  setOutreachDraft(msg);
                  setOutreachMode("ai"); // switch back to show the result
                }}
              />
            ) : (
            <>
            {/* Tone selector */}
            <div className="flex items-center justify-between mb-3">
              <div className="relative">
                <button onClick={() => setToneOpen(!toneOpen)}
                  className="flex items-center gap-1 text-[10px] font-display px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">
                  {OUTREACH_TONES.find(t => t.id === outreachTone)?.label} <ChevronDown className="w-2.5 h-2.5" />
                </button>
                {toneOpen && (
                  <div className="absolute top-full mt-1 left-0 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                    {OUTREACH_TONES.map(t => (
                      <button key={t.id} onClick={() => { setOutreachTone(t.id); setToneOpen(false); }}
                        className={`w-full text-left text-xs font-display px-3 py-1.5 hover:bg-accent transition-colors ${t.id === outreachTone ? 'text-primary' : 'text-foreground'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 mb-3">
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
              {generating ? "Generating..." : "Generate Outreach"}
            </button>

            {outreachMsg && (
              <div className="space-y-2">
                {outreachEditing ? (
                  <textarea
                    value={outreachDraft}
                    onChange={(e) => setOutreachDraft(e.target.value)}
                    rows={5}
                    className="w-full bg-secondary/50 border border-border rounded-lg p-3 text-sm text-foreground outline-none resize-none font-body focus:border-primary/30"
                  />
                ) : (
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border relative group">
                    <p className="text-sm text-foreground leading-relaxed pr-8">{outreachMsg}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {outreachEditing ? (
                    <button onClick={handleSaveOutreach}
                      className="text-[11px] font-display px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                      Save
                    </button>
                  ) : (
                    <button onClick={() => { setOutreachEditing(true); setOutreachDraft(outreachMsg); }}
                      className="text-[11px] font-display px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">
                      Edit
                    </button>
                  )}
                  <button onClick={handleCopyOutreach}
                    className={`text-[11px] font-display px-2.5 py-1 rounded-md border transition-colors ${copiedMsg ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                    {copiedMsg ? <><ClipboardCheck className="w-3 h-3 inline mr-1" />Copied</> : <><Copy className="w-3 h-3 inline mr-1" />Copy</>}
                  </button>
                  {/* U3: Regenerate button */}
                  <button onClick={handleGenerate} disabled={generating}
                    className="text-[11px] font-display px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                    {generating ? <Loader2 className="w-3 h-3 inline mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 inline mr-1" />}
                    Regenerate
                  </button>
                </div>
                {/* U3: Character count */}
                <p className="text-[10px] text-muted-foreground mt-1.5 font-display">
                  {(outreachEditing ? outreachDraft : outreachMsg || "").length} characters
                </p>
              </div>
            )}

            {settings?.target_role && (
              <p className="text-[10px] text-muted-foreground mt-2 font-display">
                Context: {settings.target_role}{settings.target_company ? ` at ${settings.target_company}` : ''}
              </p>
            )}
            </>
            )}
          </div>

          {/* ===== OUTREACH HISTORY ===== */}
          {pipelineRow && outreachHistory.length > 0 && (
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="font-display text-xs font-semibold text-foreground">
                  Past Messages ({outreachHistory.length})
                </h3>
              </div>
              <div className="space-y-2">
                {outreachHistory.map((h: any) => {
                  const isExpanded = expandedHistoryId === h.id;
                  const msgText: string = h.message || "";
                  const truncated = msgText.length > 120 && !isExpanded;
                  return (
                    <div key={h.id} className="group/msg p-3 rounded-lg bg-secondary/50 border border-border relative">
                      <p className="text-xs text-secondary-foreground leading-relaxed pr-7">
                        {truncated ? msgText.slice(0, 120) + "..." : msgText}
                      </p>
                      {msgText.length > 120 && (
                        <button
                          onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                          className="text-[10px] text-primary font-display mt-1 hover:underline"
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                      <div className="flex items-center mt-1.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msgText);
                          setCopiedHistoryId(h.id);
                          setTimeout(() => setCopiedHistoryId(null), 1500);
                        }}
                        className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground opacity-0 group-hover/msg:opacity-100 transition-opacity"
                        title="Copy message"
                      >
                        {copiedHistoryId === h.id ? <ClipboardCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats footer */}
          <div className="glass rounded-xl p-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Repos", value: dev.publicRepos || 0 },
                { label: "Stars", value: dev.stars || 0 },
                { label: "Followers", value: dev.followers || 0 },
                { label: "Since", value: dev.joinedYear || "N/A" },
              ].map(stat => (
                <div key={stat.label} className="text-center p-2 rounded-lg bg-secondary/50 border border-border">
                  <div className="font-display text-sm font-bold text-foreground">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</div>
                  <div className="text-[10px] font-display text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CandidateSlideOut;
