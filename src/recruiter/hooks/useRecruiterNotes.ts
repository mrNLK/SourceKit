// SourceKit Recruiter OS — Candidate Notes hook

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CandidateNote } from '../lib/types';

const TABLE = 'recruiter_candidate_notes';

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export function useRecruiterNotes(candidateId: string | undefined) {
  return useQuery({
    queryKey: ['recruiter-notes', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CandidateNote[];
    },
    enabled: !!candidateId,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidateId, content }: { candidateId: string; content: string }) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(TABLE)
        .insert({ user_id: userId, candidate_id: candidateId, content })
        .select()
        .single();
      if (error) throw error;
      return data as CandidateNote;
    },
    onSuccess: (_, { candidateId }) => {
      qc.invalidateQueries({ queryKey: ['recruiter-notes', candidateId] });
    },
  });
}
