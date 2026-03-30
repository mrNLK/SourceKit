// SourceKit Recruiter OS — Scorecard CRUD hook

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RoleScorecard } from '../lib/types';

const TABLE = 'recruiter_scorecards';

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export function useRecruiterScorecards() {
  return useQuery({
    queryKey: ['recruiter-scorecards'],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoleScorecard[];
    },
  });
}

export function useRecruiterScorecard(id: string | undefined) {
  return useQuery({
    queryKey: ['recruiter-scorecard', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as RoleScorecard;
    },
    enabled: !!id,
  });
}

export function useCreateScorecard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scorecard: Partial<RoleScorecard>) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          user_id: userId,
          name: scorecard.name ?? 'Untitled Scorecard',
          status: scorecard.status ?? 'draft',
          talent_thesis: scorecard.talent_thesis ?? '',
          must_have_signals: scorecard.must_have_signals ?? [],
          nice_to_have_signals: scorecard.nice_to_have_signals ?? [],
          suppressions: scorecard.suppressions ?? [],
          scoring_weights: scorecard.scoring_weights ?? { eea: 25, builder: 20, ai_recency: 20, systems_depth: 15, product_instinct: 10, hidden_gem: 10 },
          outreach_tone: scorecard.outreach_tone ?? 'professional',
          evaluation_questions: scorecard.evaluation_questions ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return data as RoleScorecard;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-scorecards'] });
    },
  });
}

export function useUpdateScorecard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RoleScorecard> }) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RoleScorecard;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['recruiter-scorecards'] });
      qc.invalidateQueries({ queryKey: ['recruiter-scorecard', id] });
    },
  });
}

export function useDeleteScorecard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-scorecards'] });
    },
  });
}
