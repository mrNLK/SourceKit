import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from '../_shared/cors.ts';

const CACHE_HOURS = 24;

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

interface DayContribution {
  date: string;
  count: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'username parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabase();

    // Check cache
    const { data: cached } = await supabase
      .from('github_activity_cache')
      .select('*')
      .eq('github_username', username.toLowerCase())
      .single();

    if (cached) {
      const cacheAge = Date.now() - new Date(cached.fetched_at).getTime();
      if (cacheAge < CACHE_HOURS * 60 * 60 * 1000) {
        return new Response(
          JSON.stringify(cached.contribution_data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch from GitHub Events API (public, no auth needed for basic data)
    const token = Deno.env.get('GITHUB_TOKEN');
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SourceKit-App',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Fetch events (up to 300 events = 3 pages)
    const events: Array<{ type: string; created_at: string }> = [];
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100&page=${page}`,
        { headers }
      );
      if (!res.ok) break;
      const pageEvents = await res.json();
      if (!Array.isArray(pageEvents) || pageEvents.length === 0) break;
      events.push(...pageEvents);
    }

    // Build daily contribution counts from events
    const dailyCounts: Record<string, number> = {};
    const pushEvents: string[] = [];
    const prEvents: string[] = [];
    const issueEvents: string[] = [];

    for (const event of events) {
      const date = event.created_at?.slice(0, 10);
      if (!date) continue;
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;

      if (event.type === 'PushEvent') pushEvents.push(date);
      if (event.type === 'PullRequestEvent') prEvents.push(date);
      if (event.type === 'IssuesEvent' || event.type === 'IssueCommentEvent') issueEvents.push(date);
    }

    // Generate 365-day grid
    const today = new Date();
    const days: DayContribution[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({ date: dateStr, count: dailyCounts[dateStr] || 0 });
    }

    // Compute activity score (0-100)
    const last30 = days.slice(-30);
    const last90 = days.slice(-90);
    const totalLast30 = last30.reduce((s, d) => s + d.count, 0);
    const totalLast90 = last90.reduce((s, d) => s + d.count, 0);
    const activeDays30 = last30.filter(d => d.count > 0).length;
    const uniquePRDays = new Set(prEvents).size;

    const commitFrequency = Math.min(40, totalLast30 * 1.5);
    const prEngagement = Math.min(25, uniquePRDays * 5);
    const consistency = Math.min(20, activeDays30 * 1.5);
    const recencyRatio = Math.min(15, totalLast90 > 0 ? (totalLast30 / totalLast90) * 45 : 0);
    const activityScore = Math.round(Math.min(100, commitFrequency + prEngagement + consistency + recencyRatio));

    // Build last 30-day sparkline data
    const sparkline = last30.map(d => d.count);

    // Trend direction
    const firstHalf = sparkline.slice(0, 15).reduce((s, v) => s + v, 0);
    const secondHalf = sparkline.slice(15).reduce((s, v) => s + v, 0);
    const trend = secondHalf > firstHalf * 1.2 ? 'up' : secondHalf < firstHalf * 0.8 ? 'down' : 'flat';

    const contributionData = {
      days,
      sparkline,
      activityScore,
      trend,
      stats: {
        totalEvents: events.length,
        pushEvents: pushEvents.length,
        prEvents: prEvents.length,
        issueEvents: issueEvents.length,
        activeDays30,
        totalLast30,
      },
    };

    // Cache result
    await supabase.from('github_activity_cache').upsert({
      github_username: username.toLowerCase(),
      contribution_data: contributionData,
      activity_score: activityScore,
      fetched_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify(contributionData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('github-activity error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Failed to fetch activity' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
