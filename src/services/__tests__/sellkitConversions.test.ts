import { describe, expect, it } from "vitest";
import { buildConversionEventInsert, mapConversionEventRow } from "@/services/sellkitConversions";
import type { BdConversionEvent } from "@/lib/bd-sourcing/conversions";

const event: BdConversionEvent = {
  id: "local-event",
  targetId: "sarah-chen",
  targetDbId: null,
  signalId: null,
  companyName: "Datadog",
  contactName: "Sarah Chen",
  signalType: "funding",
  signalTitle: "Datadog expands AI observability investment",
  eventType: "manual_email_sent",
  conversionArea: "outreach",
  channel: "manual_email",
  occurredAt: "2026-06-10T12:00:00Z",
  source: "manual",
  notes: "Sent manually from Outlook.",
  externalWrites: [],
};

describe("SellKit conversion persistence mapping", () => {
  it("builds an insert payload for append-only conversion tracking", () => {
    const insert = buildConversionEventInsert("user-1", event);

    expect(insert).toMatchObject({
      user_id: "user-1",
      target_id: null,
      target_external_id: "sarah-chen",
      company_name: "Datadog",
      event_type: "manual_email_sent",
      conversion_area: "outreach",
      channel: "manual_email",
      source: "manual",
    });
    expect(insert).not.toHaveProperty("externalWrites");
    expect(insert.metadata).toEqual({ localEventId: "local-event" });
  });

  it("maps database rows back to conversion events without external writes", () => {
    const mapped = mapConversionEventRow({
      id: "db-event",
      user_id: "user-1",
      target_id: null,
      target_external_id: "sarah-chen",
      signal_id: null,
      signal_external_id: null,
      outreach_touch_id: null,
      company_name: "Datadog",
      contact_name: "Sarah Chen",
      signal_type: "funding",
      signal_title: "Datadog expands AI observability investment",
      event_type: "manual_email_sent",
      conversion_area: "outreach",
      channel: "manual_email",
      occurred_at: "2026-06-10T12:00:00Z",
      source: "manual",
      notes: "Sent manually from Outlook.",
      metadata: {},
      created_at: "2026-06-10T12:00:01Z",
    });

    expect(mapped).toMatchObject({
      id: "db-event",
      targetId: "sarah-chen",
      eventType: "manual_email_sent",
      externalWrites: [],
    });
  });
});
