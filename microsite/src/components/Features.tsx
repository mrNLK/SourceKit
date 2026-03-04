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
    title: "Repo discovery",
    tag: "Exa Search",
    description:
      "Query GitHub's public index by language, stars, recency, and contributor activity. Plain text or structured filters.",
    details: [
      "Natural language + structured queries",
      "Language, stars, activity filters",
      "Real-time public repo index",
    ],
  },
  {
    title: "Persistent pools",
    tag: "Exa Websets",
    description:
      "Searches keep running in the background. New repos and contributors land in your pool automatically, deduped and ranked.",
    details: [
      "Background monitoring",
      "Auto-dedup and ranking",
      "Webhook and API export",
    ],
  },
  {
    title: "Parallel eval",
    tag: "Claude",
    description:
      "Claude scores candidates in parallel — code quality, commit consistency, technical range — and returns a ranked shortlist.",
    details: [
      "Batch profile evaluation",
      "Code quality + consistency scoring",
      "Ranked output with evidence",
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
              Search, collect, evaluate
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
