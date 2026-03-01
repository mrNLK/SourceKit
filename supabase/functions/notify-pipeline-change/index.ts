import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from '../_shared/cors.ts';

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const {
      pipeline_id,
      github_username,
      candidate_name,
      from_stage,
      to_stage,
    } = await req.json();

    if (!github_username || !to_stage) {
      return new Response(JSON.stringify({ error: 'Missing github_username or to_stage' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();

    // Get webhook URLs from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['webhook_url', 'slack_webhook_url']);

    const settingsMap: Record<string, string> = {};
    if (settings) {
      settings.forEach((s: any) => { settingsMap[s.key] = s.value; });
    }

    const webhookUrl = settingsMap.webhook_url;
    const slackWebhookUrl = settingsMap.slack_webhook_url;

    let webhookStatus = 'skipped';
    const results: { target: string; ok: boolean; error?: string }[] = [];

    const stageLabels: Record<string, string> = {
      sourced: 'Sourced',
      contacted: 'Contacted',
      responded: 'Responded',
      screen: 'Screen',
      offer: 'Offer',
    };

    const fromLabel = from_stage ? (stageLabels[from_stage] || from_stage) : 'New';
    const toLabel = stageLabels[to_stage] || to_stage;
    const displayName = candidate_name || github_username;

    // Fire generic webhook
    if (webhookUrl) {
      try {
        const payload = {
          event: 'pipeline.stage_changed',
          timestamp: new Date().toISOString(),
          data: {
            pipeline_id,
            github_username,
            candidate_name: displayName,
            from_stage,
            to_stage,
            from_stage_label: fromLabel,
            to_stage_label: toLabel,
            github_url: `https://github.com/${github_username}`,
          },
        };
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        results.push({ target: 'webhook', ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` });
      } catch (e) {
        results.push({ target: 'webhook', ok: false, error: (e as Error).message });
      }
    }

    // Fire Slack webhook
    if (slackWebhookUrl) {
      try {
        const slackPayload = {
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Pipeline Update*\n*${displayName}* moved from *${fromLabel}* → *${toLabel}*\n<https://github.com/${github_username}|View on GitHub>`,
              },
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `SourceKit • ${new Date().toLocaleString()}` }],
            },
          ],
        };
        const res = await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });
        results.push({ target: 'slack', ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` });
      } catch (e) {
        results.push({ target: 'slack', ok: false, error: (e as Error).message });
      }
    }

    // Determine overall status
    if (results.length > 0) {
      webhookStatus = results.every(r => r.ok) ? 'sent' : results.some(r => r.ok) ? 'sent' : 'failed';
    }

    // Log event to pipeline_events
    await supabase.from('pipeline_events').insert({
      pipeline_id: pipeline_id || null,
      github_username,
      candidate_name: displayName,
      from_stage: from_stage || null,
      to_stage,
      event_type: 'stage_change',
      webhook_status: webhookStatus,
    });

    return new Response(JSON.stringify({ ok: true, webhookStatus, results }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
