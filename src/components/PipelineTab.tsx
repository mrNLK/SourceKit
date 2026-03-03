import { GripVertical, Trash2, Loader2, Bookmark, BookmarkCheck, Clock, Search, ArrowRight, ArrowUpDown, ChevronDown, Tag, StickyNote, Share2, X, Plus, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CandidateProfile from "@/components/CandidateProfile";
import ExportButton from "@/components/ExportButton";
import PipelineAnalytics from "@/components/pipeline/PipelineAnalytics";
import EEAMetadata from "@/components/pipeline/EEAMetadata";
import PresenceAvatars from "@/components/pipeline/PresenceAvatars";
import { useWatchlist } from "@/hooks/useWatchlist";
import { usePipelineRealtime } from "@/hooks/usePipelineRealtime";
import { toast } from "@/hooks/use-toast";
import { notifyStageChange } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";

const STAGES = [
  { id: "sourced", label: "Sourced", color: "bg-primary/15 text-primary border-primary/30", tip: "Identified and saved. Ready for outreach." },
  { id: "contacted", label: "Contacted", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", tip: "Message sent. Waiting for response." },
  { id: "responded", label: "Responded", color: "bg-info/15 text-info border-info/30", tip: "Candidate replied. Active conversation." },
  { id: "screen", label: "Screen", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", tip: "Phone/video screen scheduled or completed." },
  { id: "offer", label: "Offer", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", tip: "Offer extended or in negotiation." },
] as const;

function daysInStage(updatedAt: string): { days: number; label: string; color: string } {
  const now = new Date();
  const updated = new Date(updatedAt);
  const diffMs = now.getTime() - updated.getTime();
  const days = Math.floor(diffMs / 86400000);

  if (days === 0) return { days, label: "Today", color: "text-emerald-400" };
  if (days === 1) return { days, label: "1d", color: "text-emerald-400" };
  if (days <= 3) return { days, label: `${days}d`, color: "text-emerald-400" };
  if (days <= 7) return { days, label: `${days}d`, color: "text-amber-400" };
  return { days, label: `${days}d`, color: "text-red-400" };
}

interface PipelineCandidate {
  id: string;
  github_username: string;
  name: string | null;
  avatar_url: string | null;
  stage: string;
  notes: string | null;
  tags: string[] | null;
  eea_data?: { strength: string; enrichments: string[] } | null;
  created_at: string;
  updated_at: string;
}

interface PipelineTabProps {
  onNavigateToSearch?: () => void;
}

const PipelineTab = ({ onNavigateToSearch }: PipelineTabProps) => {
  const queryClient = useQueryClient();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineCandidate | null>(null);
  const { isWatched, toggle: toggleWatchlist } = useWatchlist();
  const { settings } = useSettings();
  const { presenceState, trackViewing } = usePipelineRealtime();
  const [sortByScore, setSortByScore] = useState(false);
  const [activeStageFilter, setActiveStageFilter] = useState<string | null>(null);
  const [activeTagFilters, setActiveTagFilters] = useState<Set<string>>(new Set());
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pipeline").select("id, github_username, name, avatar_url, stage, notes, tags, created_at, updated_at").order("created_at", { ascending: false }).returns<PipelineCandidate[]>();
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch scores from candidates table
  const { data: candidateScores = {} } = useQuery({
    queryKey: ["candidate-scores"],
    queryFn: async () => {
      const usernames = candidates.map((c: PipelineCandidate) => c.github_username);
      if (usernames.length === 0) return {};
      const { data } = await supabase.from("candidates").select("github_username, score").in("github_username", usernames);
      const map: Record<string, number> = {};
      (data || []).forEach((r: { github_username: string; score: number | null }) => { map[r.github_username] = r.score || 0; });
      return map;
    },
    enabled: candidates.length > 0,
  });

  // Fetch last stage change time per candidate from pipeline_events
  const { data: stageChangeTimes = {} } = useQuery({
    queryKey: ["stage-change-times", candidates.length],
    queryFn: async () => {
      const ids = candidates.map((c: any) => c.id);
      if (ids.length === 0) return {};
      const { data } = await supabase
        .from("pipeline_events")
        .select("pipeline_id, created_at")
        .eq("event_type", "stage_change")
        .in("pipeline_id", ids)
        .order("created_at", { ascending: false });
      const map: Record<string, string> = {};
      // First row per pipeline_id is the most recent stage change
      (data || []).forEach((r: any) => {
        if (!map[r.pipeline_id]) map[r.pipeline_id] = r.created_at;
      });
      return map;
    },
    enabled: candidates.length > 0,
  });

  // All unique tags across candidates
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    candidates.forEach((c: PipelineCandidate) => {
      (c.tags || []).forEach((t: string) => tags.add(t));
    });
    return [...tags].sort();
  }, [candidates]);

  // Filtered + sorted candidates
  const filteredCandidates = useMemo(() => {
    let list = candidates;
    if (activeStageFilter) {
      list = list.filter((c: PipelineCandidate) => c.stage === activeStageFilter);
    }
    if (activeTagFilters.size > 0) {
      list = list.filter((c: PipelineCandidate) => {
        const cTags = c.tags || [];
        return [...activeTagFilters].some(t => cTags.includes(t));
      });
    }
    if (sortByScore) {
      list = [...list].sort((a: PipelineCandidate, b: PipelineCandidate) => {
        const sa = candidateScores[a.github_username] || 0;
        const sb = candidateScores[b.github_username] || 0;
        return sb - sa;
      });
    }
    return list;
  }, [candidates, activeStageFilter, activeTagFilters, sortByScore, candidateScores]);

  const moveMutation = useMutation({
    mutationFn: async ({ id, stage, fromStage }: { id: string; stage: string; fromStage?: string }) => {
      const { error } = await supabase.from("pipeline").update({ stage, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return { id, stage, fromStage };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["bulk-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["stage-change-times"] });
      const candidate = candidates.find((c: any) => c.id === variables.id);
      const stageLabel = STAGES.find(s => s.id === variables.stage)?.label || variables.stage;
      toast({ title: `Moved ${candidate?.name || candidate?.github_username || "candidate"} to ${stageLabel}` });
      // Non-blocking webhook notification with error feedback
      if (candidate) {
        notifyStageChange({
          pipeline_id: variables.id,
          github_username: candidate.github_username,
          candidate_name: candidate.name ?? undefined,
          from_stage: variables.fromStage,
          to_stage: variables.stage,
        }).catch(() => {
          toast({ title: "Webhook notification failed", description: "Check your webhook URL in Settings.", variant: "destructive" });
        });
      }
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast({ title: "Failed to move candidate", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pipeline").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["bulk-pipeline"] });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["bulk-pipeline"] });
      toast({ title: "Failed to remove candidate", description: error.message, variant: "destructive" });
    },
  });

  const notesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("pipeline").update({ notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
    onError: (error: Error) => {
      toast({ title: "Failed to save notes", description: error.message, variant: "destructive" });
    },
  });

  const tagsMutation = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const { error } = await supabase.from("pipeline").update({ tags }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
    onError: (error: Error) => {
      toast({ title: "Failed to save tags", description: error.message, variant: "destructive" });
    },
  });

  const handleDrop = useCallback((stageId: string) => {
    if (draggedItem) {
      const fromStage = candidates.find((c: PipelineCandidate) => c.id === draggedItem)?.stage;
      moveMutation.mutate({ id: draggedItem, stage: stageId, fromStage });
      setDraggedItem(null);
    }
  }, [draggedItem, candidates, moveMutation]);

  const handleBack = useCallback(() => { setSelectedCandidate(null); trackViewing(null); }, [trackViewing]);

  const handleShareToSlack = useCallback(async (candidate: PipelineCandidate) => {
    try {
      const webhookUrl = settings.slack_webhook_url;
      if (!webhookUrl) {
        toast({ title: "Set up Slack in Settings first", description: "Add your Slack webhook URL in Settings → Webhook URL." });
        return;
      }
      const score = candidateScores[candidate.github_username] || 0;
      const stage = STAGES.find(s => s.id === candidate.stage)?.label || candidate.stage;
      const payload = {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${candidate.name || candidate.github_username}*\nScore: ${score}/100 | Stage: ${stage}\nhttps://github.com/${candidate.github_username}`,
            },
          },
          {
            type: "context",
            elements: [{ type: "mrkdwn", text: "Shared from SourceKit" }],
          },
        ],
      };
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: "Shared to Slack" });
      } else {
        toast({ title: "Failed to share to Slack", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to share to Slack", variant: "destructive" });
    }
  }, [settings.slack_webhook_url, candidateScores]);

  // Stage pill counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach(s => { counts[s.id] = 0; });
    candidates.forEach((c: PipelineCandidate) => { counts[c.stage] = (counts[c.stage] || 0) + 1; });
    return counts;
  }, [candidates]);

  const toggleTagFilter = useCallback((tag: string) => {
    setActiveTagFilters(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }, []);

  if (selectedCandidate) {
    return <CandidateProfile pipelineCandidate={selectedCandidate} onBack={handleBack} />;
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-44" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mb-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((col) => (
            <div key={col} className="glass rounded-xl p-3 min-h-[400px]">
              <Skeleton className="h-6 w-16 rounded-md mb-3" />
              <div className="space-y-2">
                {[1, 2].map((card) => (
                  <div key={card} className="glass rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Skeleton className="w-7 h-7 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-lg font-semibold text-foreground">Candidate Pipeline</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border transition-colors ${
              showAnalytics ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            Analytics
          </button>
          <button
            onClick={() => setSortByScore(!sortByScore)}
            className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border transition-colors ${
              sortByScore ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            <ArrowUpDown className="w-3 h-3" />
            {sortByScore ? "Score ↓" : "Sort by Score"}
          </button>
          <ExportButton data={filteredCandidates} filename={`sourcekit-pipeline-${new Date().toISOString().slice(0,10)}`} />
        </div>
      </div>

      {/* Stage filter pills */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveStageFilter(null)}
          className={`text-xs font-display font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
            !activeStageFilter ? "bg-primary/15 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({candidates.length})
        </button>
        {STAGES.map((stage) => (
          <button
            key={stage.id}
            onClick={() => setActiveStageFilter(activeStageFilter === stage.id ? null : stage.id)}
            className={`text-xs font-display font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
              activeStageFilter === stage.id ? stage.color : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {stage.label} ({stageCounts[stage.id]})
          </button>
        ))}
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTagFilter(tag)}
              className={`text-[10px] font-display px-2 py-1 rounded-full border whitespace-nowrap transition-colors ${
                activeTagFilters.has(tag) ? "bg-primary/15 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              #{tag}
            </button>
          ))}
          {activeTagFilters.size > 0 && (
            <button onClick={() => setActiveTagFilters(new Set())} className="text-[10px] text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Analytics panel */}
      {showAnalytics && candidates.length > 0 && (
        <PipelineAnalytics candidates={candidates} stages={STAGES} />
      )}

      {/* Empty state */}
      {(!candidates || candidates.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-muted-foreground/20">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-primary" />
          </div>
          <p className="font-display text-sm font-semibold text-foreground mb-1">No candidates in your pipeline yet</p>
          <p className="text-xs text-muted-foreground mb-4">Search for candidates and add them to start building your pipeline.</p>
          <div className="flex items-center gap-1.5 mb-5 flex-wrap justify-center">
            {STAGES.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-1.5">
                <span className={`text-[10px] font-display font-semibold px-2 py-1 rounded-md border ${stage.color}`} title={stage.tip}>
                  {stage.label}
                </span>
                {i < STAGES.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
              </div>
            ))}
          </div>
          {onNavigateToSearch && (
            <button onClick={onNavigateToSearch}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:bg-primary/90 transition-colors">
              <Search className="w-3.5 h-3.5" /> Start Searching
            </button>
          )}
        </div>
      )}

      {/* Kanban columns — show filtered view if stage filter active, else kanban */}
      {activeStageFilter ? (
        <div className="space-y-2">
          {filteredCandidates.map((c: PipelineCandidate) => (
            <PipelineCard
              key={c.id}
              c={c}
              score={candidateScores[c.github_username] || 0}
              stage={STAGES.find(s => s.id === c.stage) || STAGES[0]}
              stageChangedAt={stageChangeTimes[c.id]}
              onDragStart={() => setDraggedItem(c.id)}
              onClick={() => { setSelectedCandidate(c); trackViewing(c.id); }}
              onRemove={() => { if (window.confirm(`Remove ${c.name || c.github_username}?`)) removeMutation.mutate(c.id); }}
              onWatch={() => toggleWatchlist(c.github_username, c.name, c.avatar_url)}
              isWatched={isWatched(c.github_username)}
              presenceUsers={presenceState[c.id] || []}
              onNotesChange={(notes) => notesMutation.mutate({ id: c.id, notes })}
              onTagsChange={(tags) => tagsMutation.mutate({ id: c.id, tags })}
              onShareSlack={() => handleShareToSlack(c)}
              onMove={(stageId) => moveMutation.mutate({ id: c.id, stage: stageId, fromStage: c.stage })}
            />
          ))}
          {filteredCandidates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No candidates match the current filters.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAGES.map((stage) => {
            const items = (sortByScore
              ? [...filteredCandidates].sort((a: PipelineCandidate, b: PipelineCandidate) => (candidateScores[b.github_username] || 0) - (candidateScores[a.github_username] || 0))
              : filteredCandidates
            ).filter((c: PipelineCandidate) => c.stage === stage.id);
            return (
              <div
                key={stage.id}
                className="glass rounded-xl p-3 min-h-[400px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-display font-semibold px-2 py-1 rounded-md border ${stage.color}`} title={stage.tip}>
                    {stage.label}
                  </span>
                  <span className="text-xs font-display text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/30 text-center py-4">Drop candidates here</p>
                  )}
                  {items.map((c: PipelineCandidate) => (
                    <PipelineCard
                      key={c.id}
                      c={c}
                      score={candidateScores[c.github_username] || 0}
                      stage={stage}
                      stageChangedAt={stageChangeTimes[c.id]}
                      onDragStart={() => setDraggedItem(c.id)}
                      onClick={() => { setSelectedCandidate(c); trackViewing(c.id); }}
                      onRemove={() => { if (window.confirm(`Remove ${c.name || c.github_username}?`)) removeMutation.mutate(c.id); }}
                      onWatch={() => toggleWatchlist(c.github_username, c.name, c.avatar_url)}
                      isWatched={isWatched(c.github_username)}
                      presenceUsers={presenceState[c.id] || []}
                      onNotesChange={(notes) => notesMutation.mutate({ id: c.id, notes })}
                      onTagsChange={(tags) => tagsMutation.mutate({ id: c.id, tags })}
                      onShareSlack={() => handleShareToSlack(c)}
                      onMove={(stageId) => moveMutation.mutate({ id: c.id, stage: stageId, fromStage: c.stage })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---- Pipeline Card with notes/tags/share ----

interface PipelineCardProps {
  c: PipelineCandidate;
  score: number;
  stage: typeof STAGES[number];
  stageChangedAt?: string;
  onDragStart: () => void;
  onClick: () => void;
  onRemove: () => void;
  onWatch: () => void;
  isWatched: boolean;
  presenceUsers: { id: string; email?: string }[];
  onNotesChange: (notes: string) => void;
  onTagsChange: (tags: string[]) => void;
  onShareSlack: () => void;
  onMove: (stage: string) => void;
}

const PipelineCard = memo(function PipelineCard({ c, score, stage, stageChangedAt, onDragStart, onClick, onRemove, onWatch, isWatched, presenceUsers, onNotesChange, onTagsChange, onShareSlack, onMove }: PipelineCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(c.notes || "");
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const tags: string[] = c.tags || [];
  // Use stage change timestamp if available, otherwise fall back to created_at
  const stageTime = daysInStage(stageChangedAt || c.created_at);
  const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => { setNotesValue(c.notes || ""); }, [c.notes]);

  // Cleanup debounce on unmount to prevent memory leaks
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleNotesBlur = () => {
    // Clear pending debounce to prevent double-save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (notesValue !== (c.notes || "")) {
      onNotesChange(notesValue);
    }
  };

  const handleNotesInput = (val: string) => {
    setNotesValue(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val !== (c.notes || "")) onNotesChange(val);
    }, 500);
  };

  const addTag = () => {
    const raw = tagInput.trim().toLowerCase().replace(/^#/, "");
    if (!raw) return;
    if (!tags.includes(raw)) {
      onTagsChange([...tags, raw]);
    }
    setTagInput("");
    setShowTagInput(false);
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter(t => t !== tag));
  };

  const scoreColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : score >= 40 ? "text-orange-400" : "text-red-400";

  return (
    <div
      draggable={!isTouch}
      onDragStart={isTouch ? undefined : onDragStart}
      className={`glass rounded-lg p-3 hover:glow-border transition-all group ${isTouch ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-start gap-2 cursor-pointer" onClick={onClick}>
        {!isTouch && <GripVertical className="w-3 h-3 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
        {c.avatar_url ? (
          <img
            src={c.avatar_url}
            alt=""
            className="w-7 h-7 rounded-full bg-secondary border border-border shrink-0 object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }}
          />
        ) : null}
        <div className={`${c.avatar_url ? "hidden" : "flex"} w-7 h-7 rounded-full bg-primary/15 border border-primary/30 items-center justify-center font-display text-[10px] font-bold text-primary shrink-0`}>
          {(c.name || c.github_username)?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-display text-xs font-semibold text-foreground hover:text-primary transition-colors block break-words" title={c.name || c.github_username}>
            {c.name || c.github_username}
          </span>
          <p className="text-[10px] text-muted-foreground font-display truncate">@{c.github_username}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <PresenceAvatars users={presenceUsers} />
          {score > 0 && (
            <span className={`text-[10px] font-display font-bold px-1.5 py-0.5 rounded ${
              score >= 70 ? "bg-emerald-500/15 text-emerald-400" :
              score >= 40 ? "bg-amber-500/15 text-amber-400" :
              "bg-red-500/15 text-red-400"
            }`}>{score}</span>
          )}
          <span className={`flex items-center gap-0.5 text-[9px] font-display font-semibold ${stageTime.color}`} title={`${stageTime.days} day${stageTime.days !== 1 ? 's' : ''} in ${stage.label}`}>
            <Clock className="w-2.5 h-2.5" />
            {stageTime.label}
          </span>
        </div>
      </div>

      {/* EEA metadata (from webset enrichment) */}
      {c.eea_data && (
        <div className="ml-5 mt-1">
          <EEAMetadata
            strength={c.eea_data.strength}
            enrichments={c.eea_data.enrichments}
            compact
          />
        </div>
      )}

      {/* Tag pills */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 ml-5">
          {tags.map(tag => (
            <span key={tag} className="text-[9px] font-display px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/15 flex items-center gap-0.5">
              #{tag}
              <button onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="hover:text-destructive">
                <X className="w-2 h-2" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Notes preview */}
      {c.notes && !showNotes && (
        <p className="text-[10px] text-muted-foreground/60 ml-5 mt-1 truncate italic cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowNotes(true); }}>
          {c.notes}
        </p>
      )}

      {/* Expanded notes */}
      {showNotes && (
        <div className="mt-2 ml-5" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={notesValue}
            onChange={(e) => handleNotesInput(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add notes..."
            rows={2}
            className="w-full bg-secondary/50 border border-border rounded-md px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-primary/40"
          />
        </div>
      )}

      {/* Tag input */}
      {showTagInput && (
        <div className="mt-1.5 ml-5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTag(); if (e.key === "Escape") setShowTagInput(false); }}
            placeholder="tag name"
            autoFocus
            className="bg-secondary/50 border border-border rounded px-2 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 w-24"
          />
          <button onClick={addTag} className="text-primary text-[10px] font-display">Add</button>
        </div>
      )}

      {/* Mobile stage select */}
      {isTouch && (
        <div className="mt-2 ml-5" onClick={(e) => e.stopPropagation()}>
          <select
            value={c.stage}
            onChange={(e) => onMove(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-md px-2 py-1.5 text-[11px] text-foreground font-display outline-none focus:border-primary/40"
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Action buttons row */}
      <div className={`flex items-center justify-between gap-1 mt-1.5 transition-opacity ${isTouch ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <div className="flex items-center gap-1 ml-5">
          <button onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }} className="p-1 rounded text-muted-foreground hover:text-foreground" title="Notes">
            <StickyNote className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowTagInput(!showTagInput); }} className="p-1 rounded text-muted-foreground hover:text-foreground" title="Add tag">
            <Tag className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onShareSlack(); }} className="p-1 rounded text-muted-foreground hover:text-foreground" title="Share to Slack">
            <Share2 className="w-3 h-3" />
          </button>
          {/* Move to stage */}
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowMoveMenu(!showMoveMenu); }} className="p-1 rounded text-muted-foreground hover:text-primary" title="Move to stage">
              <ArrowRight className="w-3 h-3" />
            </button>
            {showMoveMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoveMenu(false)} />
                <div className="absolute bottom-full mb-1 left-0 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[120px]">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      onClick={(e) => { e.stopPropagation(); onMove(s.id); setShowMoveMenu(false); }}
                      className={`w-full text-left text-[10px] font-display px-3 py-1.5 hover:bg-accent transition-colors ${
                        s.id === c.stage ? "text-primary font-semibold" : "text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onWatch(); }}
            className={`p-1 rounded transition-all ${isWatched ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            title={isWatched ? "In watchlist" : "Add to watchlist"}
          >
            {isWatched ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded text-muted-foreground hover:text-destructive transition-all"
            title="Remove from pipeline"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default PipelineTab;