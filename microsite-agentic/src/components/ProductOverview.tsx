import { AnimateOnScroll } from "./AnimateOnScroll";

interface FlowStepProps {
  label: string;
  description: string;
}

function FlowStep({ label, description }: FlowStepProps) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-1 h-1 mt-2 rounded-full bg-sk-accent flex-shrink-0" />
      <div>
        <span className="font-mono text-sm font-medium text-white">
          {label}
        </span>
        <span className="text-xs text-sk-muted ml-1.5">{description}</span>
      </div>
    </div>
  );
}

interface InfoRowProps {
  title: string;
  items: { label: string; description: string }[];
  delay?: number;
}

function InfoRow({ title, items, delay = 0 }: InfoRowProps) {
  return (
    <AnimateOnScroll delay={delay}>
      <div className="panel-card p-6">
        <h3 className="font-mono text-xs font-semibold text-sk-accent uppercase tracking-widest mb-4">
          {title}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <FlowStep
              key={item.label}
              label={item.label}
              description={item.description}
            />
          ))}
        </div>
      </div>
    </AnimateOnScroll>
  );
}

export function ProductOverview() {
  return (
    <section id="overview" className="py-24 md:py-32">
      <div className="section-container">
        <AnimateOnScroll>
          <div className="mb-12">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              How it works
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              From recruiter prompt to agent-ready candidate graph
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              Paste a role, JD, or company target. SourceKit turns open-source
              activity into structured candidate evidence that AI recruiter tools
              can rank, enrich, monitor, and route.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Pipeline flow */}
        <AnimateOnScroll delay={50}>
          <div className="panel-card p-6 mb-6">
            <h3 className="font-mono text-xs font-semibold text-sk-accent uppercase tracking-widest mb-5">
              Pipeline
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              {[
                { step: "Recruiter Input", desc: "Role, JD, company target, or sourcing brief" },
                { step: "Strategy Build", desc: "AI maps repos, skills, adjacencies, and signals" },
                { step: "Evidence Extraction", desc: "GitHub work converted into structured candidate proof" },
                { step: "Agent Enrichment", desc: "Profiles, contact paths, and company context" },
                { step: "Operational Output", desc: "Ranked lists, monitoring, exports, and workflows" },
              ].map((item, i) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className="bg-sk-panel border border-sk-border rounded-lg px-4 py-3 min-w-[140px]">
                    <div className="font-mono text-[10px] text-sk-muted uppercase tracking-wider mb-1">
                      {i === 0 ? "Input" : i === 1 ? "Planning" : i === 2 ? "Evidence" : i === 3 ? "Enrichment" : "Workflow"}
                    </div>
                    <div className="text-sm font-semibold text-white">{item.step}</div>
                    <div className="text-[11px] text-sk-muted mt-0.5">{item.desc}</div>
                  </div>
                  {i < 4 && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sk-accent flex-shrink-0">
                      <path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </AnimateOnScroll>

        <div className="flex flex-col gap-6">
          <InfoRow
            title="Three ways to start"
            delay={100}
            items={[
              {
                label: "Role + Company",
                description:
                  "AI infers the stack, identifies repos, builds sourcing strategy.",
              },
              {
                label: "Paste a JD",
                description:
                  "AI parses requirements, tech stack, and seniority level.",
              },
              {
                label: "Paste a Hiring Brief",
                description:
                  "Drop a sourcing brief or job link. AI extracts and structures the target.",
              },
            ]}
          />

          <InfoRow
            title="Scoring"
            delay={200}
            items={[
              {
                label: "Agent-readable score",
                description:
                  "0 to 100 structured output that downstream tools can consume.",
              },
              {
                label: "Evidence-backed ranking",
                description:
                  "Every score is traceable to specific repos and contributions.",
              },
              {
                label: "Stack relevance",
                description:
                  "How well primary languages and frameworks align with role requirements.",
              },
              {
                label: "Proof over self-report",
                description:
                  "GitHub activity only. No resume claims, no self-reported skills.",
              },
            ]}
          />

          <InfoRow
            title="Pipeline stages"
            delay={300}
            items={[
              {
                label: "Discovered",
                description:
                  "Candidates enter from search results or continuous monitoring.",
              },
              {
                label: "Validated",
                description:
                  "Evidence extracted and scored against role requirements.",
              },
              {
                label: "Enriched",
                description:
                  "Profiles, company context, and contact paths added.",
              },
              {
                label: "Activated",
                description:
                  "Routed to outreach, review, or batch workflows.",
              },
              {
                label: "Exported",
                description:
                  "Output to CSV, API, or downstream recruiting systems.",
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
