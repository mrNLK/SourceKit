export interface ManualEmailHandoffInput {
  to: string;
  from: string;
  subject: string;
  textBody: string;
}

export interface ManualEmailHandoff {
  copyText: string;
  emlContent: string;
  providerMessageId: null;
}

export interface ManualCrmExportTarget {
  fullName: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  domain: string;
  workEmail: string;
  linkedinUrl?: string | null;
  signal: string;
  sourceUrl: string;
  score: number;
}

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildManualEmailHandoff(input: ManualEmailHandoffInput): ManualEmailHandoff {
  const fromLines = input.from.trim() ? [`From: ${input.from}`] : [];
  const copyText = [
    `To: ${input.to}`,
    ...fromLines,
    `Subject: ${input.subject}`,
    "",
    input.textBody,
  ].join("\n");

  const emlContent = [
    `To: ${input.to}`,
    ...fromLines,
    `Subject: ${input.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.textBody,
  ].join("\r\n");

  return {
    copyText,
    emlContent,
    providerMessageId: null,
  };
}

export function buildManualCrmCsv(targets: ManualCrmExportTarget[]): string {
  const headers = [
    "Full Name",
    "First Name",
    "Last Name",
    "Title",
    "Company",
    "Domain",
    "Email",
    "LinkedIn URL",
    "Signal",
    "Source URL",
    "Score",
  ];

  const rows = targets.map((target) => [
    target.fullName,
    target.firstName,
    target.lastName,
    target.title,
    target.company,
    target.domain,
    target.workEmail,
    target.linkedinUrl ?? "",
    target.signal,
    target.sourceUrl,
    target.score,
  ]);

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
