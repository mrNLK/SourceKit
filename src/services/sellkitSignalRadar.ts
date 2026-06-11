import type { Database } from "@/integrations/supabase/types";
import type { BdRadarItemStatus, BdSignalRadarItem } from "@/lib/bd-sourcing/signal-radar";

type RadarItemRow = Database["public"]["Tables"]["bd_signal_radar_items"]["Row"];
type RadarItemInsert = Database["public"]["Tables"]["bd_signal_radar_items"]["Insert"];

export function buildRadarItemInsert(userId: string, item: BdSignalRadarItem): RadarItemInsert {
  return {
    user_id: userId,
    company_name: item.companyName,
    company_domain: item.companyDomain,
    signal_type: item.signalType,
    signal_title: item.signalTitle,
    signal_summary: item.signalSummary,
    source_url: item.sourceUrl,
    provider: item.provider ?? "manual",
    detected_at: item.detectedAt,
    confidence: Math.min(100, Math.max(0, Math.round(item.confidence))),
    suggested_persona: item.suggestedPersona,
    status: item.status,
    metadata: { ...item.metadata, localItemId: item.id },
  };
}

export function mapRadarItemRow(row: RadarItemRow): BdSignalRadarItem {
  return {
    id: row.id,
    companyName: row.company_name,
    companyDomain: row.company_domain,
    signalType: row.signal_type,
    signalTitle: row.signal_title,
    signalSummary: row.signal_summary,
    sourceUrl: row.source_url,
    provider: row.provider,
    detectedAt: row.detected_at,
    confidence: row.confidence,
    suggestedPersona: row.suggested_persona,
    status: row.status,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export async function loadSellKitRadarItems(userId: string): Promise<BdSignalRadarItem[]> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("bd_signal_radar_items")
    .select("*")
    .eq("user_id", userId)
    .order("detected_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRadarItemRow);
}

export async function saveSellKitRadarItem(
  userId: string,
  item: BdSignalRadarItem,
): Promise<BdSignalRadarItem> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("bd_signal_radar_items")
    .insert(buildRadarItemInsert(userId, item))
    .select("*")
    .single();

  if (error) throw error;
  return mapRadarItemRow(data);
}

export async function updateSellKitRadarItemStatus(
  userId: string,
  itemId: string,
  status: BdRadarItemStatus,
): Promise<void> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase
    .from("bd_signal_radar_items")
    .update({ status })
    .eq("user_id", userId)
    .eq("id", itemId);

  if (error) throw error;
}
