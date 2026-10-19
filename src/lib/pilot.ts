/**
 * Pilot mode (VITE_PILOT_MODE=true): free pilot for @aifundpc.com and invited users.
 * Hides SellKit, /recruiter, the AI Fund dashboard, and Stripe upgrade prompts.
 */
export function isPilotMode(env: Record<string, unknown> = import.meta.env): boolean {
  const raw = String(env.VITE_PILOT_MODE ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

export const PILOT_MODE = isPilotMode();
