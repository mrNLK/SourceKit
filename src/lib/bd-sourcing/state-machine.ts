import type { BdTargetLifecycleState } from "@/types/bd-sourcing";

const terminalStates = new Set<BdTargetLifecycleState>(["won", "lost", "suppressed"]);

const allowedTransitions: Record<BdTargetLifecycleState, BdTargetLifecycleState[]> = {
  discovered: ["scored", "suppressed"],
  scored: ["qualified", "suppressed"],
  qualified: ["sfdc_checked", "suppressed"],
  sfdc_checked: ["queued", "suppressed"],
  queued: ["approved", "suppressed"],
  approved: ["emailed", "suppressed"],
  emailed: ["opened", "replied", "li_drafted", "suppressed"],
  opened: ["replied", "li_drafted", "suppressed"],
  replied: ["li_drafted", "meeting", "suppressed"],
  li_drafted: ["li_sent", "suppressed"],
  li_sent: ["connected", "suppressed"],
  connected: ["meeting", "suppressed"],
  meeting: ["won", "lost", "suppressed"],
  won: [],
  lost: [],
  suppressed: [],
};

export function canTransition(from: BdTargetLifecycleState, to: BdTargetLifecycleState): boolean {
  if (terminalStates.has(from)) return false;
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function assertTransition(from: BdTargetLifecycleState, to: BdTargetLifecycleState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid BD target transition: ${from} -> ${to}`);
  }
}

