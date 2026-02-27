import { AlertTriangle, X, Eye, Plus } from "lucide-react";

interface DuplicateModalProps {
  open: boolean;
  onClose: () => void;
  existing: any;
  onSaveAnyway: () => void;
  onViewExisting: () => void;
}

const DuplicateModal = ({ open, onClose, existing, onSaveAnyway, onViewExisting }: DuplicateModalProps) => {
  if (!open || !existing) return null;

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="glass rounded-xl border border-border w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">Possible Duplicate</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground">This candidate may already be in your pipeline.</p>

          {/* Existing candidate preview */}
          <div className="glass rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3">
              {existing.avatar_url && (
                <img src={existing.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
              )}
              <div>
                <p className="font-display text-sm font-semibold text-foreground">{existing.name || existing.github_username}</p>
                <p className="text-[11px] text-muted-foreground">@{existing.github_username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-display px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {existing.stage}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Added {new Date(existing.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onViewExisting}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-display font-semibold px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              View Existing
            </button>
            <button
              onClick={onSaveAnyway}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-display font-semibold px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Save Anyway
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DuplicateModal;
