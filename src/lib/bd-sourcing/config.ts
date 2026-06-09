import type { BdSignalType } from "@/types/bd-sourcing";

export const bdSourcingConfig = {
  companyFilters: {
    minEmployees: 200, // TODO: confirm with operator
    fundingStageAllowlist: ["Series B", "Series C", "Series D", "Growth", "Public"], // TODO: confirm with operator
    industryAllowlist: ["Software", "AI", "Data", "Cloud", "Cybersecurity", "Fintech"], // TODO: confirm with operator
    industryDenylist: ["Staffing", "Recruiting", "Agency"], // TODO: confirm with operator
  },
  personFilters: {
    titleAllowlist: ["VP", "Head", "Director", "Chief", "CIO", "CTO", "CDO", "CPO"], // TODO: confirm with operator
    functionAllowlist: ["Engineering", "Data", "Product", "Digital", "Strategy"], // TODO: confirm with operator
    titleDenylist: ["Assistant", "Coordinator", "Intern", "Recruiter", "Consultant"], // TODO: confirm with operator
  },
  scoring: {
    reachNowThreshold: 75, // TODO: confirm with operator
    warmLaterThreshold: 50, // TODO: confirm with operator
    signalStrength: {
      exec_change: 90,
      senior_hiring_spike: 80,
      funding: 85,
      open_web: 60,
      manual: 50,
    } satisfies Record<BdSignalType, number>,
  },
  signalDetectors: {
    newRelevantExecDays: 90, // TODO: confirm with operator
    seniorRolesWindowDays: 30, // TODO: confirm with operator
    seniorRolesThreshold: 3, // TODO: confirm with operator
    fundingFreshnessDays: 90, // TODO: confirm with operator
  },
  sendCaps: {
    maxSendsPerDay: 30, // TODO: confirm with operator
    maxSignalAgeDays: 30, // TODO: confirm with operator
    recontactWindowDays: 90, // TODO: confirm with operator
    maxContactsPerCompany: 1, // TODO: confirm with operator
    companyWindowDays: 14, // TODO: confirm with operator
  },
  salesforceExclusions: {
    excludeLeadStatuses: ["Open", "Working", "Nurture", "Qualified"], // TODO: confirm with operator
    excludeContactStatuses: ["Active", "Working", "Customer", "Do Not Contact"], // TODO: confirm with operator
    excludeOpportunityStages: ["Prospecting", "Qualification", "Proposal", "Negotiation", "Contracting"], // TODO: confirm with operator
    excludeOwnedByAnotherRep: true, // TODO: confirm with operator
  },
};

