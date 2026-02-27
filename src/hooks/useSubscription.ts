import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Subscription {
  plan: 'trial' | 'pro';
  searches_used: number;
  search_limit: number | null;
  searches_remaining: number | null;
  can_search: boolean;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/check-subscription`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        setSubscription(await res.json());
      }
    } catch (e) {
      console.error('Failed to check subscription:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh when a search completes (B2 fix: counter never incrementing)
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("sourcekit-search-complete", handler);
    return () => window.removeEventListener("sourcekit-search-complete", handler);
  }, [refresh]);

  return { subscription, loading, refresh };
}
