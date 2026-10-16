import { PILOT_MODE } from "@/lib/pilot";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const UpgradeModalInner = ({ open, onClose }: UpgradeModalProps) => {
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ return_url: window.location.origin }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Checkout error:', e);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center font-display text-lg">
            Trial limit reached
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            You've used all 10 free searches. Upgrade to SourceKit Pro for unlimited searches.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="text-center">
            <span className="text-3xl font-display font-bold text-foreground">$149</span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground font-display text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {upgrading ? "Redirecting..." : "Upgrade Now"}
          </button>

          <button
            onClick={onClose}
            className="text-sm font-display text-muted-foreground hover:text-foreground transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Free pilot: no Stripe upgrade prompts.
const UpgradeModal = (props: UpgradeModalProps) => (PILOT_MODE ? null : <UpgradeModalInner {...props} />);

export default UpgradeModal;
