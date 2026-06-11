import type { FirstTouchEmailInput, FirstTouchEmailResult } from "@/types/bd-sourcing";
import { buildOperatorContextBlock } from "@/lib/bd-sourcing/operator-context";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildFirstTouchEmail(input: FirstTouchEmailInput): FirstTouchEmailResult {
  const signalReference = input.signalReference.trim();
  if (!input.workEmail || input.emailVerificationStatus !== "verified" || !signalReference) {
    return { ok: false, reason: "insufficient_data" };
  }

  const signalSentence = /[.!?]$/.test(signalReference) ? signalReference : `${signalReference}.`;
  const subject = `Quick thought for ${input.company}`;
  const bookingLink = input.ctaBookingLink?.trim();
  const ctaLine = bookingLink
    ? `Would it be useful to grab 20 minutes? Here is my calendar: ${bookingLink}`
    : "Would it be useful to grab 20 minutes next week?";
  const textBody = [
    `Hi ${input.firstName},`,
    "",
    `I noticed ${signalSentence} It made me think there may be a timely reason to compare notes on how your team is approaching this.`,
    "",
    ctaLine,
    "",
    "Best,",
    input.operatorName,
  ];
  const footerLines = [input.physicalAddress.trim(), input.unsubscribeUrl.trim() ? `Unsubscribe: ${input.unsubscribeUrl.trim()}` : ""]
    .filter(Boolean);
  const fullTextBody = footerLines.length > 0 ? [...textBody, "", ...footerLines].join("\n") : textBody.join("\n");

  const htmlBody = fullTextBody
    .split("\n")
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<br />"))
    .join("");

  return {
    ok: true,
    status: "draft",
    to: input.workEmail,
    from: input.operatorEmail,
    subject,
    textBody: fullTextBody,
    htmlBody,
    unsubscribeUrl: input.unsubscribeUrl,
    physicalAddress: input.physicalAddress,
    operatorContextBlock: buildOperatorContextBlock(input.operatorContext),
  };
}

export function buildSalesNavigatorNote(firstName: string, signalReference: string): string {
  const trimmedSignal = signalReference.trim();
  if (!trimmedSignal) {
    return `Hi ${firstName}, thought it would be useful to connect.`;
  }
  return `Hi ${firstName}, noticed ${trimmedSignal} and thought it would be useful to compare notes.`;
}
