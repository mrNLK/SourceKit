import { useState } from "react";
import { ExternalLink, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WORKFLOW_STEPS = [
  { label: "Research", desc: "Role + Company or JD" },
  { label: "Repo Map", desc: "Target repos identified" },
  { label: "Company Map", desc: "Poach list built" },
  { label: "Edit Query", desc: "Tune repos + skills" },
  { label: "Run Search", desc: "Scored pipeline out" },
];

const QUICK_START = [
  { title: "Sign in", desc: "with Google at getsourcekit.vercel.app" },
  { title: "Enter a role", desc: "type role + company, paste a JD, or drop a job URL" },
  { title: "Edit the repo list", desc: "this is the biggest lever for result quality" },
  { title: "Run the search", desc: "filter by language, commits, location" },
  { title: "Review candidates", desc: 'try "Find LinkedIn" and "Enrich" on top matches' },
  { title: "Create a Webset", desc: "set criteria and monitoring for persistent tracking" },
  { title: "Pipeline", desc: "add candidates, drag between stages, bulk actions, export CSV" },
];

const PRO_TIPS = [
  { title: "Be specific", desc: '"ML Infra Engineer, training pipelines" beats "ML Engineer"' },
  { title: "Edit repos", desc: "The AI list is a starting point. Your edits are the biggest quality lever." },
  { title: "Hidden gems", desc: "High commits + low followers = under-recruited and responsive." },
  { title: "Webset criteria", desc: "Think like a database filter. Quantifiable and verifiable beats aspirational." },
  { title: "Layer enrichments", desc: "Start with contact info. Add publications only for top candidates." },
];

const INPUT_METHODS = [
  { title: "Role + Company", desc: "Claude infers the stack, finds repos, builds your strategy" },
  { title: "Paste a JD", desc: "AI parses requirements, technologies, and seniority level" },
  { title: "Paste a Job URL", desc: "Parallel.ai extracts JDs from Lever, Greenhouse, Ashby" },
];

const EEA_ARTIFACTS = [
  { label: "Published Research", examples: "Papers at top venues, patents, h-index, citations" },
  { label: "Open Source Impact", examples: "Maintainer of 1K+ star repos, framework contributions, adopted RFCs" },
  { label: "Conference & Teaching", examples: "Keynotes, invited talks, courses, high-reach technical blogs" },
  { label: "Industry Recognition", examples: "Awards, top-N lists, Kaggle Grandmaster, fellowships" },
  { label: "Technical Leadership", examples: "Systems at scale, standards contributions, design docs" },
  { label: "Scale & Impact", examples: "Products with 1M+ users, documented perf gains, post-mortems" },
];

const RECIPE_EXAMPLE = {
  role: "Senior ML Engineer",
  query: "ML engineers who publish research and contribute to open source ML projects",
  criteria: [
    "Published at NeurIPS, ICML, or ICLR in last 3 years",
    "Maintainer / top-20 contributor to repo with 1K+ stars in ML/AI",
    "Has industry experience, not purely academic",
  ],
  enrichments: [
    "Peer-reviewed publications with venues (text)",
    "GitHub repos maintained with star counts (text)",
    "Most compelling outreach hook (text)",
    "Contact email (email)",
    "EEA strength: Strong / Moderate / Emerging (options)",
  ],
};

/* ─── TLDR View (default) ─── */
const TLDRView = () => (
  <div className="space-y-6">
    {/* Workflow bar */}
    <div className="flex items-stretch gap-0 rounded-lg border border-border overflow-hidden">
      {WORKFLOW_STEPS.map((step, i) => (
        <div
          key={step.label}
          className={`flex-1 text-center py-3 px-2 ${
            i < WORKFLOW_STEPS.length - 1 ? "border-r border-border" : ""
          }`}
        >
          <div className="text-xs font-display font-bold text-foreground mb-0.5">{step.label}</div>
          <div className="text-[10px] text-muted-foreground leading-tight">{step.desc}</div>
        </div>
      ))}
    </div>

    {/* Quick Start - 2-column grid */}
    <div>
      <h2 className="text-xs font-display font-semibold text-primary uppercase tracking-wider mb-3">Quick Start</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {QUICK_START.map((step, i) => (
          <div key={i} className="py-1">
            <span className="text-sm font-semibold text-foreground">{step.title}</span>
            {" "}
            <span className="text-sm text-muted-foreground">{step.desc}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Pro Tips - 2-column grid */}
    <div>
      <h2 className="text-xs font-display font-semibold text-primary uppercase tracking-wider mb-3">Pro Tips</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {PRO_TIPS.map((tip, i) => (
          <div key={i} className="py-1">
            <span className="text-sm font-semibold text-foreground">{tip.title}.</span>
            {" "}
            <span className="text-sm text-muted-foreground">{tip.desc}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Full Guide View ─── */
const FullGuideView = () => (
  <div className="space-y-8">
    {/* Workflow */}
    <Card>
      <CardContent className="pt-5 pb-4">
        <h2 className="text-xs font-display font-semibold text-primary uppercase tracking-wider mb-4">Workflow</h2>
        <div className="flex items-stretch gap-0 rounded-lg border border-border overflow-hidden">
          {WORKFLOW_STEPS.map((step, i) => (
            <div
              key={step.label}
              className={`flex-1 text-center py-3 px-2 ${
                i < WORKFLOW_STEPS.length - 1 ? "border-r border-border" : ""
              }`}
            >
              <div className="text-xs font-display font-bold text-foreground mb-0.5">{step.label}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{step.desc}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Input Methods */}
    <Card>
      <CardContent className="pt-5 pb-4">
        <h2 className="text-xs font-display font-semibold text-primary uppercase tracking-wider mb-4">Three Ways to Start</h2>
        <div className="grid grid-cols-3 gap-3">
          {INPUT_METHODS.map((method) => (
            <div key={method.title} className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="text-xs font-display font-bold text-foreground">{method.title}</div>
              <div className="text-[11px] text-muted-foreground leading-snug">{method.desc}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Quick Start */}
    <Card>
      <CardContent className="pt-5 pb-4">
        <h2 className="text-xs font-display font-semibold text-primary uppercase tracking-wider mb-4">Quick Start</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {QUICK_START.map((step, i) => (
            <div key={i} className="text-sm">
              <span className="font-semibold text-foreground">{step.title}</span>
              {" "}
              <span className="text-muted-foreground">{step.desc}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Pro Tips */}
    <Card>
      <CardContent className="pt-5 pb-4">
        <h2 className="text-xs font-display font-semibold text-primary uppercase tracking-wider mb-4">Pro Tips</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {PRO_TIPS.map((tip, i) => (
            <div key={i} className="text-sm">
              <span className="font-semibold text-foreground">{tip.title}.</span>
              {" "}
              <span className="text-muted-foreground">{tip.desc}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* EEA Artifact Types */}
    <Card>
      <CardContent className="pt-5 pb-4">
        <h2 className="text-xs font-display font-semibold text-primary uppercase tracking-wider mb-4">EEA Artifact Types</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Evidence of Exceptional Ability - verifiable signals that put someone in the top 5-10%. Pick 3-5 per role as Webset criteria.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {EEA_ARTIFACTS.map((a) => (
            <div key={a.label} className="rounded-lg border border-border p-2.5">
              <div className="text-xs font-semibold text-foreground mb-1">
                {a.label}
              </div>
              <div className="text-[10.5px] text-muted-foreground leading-snug">{a.examples}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Webset Recipe Example */}
    <Card>
      <CardContent className="pt-5 pb-4">
        <h2 className="text-xs font-display font-semibold text-primary uppercase tracking-wider mb-4">Webset Recipe: {RECIPE_EXAMPLE.role}</h2>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-display font-semibold text-primary uppercase tracking-wider mb-1">Query</div>
            <div className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-md px-3 py-2">
              {RECIPE_EXAMPLE.query}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-display font-semibold text-primary uppercase tracking-wider mb-1">Criteria</div>
            <div className="space-y-0">
              {RECIPE_EXAMPLE.criteria.map((c, i) => (
                <div key={i} className={`text-xs text-muted-foreground py-1.5 ${
                  i < RECIPE_EXAMPLE.criteria.length - 1 ? "border-b border-border" : ""
                }`}>
                  {c}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-display font-semibold text-primary uppercase tracking-wider mb-1">Enrichments</div>
            <div className="space-y-0">
              {RECIPE_EXAMPLE.enrichments.map((e, i) => (
                <div key={i} className="text-[11px] text-muted-foreground py-1">
                  {e}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[10.5px] text-muted-foreground mt-3 italic">
          5 more role recipes in the{" "}
          <button
            className="text-primary underline underline-offset-2 hover:no-underline"
            onClick={() => window.open("https://sourcekit-docs.netlify.app/#eea", "_blank")}
          >
            full docs
          </button>.
        </p>
      </CardContent>
    </Card>

    {/* Pipeline stages */}
    <Card>
      <CardContent className="pt-5 pb-4">
        <h2 className="text-xs font-display font-semibold text-primary uppercase tracking-wider mb-4">Pipeline Stages</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {["Sourced", "Contacted", "Responded", "Screen", "Offer"].map((stage, i, arr) => (
            <span key={stage} className="flex items-center gap-2">
              <span className="text-xs font-display font-semibold text-primary border border-primary/20 rounded-full px-3 py-1">
                {stage}
              </span>
              {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Drag-and-drop between stages. Bulk actions for compare, summarize, and outreach. Export to CSV anytime.
        </p>
      </CardContent>
    </Card>

    {/* Tech stack */}
    <div className="flex flex-wrap gap-2">
      {["Claude AI", "Exa Search", "Exa Websets", "Parallel.ai", "GitHub API", "React + TS", "Supabase", "Vercel"].map((tech) => (
        <span key={tech} className="text-[10px] font-display font-medium text-muted-foreground border border-border rounded-full px-3 py-1">
          {tech}
        </span>
      ))}
    </div>

    {/* Full docs CTA */}
    <div className="text-center py-4">
      <Button
        variant="default"
        size="lg"
        className="gap-2"
        onClick={() => window.open("https://sourcekit-docs.netlify.app", "_blank")}
      >
        <span className="font-display text-sm font-semibold">Read the Full Docs</span>
        <ExternalLink className="w-4 h-4" />
      </Button>
      <p className="text-xs text-muted-foreground mt-3">
        Websets deep dive, EEA framework, architecture, and more.
      </p>
    </div>
  </div>
);

/* ─── Main GuideTab ─── */
const GuideTab = () => {
  const [view, setView] = useState<"tldr" | "full">("tldr");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header with toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-lg font-display font-bold text-foreground">
              {view === "tldr" ? "Quick Reference" : "Full Guide"}
            </h1>
            <Badge variant="outline" className="text-[10px] font-display">v2.0</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {view === "tldr"
              ? "The essentials. Switch to the full guide for deep dives and examples."
              : "Workflows, input methods, EEA framework, and recipes."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setView(view === "tldr" ? "full" : "tldr")}
            className="text-xs font-display font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {view === "tldr" ? "Full Guide" : "TLDR"}
          </button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open("https://sourcekit-docs.netlify.app", "_blank")}
          >
            <span className="font-display text-xs">Docs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === "tldr" ? <TLDRView /> : <FullGuideView />}
    </div>
  );
};

export default GuideTab;
