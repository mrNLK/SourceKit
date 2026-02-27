import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

    if (!webhookSecret || !stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the event (in production, verify signature with Stripe SDK)
    const event = JSON.parse(body)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log('Checkout completed:', session.id)
        // TODO: Update user plan status in database
        // e.g. supabase.from('user_plans').upsert({ user_id, status: 'pro', stripe_customer_id: session.customer })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const status = subscription.status === 'active' ? 'pro'
          : subscription.status === 'past_due' ? 'past_due'
          : 'free'
        console.log('Subscription updated:', subscription.id, status)
        // TODO: Update user plan status in database
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        console.log('Subscription cancelled:', subscription.id)
        // TODO: Set user plan status to 'free' in database
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.log('Payment failed:', invoice.id)
        // TODO: Set user plan status to 'past_due' in database
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
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
