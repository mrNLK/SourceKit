import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EnrichmentGateResult } from "@/lib/bd-sourcing/enrichment-gate";

type EnrichmentGateCardProps = {
  gate: EnrichmentGateResult;
  score: number;
  enriching: boolean;
  resultMessage: string | null;
  onEnrich: () => void;
};

function gateStatusClass(status: EnrichmentGateResult["status"]): string {
  if (status === "Ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Enriched") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-red-200 bg-red-50 text-red-600";
}

export default function EnrichmentGateCard({ gate, score, enriching, resultMessage, onEnrich }: EnrichmentGateCardProps) {
  return (
    <section className="sk-panel rounded-md p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-semibold">Apollo Enrichment Gate</h3>
            <p className="text-xs text-slate-500">Qualified-only, manual-click, work email only.</p>
          </div>
        </div>
        <Badge variant="outline" className={gateStatusClass(gate.status)}>
          {gate.status}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
          <span className="block text-base font-semibold text-slate-900">{score}</span>
          <span className="text-slate-500">current score</span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
          <span className="block text-base font-semibold text-slate-900">{gate.threshold}</span>
          <span className="text-slate-500">threshold</span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
          <span className="block text-base font-semibold text-slate-900">
            {gate.batchUsed}/{gate.batchCap}
          </span>
          <span className="text-slate-500">batch cap</span>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
        {gate.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
        <li>No phone or personal email enrichment. Apollo runs only on this manual click.</li>
      </ul>

      <Button
        type="button"
        variant="outline"
        className="sk-packet-action mt-3 w-full"
        disabled={!gate.canEnrich || enriching}
        onClick={onEnrich}
      >
        <ShieldCheck className="h-4 w-4" />
        {enriching ? "Enriching..." : gate.status === "Enriched" ? "Work email enriched" : "Enrich work email"}
      </Button>

      {resultMessage && (
        <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          {resultMessage}
        </p>
      )}
    </section>
  );
}
