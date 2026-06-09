import { bdSourcingConfig } from "@/lib/bd-sourcing/config";
import type { BdScoreBucket, BdScoreInput, BdScoreResult } from "@/types/bd-sourcing";

function includesLoose(values: string[], input?: string | null): boolean {
  if (!input) return false;
  const normalized = input.toLowerCase();
  return values.some((value) => normalized.includes(value.toLowerCase()));
}

function exactLoose(values: string[], input?: string | null): boolean {
  if (!input) return false;
  const normalized = input.toLowerCase();
  return values.some((value) => normalized === value.toLowerCase());
}

function daysBetween(from: string, to: Date): number {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.max(0, Math.floor((toUtc - fromDate.getTime()) / 86_400_000));
}

function bucketFor(composite: number): BdScoreBucket {
  if (composite >= bdSourcingConfig.scoring.reachNowThreshold) return "reach_now";
  if (composite >= bdSourcingConfig.scoring.warmLaterThreshold) return "warm_later";
  return "not_a_fit";
}

export function scoreTarget(input: BdScoreInput): BdScoreResult {
  const now = input.now ?? new Date();
  const reasons: string[] = [];

  const passesEmployees = (input.company.employeeCount ?? 0) >= bdSourcingConfig.companyFilters.minEmployees;
  const passesFunding = exactLoose(
    bdSourcingConfig.companyFilters.fundingStageAllowlist,
    input.company.fundingStage,
  );
  const passesIndustry = exactLoose(
    bdSourcingConfig.companyFilters.industryAllowlist,
    input.company.industry,
  );
  const deniedIndustry = exactLoose(
    bdSourcingConfig.companyFilters.industryDenylist,
    input.company.industry,
  );
  const companyPasses = [passesEmployees, passesFunding, passesIndustry].filter(Boolean).length;
  const companyFit = deniedIndustry ? 0 : companyPasses === 3 ? 100 : companyPasses >= 2 ? 60 : companyPasses === 1 ? 40 : 25;
  if (companyFit >= 100) reasons.push("company matches ICP filters");

  const deniedTitle = includesLoose(bdSourcingConfig.personFilters.titleDenylist, input.contact.title);
  const passesTitle = includesLoose(bdSourcingConfig.personFilters.titleAllowlist, input.contact.title);
  const passesFunction = includesLoose(bdSourcingConfig.personFilters.functionAllowlist, input.contact.title);
  const personFit = deniedTitle ? 20 : passesTitle && passesFunction ? 100 : passesTitle || passesFunction ? 60 : 25;
  if (personFit >= 100) reasons.push("contact title matches senior function filters");

  const signalStrength = bdSourcingConfig.scoring.signalStrength[input.signal.signalType];
  const signalAgeDays = daysBetween(input.signal.sourceDate, now);
  const signalFreshness = signalAgeDays <= 7 ? 100 : signalAgeDays <= 30 ? 80 : signalAgeDays <= 90 ? 50 : 20;
  if (signalFreshness >= 80) reasons.push("signal is fresh");

  const reachability =
    input.contact.emailVerificationStatus === "verified"
      ? 100
      : input.contact.emailVerificationStatus === "risky"
        ? 50
        : 0;
  if (reachability === 100) reasons.push("verified work email");

  const composite = Math.round(
    (companyFit + personFit + signalStrength + signalFreshness + reachability) / 5,
  );

  return {
    companyFit,
    personFit,
    signalStrength,
    signalFreshness,
    reachability,
    composite,
    bucket: bucketFor(composite),
    reasons,
  };
}

