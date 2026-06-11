import type { BdSignalType, BdTargetView } from "@/types/bd-sourcing";
import { buyerPersonaLabel, inferBuyerPersona, type BdBuyerPersona } from "@/lib/bd-sourcing/personas";

export type BdConversionEventType =
  | "target_approved"
  | "manual_email_sent"
  | "linkedin_note_sent"
  | "reply_received"
  | "positive_reply"
  | "meeting_booked"
  | "opportunity_created"
  | "won"
  | "lost"
  | "disqualified";

export type BdConversionArea = "signal" | "outreach" | "both";
export type BdOutreachChannel = "manual_email" | "linkedin_manual" | "crm_import" | "offline";
export type BdConversionSource = "manual" | "csv_import" | "api_import" | "provider_webhook" | "demo";

export interface BdConversionEvent {
  id: string;
  targetId: string;
  targetDbId?: string | null;
  signalId?: string | null;
  outreachTouchId?: string | null;
  companyName: string;
  contactName: string;
  signalType: BdSignalType;
  signalTitle: string;
  eventType: BdConversionEventType;
  conversionArea: BdConversionArea;
  channel?: BdOutreachChannel | null;
  occurredAt: string;
  source: BdConversionSource;
  notes?: string;
  externalWrites: [];
}

export interface BdSignalConversionStat {
  signalType: BdSignalType;
  signalTitle: string;
  sourced: number;
  approved: number;
  outreachSent: number;
  replies: number;
  positiveReplies: number;
  meetings: number;
  wins: number;
  approvalRate: number;
  replyRate: number;
  positiveReplyRate: number;
  meetingRate: number;
  winRate: number;
}

export interface BdPersonaConversionStat {
  persona: BdBuyerPersona;
  personaLabel: string;
  sourced: number;
  approved: number;
  outreachSent: number;
  replies: number;
  positiveReplies: number;
  meetings: number;
  wins: number;
  approvalRate: number;
  replyRate: number;
  positiveReplyRate: number;
  meetingRate: number;
  winRate: number;
}

export interface BdOutreachConversionStat {
  channel: BdOutreachChannel;
  sent: number;
  replies: number;
  positiveReplies: number;
  meetings: number;
  wins: number;
  replyRate: number;
  meetingRate: number;
  winRate: number;
}

export interface BdConversionSummary {
  totals: {
    targets: number;
    approved: number;
    outreachSent: number;
    replies: number;
    meetings: number;
    wins: number;
    signalMeetingRate: number;
    outreachReplyRate: number;
    outreachMeetingRate: number;
  };
  signalStats: BdSignalConversionStat[];
  personaStats: BdPersonaConversionStat[];
  outreachStats: BdOutreachConversionStat[];
  bestSignal: BdSignalConversionStat | null;
}

interface MutableConversionBuckets {
  sourcedTargetIds: Set<string>;
  approvedTargetIds: Set<string>;
  outreachTargetIds: Set<string>;
  replyTargetIds: Set<string>;
  positiveReplyTargetIds: Set<string>;
  meetingTargetIds: Set<string>;
  wonTargetIds: Set<string>;
}

type MutableSignalStat = Pick<BdSignalConversionStat, "signalType" | "signalTitle"> & MutableConversionBuckets;

type MutablePersonaStat = Pick<BdPersonaConversionStat, "persona"> & MutableConversionBuckets;

type MutableOutreachStat = Omit<
  BdOutreachConversionStat,
  "sent" | "replies" | "positiveReplies" | "meetings" | "wins" | "replyRate" | "meetingRate" | "winRate"
> & {
  sentTargetIds: Set<string>;
  replyTargetIds: Set<string>;
  positiveReplyTargetIds: Set<string>;
  meetingTargetIds: Set<string>;
  wonTargetIds: Set<string>;
};

const outreachSentEvents = new Set<BdConversionEventType>(["manual_email_sent", "linkedin_note_sent"]);
const replyEvents = new Set<BdConversionEventType>(["reply_received", "positive_reply"]);
const positiveReplyEvents = new Set<BdConversionEventType>(["positive_reply"]);
const meetingEvents = new Set<BdConversionEventType>(["meeting_booked", "opportunity_created", "won"]);
const wonEvents = new Set<BdConversionEventType>(["won"]);

export function conversionAreaForEvent(eventType: BdConversionEventType): BdConversionArea {
  if (eventType === "target_approved") return "signal";
  if (eventType === "manual_email_sent" || eventType === "linkedin_note_sent") return "outreach";
  return "both";
}

export function defaultChannelForEvent(eventType: BdConversionEventType): BdOutreachChannel | null {
  if (eventType === "linkedin_note_sent") return "linkedin_manual";
  if (
    eventType === "manual_email_sent" ||
    eventType === "reply_received" ||
    eventType === "positive_reply" ||
    eventType === "meeting_booked" ||
    eventType === "opportunity_created" ||
    eventType === "won" ||
    eventType === "lost"
  ) {
    return "manual_email";
  }
  return null;
}

