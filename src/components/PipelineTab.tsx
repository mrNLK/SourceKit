import { GripVertical, Trash2, Loader2, Bookmark, BookmarkCheck } from "lucide-react";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CandidateProfile from "@/components/CandidateProfile";
import { useWatchlist } from "@/hooks/useWatchlist";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const STAGES = [
  { id: "sourced", label: "Sourced", color: "bg-primary/15 text-primary border-primary/30" },
  { id: "contacted", label: "Contacted", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { id: "responded", label: "Responded", color: "bg-info/15 text-info border-info/30" },
  { id: "screen", label: "Screen", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { id: "offer", label: "Offer", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
] as const;

const PipelineTab = () => {
  const queryClient = useQueryClient();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const { isWatched, toggle: toggleWatchlist } = useWatchlist();

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pipeline").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("pipeline").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pipeline").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const handleDrop = (stageId: string) => {
    if (draggedItem) {
      moveMutation.mutate({ id: draggedItem, stage: stageId });
      setDraggedItem(null);
    }
  };

  const handleBack = useCallback(() => setSelectedCandidate(null), []);

  // If a candidate is selected, show the profile view
  if (selectedCandidate) {
    return <CandidateProfile pipelineCandidate={selectedCandidate} onBack={handleBack} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-lg font-semibold text-foreground mb-6">Candidate Pipeline</h1>
      {(!candidates || candidates.length === 0) && (
        <div className="text-center py-8 mb-4 rounded-xl border border-dashed border-muted-foreground/20">
          <p className="text-sm text-muted-foreground/60 mb-1">No candidates in your pipeline yet</p>
          <p className="text-xs text-muted-foreground/40">
            Search for candidates and save them to start building your pipeline
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAGES.map((stage) => {
          const items = candidates.filter((c: any) => c.stage === stage.id);
          return (
            <div
              key={stage.id}
              className="glass rounded-xl p-3 min-h-[400px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-display font-semibold px-2 py-1 rounded-md border ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-xs font-display text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="text-[11px] text-muted-foreground/30 text-center py-4">Drop candidates here</p>
                )}
                {items.map((c: any) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDraggedItem(c.id)}
                    className="glass rounded-lg p-3 cursor-grab active:cursor-grabbing hover:glow-border transition-all group"
                  >
                    <div className="flex items-start gap-2 cursor-pointer" onClick={() => setSelectedCandidate(c)}>
                      <GripVertical className="w-3 h-3 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-full bg-secondary border border-border shrink-0 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div
                        className={`${c.avatar_url ? "hidden" : "flex"} w-7 h-7 rounded-full bg-primary/15 border border-primary/30 items-center justify-center font-display text-[10px] font-bold text-primary shrink-0`}
                      >
                        {(c.name || c.github_username)?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-display text-xs font-semibold text-foreground hover:text-primary transition-colors truncate block">
                          {c.name || c.github_username}
                        </span>
                        <p className="text-[10px] text-muted-foreground font-display truncate">@{c.github_username}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(c.github_username, c.name, c.avatar_url);
                        }}
                        className={`p-1 rounded transition-all shrink-0 ${
                          isWatched(c.github_username)
                            ? "text-primary opacity-100"
                            : "text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100"
                        }`}
                        title={isWatched(c.github_username) ? "In watchlist" : "Add to watchlist"}
                      >
                        {isWatched(c.github_username) ? (
                          <BookmarkCheck className="w-3 h-3" />
                        ) : (
                          <Bookmark className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMutation.mutate(c.id);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineTab;
