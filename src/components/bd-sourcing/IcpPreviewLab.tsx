import { useState } from "react";
import { FlaskConical, Radar, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildIcpPreviewRequest,
  buildStubIcpPreviewMatches,
  normalizeIcpPreviewMatches,
  type IcpPreviewMatch,
  type IcpPreviewMode,
} from "@/lib/bd-sourcing/icp-preview";
import { invokeBdSourcingAction } from "@/services/bdSourcing";

type IcpPreviewLabProps = {
  onAddToRadar: (match: IcpPreviewMatch, icpText: string) => void;
};

const modeOptions: Array<{ value: IcpPreviewMode; label: string; detail: string }> = [
  { value: "fast_lookup", label: "Fast lookup", detail: "Parallel Entity Search" },
  { value: "preview_run", label: "Preview run", detail: "Parallel FindAll Preview" },
];

export default function IcpPreviewLab({ onAddToRadar }: IcpPreviewLabProps) {
  const [icpText, setIcpText] = useState("");
  const [mode, setMode] = useState<IcpPreviewMode>("fast_lookup");
  const [running, setRunning] = useState(false);
  const [matches, setMatches] = useState<IcpPreviewMatch[]>([]);
  const [resultNote, setResultNote] = useState<string | null>(null);
  const [addedMatchIds, setAddedMatchIds] = useState<Set<string>>(new Set());
  const [hasRun, setHasRun] = useState(false);

  const runPreview = async () => {
    const trimmed = icpText.trim();
    if (!trimmed || running) return;

    setRunning(true);
    setHasRun(true);
    setAddedMatchIds(new Set());

    const request = buildIcpPreviewRequest({ icpText: trimmed, mode });
    try {
      const response = await invokeBdSourcingAction(request.action, request.payload);
      const normalized = normalizeIcpPreviewMatches(response.data);
      if (normalized.length > 0) {
        setMatches(normalized);
        setResultNote(response.message);
      } else {
        setMatches(buildStubIcpPreviewMatches(trimmed, mode));
        setResultNote(
          response.status === "completed"
            ? "Provider accepted the run but returned no inline matches yet. Showing a stubbed preview so you can sanity-check the criteria."
            : "Provider action is stubbed or unavailable. Showing a deterministic sample preview instead.",
        );
      }
    } catch {
      setMatches(buildStubIcpPreviewMatches(trimmed, mode));
      setResultNote("Provider is unavailable right now. Showing a stubbed preview - no provider spend happened.");
    } finally {
      setRunning(false);
    }
  };

  const addToRadar = (match: IcpPreviewMatch) => {
    onAddToRadar(match, icpText.trim());
    setAddedMatchIds((current) => new Set(current).add(match.id));
  };

  return (
    <section className="sk-panel mb-3 rounded-md px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-600">
            <FlaskConical className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ICP Preview Lab</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Test an ICP cheaply before a larger run</h2>
            <p className="mt-1 text-sm text-slate-600">
              Previews return up to 10 sample matches so Mariah can tune criteria. A full FindAll run never starts from here.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
          Preview only · no list-building spend
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <Label htmlFor="sellkit-icp-preview" className="text-sm font-semibold text-slate-900">
            Describe the ICP
          </Label>
          <Textarea
            id="sellkit-icp-preview"
            value={icpText}
            onChange={(event) => setIcpText(event.target.value)}
            placeholder="Example: 1,000+ employee B2B software companies in the US with active platform engineering hiring and AI observability language."
            rows={4}
            className="mt-2 resize-y bg-white"
          />
        </div>
        <div className="sk-inset-panel rounded-md p-4">
          <p className="text-sm font-semibold text-slate-900">Mode</p>
          <div className="mt-2 space-y-2">
            {modeOptions.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                  mode === option.value ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="sellkit-icp-mode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium text-slate-900">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.detail}</span>
                </span>
              </label>
            ))}
          </div>
          <Button
            type="button"
            className="sk-primary-action mt-3 w-full"
            onClick={runPreview}
            disabled={!icpText.trim() || running}
          >
            <Search className="h-4 w-4" />
            {running ? "Previewing..." : "Run 10-match preview"}
          </Button>
        </div>
      </div>

      {hasRun && (
        <div className="mt-4">
          {resultNote && (
            <p className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              {resultNote}
            </p>
          )}
          <div className="grid gap-2 md:grid-cols-2">
            {matches.map((match) => (
              <article key={match.id} className="rounded-md border border-slate-200 bg-white px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{match.name}</p>
                    {match.detail && <p className="truncate text-xs text-slate-500">{match.detail}</p>}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      match.provider === "parallel"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }
                  >
                    {match.provider === "parallel" ? "Parallel" : "Stub"} · {match.confidence}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{match.matchReason}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sk-packet-action mt-3"
                  disabled={addedMatchIds.has(match.id)}
                  onClick={() => addToRadar(match)}
                >
                  <Radar className="h-4 w-4" />
                  {addedMatchIds.has(match.id) ? "Added to Signal Radar" : "Add to Signal Radar"}
                </Button>
              </article>
            ))}
            {!running && matches.length === 0 && (
              <p className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500 md:col-span-2">
                No matches returned for this ICP. Loosen one criterion and preview again.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