export function conversionEventLabel(eventType: BdConversionEventType): string {
  const labels: Record<BdConversionEventType, string> = {
    target_approved: "Approved for outreach",
    manual_email_sent: "Email sent manually",
    linkedin_note_sent: "LinkedIn note sent manually",
    reply_received: "Reply received",
    positive_reply: "Positive reply",
    meeting_booked: "Meeting booked",
    opportunity_created: "Opportunity created",
    won: "Won",
    lost: "Lost",
    disqualified: "Disqualified",
  };
  return labels[eventType];
}

export function buildManualConversionEvent(
  target: BdTargetView,
  eventType: BdConversionEventType,
  options: {
    occurredAt?: string;
    channel?: BdOutreachChannel | null;
    notes?: string;
  } = {},
): BdConversionEvent {
  const occurredAt = options.occurredAt ?? new Date().toISOString();
  return {
    id: `${target.id}:${eventType}:${occurredAt}`,
    targetId: target.id,
    targetDbId: target.id.match(/^[0-9a-f-]{36}$/i) ? target.id : null,
    signalId: target.signal.id ?? null,
    companyName: target.company.name,
    contactName: target.contact.fullName,
    signalType: target.signal.signalType,
    signalTitle: target.signal.title,
    eventType,
    conversionArea: conversionAreaForEvent(eventType),
    channel: options.channel ?? defaultChannelForEvent(eventType),
    occurredAt,
    source: "manual",
    notes: options.notes ?? "",
    externalWrites: [],
  };
}

