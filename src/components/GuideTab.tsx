import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Data ─── */

const WORKFLOW = [
  { label: "Research", desc: "Role + Company or JD" },
  { label: "Repo Map", desc: "Target repos identified" },
  { label: "Company Map", desc: "Poach list built" },
  { label: "Edit Query", desc: "Tune repos + skills" },
  { label: "Run Search", desc: "Scored pipeline out" },
];

const WALKTHROUGH = [
  {
    step: "1. Enter a role",
    caption: "Type a role + company, paste a JD, or drop a job URL. Claude builds your sourcing strategy, repo list, and poach targets.",
    img: "/screenshots/step-1-input.png",
  },
  {
    step: "2. Edit the repo list",
    caption: "The AI suggestions are a starting point. Your edits are the single biggest lever for result quality.",
    img: "/screenshots/step-2-repos.png",
  },
  {
    step: "3. Run the search",
    caption: "Multi-API search scans contributors across repos. Results ranked by code signal - commits, stars, recency.",
    img: "/screenshots/step-3-results.png",
  },
  {
    step: "4. Review and pipeline",
    caption: "Enrich top matches, find LinkedIn profiles, add to pipeline. Drag between stages. Export CSV anytime.",
    img: "/screenshots/step-4-pipeline.png",
  },
];

const STACK = ["Claude AI", "Exa Search", "Exa Websets", "Parallel.ai", "GitHub API", "React + TS", "Supabase", "Vercel"];

/* ─── Components ─── */

const SteppedBar = ({ steps }: { steps: { label: string; desc: string }[] }) => (
  <div className="flex items-stretch rounded-lg border border-border overflow-hidden">
    {steps.map((step, i) => (
      <div
        key={step.label}
        className={`flex-1 text-center py-3 px-2 ${
          i < steps.length - 1 ? "border-r border-border" : ""
        }`}
      >
        <div className="text-xs font-display font-bold text-foreground">{step.label}</div>
        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{step.desc}</div>
      </div>
    ))}
  </div>
);

const ScreenshotSlot = ({ step, caption, img }: { step: string; caption: string; img: string }) => (
  <div className="space-y-2">
    <div className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-widest">
      {step}
    </div>
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <img
        src={img}
        alt={step}
        className="w-full block"
        onError={(e) => {
          // Hide broken image, show placeholder
          const el = e.currentTarget;
          el.style.display = "none";
          const placeholder = el.nextElementSibling;
          if (placeholder) (placeholder as HTMLElement).style.display = "flex";
        }}
      />
      <div
        className="hidden items-center justify-center bg-muted/20 text-muted-foreground/40 text-xs font-display"
        style={{ aspectRatio: "16/9" }}
      >
        Screenshot
      </div>
    </div>
    <p className="text-[13px] text-muted-foreground leading-relaxed">{caption}</p>
  </div>
);

/* ─── Main ─── */
const GuideTab = () => (
  <div className="max-w-3xl mx-auto space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-display font-bold text-foreground">Guide</h1>
        <Badge variant="outline" className="text-[10px] font-display">v2.0</Badge>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => window.open("https://sourcekit-docs.netlify.app", "_blank")}
      >
        <span className="font-display text-xs">Full Docs</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </Button>
    </div>

    {/* Workflow overview */}
    <SteppedBar steps={WORKFLOW} />

    {/* Screenshot walkthrough */}
    <div className="space-y-6">
      {WALKTHROUGH.map((w) => (
        <ScreenshotSlot key={w.step} {...w} />
      ))}
    </div>

    {/* Stack */}
    <div className="flex flex-wrap gap-1.5 pt-2">
      {STACK.map((tech) => (
        <span key={tech} className="text-[10px] font-display font-medium text-muted-foreground border border-border rounded-full px-2.5 py-1">
          {tech}
        </span>
      ))}
    </div>

    {/* Docs link */}
    <div className="pt-1">
      <button
        onClick={() => window.open("https://sourcekit-docs.netlify.app", "_blank")}
        className="text-[11px] font-display font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
      >
        EEA framework, Websets deep dive, and more in the full docs
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  </div>
);

export default GuideTab;
