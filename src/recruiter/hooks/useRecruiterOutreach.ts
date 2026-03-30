// SourceKit Recruiter OS — Outreach hook

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OutreachMessage } from '../lib/types';

const TABLE = 'recruiter_outreach';

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export function useRecruiterOutreach(candidateId?: string) {
  return useQuery({
    queryKey: ['recruiter-outreach', candidateId],
    queryFn: async () => {
      const userId = await getUserId();
      let query = supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (candidateId) query = query.eq('candidate_id', candidateId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as OutreachMessage[];
    },
  });
}

export function useCreateOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (outreach: Partial<OutreachMessage>) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          user_id: userId,
          candidate_id: outreach.candidate_id,
          scorecard_id: outreach.scorecard_id ?? null,
          message: outreach.message ?? '',
          grounding_artifacts: outreach.grounding_artifacts ?? [],
          tone: outreach.tone ?? 'professional',
          sequence_step: outreach.sequence_step ?? 'initial',
          channel: outreach.channel ?? 'email',
          status: outreach.status ?? 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data as OutreachMessage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-outreach'] });
    },
  });
}

export function useUpdateOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<OutreachMessage> }) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as OutreachMessage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-outreach'] });
    },
  });
}
