import { AnimateOnScroll } from "./AnimateOnScroll";

interface FlowStepProps {
  label: string;
  description: string;
  index: number;
}

function FlowStep({ label, description, index }: FlowStepProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-md accent-gradient flex items-center justify-center text-sk-bg font-mono text-xs font-bold">
        {index}
      </div>
      <div>
        <div className="font-mono text-sm font-semibold text-white">
          {label}
        </div>
        <div className="text-xs text-sk-muted mt-0.5 leading-relaxed">
          {description}
        </div>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <FlowStep
              key={item.label}
              label={item.label}
              description={item.description}
              index={i + 1}
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
              Product Overview
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              From signal to hire
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              A complete pipeline for finding, qualifying, and engaging
              engineering candidates through GitHub activity analysis.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="flex flex-col gap-6">
          <InfoRow
            title="Workflow"
            delay={100}
            items={[
              {
                label: "Define criteria",
                description:
                  "Set language, framework, contribution frequency, and quality thresholds.",
              },
              {
                label: "Search repos",
                description:
                  "Exa scans GitHub for repositories matching your technical requirements.",
              },
              {
                label: "Extract candidates",
                description:
                  "Identify active contributors with matching skill profiles.",
              },
            ]}
          />

          <InfoRow
            title="Quick Start"
            delay={200}
            items={[
              {
                label: "Connect GitHub",
                description:
                  "Authorize read access to public repository metadata.",
              },
              {
                label: "Create a pool",
                description:
                  "Define your ideal candidate profile with technical filters.",
              },
              {
                label: "Review results",
                description:
                  "Browse ranked candidates with contribution evidence.",
              },
            ]}
          />

          <InfoRow
            title="Websets Pipeline"
            delay={300}
            items={[
              {
                label: "Persistent search",
                description:
                  "Websets continuously discover new matching repositories.",
              },
              {
                label: "Auto-refresh",
                description:
                  "Candidate pools update as new contributions appear.",
              },
              {
                label: "Alert & export",
                description:
                  "Get notified of high-signal matches, export to ATS.",
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
