import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWatchlist() {
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
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

  const watchedUsernames = new Set(items.map((i: any) => i.candidate_username));

  const toggleMutation = useMutation({
    mutationFn: async ({
      username,
      name,
      avatarUrl,
      listName = "Default",
    }: {
      username: string;
      name?: string;
      avatarUrl?: string;
      listName?: string;
    }) => {
      const existing = items.find(
        (i: any) => i.candidate_username === username && i.list_name === listName
      );
      if (existing) {
        const { error } = await supabase.from("watchlist_items").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("watchlist_items").insert({
          candidate_username: username,
          candidate_name: name || null,
          candidate_avatar_url: avatarUrl || null,
          list_name: listName,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  const isWatched = (username: string) => watchedUsernames.has(username);

  const toggle = (username: string, name?: string, avatarUrl?: string, listName?: string) =>
    toggleMutation.mutate({ username, name, avatarUrl, listName });

  const listNames = ["Default", ...Array.from(new Set(items.map((i: any) => i.list_name).filter((n: string) => n !== "Default")))];

  return { items, isWatched, toggle, listNames, count: items.length };
}
