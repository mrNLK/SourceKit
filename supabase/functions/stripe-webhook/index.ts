import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!webhookSecret || !stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify Stripe webhook signature (HMAC-SHA256)
    const encoder = new TextEncoder()
    const parts = signature.split(',')
    const timestamp = parts.find((p: string) => p.startsWith('t='))?.slice(2)
    const sig = parts.find((p: string) => p.startsWith('v1='))?.slice(3)

    if (!timestamp || !sig) {
      return new Response(
        JSON.stringify({ error: 'Invalid stripe-signature format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const signedPayload = `${timestamp}.${body}`
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    if (expectedSig !== sig) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Reject events older than 5 minutes to prevent replay attacks
    const eventAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)
    if (eventAge > 300) {
      return new Response(
        JSON.stringify({ error: 'Event too old' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const event = JSON.parse(body)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log('Checkout completed:', session.id)

        // Find user by email from session or customer metadata
        const customerEmail = session.customer_details?.email || session.customer_email
        if (customerEmail) {
          const { data: users } = await supabase.auth.admin.listUsers()
          const user = users?.users?.find((u: { email?: string }) => u.email === customerEmail)
          if (user) {
            await supabase.from('user_plans').upsert({
              user_id: user.id,
              plan: 'pro',
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const status = subscription.status === 'active' ? 'pro'
          : subscription.status === 'past_due' ? 'past_due'
          : 'free'
        console.log('Subscription updated:', subscription.id, status)

        const { data: plan } = await supabase
          .from('user_plans')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        if (plan) {
          await supabase.from('user_plans').update({
            plan: status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', plan.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        console.log('Subscription cancelled:', subscription.id)

        await supabase.from('user_plans').update({
          plan: 'free',
          current_period_end: null,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.log('Payment failed:', invoice.id)

        if (invoice.subscription) {
          await supabase.from('user_plans').update({
            plan: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
