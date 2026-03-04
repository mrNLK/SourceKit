import { AnimateOnScroll } from "./AnimateOnScroll";

const SIGNALS = [
  {
    category: "Experience",
    items: [
      "Multi-year streaks in target stack",
      "Cross-repo collaboration and review patterns",
      "Maintained projects — not just drive-by commits",
    ],
  },
  {
    category: "Expertise",
    items: [
      "Per-language proficiency from recent commits",
      "Test coverage and CI habits",
      "Docs contributions as a communication proxy",
    ],
  },
];

export function EEASourcing() {
  return (
    <section id="eea" className="py-24 md:py-32">
      <div className="section-container">
        <AnimateOnScroll>
          <div className="mb-10">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              Scoring
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              Scored on commits, not keywords
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              Candidates are ranked by what they've shipped — commit depth,
              review activity, code quality — not resume keywords.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <div className="panel-card p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {SIGNALS.map((group) => (
                <div key={group.category}>
                  <h3 className="font-mono text-xs font-semibold text-sk-accent uppercase tracking-widest mb-3">
                    {group.category}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-sk-muted"
                      >
                        <span className="w-1 h-1 mt-2 rounded-full bg-sk-accent flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
