import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface AuthResult {
  user: { id: string; email?: string };
}

/**
 * Validate the Authorization header and return the authenticated user.
 * Throws an object with { status, body } if auth fails, so callers can
 * return it directly as a Response.
 *
 * Usage:
 *   const { user } = await requireAuth(req);
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw { status: 401, body: { error: "Missing Authorization header" } };
  }

  const token = authHeader.replace("Bearer ", "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  // Reject if the caller only sent the anon key (not a user session)
  if (token === anonKey) {
    throw { status: 401, body: { error: "Anonymous access not allowed" } };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw { status: 401, body: { error: "Invalid or expired token" } };
  }

  return { user: { id: user.id, email: user.email } };
}

/**
 * Helper to catch requireAuth rejections and turn them into Response objects.
 * Use in a catch block:
 *   catch (err) { const r = authError(err, req); if (r) return r; throw err; }
 */
export function authErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>
): Response | null {
  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    "body" in err
  ) {
    const { status, body } = err as { status: number; body: unknown };
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}