export function summarizeConversionEvents(
  targets: Pick<BdTargetView, "id" | "signal" | "contact">[],
  events: BdConversionEvent[],
): BdConversionSummary {
  const signalGroups = new Map<string, MutableSignalStat>();
  const personaGroups = new Map<BdBuyerPersona, MutablePersonaStat>();
  const personaByTargetId = new Map<string, BdBuyerPersona>(
    targets.map((target) => [target.id, inferBuyerPersona(target.contact.title)]),
  );
  const outreachGroups = new Map<BdOutreachChannel, MutableOutreachStat>();
  const approvedTargetIds = new Set<string>();
  const sentTargetIds = new Set<string>();
  const replyTargetIds = new Set<string>();
  const meetingTargetIds = new Set<string>();
  const wonTargetIds = new Set<string>();

  const ensureSignal = (signalType: BdSignalType, signalTitle: string) => {
    const key = `${signalType}:${signalTitle}`;
    const existing = signalGroups.get(key);
    if (existing) return existing;

    const created: MutableSignalStat = {
      signalType,
      signalTitle,
      sourcedTargetIds: new Set(),
      approvedTargetIds: new Set(),
      outreachTargetIds: new Set(),
      replyTargetIds: new Set(),
      positiveReplyTargetIds: new Set(),
      meetingTargetIds: new Set(),
      wonTargetIds: new Set(),
    };
    signalGroups.set(key, created);
    return created;
  };

  const ensurePersona = (persona: BdBuyerPersona) => {
    const existing = personaGroups.get(persona);
    if (existing) return existing;

    const created: MutablePersonaStat = {
      persona,
      sourcedTargetIds: new Set(),
      approvedTargetIds: new Set(),
      outreachTargetIds: new Set(),
      replyTargetIds: new Set(),
      positiveReplyTargetIds: new Set(),
      meetingTargetIds: new Set(),
      wonTargetIds: new Set(),
    };
    personaGroups.set(persona, created);
    return created;
  };

  const ensureOutreach = (channel: BdOutreachChannel) => {
    const existing = outreachGroups.get(channel);
    if (existing) return existing;

    const created: MutableOutreachStat = {
      channel,
      sentTargetIds: new Set(),
      replyTargetIds: new Set(),
      positiveReplyTargetIds: new Set(),
      meetingTargetIds: new Set(),
      wonTargetIds: new Set(),
    };
    outreachGroups.set(channel, created);
    return created;
  };

  targets.forEach((target) => {
    const group = ensureSignal(target.signal.signalType, target.signal.title);
    group.sourcedTargetIds.add(target.id);
    ensurePersona(personaByTargetId.get(target.id) ?? "other").sourcedTargetIds.add(target.id);
  });

  events.forEach((event) => {
    const signal = ensureSignal(event.signalType, event.signalTitle);
    signal.sourcedTargetIds.add(event.targetId);
    const persona = ensurePersona(personaByTargetId.get(event.targetId) ?? "other");
    persona.sourcedTargetIds.add(event.targetId);

    if (event.eventType === "target_approved") {
      signal.approvedTargetIds.add(event.targetId);
      persona.approvedTargetIds.add(event.targetId);
      approvedTargetIds.add(event.targetId);
    }
    if (outreachSentEvents.has(event.eventType)) {
      signal.outreachTargetIds.add(event.targetId);
      persona.outreachTargetIds.add(event.targetId);
      sentTargetIds.add(event.targetId);
    }
    if (replyEvents.has(event.eventType)) {
      signal.replyTargetIds.add(event.targetId);
      persona.replyTargetIds.add(event.targetId);
      replyTargetIds.add(event.targetId);
    }
    if (positiveReplyEvents.has(event.eventType)) {
      signal.positiveReplyTargetIds.add(event.targetId);
      persona.positiveReplyTargetIds.add(event.targetId);
    }
    if (meetingEvents.has(event.eventType)) {
      signal.meetingTargetIds.add(event.targetId);
      persona.meetingTargetIds.add(event.targetId);
      meetingTargetIds.add(event.targetId);
    }
    if (wonEvents.has(event.eventType)) {
      signal.wonTargetIds.add(event.targetId);
      persona.wonTargetIds.add(event.targetId);
      wonTargetIds.add(event.targetId);
    }

    if (!event.channel) return;
    const outreach = ensureOutreach(event.channel);
    if (outreachSentEvents.has(event.eventType)) outreach.sentTargetIds.add(event.targetId);
    if (replyEvents.has(event.eventType)) outreach.replyTargetIds.add(event.targetId);
    if (positiveReplyEvents.has(event.eventType)) outreach.positiveReplyTargetIds.add(event.targetId);
    if (meetingEvents.has(event.eventType)) outreach.meetingTargetIds.add(event.targetId);
    if (wonEvents.has(event.eventType)) outreach.wonTargetIds.add(event.targetId);
  });

  const signalStats = [...signalGroups.values()]
    .map((stat): BdSignalConversionStat => {
      const sourced = stat.sourcedTargetIds.size;
      const outreachSent = stat.outreachTargetIds.size;
      return {
        signalType: stat.signalType,
        signalTitle: stat.signalTitle,
        sourced,
        approved: stat.approvedTargetIds.size,
        outreachSent,
        replies: stat.replyTargetIds.size,
        positiveReplies: stat.positiveReplyTargetIds.size,
        meetings: stat.meetingTargetIds.size,
        wins: stat.wonTargetIds.size,
        approvalRate: rate(stat.approvedTargetIds.size, sourced),
        replyRate: rate(stat.replyTargetIds.size, outreachSent),
        positiveReplyRate: rate(stat.positiveReplyTargetIds.size, outreachSent),
        meetingRate: rate(stat.meetingTargetIds.size, sourced),
        winRate: rate(stat.wonTargetIds.size, sourced),
      };
    })
    .sort((a, b) => b.meetingRate - a.meetingRate || b.meetings - a.meetings || b.approved - a.approved);

  const personaStats = [...personaGroups.values()]
    .map((stat): BdPersonaConversionStat => {
      const sourced = stat.sourcedTargetIds.size;
      const outreachSent = stat.outreachTargetIds.size;
      return {
        persona: stat.persona,
        personaLabel: buyerPersonaLabel(stat.persona),
        sourced,
        approved: stat.approvedTargetIds.size,
        outreachSent,
        replies: stat.replyTargetIds.size,
        positiveReplies: stat.positiveReplyTargetIds.size,
        meetings: stat.meetingTargetIds.size,
        wins: stat.wonTargetIds.size,
        approvalRate: rate(stat.approvedTargetIds.size, sourced),
        replyRate: rate(stat.replyTargetIds.size, outreachSent),
        positiveReplyRate: rate(stat.positiveReplyTargetIds.size, outreachSent),
        meetingRate: rate(stat.meetingTargetIds.size, sourced),
        winRate: rate(stat.wonTargetIds.size, sourced),
      };
    })
    .sort((a, b) => b.meetingRate - a.meetingRate || b.replyRate - a.replyRate || b.sourced - a.sourced);

  const outreachStats = [...outreachGroups.values()]
    .map((stat): BdOutreachConversionStat => {
      const sent = stat.sentTargetIds.size;
      return {
        channel: stat.channel,
        sent,
        replies: stat.replyTargetIds.size,
        positiveReplies: stat.positiveReplyTargetIds.size,
        meetings: stat.meetingTargetIds.size,
        wins: stat.wonTargetIds.size,
        replyRate: rate(stat.replyTargetIds.size, sent),
        meetingRate: rate(stat.meetingTargetIds.size, sent),
        winRate: rate(stat.wonTargetIds.size, sent),
      };
    })
    .sort((a, b) => b.meetingRate - a.meetingRate || b.replyRate - a.replyRate || b.sent - a.sent);

  return {
    totals: {
      targets: targets.length,
      approved: approvedTargetIds.size,
      outreachSent: sentTargetIds.size,
      replies: replyTargetIds.size,
      meetings: meetingTargetIds.size,
      wins: wonTargetIds.size,
      signalMeetingRate: rate(meetingTargetIds.size, targets.length),
      outreachReplyRate: rate(replyTargetIds.size, sentTargetIds.size),
      outreachMeetingRate: rate(meetingTargetIds.size, sentTargetIds.size),
    },
    signalStats,
    personaStats,
    outreachStats,
    bestSignal: signalStats[0] ?? null,
  };
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}
