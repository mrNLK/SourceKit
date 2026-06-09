import type { FirstTouchEmailInput, FirstTouchEmailResult } from "@/types/bd-sourcing";

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
  const textBody = [
    `Hi ${input.firstName},`,
    "",
    `I noticed ${signalSentence} It made me think there may be a timely reason to compare notes on how your team is approaching this.`,
    "",
    `Would it be useful to grab 20 minutes? Here is my calendar: ${input.ctaBookingLink}`,
    "",
    "Best,",
    input.operatorName,
    "",
    input.physicalAddress,
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");

  const htmlBody = textBody
    .split("\n")
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<br />"))
    .join("");

  return {
    ok: true,
    status: "draft",
    to: input.workEmail,
    from: input.operatorEmail,
    subject,
    textBody,
    htmlBody,
    unsubscribeUrl: input.unsubscribeUrl,
    physicalAddress: input.physicalAddress,
  };
}

export function buildSalesNavigatorNote(firstName: string, signalReference: string): string {
  const trimmedSignal = signalReference.trim();
  if (!trimmedSignal) {
    return `Hi ${firstName}, thought it would be useful to connect.`;
  }
  return `Hi ${firstName}, noticed ${trimmedSignal} and thought it would be useful to compare notes.`;
}
