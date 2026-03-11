import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SequenceStep {
  subject: string;
  body: string;
  delay_days: number;
}

export interface OutreachSequence {
  id: string;
  name: string;
  steps: SequenceStep[];
  created_at: string;
  updated_at: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  pipeline_id: string;
  current_step: number;
  status: 'active' | 'paused' | 'completed' | 'replied' | 'bounced';
  next_send_at: string | null;
  created_at: string;
}

export const DEFAULT_TEMPLATES: { name: string; steps: SequenceStep[] }[] = [
  {
    name: 'Cold Outreach (3-step)',
    steps: [
      { subject: 'Your {{firstName}} work on GitHub caught my eye', body: 'Hi {{firstName}},\n\nI came across your GitHub contributions and was impressed by your work. We have an exciting opportunity that aligns well with your skills.\n\nWould you be open to a brief chat?', delay_days: 0 },
      { subject: 'Following up — opportunity for {{firstName}}', body: 'Hi {{firstName}},\n\nJust wanted to follow up on my previous message. I think you would be a great fit for what we are building.\n\nHappy to share more details if you are interested.', delay_days: 3 },
      { subject: 'Last note from me, {{firstName}}', body: 'Hi {{firstName}},\n\nI do not want to be a bother — this will be my last message. If timing is not right, no worries at all.\n\nFeel free to reach out anytime if things change. Best of luck with your projects!', delay_days: 5 },
    ],
  },
  {
    name: 'Warm Introduction (2-step)',
    steps: [
      { subject: 'Loved your work on GitHub, {{firstName}}', body: 'Hi {{firstName}},\n\nA colleague mentioned your GitHub profile, and after looking at your contributions, I can see why. Really impressive work.\n\nWe are looking for someone with exactly your skillset. Mind if I share a few details?', delay_days: 0 },
      { subject: 'Quick follow-up, {{firstName}}', body: 'Hi {{firstName}},\n\nHoping this finds you well. Just circling back in case my previous note got buried.\n\nThe opportunity is still open and I would love to tell you more. Any interest?', delay_days: 4 },
    ],
  },
];

export function useSequences() {
  const queryClient = useQueryClient();

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_sequences')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as OutreachSequence[];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['sequence-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sequence_enrollments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SequenceEnrollment[];
    },
  });

  const createSequence = useMutation({
    mutationFn: async (seq: { name: string; steps: SequenceStep[] }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('outreach_sequences')
        .insert({ name: seq.name, steps: seq.steps, user_id: session?.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast({ title: 'Sequence created' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create sequence', description: err.message, variant: 'destructive' });
    },
  });

  const enrollCandidate = useMutation({
    mutationFn: async ({ sequenceId, pipelineId }: { sequenceId: string; pipelineId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const sequence = sequences.find(s => s.id === sequenceId);
      const firstDelay = sequence?.steps?.[0]?.delay_days || 0;
      const nextSendAt = new Date();
      nextSendAt.setDate(nextSendAt.getDate() + firstDelay);

      const { data, error } = await supabase
        .from('sequence_enrollments')
        .insert({
          sequence_id: sequenceId,
          pipeline_id: pipelineId,
          user_id: session?.user?.id,
          next_send_at: nextSendAt.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence-enrollments'] });
      toast({ title: 'Candidate enrolled in sequence' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to enroll', description: err.message, variant: 'destructive' });
    },
  });

  const pauseEnrollment = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('sequence_enrollments')
        .update({ status: 'paused' })
        .eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sequence-enrollments'] }),
  });

  const resumeEnrollment = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('sequence_enrollments')
        .update({ status: 'active' })
        .eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sequence-enrollments'] }),
  });

  return {
    sequences,
    enrollments,
    isLoading,
    createSequence,
    enrollCandidate,
    pauseEnrollment,
    resumeEnrollment,
    getEnrollmentForPipeline: (pipelineId: string) =>
      enrollments.find(e => e.pipeline_id === pipelineId),
  };
}
