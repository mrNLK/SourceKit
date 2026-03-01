import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, FileText } from "lucide-react";
import {
  computeEEA,
  developerToCandidate,
  STRENGTH_LABELS,
  STRENGTH_COLORS,
  type EEAProfile,
  type EEADimension,
  type EEAStrength,
} from "@/lib/eea";

// ---------------------------------------------------------------------------
// Shared hook
// ---------------------------------------------------------------------------

export function useEEA(developer: any): EEAProfile {
  return useMemo(() => computeEEA(developerToCandidate(developer)), [developer]);
}

// ---------------------------------------------------------------------------
// Mini — compact indicator for DeveloperCard
// Shows the overall tier badge and top 2 signal dots
// ---------------------------------------------------------------------------

export function EEAMini({ developer }: { developer: any }) {
  const eea = useEEA(developer);

  if (eea.overallScore === 0) return null;

  // Show top 3 dimensions that scored >= 2 as colored dots
  const topDims = eea.dimensions
    .filter(d => d.strength >= 2)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3);

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`text-[10px] font-display font-semibold px-1.5 py-0.5 rounded border ${eea.tier.bgColor} ${eea.tier.color} ${eea.tier.borderColor}`}
        title="Evidence of Exceptional Ability — measures publications, patents, open-source impact, and top-company experience. 70+ Strong, 40-69 Moderate, <40 Limited."
      >
        EEA {eea.overallScore}
      </span>
      {topDims.map(dim => (
        <span
          key={dim.id}
          className={`w-2 h-2 rounded-full ${STRENGTH_COLORS[dim.strength].bar}`}
          title={`${dim.shortLabel}: ${STRENGTH_LABELS[dim.strength]}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar — single dimension bar for the full display
// ---------------------------------------------------------------------------

function DimensionBar({ dim, expanded, onToggle }: { dim: EEADimension; expanded: boolean; onToggle: () => void }) {
  const colors = STRENGTH_COLORS[dim.strength];
  const widthPercent = (dim.strength / 4) * 100;

  return (
    <div className="space-y-1">
      <button onClick={onToggle} className="w-full flex items-center gap-2 group">
        <span className="text-base leading-none">{dim.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-display font-medium text-foreground truncate">{dim.shortLabel}</span>
            <span className={`text-[10px] font-display font-semibold ${colors.text}`}>
              {STRENGTH_LABELS[dim.strength]}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
              style={{ width: `${widthPercent}%` }}
            />
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="ml-7 space-y-1.5 pb-2">
          {dim.criterion === 'uscis' && (
            <p className="text-[10px] text-muted-foreground/70 font-display italic">{dim.uscisMapping}</p>
          )}
          <p className="text-[11px] text-muted-foreground">{dim.description}</p>
          {dim.evidence.length > 0 && (
            <ul className="space-y-0.5">
              {dim.evidence.map((e, i) => (
                <li key={i} className="text-[11px] text-secondary-foreground flex items-start gap-1.5">
                  <span className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${colors.bar}`} />
                  {e}
                </li>
              ))}
            </ul>
          )}
          {dim.needsDocumentation.length > 0 && (
            <div className="mt-1.5 p-2 rounded-md bg-amber-500/5 border border-amber-500/15">
              <div className="flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-display font-semibold text-amber-400">Needs Documentation</span>
              </div>
              <ul className="space-y-0.5">
                {dim.needsDocumentation.map((nd, i) => (
                  <li key={i} className="text-[10px] text-amber-400/70">{nd}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popover — compact all-dimension summary for DeveloperCard hover
// ---------------------------------------------------------------------------

function CompactDimensionRow({ dim }: { dim: EEADimension }) {
  const colors = STRENGTH_COLORS[dim.strength];
  const widthPercent = (dim.strength / 4) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs leading-none w-4 text-center">{dim.icon}</span>
      <span className="text-[10px] font-display text-foreground w-24 truncate">{dim.shortLabel}</span>
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${widthPercent}%` }} />
      </div>
      <span className={`text-[9px] font-display font-semibold w-16 text-right ${colors.text}`}>
        {STRENGTH_LABELS[dim.strength]}
      </span>
    </div>
  );
}

export function EEAPopover({ developer }: { developer: any }) {
  const eea = useEEA(developer);

  if (eea.overallScore === 0) return null;

  const uscisDims = eea.dimensions.filter(d => d.criterion === 'uscis');
  const suppDims = eea.dimensions.filter(d => d.criterion === 'supplementary');

  return (
    <div className="space-y-3 w-72">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-display font-semibold text-foreground">EEA Breakdown</span>
          <span className={`text-[9px] font-display font-bold px-1.5 py-0.5 rounded-full border ${eea.tier.bgColor} ${eea.tier.color} ${eea.tier.borderColor}`}>
            {eea.tier.label}
          </span>
        </div>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center font-display text-xs font-bold border ${eea.tier.bgColor} ${eea.tier.color} ${eea.tier.borderColor}`}>
          {eea.overallScore}
        </div>
      </div>

      {/* USCIS Criteria */}
      <div>
        <span className="text-[9px] font-display font-semibold text-muted-foreground uppercase tracking-wider">USCIS Criteria</span>
        <div className="mt-1.5 space-y-1.5">
          {uscisDims.map(dim => <CompactDimensionRow key={dim.id} dim={dim} />)}
        </div>
      </div>

      {/* Supplementary */}
      <div>
        <span className="text-[9px] font-display font-semibold text-muted-foreground uppercase tracking-wider">Supplementary</span>
        <div className="mt-1.5 space-y-1.5">
          {suppDims.map(dim => <CompactDimensionRow key={dim.id} dim={dim} />)}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-[10px] text-muted-foreground font-display">
          {eea.strongCount} strong signal{eea.strongCount !== 1 ? 's' : ''}
        </span>
        {eea.documentationGaps.length > 0 && (
          <span className="text-[10px] text-amber-400 font-display">
            {eea.documentationGaps.length} doc gap{eea.documentationGaps.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full — complete EEA breakdown for CandidateProfile / SlideOut
// ---------------------------------------------------------------------------

export function EEAFull({ developer }: { developer: any }) {
  const eea = useEEA(developer);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const uscisDims = eea.dimensions.filter(d => d.criterion === 'uscis');
  const suppDims = eea.dimensions.filter(d => d.criterion === 'supplementary');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-semibold text-foreground" title="EEA measures signals like publications, patents, open-source impact, and top-company experience based on USCIS O-1A visa criteria.">Evidence of Exceptional Ability</h2>
          <span className={`text-[10px] font-display font-bold px-2 py-0.5 rounded-full border ${eea.tier.bgColor} ${eea.tier.color} ${eea.tier.borderColor}`}>
            {eea.tier.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-display text-muted-foreground">
            {eea.strongCount} strong signal{eea.strongCount !== 1 ? 's' : ''}
          </span>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-display text-sm font-bold border ${eea.tier.bgColor} ${eea.tier.color} ${eea.tier.borderColor}`}>
            {eea.overallScore}
          </div>
        </div>
      </div>

      {/* USCIS Criteria */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">USCIS Criteria</span>
          <span className="flex-1 h-px bg-border" />
        </div>
        <div className="space-y-3">
          {uscisDims.map(dim => (
            <DimensionBar
              key={dim.id}
              dim={dim}
              expanded={expandedId === dim.id}
              onToggle={() => setExpandedId(expandedId === dim.id ? null : dim.id)}
            />
          ))}
        </div>
      </div>

      {/* Supplementary Signals */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">Supplementary Signals</span>
          <span className="flex-1 h-px bg-border" />
        </div>
        <div className="space-y-3">
          {suppDims.map(dim => (
            <DimensionBar
              key={dim.id}
              dim={dim}
              expanded={expandedId === dim.id}
              onToggle={() => setExpandedId(expandedId === dim.id ? null : dim.id)}
            />
          ))}
        </div>
      </div>

      {/* Documentation Gaps */}
      {eea.documentationGaps.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-display font-semibold text-amber-400">Top Documentation Gaps</span>
          </div>
          <ul className="space-y-1">
            {eea.documentationGaps.map((gap, i) => (
              <li key={i} className="text-[11px] text-amber-400/80 flex items-start gap-1.5">
                <span className="text-amber-400/50 mt-0.5">-</span>
                {gap}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            Automated scoring uses GitHub public data only. Supplement with documentation for a complete EEA case.
          </p>
        </div>
      )}
    </div>
  );
}
