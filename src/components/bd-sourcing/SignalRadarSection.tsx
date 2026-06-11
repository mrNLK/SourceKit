import { ExternalLink, Eye, ListPlus, Radar, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buyerPersonaLabel } from "@/lib/bd-sourcing/personas";
import {
  canTransitionRadarStatus,
  radarConfidenceTier,
  radarStatusForAction,
  radarStatusLabel,
  type BdRadarAction,
  type BdSignalRadarItem,
} from "@/lib/bd-sourcing/signal-radar";
import type { BdSignalType } from "@/types/bd-sourcing";

const signalTypeLabels: Record<BdSignalType, string> = {
  exec_change: "Exec change",
  senior_hiring_spike: "Hiring spike",
  funding: "Funding",
  open_web: "Open web",
  manual: "Manual",
};

const providerLabels: Record<string, string> = {
  exa: "Exa",
  parallel: "Parallel",
  findem: "Findem",
  manual: "Manual",
};

function radarStatusClass(status: BdSignalRadarItem["status"]): string {
  if (status === "new") return "border-[#5EEAD4] bg-[#ECFDF5] text-[#0F766E]";
  if (status === "queued") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "ignored") return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-[#FED7AA] bg-[#FFF7ED] text-[#B45309]";
}

function confidenceClass(tier: "High" | "Medium" | "Low"): string {
  if (tier === "High") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tier === "Medium") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

type SignalRadarSectionProps = {
  items: BdSignalRadarItem[];
  onAction: (item: BdSignalRadarItem, action: BdRadarAction) => void;
};

export default function SignalRadarSection({ items, onAction }: SignalRadarSectionProps) {
  const newCount = items.filter((item) => item.status === "new").length;
  const visibleItems = [...items].sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));

  const actionEnabled = (item: BdSignalRadarItem, action: BdRadarAction) =>
    canTransitionRadarStatus(item.status, radarStatusForAction(action));

  return (
    <section className="sk-panel mb-3 rounded-md px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-600">
            <Radar className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Signal Radar</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Fresh account signals to review before the queue</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review each signal manually. Nothing here sends email, touches LinkedIn, or starts paid enrichment.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-[#5EEAD4] bg-[#ECFDF5] text-[#0F766E]">
          {newCount} new signal{newCount === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {visibleItems.map((item) => {
          const tier = radarConfidenceTier(item.confidence);
          return (
            <article key={item.id} className="sk-mini-card rounded-md p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{item.companyName}</p>
                  <p className="text-xs text-slate-500">{item.companyDomain}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={confidenceClass(tier)}>
                    {tier} · {item.confidence}
                  </Badge>
                  <Badge variant="outline" className={radarStatusClass(item.status)}>
                    {radarStatusLabel(item.status)}
                  </Badge>
                </div>
              </div>

              <h3 className="mt-3 text-sm font-semibold leading-5 text-slate-900">{item.signalTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{item.signalSummary}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="rounded border border-slate-200 px-1.5 py-0.5 font-medium text-slate-600">
                  {signalTypeLabels[item.signalType]}
                </span>
                <span>{providerLabels[item.provider] ?? item.provider}</span>
                <span>Detected {new Date(item.detectedAt).toLocaleDateString()}</span>
                <span>Suggested buyer: {buyerPersonaLabel(item.suggestedPersona)}</span>
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-600"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sk-packet-action"
                  disabled={!actionEnabled(item, "review")}
                  onClick={() => onAction(item, "review")}
                >
                  <Eye className="h-4 w-4" />
                  Review
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sk-packet-action"
                  disabled={!actionEnabled(item, "add_to_queue")}
                  onClick={() => onAction(item, "add_to_queue")}
                >
                  <ListPlus className="h-4 w-4" />
                  Add to queue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sk-packet-action"
                  disabled={!actionEnabled(item, "ignore")}
                  onClick={() => onAction(item, "ignore")}
                >
                  <X className="h-4 w-4" />
                  Ignore
                </Button>
              </div>
            </article>
          );
        })}
        {visibleItems.length === 0 && (
          <p className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500 lg:col-span-2">
            No radar signals yet. Run an ICP preview below and add promising matches here.
          </p>
        )}
      </div>
    </section>
  );
}
