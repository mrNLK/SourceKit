import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const guideUrl = "https://sourcekit-docs.netlify.app/guide_user_reference.html";

const GuideTab = () => {
  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-border/40 bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/70">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            Guide
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Loaded from `sourcekit-docs.netlify.app`
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => window.open(guideUrl, "_blank", "noopener,noreferrer")}
        >
          Open in new tab
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>
      <iframe
        src={guideUrl}
        title="SourceKit Reference Guide"
        className="flex-1 w-full border-0 bg-background"
        style={{ minHeight: "calc(100vh - 140px)" }}
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
};

export default GuideTab;
