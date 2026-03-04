import { useState } from 'react';
import { Pencil, Check, X, Eye, EyeOff } from 'lucide-react';
import type { WebsetEEASignal } from '@/types/eea';

interface EEASignalCardProps {
  signal: WebsetEEASignal;
  onChange: (updated: WebsetEEASignal) => void;
  onRemove: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  options: 'Options',
};

const EEASignalCard = ({ signal, onChange, onRemove }: EEASignalCardProps) => {
  const [editing, setEditing] = useState(false);
  const [localCriterion, setLocalCriterion] = useState(signal.webset_criterion);
  const [localEnrichment, setLocalEnrichment] = useState(signal.enrichment_description);

  const handleSave = () => {
    onChange({
      ...signal,
      webset_criterion: localCriterion,
      enrichment_description: localEnrichment,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setLocalCriterion(signal.webset_criterion);
    setLocalEnrichment(signal.enrichment_description);
    setEditing(false);
  };

  const toggleEnabled = () => onChange({ ...signal, enabled: !signal.enabled });

  return (
    <div className={`rounded-lg border p-3 transition-all ${
      signal.enabled
        ? 'bg-secondary/30 border-border hover:border-primary/20'
        : 'bg-secondary/10 border-border/50 opacity-60'
    }`}>
      <div className="flex items-start gap-3">
        {/* Toggle */}
        <button
          onClick={toggleEnabled}
          className="mt-0.5 shrink-0"
          title={signal.enabled ? 'Disable this signal' : 'Enable this signal'}
        >
          {signal.enabled ? (
            <Eye className="w-4 h-4 text-emerald-400" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Signal name */}
          <p className="text-sm font-medium text-foreground font-display">{signal.signal}</p>

          {editing ? (
            <div className="mt-2 space-y-2">
              {/* Criterion editor */}
              <div>
                <label className="text-[10px] font-display text-muted-foreground uppercase tracking-wider">
                  Webset Criterion
                </label>
                <textarea
                  value={localCriterion}
                  onChange={e => setLocalCriterion(e.target.value)}
                  rows={2}
                  className="w-full mt-1 bg-secondary rounded-md text-xs text-foreground p-2 outline-none border border-primary/30 font-body resize-none leading-relaxed"
                />
              </div>
              {/* Enrichment editor */}
              <div>
                <label className="text-[10px] font-display text-muted-foreground uppercase tracking-wider">
                  Enrichment Query
                </label>
                <input
                  value={localEnrichment}
                  onChange={e => setLocalEnrichment(e.target.value)}
                  className="w-full mt-1 bg-secondary rounded-md text-xs text-foreground p-2 outline-none border border-primary/30 font-body"
                />
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 text-[10px] font-display px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
                <button
                  onClick={handleCancel}
                  className="text-[10px] font-display px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Criterion display */}
              <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">
                {signal.webset_criterion}
              </p>
              {/* Enrichment tag */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] font-display px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Enrichment: {signal.enrichment_description.length > 50
                    ? signal.enrichment_description.slice(0, 50) + '...'
                    : signal.enrichment_description}
                </span>
                <span className="text-[10px] font-display px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                  {FORMAT_LABELS[signal.enrichment_format] || signal.enrichment_format}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Edit / Remove */}
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Edit criterion"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={onRemove}
              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
              title="Remove signal"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EEASignalCard;
