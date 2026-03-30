// SourceKit Recruiter OS — Candidate data hook
// Connects to recruiter_candidates table via Supabase

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RecruiterCandidate, CandidateTier, PipelineStage, ContactStatus } from '../lib/types';

const TABLE = 'recruiter_candidates';

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

// Fetch all candidates for the current user
export function useRecruiterCandidates(filters?: {
  tier?: CandidateTier;
  stage?: PipelineStage;
  tags?: string[];
  needs_review?: boolean;
}) {
  return useQuery({
    queryKey: ['recruiter-candidates', filters],
    queryFn: async () => {
      const userId = await getUserId();
      let query = supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('composite_score', { ascending: false });

      if (filters?.tier) query = query.eq('tier', filters.tier);
      if (filters?.stage) query = query.eq('pipeline_stage', filters.stage);
      if (filters?.needs_review) query = query.eq('needs_review', true);
      if (filters?.tags?.length) query = query.overlaps('tags', filters.tags);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as RecruiterCandidate[];
    },
  });
}

// Fetch a single candidate by ID
export function useRecruiterCandidate(id: string | undefined) {
  return useQuery({
    queryKey: ['recruiter-candidate', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as RecruiterCandidate;
    },
    enabled: !!id,
  });
}

// Update candidate fields
export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RecruiterCandidate> }) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RecruiterCandidate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-candidates'] });
      qc.invalidateQueries({ queryKey: ['recruiter-candidate'] });
    },
  });
}

// Create a new candidate
export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (candidate: Partial<RecruiterCandidate>) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(TABLE)
        .insert({ ...candidate, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data as RecruiterCandidate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-candidates'] });
    },
  });
}

// Pipeline stats for command center
export function useRecruiterPipelineStats() {
  return useQuery({
    queryKey: ['recruiter-pipeline-stats'],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(TABLE)
        .select('tier, pipeline_stage, contact_status, needs_review, ats_sync_status')
        .eq('user_id', userId);
      if (error) throw error;

      const candidates = data ?? [];
      return {
        total: candidates.length,
        tier_1: candidates.filter(c => c.tier === 'tier_1').length,
        tier_2: candidates.filter(c => c.tier === 'tier_2').length,
        borderline: candidates.filter(c => c.tier === 'borderline').length,
        below_bar: candidates.filter(c => c.tier === 'below_bar').length,
        needs_review: candidates.filter(c => c.needs_review).length,
        outreach_sent: candidates.filter(c => c.pipeline_stage === 'outreach_sent').length,
        ats_synced: candidates.filter(c => c.ats_sync_status === 'synced').length,
        hidden_gems: candidates.filter(c => c.tier === 'tier_1' || c.tier === 'tier_2').length, // TODO: use hidden_gem_score
      };
    },
  });
}
