import { useState } from 'react';
import { Layers, Loader2, Check, ExternalLink } from 'lucide-react';
import type { WebsetEEASignal } from '@/types/eea';
import { useEEAWebset } from '@/hooks/useEEAWebset';
import { useWebsets } from '@/hooks/useWebsets';
import { toast } from '@/hooks/use-toast';
import { MAX_WEBSET_CRITERIA } from '@/lib/eea-webset';

interface CreateWebsetButtonProps {
  role: string;
  company?: string;
  skills?: string[];
  signals: WebsetEEASignal[];
  onNavigateToWebsets?: () => void;
}

const CreateWebsetButton = ({ role, company, skills, signals, onNavigateToWebsets }: CreateWebsetButtonProps) => {
  const [searchCount, setSearchCount] = useState(25);
  const { addWebsetRef } = useWebsets();
  const enabledCount = signals.filter(s => s.enabled).length;
  const verifiedCount = Math.min(enabledCount, MAX_WEBSET_CRITERIA);

  const { createEEAWebset, isCreating, error, createdWebsetId } = useEEAWebset({
    addWebsetRef,
    onCreated: () => {
      toast({ title: 'EEA Webset created', description: `Searching for ${searchCount} candidates with ${verifiedCount} criteria.` });
    },
  });

  const handleCreate = async () => {
    await createEEAWebset(role, signals, {
      company,
      skills,
      searchCount,
    });
  };

  if (createdWebsetId) {
    return (
      <div className="glass rounded-xl p-5 glow-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-display font-semibold text-foreground">EEA Webset Created</p>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              {verifiedCount} criteria active. Exa is verifying candidates now.
            </p>
          </div>
          {onNavigateToWebsets && (
            <button
              onClick={onNavigateToWebsets}
              className="flex items-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> View Webset
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-display font-semibold text-foreground">Create EEA Webset</p>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              {verifiedCount} criteria will be verified by Exa's AI agents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-display text-muted-foreground">Count</label>
            <input
              type="number"
              value={searchCount}
              onChange={e => setSearchCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 25)))}
              min={1}
              max={100}
              className="w-16 bg-secondary rounded-md text-xs text-foreground p-1.5 outline-none border border-border focus:border-primary/30 text-center font-display"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={isCreating || enabledCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" /> Create EEA Webset
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}

      {enabledCount > MAX_WEBSET_CRITERIA && (
        <p className="text-xs text-amber-400 mt-2">
          Exa supports up to {MAX_WEBSET_CRITERIA} criteria per webset. Using the first {MAX_WEBSET_CRITERIA} enabled criteria.
        </p>
      )}

      {enabledCount === 0 && (
        <p className="text-xs text-amber-400 mt-2">Enable at least one EEA signal above to create a Webset.</p>
      )}
    </div>
  );
};

export default CreateWebsetButton;
