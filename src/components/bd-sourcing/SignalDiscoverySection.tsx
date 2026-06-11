import { Lightbulb, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BdSignalDiscoveryRecommendation } from "@/lib/bd-sourcing/signal-discovery";

type SignalDiscoverySectionProps = {
  recommendations: BdSignalDiscoveryRecommendation[];
  addedCriteriaIds: Set<string>;
  onAddCriteria: (recommendation: BdSignalDiscoveryRecommendation) => void;
};

export default function SignalDiscoverySection({
  recommendations,
  addedCriteriaIds,
  onAddCriteria,
}: SignalDiscoverySectionProps) {
  return (
    <section className="sk-panel mb-3 rounded-md px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-600">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Signal Discovery Agent</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Suggested signals to test next</h2>
            <p className="mt-1 text-sm text-slate-600">
              A weekly recommendation queue built from converted vs ignored leads. It suggests criteria to test - it never
              runs outreach or enrichment on its own.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
          Weekly recommendations · manual review
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {recommendations.map((recommendation) => {
          const added = addedCriteriaIds.has(recommendation.id);
          return (
            <article key={recommendation.id} className="sk-mini-card rounded-md p-4">
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                {recommendation.liftEstimate}
              </Badge>
              <p className="mt-3 text-sm font-semibold leading-5 text-slate-900">{recommendation.recommendation}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{recommendation.evidence}</p>
              {recommendation.sampleAccounts.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Sample accounts: {recommendation.sampleAccounts.join(", ")}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="sk-packet-action mt-3"
                disabled={added}
                onClick={() => onAddCriteria(recommendation)}
              >
                <Plus className="h-4 w-4" />
                {added ? "Added to radar criteria" : "Add to radar criteria"}
              </Button>
            </article>
          );
        })}
        {recommendations.length === 0 && (
          <p className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500 lg:col-span-3">
            Not enough conversion history yet. Track approvals, sends, and replies to unlock weekly signal recommendations.
          </p>
        )}
      </div>
    </section>
  );
}
