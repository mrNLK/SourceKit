export type BdSignalProvider = "exa" | "findem" | "parallel" | "manual";

export type BdSignalType =
  | "exec_change"
  | "senior_hiring_spike"
  | "funding"
  | "open_web"
  | "manual";

export type BdEmailVerificationStatus =
  | "unknown"
  | "verified"
  | "invalid"
  | "risky"
  | "insufficient_data";

export type BdTargetLifecycleState =
  | "discovered"
  | "scored"
  | "qualified"
  | "sfdc_checked"
  | "queued"
  | "approved"
  | "emailed"
  | "opened"
  | "replied"
  | "li_drafted"
  | "li_sent"
  | "connected"
  | "meeting"
  | "won"
  | "lost"
  | "suppressed";

export type BdScoreBucket = "reach_now" | "warm_later" | "not_a_fit";

export interface BdCompanySnapshot {
  id?: string;
  name?: string;
  domain?: string;
  employeeCount?: number | null;
  fundingStage?: string | null;
  industry?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
}

export interface BdContactSnapshot {
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title: string;
  workEmail?: string | null;
  emailVerificationStatus: BdEmailVerificationStatus;
  linkedinUrl?: string | null;
  salesNavUrl?: string | null;
}

export interface BdSignalSnapshot {
  id?: string;
  provider?: BdSignalProvider;
  signalType: BdSignalType;
  title?: string;
  summary?: string;
  sourceUrl?: string;
  sourceDate: string;
}

export interface BdScoreInput {
  company: BdCompanySnapshot;
  contact: BdContactSnapshot;
  signal: BdSignalSnapshot;
  now?: Date;
}

export interface BdScoreResult {
  companyFit: number;
  personFit: number;
  signalStrength: number;
  signalFreshness: number;
  reachability: number;
  composite: number;
  bucket: BdScoreBucket;
  reasons: string[];
}

export interface SalesforceExclusionInput {
  leadStatus?: string | null;
  contactStatus?: string | null;
  opportunityStage?: string | null;
  ownerEmail?: string | null;
  operatorEmail: string;
}

export interface SalesforceExclusionResult {
  excluded: boolean;
  reason: string | null;
  reasons: string[];
}

export type BdSuppressionScope = "email" | "domain" | "company" | "contact";
export type BdSuppressionReason =
  | "reply"
  | "unsubscribe"
  | "bounce"
  | "manual"
  | "salesforce_active"
  | "ownership_conflict";

export interface BdSuppressionRecord {
  scope: BdSuppressionScope;
  value: string;
  reason: BdSuppressionReason;
  permanent: boolean;
}

export interface BdPriorTouch {
  email?: string | null;
  companyDomain?: string | null;
  sentAt: string;
}

export interface LocalSuppressionInput {
  email?: string | null;
  companyDomain?: string | null;
  now?: Date;
  suppressions: BdSuppressionRecord[];
  priorTouches: BdPriorTouch[];
}

export interface LocalSuppressionResult {
  blocked: boolean;
  reasons: string[];
}

export interface FirstTouchEmailInput {
  firstName: string;
  company: string;
  workEmail?: string | null;
  emailVerificationStatus: BdEmailVerificationStatus;
  signalReference: string;
  ctaBookingLink?: string | null;
  operatorName: string;
  operatorEmail: string;
  physicalAddress: string;
  unsubscribeUrl: string;
}

export type FirstTouchEmailResult =
  | {
      ok: true;
      status: "draft";
      to: string;
      from: string;
      subject: string;
      textBody: string;
      htmlBody: string;
      unsubscribeUrl: string;
      physicalAddress: string;
    }
  | {
      ok: false;
      reason: "insufficient_data";
    };

export interface BdTargetView {
  id: string;
  company: Required<Pick<BdCompanySnapshot, "name" | "domain">> & BdCompanySnapshot;
  contact: Required<Pick<BdContactSnapshot, "fullName" | "title">> & BdContactSnapshot;
  signal: Required<Pick<BdSignalSnapshot, "title" | "summary" | "sourceUrl">> & BdSignalSnapshot;
  lifecycleState: BdTargetLifecycleState;
  salesforceGate: SalesforceExclusionResult;
  score: BdScoreResult;
  linkedinNote: string;
}

export interface BdAuditLogEntry {
  action: string;
  fromState?: BdTargetLifecycleState;
  toState?: BdTargetLifecycleState;
  createdAt: string;
}

export interface BdDemoFlow {
  target: BdTargetView;
  emailDraft: Extract<FirstTouchEmailResult, { ok: true }>;
  externalWrites: unknown[];
  auditLog: BdAuditLogEntry[];
}
