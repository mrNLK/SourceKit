import { supabase } from "@/integrations/supabase/client";

/**
 * Get the current authenticated user's ID.
 * Returns null if not signed in.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
