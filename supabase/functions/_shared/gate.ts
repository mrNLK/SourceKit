import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

export interface GateResult {
  allowed: boolean;
  userId: string | null;
  plan: string | null;
  error?: string;
  searchesUsed?: number;
  searchLimit?: number | null;
}

/**
 * Check if the user is allowed to perform a search.
 * Pass the Authorization header value (Bearer <token>).
 * Returns { allowed, userId, plan } or { allowed: false, error }.
 * 
 * If no auth header is present, allows the request (anonymous/backward compat).
 * Gate only blocks when we can identify a trial user who is over limit.
 */
export async function checkSearchGate(authHeader: string | null): Promise<GateResult> {
  if (!authHeader || authHeader === `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`) {
    // No user-specific token, allow but can't track
    return { allowed: true, userId: null, plan: null };
  }

  const supabase = getSupabase();
  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    // Invalid token but don't block, just can't track
    return { allowed: true, userId: null, plan: null };
  }

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan, searches_used, search_limit')
    .eq('user_id', user.id)
    .single();

  if (!sub) {
    // No subscription row, create one (edge case)
    await supabase.from('user_subscriptions').insert({ user_id: user.id });
    return { allowed: true, userId: user.id, plan: 'trial', searchesUsed: 0, searchLimit: 10 };
  }

  // Pro users always allowed
  if (sub.plan === 'pro' || sub.search_limit === null) {
    return { allowed: true, userId: user.id, plan: 'pro', searchesUsed: sub.searches_used, searchLimit: null };
  }

  // Trial users: check limit
  if (sub.searches_used >= sub.search_limit) {
    return {
      allowed: false,
      userId: user.id,
      plan: 'trial',
      error: 'trial_limit_reached',
      searchesUsed: sub.searches_used,
      searchLimit: sub.search_limit,
    };
  }

  return {
    allowed: true,
    userId: user.id,
    plan: 'trial',
    searchesUsed: sub.searches_used,
    searchLimit: sub.search_limit,
  };
}

/**
 * Increment the search count for a user after a successful search.
 * Uses a single atomic RPC call to avoid race conditions under concurrent requests.
 */
export async function incrementSearchCount(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('increment_searches_used', { p_user_id: userId });
  if (error) {
    console.error('Failed to increment search count:', error.message);
  }
}
