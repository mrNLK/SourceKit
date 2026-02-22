import { useState } from "react";
import { Plus, X, Search, Bookmark, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WatchlistTabProps {
  onNavigateToSearch?: () => void;
}

const WatchlistTab = ({ onNavigateToSearch }: WatchlistTabProps) => {
  const queryClient = useQueryClient();
  const [activeList, setActiveList] = useState("Default");
  const [filterText, setFilterText] = useState("");
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Fetch all watchlist items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watchlist_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get unique list names
  const listNames = ["Default", ...Array.from(new Set(items.map((i: any) => i.list_name).filter((n: string) => n !== "Default")))];

  // Filter items by active list and search text
  const filteredItems = items.filter((i: any) => {
    if (i.list_name !== activeList) return false;
    if (filterText) {
      const search = filterText.toLowerCase();
      return (
        (i.candidate_name || "").toLowerCase().includes(search) ||
        i.candidate_username.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Remove from watchlist
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("watchlist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  // Create new list by inserting a placeholder (user will add candidates to it)
  const handleCreateList = () => {
    const name = newListName.trim();
    if (!name || listNames.includes(name)) return;
    setActiveList(name);
    setNewListOpen(false);
    setNewListName("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-lg font-semibold text-foreground mb-4">Watchlist</h1>

      {/* List tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {listNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveList(name)}
            className={`text-xs font-display px-3 py-1.5 rounded-full border transition-colors ${
              activeList === name
                ? "bg-primary/10 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
            }`}
          >
            {name}
            <span className="ml-1.5 text-[10px] opacity-70">
              {items.filter((i: any) => i.list_name === name).length}
            </span>
          </button>
        ))}
        <button
          onClick={() => setNewListOpen(true)}
          className="flex items-center gap-1 text-xs font-display px-2.5 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Plus className="w-3 h-3" />
          New List
        </button>
      </div>

      {/* Filter input */}
      {items.filter((i: any) => i.list_name === activeList).length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter candidates..."
            className="w-full bg-secondary/50 border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/30 transition-colors font-body"
          />
        </div>
      )}

      {/* Candidates grid */}
      {filteredItems.length > 0 ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item: any) => (
            <div
              key={item.id}
              className="glass rounded-xl p-4 hover:glow-border transition-all group relative"
            >
              <div className="flex items-start gap-3">
                {item.candidate_avatar_url ? (
                  <img
                    src={item.candidate_avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-lg bg-secondary border border-border object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center font-display text-sm font-bold text-primary shrink-0">
                    {(item.candidate_name || item.candidate_username)?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-semibold text-foreground truncate">
                    {item.candidate_name || item.candidate_username}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-display">@{item.candidate_username}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-display">
                    Added {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => removeMutation.mutate(item.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Remove from watchlist"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Bookmark className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-1">
            {filterText ? "No matches" : "No candidates in this list"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {filterText
              ? "Try a different search term."
              : "Star candidates from Search or Pipeline to add them here."}
          </p>
          {!filterText && onNavigateToSearch && (
            <Button variant="outline" size="sm" onClick={onNavigateToSearch}>
              Go to Search
            </Button>
          )}
        </div>
      )}

      {/* New List Dialog */}
      <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="font-display">Create New List</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="e.g. Frontend, ML Team, Q2 Hires..."
            className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/30 transition-colors font-body"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewListOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateList} disabled={!newListName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WatchlistTab;
