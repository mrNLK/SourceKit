import { describe, expect, it } from "vitest";
import {
  applyRadarAction,
  buildDemoRadarItems,
  canTransitionRadarStatus,
  radarConfidenceTier,
  radarStatusForAction,
  type BdSignalRadarItem,
} from "@/lib/bd-sourcing/signal-radar";

function radarItem(status: BdSignalRadarItem["status"]): BdSignalRadarItem {
  return {
    id: "radar-1",
    companyName: "Acme",
    companyDomain: "acme.example",
    signalType: "exec_change",
    signalTitle: "New Head of AI",
    signalSummary: "New AI leader hired.",
    sourceUrl: "https://acme.example/news",
    provider: "exa",
    detectedAt: "2026-06-09T00:00:00Z",
    confidence: 85,
    suggestedPersona: "vp_data",
    status,
    metadata: {},
  };
}

describe("Signal Radar status transitions", () => {
  it("allows new items to be reviewed, queued, or ignored", () => {
    expect(canTransitionRadarStatus("new", "reviewed")).toBe(true);
    expect(canTransitionRadarStatus("new", "queued")).toBe(true);
    expect(canTransitionRadarStatus("new", "ignored")).toBe(true);
  });

  it("allows reviewed items to be queued or ignored but not back to new", () => {
    expect(canTransitionRadarStatus("reviewed", "queued")).toBe(true);
    expect(canTransitionRadarStatus("reviewed", "ignored")).toBe(true);
    expect(canTransitionRadarStatus("reviewed", "new")).toBe(false);
  });

  it("only lets queued items be ignored and ignored items be reconsidered", () => {
    expect(canTransitionRadarStatus("queued", "ignored")).toBe(true);
    expect(canTransitionRadarStatus("queued", "reviewed")).toBe(false);
    expect(canTransitionRadarStatus("ignored", "reviewed")).toBe(true);
    expect(canTransitionRadarStatus("ignored", "queued")).toBe(false);
  });

  it("applies operator actions as status transitions", () => {
    const reviewed = applyRadarAction(radarItem("new"), "review");
    expect(reviewed).toMatchObject({ ok: true, item: { status: "reviewed" } });

    const queued = applyRadarAction(radarItem("reviewed"), "add_to_queue");
    expect(queued).toMatchObject({ ok: true, item: { status: "queued" } });

    const ignored = applyRadarAction(radarItem("new"), "ignore");
    expect(ignored).toMatchObject({ ok: true, item: { status: "ignored" } });
  });

  it("rejects invalid transitions with a reason instead of mutating", () => {
    const item = radarItem("queued");
    const result = applyRadarAction(item, "add_to_queue");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("queued");
    expect(item.status).toBe("queued");
  });

  it("maps actions to target statuses", () => {
    expect(radarStatusForAction("review")).toBe("reviewed");
    expect(radarStatusForAction("add_to_queue")).toBe("queued");
    expect(radarStatusForAction("ignore")).toBe("ignored");
  });

  it("tiers confidence deterministically", () => {
    expect(radarConfidenceTier(85)).toBe("High");
    expect(radarConfidenceTier(80)).toBe("High");
    expect(radarConfidenceTier(65)).toBe("Medium");
    expect(radarConfidenceTier(40)).toBe("Low");
  });

  it("ships demo radar items that cover the launch examples", () => {
    const items = buildDemoRadarItems();
    expect(items.length).toBeGreaterThanOrEqual(4);
    const titles = items.map((item) => item.signalTitle);
    expect(titles).toContain("New Head of AI at enterprise software company");
    expect(titles).toContain("20+ platform roles opened this week");
    expect(titles).toContain("Cloud cost pressure mentioned in earnings call");
    expect(titles).toContain("Platform hiring + AI observability language");
    items.forEach((item) => {
      expect(item.confidence).toBeGreaterThanOrEqual(0);
      expect(item.confidence).toBeLessThanOrEqual(100);
      expect(item.companyDomain).toBeTruthy();
    });
  });
});
