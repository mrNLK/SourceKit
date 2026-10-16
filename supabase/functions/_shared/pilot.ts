import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { interpretPilotResult, isPilotEnforced, resolveDailyCap, type PilotDecision, type UsageKind } from "./pilot-policy.ts";

export type { UsageKind } from "./pilot-policy.ts";

const getEnv = (name: string) => Deno.env.get(name);

/**
 * Invite-only + daily caps. No-op unless PILOT_MODE=true.
 * kind=null only checks the allowlist; otherwise consumes one unit of that kind's daily cap.
 */
export async function checkPilotAccess(userId: string, kind: UsageKind | null): Promise<PilotDecision> {
  if (!isPilotEnforced(getEnv)) return { allowed: true, status: 200 };
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase.rpc("pilot_consume", {
    p_user_id: userId,
    p_kind: kind,
    p_default_cap: kind ? resolveDailyCap(kind, getEnv) : null,
  });
  if (error) {
    console.error("pilot_consume failed:", error.message);
    return interpretPilotResult(null, kind);
  }
  return interpretPilotResult(data, kind);
}
