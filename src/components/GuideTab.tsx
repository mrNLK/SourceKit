import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// SourceKit Pilot Guide, served as a static page from public/guide/.
export const GUIDE_URL = "/guide/index.html";
export const GUIDE_PDF_URL = "/guide/SourceKit-Pilot-Guide.pdf";

const GuideTab = () => {
  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">SourceKit Pilot Guide</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Onboarding walkthrough for pilot users</p>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-secondary-foreground hover:text-primary">
            <a href={GUIDE_PDF_URL} download>
              Download PDF
              <Download className="w-3 h-3" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-secondary-foreground hover:text-primary"
            onClick={() => window.open(GUIDE_URL, "_blank", "noopener,noreferrer")}
          >
            Open in new tab
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <iframe
        src={GUIDE_URL}
        title="SourceKit Pilot Guide"
        className="flex-1 w-full border-0 bg-background"
        style={{ minHeight: "calc(100vh - 140px)" }}
      />
    </div>
  );
};

export default GuideTab;
