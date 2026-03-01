import { ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOCS_URL = "https://sourcekit-docs.netlify.app";

const GuideTab = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4.5 h-4.5 text-primary" />
          <h1 className="text-sm font-display font-bold text-foreground">Documentation</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          onClick={() => window.open(DOCS_URL, "_blank")}
        >
          <span className="font-display text-xs">Open in new tab</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Iframe */}
      <iframe
        src={DOCS_URL}
        title="SourceKit Documentation"
        className="flex-1 w-full rounded-lg border border-border bg-background"
        style={{ minHeight: 0 }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
};

export default GuideTab;
