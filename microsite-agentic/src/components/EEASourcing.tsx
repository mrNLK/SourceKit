import { AnimateOnScroll } from "./AnimateOnScroll";

const EVIDENCE_DIMENSIONS = [
  { label: "Repo Relevance", pct: 25, color: "#00E5A0" },
  { label: "Contribution Depth", pct: 22, color: "#00C88A" },
  { label: "Recency", pct: 18, color: "#00B07A" },
  { label: "Stack Alignment", pct: 15, color: "#009968" },
  { label: "Consistency", pct: 12, color: "#008258" },
  { label: "Community Signal", pct: 8, color: "#006B48" },
];

const EVIDENCE_CATEGORIES = [
  {
    category: "Verifiable Build History",
    items: ["Commit patterns across relevant repos", "Contribution depth and ownership signals"],
  },
  {
    category: "Relevant Repo Footprint",
    items: ["Top contributor to high-signal repositories", "Maintainer and reviewer activity"],
  },
  {
    category: "Recency and Consistency",
    items: ["Active contribution within target timeframes", "Sustained engagement vs. one-off activity"],
  },
  {
    category: "Stack Alignment",
    items: ["Language and framework match to role", "Tooling and infrastructure relevance"],
  },
  {
    category: "Signal Over Claims",
    items: ["No self-reported data in scoring", "Every signal traceable to source"],
  },
  {
    category: "Machine-Readable Output",
    items: ["Structured evidence objects for agent consumption", "Score breakdowns for downstream ranking"],
  },
];

export function EEASourcing() {
  return (
    <section id="eea" className="py-24 md:py-32">
      <div className="section-container">
        {/* Evidence Score */}
        <AnimateOnScroll>
          <div className="mb-10">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              Evidence Score
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              Evidence your recruiter agents can trust
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              Every candidate is backed by concrete OSS activity, repo context,
              contribution recency, and stack alignment.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <div className="panel-card p-6 mb-8">
            <div className="flex flex-wrap gap-2 mb-6">
              {EVIDENCE_DIMENSIONS.map((dim) => (
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
              <span className="px-2 py-1 bg-sk-panel border border-sk-border rounded">Structured Output</span>
              <span className="px-2 py-1 bg-sk-panel border border-sk-border rounded">Agent-Consumable</span>
              <span className="px-2 py-1 bg-sk-panel border border-sk-border rounded">Auditable Scoring</span>
              <span className="px-2 py-1 bg-sk-panel border border-sk-border rounded">GitHub-Verified</span>
            </div>
          </div>
        </AnimateOnScroll>

        {/* Evidence Framework */}
        <AnimateOnScroll delay={200}>
          <div className="mb-10 mt-16">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              Evidence Framework
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold text-white mt-3 tracking-tight">
              Proof over profile claims
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              Verifiable signal extracted from real engineering work.
              Every data point maps back to a repo, commit, or contribution.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={300}>
          <div className="panel-card p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {EVIDENCE_CATEGORIES.map((group) => (
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
