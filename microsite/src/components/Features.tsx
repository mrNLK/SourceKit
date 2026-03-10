import { AnimateOnScroll } from "./AnimateOnScroll";

interface FeatureCardProps {
  title: string;
  tag: string;
  isNew?: boolean;
  description: string;
  details: string[];
  delay: number;
}

function FeatureCard({ title, tag, isNew, description, details, delay }: FeatureCardProps) {
  return (
    <AnimateOnScroll delay={delay}>
      <div className="panel-card p-6 h-full flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-sk-accent tracking-widest uppercase">
            {tag}
          </span>
          {isNew && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-sk-accent/10 text-sk-accent border border-sk-accent/20">
              NEW
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-white mt-2">{title}</h3>
        <p className="text-sm text-sk-muted mt-2 leading-relaxed flex-1">
          {description}
        </p>
        <div className="mt-5 pt-4 border-t border-sk-border">
          {details.map((detail) => (
            <div
              key={detail}
              className="flex items-center gap-2 py-1 text-xs text-sk-muted"
            >
              <span className="w-1 h-1 rounded-full bg-sk-accent flex-shrink-0" />
              {detail}
            </div>
          ))}
        </div>
      </div>
    </AnimateOnScroll>
  );
}

const FEATURES: Omit<FeatureCardProps, "delay">[] = [
  {
    title: "AI Research & Strategy",
    tag: "Claude",
    description:
      "Paste a JD or job URL and Claude builds your entire sourcing plan: target repos, companies to poach from, skills matrix, and EEA signals. Everything's editable before you search.",
    details: [
      "Auto-parses JDs, Lever/Greenhouse URLs",
      "Generates target repo list + skills matrix",
      "EEA signal criteria for each role",
      "Editable strategy before execution",
    ],
  },
  {
    title: "Builder Score",
    tag: "Code Quality",
    isNew: true,
    description:
      "AI-powered code quality analysis scoring candidates 0-100 across 7 dimensions by scanning actual GitHub repos. No self-reported data.",
    details: [
      "AI Mastery (30%) - ML/AI framework usage",
      "Build Velocity (20%) - commit frequency",
      "Tooling (15%) - CI/CD and frameworks",
      "Commit Bonus (15%) - open-source impact",
      "Testing (10%) - coverage and patterns",
      "Docs (8%) + Community (7%)",
    ],
  },
  {
    title: "Harmonic Integration",
    tag: "Startup Intelligence",
    isNew: true,
    description:
      "Maps adjacent startup ecosystems, surfaces pre-breakout companies, and adds founder/funding context. Widens discovery without loosening quality.",
    details: [
      "Pre-breakout company discovery",
      "Founder and funding context",
      "Adjacent market mapping",
      "Company stage and growth signals",
    ],
  },
  {
    title: "Exa Websets",
    tag: "Persistent Pipelines",
    isNew: true,
    description:
      "Persistent, auto-updating candidate collections. Define criteria once and new verified matches get added continuously. Talent pipelines that run themselves.",
    details: [
      "Define once, match continuously",
      "Auto-enrich: email, company, talks, GitHub",
      "Daily/weekly monitoring schedule",
      "Export to CSV, API, or Clay",
    ],
  },
  {
    title: "Parallel.ai",
    tag: "Company Intelligence",
    isNew: true,
    description:
      "Company graph intelligence mapping engineers to adjacent markets and roles. Not limited to exact title matches.",
    details: [
      "JD extraction from Lever/Greenhouse/Ashby",
      "Company-to-company adjacency mapping",
      "Market and role expansion",
      "Batch entity discovery",
    ],
  },
  {
    title: "Pipeline + Bulk Actions",
    tag: "Workflow",
    description:
      "Kanban board with AI-generated outreach referencing each candidate's actual work, plus batch AI chat for comparing and ranking.",
    details: [
      "Sourced > Contacted > Responded > Screen",
      "AI outreach from contribution data",
      "Batch compare and rank candidates",
      "CSV export from any stage",
    ],
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="section-container">
        <AnimateOnScroll>
          <div className="mb-12">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              Five APIs, zero overlap
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              Claude for planning. Exa for semantic search. GitHub for contribution proof.
              Harmonic for startup intelligence. Parallel for company adjacency.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.tag} {...feature} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
