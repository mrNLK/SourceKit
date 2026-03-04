import { AnimateOnScroll } from "./AnimateOnScroll";

interface FeatureCardProps {
  title: string;
  tag: string;
  description: string;
  details: string[];
  delay: number;
}

function FeatureCard({ title, tag, description, details, delay }: FeatureCardProps) {
  return (
    <AnimateOnScroll delay={delay}>
      <div className="panel-card p-6 h-full flex flex-col">
        <span className="font-mono text-[10px] text-sk-accent tracking-widest uppercase">
          {tag}
        </span>
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
    title: "Repo Discovery",
    tag: "Exa Search",
    description:
      "Search across GitHub's entire public corpus using natural language queries and structured filters. Find repositories by language, stars, recency, and contributor patterns.",
    details: [
      "Natural language and structured queries",
      "Filter by language, stars, activity",
      "Real-time index of public repos",
    ],
  },
  {
    title: "Persistent Pools",
    tag: "Exa Websets",
    description:
      "Set up persistent searches that continuously monitor GitHub for new matching repositories and contributors. Pools auto-refresh and grow over time.",
    details: [
      "Continuous background monitoring",
      "Auto-dedup and ranking",
      "Webhook and API export",
    ],
  },
  {
    title: "Strategy + Eval",
    tag: "Claude + Parallel",
    description:
      "Claude analyzes candidate profiles in parallel, scoring code quality, contribution consistency, and technical breadth to surface the strongest engineering signals.",
    details: [
      "Parallel profile evaluation",
      "Code quality scoring",
      "Contribution consistency analysis",
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
              Three layers of intelligence
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.tag} {...feature} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}
