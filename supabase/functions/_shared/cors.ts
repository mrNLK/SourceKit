const ALLOWED_ORIGINS = [
  'https://getsourcekit.vercel.app',
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]

// Vercel deployment / branch URLs for this project only (team scope mrnlks-projects),
// e.g. https://getsourcekit-kh2gqac9l-mrnlks-projects.vercel.app
const VERCEL_DEPLOYMENT_ORIGIN = /^https:\/\/getsourcekit-[a-z0-9-]+-mrnlks-projects\.vercel\.app$/

export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || VERCEL_DEPLOYMENT_ORIGIN.test(origin)
}

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-user-jwt, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  }
}
