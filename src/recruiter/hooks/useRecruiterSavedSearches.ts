// SourceKit Recruiter OS — Saved Searches hook

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SavedSearch, RecruiterSearchConfig } from '../lib/types';

const TABLE = 'recruiter_saved_searches';

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export function useRecruiterSavedSearches() {
  return useQuery({
    queryKey: ['recruiter-saved-searches'],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedSearch[];
    },
  });
}

export function useSaveSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, config, scorecardId }: { name: string; config: RecruiterSearchConfig; scorecardId?: string }) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          user_id: userId,
          name,
          scorecard_id: scorecardId ?? null,
          config,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SavedSearch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-saved-searches'] });
    },
  });
}
