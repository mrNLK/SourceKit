import { AnimateOnScroll } from "./AnimateOnScroll";

interface SignalBarProps {
  label: string;
  value: number;
}

function SignalBar({ label, value }: SignalBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-sk-muted font-mono w-20 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-sk-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full accent-gradient transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-sk-accent font-mono w-8 text-right">
        {value}%
      </span>
    </div>
  );
}

interface EEACardProps {
  title: string;
  subtitle: string;
  bullets: string[];
  signals: SignalBarProps[];
  delay: number;
}

function EEACard({ title, subtitle, bullets, signals, delay }: EEACardProps) {
  return (
    <AnimateOnScroll delay={delay}>
      <div className="panel-card p-6 h-full">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-xs text-sk-muted font-mono mt-1">{subtitle}</p>

        <div className="mt-5 flex flex-col gap-2.5">
          {signals.map((signal) => (
            <SignalBar key={signal.label} {...signal} />
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-sk-border">
          {bullets.map((bullet) => (
            <div
              key={bullet}
              className="flex items-start gap-2 py-1.5 text-sm text-sk-muted"
            >
              <span className="w-1 h-1 mt-1.5 rounded-full bg-sk-accent flex-shrink-0" />
              {bullet}
            </div>
          ))}
        </div>
      </div>
    </AnimateOnScroll>
  );
}

export function EEASourcing() {
  return (
    <section id="eea" className="py-24 md:py-32">
      <div className="section-container">
        <AnimateOnScroll>
          <div className="mb-12">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              EEA-driven Sourcing
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              Evidence over assumptions
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              Every candidate recommendation is backed by measurable
              engineering activity, not keyword matching.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-2 gap-5">
          <EEACard
            title="Experience signals"
            subtitle="Depth of contribution"
            delay={100}
            signals={[
              { label: "Commits", value: 92 },
              { label: "Reviews", value: 78 },
              { label: "Issues", value: 65 },
            ]}
            bullets={[
              "Multi-year contribution streaks in target stack",
              "Cross-repo collaboration patterns indicate team fit",
              "Open source maintenance signals ownership and reliability",
            ]}
          />

          <EEACard
            title="Expertise signals"
            subtitle="Quality of output"
            delay={220}
            signals={[
              { label: "Code", value: 88 },
              { label: "Docs", value: 71 },
              { label: "Tests", value: 83 },
            ]}
            bullets={[
              "Language-level proficiency scored from recent commits",
              "Test coverage and CI discipline indicate rigor",
              "Documentation contributions signal communication skill",
            ]}
          />
        </div>
      </div>
    </section>
  );
}
