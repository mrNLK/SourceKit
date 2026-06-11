import { bdSourcingConfig } from "@/lib/bd-sourcing/config";
import type {
  LocalSuppressionInput,
  LocalSuppressionResult,
  SalesforceExclusionInput,
  SalesforceExclusionResult,
} from "@/types/bd-sourcing";

function normalize(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function includesStatus(statuses: string[], value?: string | null): boolean {
  const normalized = normalize(value);
  return Boolean(normalized) && statuses.some((status) => normalize(status) === normalized);
}

function daysSince(value: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000));
}

export function evaluateSalesforceExclusion(input: SalesforceExclusionInput): SalesforceExclusionResult {
  const reasons: string[] = [];

  if (includesStatus(bdSourcingConfig.salesforceExclusions.excludeLeadStatuses, input.leadStatus)) {
    reasons.push(`active Lead status ${input.leadStatus}`);
  }

  if (includesStatus(bdSourcingConfig.salesforceExclusions.excludeContactStatuses, input.contactStatus)) {
    reasons.push(`active Contact status ${input.contactStatus}`);
  }

  if (includesStatus(bdSourcingConfig.salesforceExclusions.excludeOpportunityStages, input.opportunityStage)) {
    reasons.push(`active Opportunity stage ${input.opportunityStage}`);
  }

  const owner = normalize(input.ownerEmail);
  const operator = normalize(input.operatorEmail);
  if (
    bdSourcingConfig.salesforceExclusions.excludeOwnedByAnotherRep &&
    owner &&
    operator &&
    owner !== operator
  ) {
    reasons.push("owned by another rep");
  }

  return {
    excluded: reasons.length > 0,
    reason: reasons.length > 0 ? reasons.join("; ") : null,
    reasons,
  };
}

export function evaluateLocalSuppression(input: LocalSuppressionInput): LocalSuppressionResult {
  const now = input.now ?? new Date();
  const email = normalize(input.email);
  const companyDomain = normalize(input.companyDomain);
  const reasons = new Set<string>();

  for (const suppression of input.suppressions) {
    const value = normalize(suppression.value);
    if (suppression.scope === "email" && email && value === email && suppression.permanent) {
      reasons.add("permanent email suppression");
    }
    if (suppression.scope === "domain" && companyDomain && value === companyDomain && suppression.permanent) {
      reasons.add("permanent domain suppression");
    }
    if (suppression.scope === "company" && companyDomain && value === companyDomain && suppression.permanent) {
      reasons.add("permanent company suppression");
    }
  }

  const touchesForEmail = input.priorTouches.filter((touch) => normalize(touch.email) === email);
  if (
    email &&
    touchesForEmail.some((touch) => daysSince(touch.sentAt, now) <= bdSourcingConfig.sendCaps.recontactWindowDays)
  ) {
    reasons.add("inside re-contact window");
  }

  const recentCompanyTouches = input.priorTouches.filter(
    (touch) =>
      companyDomain &&
      normalize(touch.companyDomain) === companyDomain &&
      daysSince(touch.sentAt, now) <= bdSourcingConfig.sendCaps.companyWindowDays,
  );
  if (recentCompanyTouches.length >= bdSourcingConfig.sendCaps.maxContactsPerCompany) {
    reasons.add("company contact cap reached");
  }

  return {
    blocked: reasons.size > 0,
    reasons: [...reasons],
  };
}

