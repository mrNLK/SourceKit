import { Search, FileText, RotateCw, Clock, SearchX, AlertCircle, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoryTabProps {
  onRerun: (query: string, expandedQuery?: string, searchId?: string) => void;
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This Week";
  return "Older";
}

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Older"];

const HistoryTab = ({ onRerun }: HistoryTabProps) => {
  const [filter, setFilter] = useState("");
  const queryClient = useQueryClient();

  const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("search_history").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["search-history"] });
    toast({ title: "Search removed" });
  };

  const handleClearAll = async () => {
    const { error } = await supabase.from("search_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast({ title: "Clear failed", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["search-history"] });
    toast({ title: "History cleared" });
  };

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["search-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 10,
  });

  const filtered = useMemo(() => {
    if (!filter) return history;
    const q = filter.toLowerCase();
    return history.filter((h: any) => h.query.toLowerCase().includes(q));
  }, [history, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const item of filtered) {
      const group = dateGroup(item.created_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    }
    return groups;
  }, [filtered]);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-36" />
        </div>
        <Skeleton className="h-10 w-full mb-6 rounded-lg" />
        <Skeleton className="h-4 w-20 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass rounded-lg px-4 py-3 flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-lg font-semibold text-foreground">Search History</h1>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Filter input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter history..."
          className="w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2.5 pl-10 pr-4 outline-none border border-border focus:border-primary/40 transition-colors font-body"
        />
      </div>

      {/* Empty state */}
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <SearchX className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-display text-base font-semibold text-foreground mb-1">No searches yet</h2>
          <p className="text-sm text-muted-foreground mb-1">Your past searches and research sessions will appear here.</p>
          <p className="text-xs text-muted-foreground/70 mb-4">Click any entry to re-run the same search with fresh results.</p>
          <button
            onClick={() => onRerun("")}
            className="text-xs font-display px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            New Search
          </button>
        </div>
      )}

      {/* Grouped results */}
      {GROUP_ORDER.map((groupName) => {
        const items = grouped[groupName];
        if (!items || items.length === 0) return null;
        return (
          <div key={groupName} className="mb-6">
            <h3 className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              {groupName}
            </h3>
            <div className="space-y-2">
              {items.map((item: any) => {
                const meta = item.metadata || {};
                const isResearch = item.action_type === "research";
                const Icon = isResearch ? FileText : Search;

                // Format title
                let title = item.query;
                if (!isResearch && meta.role && meta.company) {
                  title = `${meta.role} at ${meta.company}`;
                }
                if (title.length > 60) title = title.slice(0, 57) + "...";

                return (
                  <div
                    key={item.id}
                    onClick={() => onRerun(item.query, meta.expanded_query, item.id)}
                    className="glass rounded-lg px-4 py-3 flex items-center gap-3 group hover:glow-border transition-all cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isResearch ? "bg-purple-500/10 border border-purple-500/20" : "bg-primary/10 border border-primary/20"
                    }`}>
                      <Icon className={`w-4 h-4 ${isResearch ? "text-purple-400" : "text-primary"}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-medium text-foreground truncate" title={item.query}>{title}</p>
                      <p className="text-[11px] text-muted-foreground font-display mt-0.5">{relativeTime(item.created_at)}</p>
                    </div>

                    {/* P23: Show status badge for all searches including failures */}
                    {/* BUG-002: Error recovery — tooltip with error reason + Retry button */}
                    {meta.status === 'error' ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 cursor-help inline-flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Failed
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">{meta.error || 'Unknown error'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRerun(item.query, meta.expanded_query); }}
                          className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    ) : meta.status === 'no_results' ? (
                      <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                        0 results
                      </span>
                    ) : item.result_count != null ? (
                      <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border shrink-0">
                        {item.result_count} found
                      </span>
                    ) : null}

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); onRerun(item.query, meta.expanded_query, item.id); }}
                        className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                      >
                        <RotateCw className="w-3 h-3" />
                        Re-run
                      </button>
                      <button
                        onClick={(e) => handleDeleteOne(e, item.id)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && history.length > 0 && (
        <p className="text-center text-muted-foreground py-12 font-display text-sm">No history matches "{filter}"</p>
      )}
    </div>
  );
};

export default HistoryTab;
