import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DayContribution {
  date: string;
  count: number;
}

export interface GitHubActivityData {
  days: DayContribution[];
  sparkline: number[];
  activityScore: number;
  trend: 'up' | 'down' | 'flat';
  stats: {
    totalEvents: number;
    pushEvents: number;
    prEvents: number;
    issueEvents: number;
    activeDays30: number;
    totalLast30: number;
  };
}

export function useGitHubActivity(username: string | undefined) {
  return useQuery({
    queryKey: ['github-activity', username],
    queryFn: async (): Promise<GitHubActivityData> => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-activity?username=${encodeURIComponent(username!)}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      if (!res.ok) throw new Error('Failed to fetch activity');
      return res.json();
    },
    enabled: !!username,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
