import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  expanded_query: string | null;
  filters: Record<string, any> | null;
  created_at: string;
}

export function useSavedSearches() {
  const queryClient = useQueryClient();

  const { data: savedSearches = [], refetch } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: async (): Promise<SavedSearch[]> => {
      const { data } = await supabase
        .from("saved_searches")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as SavedSearch[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const isSaved = (query: string) =>
    savedSearches.some((s) => s.query === query && query.trim());

  const saveSearch = async (
    query: string,
    expandedQuery: string,
    filters: Record<string, any>,
  ) => {
    if (!query.trim()) return;

    // Toggle off if already saved
    const existing = savedSearches.find((s) => s.query === query);
    if (existing) {
      await supabase.from("saved_searches").delete().eq("id", existing.id);
      refetch();
      toast({ title: "Search removed from bookmarks" });
      return;
    }

    await supabase.from("saved_searches").insert({
      name: query,
      query,
      expanded_query: expandedQuery || null,
      filters,
    });
    refetch();
    toast({ title: "Search bookmarked" });
  };

  const deleteSearch = async (id: string) => {
    await supabase.from("saved_searches").delete().eq("id", id);
    refetch();
  };

  return { savedSearches, isSaved, saveSearch, deleteSearch };
}
