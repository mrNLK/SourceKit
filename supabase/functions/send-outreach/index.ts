import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/gate.ts';

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authErr = requireAuth(req, corsHeaders);
  if (authErr) return authErr;

  try {
    const { action, ...params } = await req.json();
    const supabase = getSupabase();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    switch (action) {
      case 'send': {
        // Send a single email via Resend
        const { to, subject, body, enrollment_id } = params;

        if (!resendKey) {
          return new Response(
            JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const fromEmail = Deno.env.get('OUTREACH_FROM_EMAIL') || 'outreach@getsourcekit.com';

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [to],
            subject,
            html: body,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          console.error('Resend error:', err);

          // Record bounce event
          if (enrollment_id) {
            await supabase.from('outreach_events').insert({
              enrollment_id,
              event_type: 'bounced',
              metadata: { error: err },
            });
          }

          return new Response(
            JSON.stringify({ error: 'Failed to send email', detail: err }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await res.json();

        // Record sent event
        if (enrollment_id) {
          await supabase.from('outreach_events').insert({
            enrollment_id,
            event_type: 'sent',
            metadata: { resend_id: data.id },
          });

          // Advance enrollment to next step
          const { data: enrollment } = await supabase
            .from('sequence_enrollments')
            .select('current_step, sequence_id')
            .eq('id', enrollment_id)
            .single();

          if (enrollment) {
            const { data: sequence } = await supabase
              .from('outreach_sequences')
              .select('steps')
              .eq('id', enrollment.sequence_id)
              .single();

            const steps = (sequence?.steps as Array<{ delay_days: number }>) || [];
            const nextStep = enrollment.current_step + 1;

            if (nextStep >= steps.length) {
              // Sequence complete
              await supabase.from('sequence_enrollments')
                .update({ status: 'completed', current_step: nextStep })
                .eq('id', enrollment_id);
            } else {
              // Schedule next step
              const nextDelay = steps[nextStep]?.delay_days || 3;
              const nextSendAt = new Date();
              nextSendAt.setDate(nextSendAt.getDate() + nextDelay);

              await supabase.from('sequence_enrollments')
                .update({ current_step: nextStep, next_send_at: nextSendAt.toISOString() })
                .eq('id', enrollment_id);
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, id: data.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'process_pending': {
        // Process all pending enrollments that are due to send
        const { data: pending } = await supabase
          .from('sequence_enrollments')
          .select('id, current_step, sequence_id, pipeline_id')
          .eq('status', 'active')
          .lte('next_send_at', new Date().toISOString())
          .limit(50);

        const results = [];
        for (const enrollment of pending || []) {
          // Get sequence and pipeline data
          const [seqRes, pipeRes] = await Promise.all([
            supabase.from('outreach_sequences').select('steps').eq('id', enrollment.sequence_id).single(),
            supabase.from('pipeline').select('github_username, name').eq('id', enrollment.pipeline_id).single(),
          ]);

          const steps = (seqRes.data?.steps as Array<{ subject: string; body: string }>) || [];
          const step = steps[enrollment.current_step];
          if (!step || !pipeRes.data) continue;

          // Look up candidate email
          const { data: candidate } = await supabase
            .from('candidates')
            .select('email')
            .eq('github_username', pipeRes.data.github_username)
            .single();

          if (!candidate?.email) {
            results.push({ id: enrollment.id, status: 'skipped', reason: 'no_email' });
            continue;
          }

          // Substitute template variables
          const body = step.body
            .replace(/\{\{firstName\}\}/g, (pipeRes.data.name || '').split(' ')[0] || pipeRes.data.github_username)
            .replace(/\{\{name\}\}/g, pipeRes.data.name || pipeRes.data.github_username)
            .replace(/\{\{username\}\}/g, pipeRes.data.github_username);

          const subject = step.subject
            .replace(/\{\{firstName\}\}/g, (pipeRes.data.name || '').split(' ')[0] || pipeRes.data.github_username)
            .replace(/\{\{name\}\}/g, pipeRes.data.name || pipeRes.data.github_username);

          results.push({ id: enrollment.id, to: candidate.email, subject, status: 'queued' });
        }

        return new Response(
          JSON.stringify({ processed: results.length, results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (e) {
    console.error('send-outreach error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
