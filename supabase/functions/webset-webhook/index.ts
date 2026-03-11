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

  // Only accept POST requests for webhook payloads
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }

  // Validate webhook secret
  const webhookSecret = Deno.env.get('WEBSET_WEBHOOK_SECRET');
  const incomingSecret = req.headers.get('X-Webhook-Secret');

  if (!webhookSecret || incomingSecret !== webhookSecret) {
    console.error('Webhook secret validation failed');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = await req.json();
  } catch (err) {
    console.error('Failed to parse webhook payload:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload' }),
      { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }

  const eventId = payload.id as string | undefined;
  const eventType = payload.type as string | undefined;
  const websetId = (payload.webset_id ?? (payload.data as Record<string, unknown>)?.webset_id) as string | undefined;

  if (!eventType) {
    return new Response(
      JSON.stringify({ error: 'Missing event type in payload' }),
      { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }

  // Handle known event types
  switch (eventType) {
    case 'webset.idle': {
      console.log(`[webset-webhook] webset.idle: webset ${websetId} finished processing`, JSON.stringify(payload));
      break;
    }

    case 'webset.item.created': {
      const item = payload.data as Record<string, unknown> | undefined;
      console.log(
        `[webset-webhook] webset.item.created: new item in webset ${websetId}`,
        JSON.stringify({ item_id: item?.id, url: item?.url, title: item?.title })
      );
      break;
    }

    case 'webset.item.enriched': {
      const item = payload.data as Record<string, unknown> | undefined;
      console.log(
        `[webset-webhook] webset.item.enriched: item enrichment completed in webset ${websetId}`,
        JSON.stringify({ item_id: item?.id, enrichments: item?.enrichments })
      );
      break;
    }

    case 'webset.enrichment.completed': {
      console.log(
        `[webset-webhook] webset.enrichment.completed: all enrichments done for webset ${websetId}`,
        JSON.stringify(payload)
      );
      break;
    }

    default:
      console.log(`[webset-webhook] Unhandled event type: ${eventType}`, JSON.stringify(payload));
  }

  // Persist event to Supabase
  try {
    const supabase = getSupabase();

    const { error: dbError } = await supabase
      .from('webset_events')
      .upsert(
        {
          id: eventId,
          webset_id: websetId ?? null,
          event_type: eventType,
          payload,
          created_at: (payload.created_at as string | undefined) ?? new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (dbError) {
      console.error('[webset-webhook] Failed to store event in webset_events:', dbError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to persist event' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('[webset-webhook] Unexpected error storing event:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
  );
});
