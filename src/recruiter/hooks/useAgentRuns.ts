// SourceKit Recruiter OS — Agent Runs hook

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AgentRun, AgentRunType, AgentRunStatus } from '../lib/types';

const TABLE = 'recruiter_agent_runs';

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export function useAgentRuns(filters?: {
  type?: AgentRunType;
  status?: AgentRunStatus;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['recruiter-agent-runs', filters],
    queryFn: async () => {
      const userId = await getUserId();
      let query = supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AgentRun[];
    },
    refetchInterval: 10000, // Poll every 10s for running jobs
  });
}

export function useCreateAgentRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (run: Partial<AgentRun>) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          user_id: userId,
          type: run.type ?? 'search',
          status: 'running',
          inputs: run.inputs ?? {},
          outputs: {},
          errors: [],
          candidate_ids: [],
          scorecard_id: run.scorecard_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AgentRun;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-agent-runs'] });
    },
  });
}

export function useUpdateAgentRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AgentRun> }) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AgentRun;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-agent-runs'] });
    },
  });
}
