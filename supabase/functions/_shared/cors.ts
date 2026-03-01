const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*'

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
