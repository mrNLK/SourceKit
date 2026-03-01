import { AlertTriangle, Eye, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface DuplicateModalProps {
  open: boolean;
  onClose: () => void;
  existing: any;
  onSaveAnyway: () => void;
  onViewExisting: () => void;
}

const DuplicateModal = ({ open, onClose, existing, onSaveAnyway, onViewExisting }: DuplicateModalProps) => {
  if (!existing) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
            <DialogTitle className="font-display text-sm font-semibold">Possible Duplicate</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            This candidate may already be in your pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2">
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
        </div>

        <DialogFooter className="px-6 pb-6 flex items-center gap-2 sm:flex-row">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateModal;
