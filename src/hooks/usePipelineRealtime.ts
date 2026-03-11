import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceUser {
  id: string;
  email?: string;
  viewingCandidate?: string;
}

interface PresenceState {
  [candidateId: string]: PresenceUser[];
}

export function usePipelineRealtime() {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Subscribe to pipeline table changes
  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUserId(session.user.id);
    });

    // Data channel: listen for INSERT, UPDATE, DELETE on pipeline
    const channel = supabase
      .channel('pipeline-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline' },
        (payload) => {
          // Invalidate pipeline query cache to trigger re-fetch
          queryClient.invalidateQueries({ queryKey: ['pipeline'] });

          // If it was an UPDATE (stage move), check for conflicts
          if (payload.eventType === 'UPDATE' && payload.new) {
            const event = new CustomEvent('pipeline-remote-update', {
              detail: {
                id: (payload.new as Record<string, unknown>).id,
                updated_at: (payload.new as Record<string, unknown>).updated_at,
                stage: (payload.new as Record<string, unknown>).stage,
              },
            });
            window.dispatchEvent(event);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  // Presence channel: track who is viewing what
  useEffect(() => {
    if (!currentUserId) return;

    const presenceChannel = supabase.channel('pipeline-presence', {
      config: { presence: { key: currentUserId } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const grouped: PresenceState = {};

        for (const [, presences] of Object.entries(state)) {
          for (const p of presences as Array<{ id: string; email?: string; viewingCandidate?: string }>) {
            if (p.viewingCandidate && p.id !== currentUserId) {
              if (!grouped[p.viewingCandidate]) grouped[p.viewingCandidate] = [];
              grouped[p.viewingCandidate].push({ id: p.id, email: p.email, viewingCandidate: p.viewingCandidate });
            }
          }
        }

        setPresenceState(grouped);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { session } } = await supabase.auth.getSession();
          await presenceChannel.track({
            id: currentUserId,
            email: session?.user?.email,
            viewingCandidate: null,
            online_at: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [currentUserId]);

  const trackViewing = useCallback(async (candidateId: string | null) => {
    if (!presenceChannelRef.current || !currentUserId) return;
    const { data: { session } } = await supabase.auth.getSession();
    await presenceChannelRef.current.track({
      id: currentUserId,
      email: session?.user?.email,
      viewingCandidate: candidateId,
      online_at: new Date().toISOString(),
    });
  }, [currentUserId]);

  return {
    presenceState,
    trackViewing,
    currentUserId,
  };
}
