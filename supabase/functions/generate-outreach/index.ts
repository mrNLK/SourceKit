import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { candidate, context } = await req.json()

    // Input validation
    if (!candidate || !candidate.name) {
      return new Response(
        JSON.stringify({ error: 'candidate with name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `Write a casual, personalized outreach message to recruit this person. Keep it under 100 words. Be genuine and specific about why they'd be a good fit.

Candidate:
- Name: ${candidate.name}
- Current: ${candidate.role || 'Engineer'} at ${candidate.company || 'Unknown'}
- Bio: ${candidate.bio || 'N/A'}
- Notable signals: ${(candidate.signals || []).map((s: { label: string }) => s.label).join(', ') || 'None'}

Your company context:
- Company: ${context?.target_company || 'Our company'}
- Role: ${context?.role_title || 'Software Engineer'}
- Pitch: ${context?.pitch || 'Exciting opportunity'}

Write ONLY the message, no subject line or signature.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2024-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      console.error(`Anthropic API error: ${response.status}`, errorBody)
      return new Response(
        JSON.stringify({ error: `AI generation failed: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const message = data.content?.[0]?.text

    if (!message) {
      console.error('Anthropic returned empty content:', JSON.stringify(data))
      return new Response(
        JSON.stringify({ error: 'AI returned empty response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('generate-outreach error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
