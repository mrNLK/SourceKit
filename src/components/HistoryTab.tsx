import { Search, FileText, RotateCw, Clock, SearchX } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HistoryTabProps {
  onRerun: (query: string, expandedQuery?: string) => void;
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
      <div className="flex items-center justify-center py-20">
        <Clock className="w-5 h-5 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-lg font-semibold text-foreground">Search History</h1>
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
                    onClick={() => onRerun(item.query, meta.expanded_query)}
                    className="glass rounded-lg px-4 py-3 flex items-center gap-3 group hover:glow-border transition-all cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isResearch ? "bg-purple-500/10 border border-purple-500/20" : "bg-primary/10 border border-primary/20"
                    }`}>
                      <Icon className={`w-4 h-4 ${isResearch ? "text-purple-400" : "text-primary"}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-medium text-foreground truncate">{title}</p>
                      <p className="text-[11px] text-muted-foreground font-display mt-0.5">{relativeTime(item.created_at)}</p>
                    </div>

                    {item.result_count != null && (
                      <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border shrink-0">
                        {item.result_count} {item.result_count === 1 ? 'result' : 'results'}
                      </span>
                    )}

                    <button
                      onClick={() => onRerun(item.query, meta.expanded_query)}
                      className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <RotateCw className="w-3 h-3" />
                      Re-run
                    </button>
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
