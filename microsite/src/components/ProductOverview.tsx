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
              Signal to shortlist
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              Set your technical criteria. Exa finds matching repos and
              contributors. Claude scores them. You get a ranked pool.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="flex flex-col gap-6">
          <InfoRow
            title="Workflow"
            delay={100}
            items={[
              {
                label: "Criteria",
                description:
                  "Language, framework, commit frequency, quality bar.",
              },
              {
                label: "Search",
                description:
                  "Exa indexes GitHub and returns repos that match.",
              },
              {
                label: "Extract",
                description:
                  "Pull active contributors from matched repos.",
              },
            ]}
          />

          <InfoRow
            title="Quick start"
            delay={200}
            items={[
              {
                label: "Connect",
                description:
                  "Read-only GitHub auth for public repo metadata.",
              },
              {
                label: "Pool",
                description:
                  "Set your filters and build a candidate pool.",
              },
              {
                label: "Review",
                description:
                  "Ranked results with commit-level evidence.",
              },
            ]}
          />

          <InfoRow
            title="Websets"
            delay={300}
            items={[
              {
                label: "Persistent",
                description:
                  "Searches keep running and pick up new repos.",
              },
              {
                label: "Auto-refresh",
                description:
                  "Pools update as contributors push new work.",
              },
              {
                label: "Export",
                description:
                  "Alerts on high-signal matches. ATS export.",
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
