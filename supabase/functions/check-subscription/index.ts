import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: sub, error } = await supabase
      .from('user_subscriptions')
      .select('plan, searches_used, search_limit, current_period_end')
      .eq('user_id', user.id)
      .single();

    if (error || !sub) {
      // Auto-create if missing (edge case: user existed before migration)
      const { data: newSub } = await supabase
        .from('user_subscriptions')
        .insert({ user_id: user.id })
        .select('plan, searches_used, search_limit, current_period_end')
        .single();

      return new Response(JSON.stringify({
        plan: newSub?.plan || 'trial',
        searches_used: newSub?.searches_used || 0,
        search_limit: newSub?.search_limit || 10,
        searches_remaining: (newSub?.search_limit || 10) - (newSub?.searches_used || 0),
        can_search: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const canSearch = sub.plan === 'pro' || sub.search_limit === null || sub.searches_used < sub.search_limit;
    const searchesRemaining = sub.search_limit === null ? null : Math.max(0, sub.search_limit - sub.searches_used);

    return new Response(JSON.stringify({
      plan: sub.plan,
      searches_used: sub.searches_used,
      search_limit: sub.search_limit,
      searches_remaining: searchesRemaining,
      can_search: canSearch,
      current_period_end: sub.current_period_end,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Check subscription error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
