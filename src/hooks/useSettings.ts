import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchSettings(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  let query = (supabase as any).from('settings').select('key, value');
  if (userId) query = query.eq('user_id', userId);
  const { data } = await query;
  const map: Record<string, string> = {};
  if (data) {
    data.forEach((r: any) => { map[r.key] = r.value; });
  }
  return map;
}

export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings = {} } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["settings"] });

  return { settings, invalidate };
}
