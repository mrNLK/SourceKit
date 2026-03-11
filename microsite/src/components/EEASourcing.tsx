import { AnimateOnScroll } from "./AnimateOnScroll";

const BUILDER_SCORE_DIMENSIONS = [
  { label: "AI Mastery", pct: 30, color: "#00E5A0" },
  { label: "Build Velocity", pct: 20, color: "#00C88A" },
  { label: "Tooling", pct: 15, color: "#00B07A" },
  { label: "Commit Bonus", pct: 15, color: "#009968" },
  { label: "Testing", pct: 10, color: "#008258" },
  { label: "Docs", pct: 8, color: "#006B48" },
  { label: "Community", pct: 7, color: "#005438" },
];

const EEA_SIGNALS = [
  {
    category: "Published Research",
    items: ["NeurIPS, ICML, ICLR, CVPR, ACL papers", "H-index, citation count"],
  },
  {
    category: "Open Source Impact",
    items: ["Top-10 contributor to repos with 1K+ stars", "Maintainer status"],
  },
  {
    category: "Conference + Teaching",
    items: ["KubeCon, QCon, Strange Loop, DEF CON talks", "Course instructor"],
  },
  {
    category: "Industry Recognition",
    items: ["Patents filed, CVE author, awards", "Press coverage"],
  },
  {
    category: "Technical Leadership",
    items: ["RFCs adopted, design docs merged", "Architecture decisions at scale"],
  },
  {
    category: "Scale + Impact",
    items: ["Shipped to 1M+ users", "Infra serving 10K+ QPS, production ML at scale"],
  },
];

export function EEASourcing() {
  return (
    <section id="eea" className="py-24 md:py-32">
      <div className="section-container">
        {/* Builder Score */}
        <AnimateOnScroll>
          <div className="mb-10">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              Builder Score
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              AI-weighted GitHub evaluation
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              Scans top repos. Returns 0-100 with per-dimension breakdowns.
              No self-reported data. GitHub activity only.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <div className="panel-card p-6 mb-8">
            <div className="flex flex-wrap gap-2 mb-6">
              {BUILDER_SCORE_DIMENSIONS.map((dim) => (
                <div key={dim.label} className="flex-1 min-w-[100px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] text-sk-muted">{dim.label}</span>
                    <span className="font-mono text-[10px] text-sk-accent">{dim.pct}%</span>
                  </div>
                  <div className="h-2 bg-sk-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${dim.pct * 3.3}%`, backgroundColor: dim.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-sk-muted font-mono">
              <span className="px-2 py-1 bg-sk-panel border border-sk-border rounded">Claude Code 5x</span>
              <span className="px-2 py-1 bg-sk-panel border border-sk-border rounded">46 AI Keywords</span>
              <span className="px-2 py-1 bg-sk-panel border border-sk-border rounded">28 Framework Files</span>
              <span className="px-2 py-1 bg-sk-panel border border-sk-border rounded">7 Coding Tools</span>
            </div>
          </div>
        </AnimateOnScroll>

        {/* EEA Framework */}
        <AnimateOnScroll delay={200}>
          <div className="mb-10 mt-16">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              EEA Framework
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold text-white mt-3 tracking-tight">
              Evidence of Exceptional Ability
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              Verifiable signal that puts someone in the top 5-10% of practitioners.
              Build Websets around these criteria for automatic candidate discovery.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={300}>
          <div className="panel-card p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {EEA_SIGNALS.map((group) => (
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
