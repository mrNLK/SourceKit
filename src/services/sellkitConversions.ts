import type { Database } from "@/integrations/supabase/types";
import type { BdConversionEvent } from "@/lib/bd-sourcing/conversions";

type ConversionEventRow = Database["public"]["Tables"]["bd_conversion_events"]["Row"];
type ConversionEventInsert = Database["public"]["Tables"]["bd_conversion_events"]["Insert"];

export function buildConversionEventInsert(userId: string, event: BdConversionEvent): ConversionEventInsert {
  return {
    user_id: userId,
    target_id: event.targetDbId ?? null,
    target_external_id: event.targetDbId ? event.targetId : event.targetId,
    signal_id: event.signalId ?? null,
    signal_external_id: event.signalId ? null : `${event.targetId}:${event.signalType}:${event.signalTitle}`,
    outreach_touch_id: event.outreachTouchId ?? null,
    company_name: event.companyName,
    contact_name: event.contactName,
    signal_type: event.signalType,
    signal_title: event.signalTitle,
    event_type: event.eventType,
    conversion_area: event.conversionArea,
    channel: event.channel ?? null,
    occurred_at: event.occurredAt,
    source: event.source,
    notes: event.notes ?? "",
    metadata: { localEventId: event.id },
  };
}

export function mapConversionEventRow(row: ConversionEventRow): BdConversionEvent {
  return {
    id: row.id,
    targetId: row.target_external_id ?? row.target_id ?? row.id,
    targetDbId: row.target_id,
    signalId: row.signal_id,
    outreachTouchId: row.outreach_touch_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    signalType: row.signal_type,
    signalTitle: row.signal_title,
    eventType: row.event_type,
    conversionArea: row.conversion_area,
    channel: row.channel,
    occurredAt: row.occurred_at,
    source: row.source,
    notes: row.notes,
    externalWrites: [],
  };
}

export async function loadSellKitConversionEvents(userId: string): Promise<BdConversionEvent[]> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("bd_conversion_events")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapConversionEventRow);
}

export async function saveSellKitConversionEvent(
  userId: string,
  event: BdConversionEvent,
): Promise<BdConversionEvent> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("bd_conversion_events")
    .insert(buildConversionEventInsert(userId, event))
    .select("*")
    .single();

  if (error) throw error;
  return mapConversionEventRow(data);
}
