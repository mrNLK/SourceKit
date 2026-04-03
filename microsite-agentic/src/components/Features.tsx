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
    title: "Agent-Ready Candidate Records",
    tag: "Structured Output",
    isNew: true,
    description:
      "Turn noisy GitHub histories into structured evidence objects that recruiter copilots and agent workflows can actually use.",
    details: [
      "Normalized candidate evidence",
      "Role relevance and builder scoring",
      "Verifiable repo and contribution context",
      "Designed for downstream automation",
    ],
  },
  {
    title: "AI Strategy Builder",
    tag: "Planning",
    description:
      "Start with a JD, company, or recruiter brief and generate a sourcing strategy covering target repos, skill clusters, and adjacent talent pools.",
    details: [
      "Job description parsing",
      "Target repo generation",
      "Skill and seniority mapping",
      "Editable sourcing strategy",
    ],
  },
  {
    title: "Evidence-Based Ranking",
    tag: "Scoring",
    description:
      "Rank engineers using actual build signal instead of profile claims, with scoring that can be explained and audited.",
    details: [
      "GitHub contribution analysis",
      "Recency and velocity weighting",
      "Stack and repo relevance",
      "Transparent score inputs",
    ],
  },
  {
    title: "Continuous Talent Monitoring",
    tag: "Pipelines",
    isNew: true,
    description:
      "Create persistent collections that keep updating as new matching engineers appear, so agentic sourcing systems stay fresh.",
    details: [
      "Saved candidate monitors",
      "Auto-updating match lists",
      "Recurring discovery workflows",
      "Export-ready outputs",
    ],
  },
  {
    title: "Company and Ecosystem Intelligence",
    tag: "Context",
    description:
      "Add adjacent-company and startup ecosystem context so recruiter agents can widen search intelligently instead of blindly.",
    details: [
      "Adjacent company discovery",
      "Startup and funding context",
      "Talent pool expansion",
      "Better targeting signals",
    ],
  },
  {
    title: "Activation Workflows",
    tag: "Ops",
    description:
      "Push ranked, enriched talent into recruiter workflows for outreach, review, batching, and operational follow-through.",
    details: [
      "Bulk review support",
      "Outreach workflow support",
      "CSV/export handoff",
      "Workflow-friendly candidate sets",
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
              Built for AI-native recruiting workflows
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              SourceKit helps recruiter agents plan, discover, score, enrich, and
              operationalize technical talent using verifiable open-source evidence.
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
