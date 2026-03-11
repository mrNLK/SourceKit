import { AnimateOnScroll } from "./AnimateOnScroll";

const API_LAYERS = [
  {
    title: "Presentation",
    items: [
      { name: "React + TypeScript", desc: "Mobile-first / OAuth / Search / Pipeline / Websets" },
    ],
  },
  {
    title: "AI Intelligence Layer",
    items: [
      { name: "Claude AI", desc: "Strategy / Scoring / Builder Score" },
      { name: "Exa + Websets", desc: "Neural search / Collections" },
      { name: "Parallel.ai", desc: "JD extraction" },
      { name: "GitHub API", desc: "Contributors / Commits / Code Quality" },
    ],
  },
  {
    title: "Data + Infrastructure",
    items: [
      { name: "Supabase", desc: "Auth / RLS / Pipeline" },
      { name: "Vercel", desc: "Edge" },
      { name: "Stripe", desc: "Billing" },
    ],
  },
];

const API_ENDPOINTS = [
  {
    api: "Exa API",
    count: 5,
    endpoints: ["Research", "Search", "Answer", "findSimilar", "Websets"],
  },
  {
    api: "Parallel API",
    count: 3,
    endpoints: ["Task", "FindAll", "Search"],
  },
  {
    api: "GitHub API + Builder Score",
    count: 3,
    endpoints: ["REST", "GraphQL", "Builder Score"],
  },
];

export function Architecture() {
  return (
    <section className="py-24 md:py-32">
      <div className="section-container">
        <AnimateOnScroll>
          <div className="mb-10">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              Architecture + API Surface
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              Under the hood
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="flex flex-col gap-6">
          {API_LAYERS.map((layer, i) => (
            <AnimateOnScroll key={layer.title} delay={i * 100}>
              <div className="panel-card p-6">
                <h3 className="font-mono text-xs font-semibold text-sk-accent uppercase tracking-widest mb-4">
                  {layer.title}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {layer.items.map((item) => (
                    <div
                      key={item.name}
                      className="bg-sk-bg border border-sk-border rounded-lg px-4 py-3 flex-1 min-w-[160px]"
                    >
                      <div className="font-mono text-sm font-medium text-white">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-sk-muted mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <AnimateOnScroll delay={400}>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {API_ENDPOINTS.map((api) => (
              <div key={api.api} className="panel-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs font-semibold text-sk-accent">
                    {api.api}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sk-accent/10 text-sk-accent border border-sk-accent/20">
                    {api.count} endpoints
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {api.endpoints.map((ep) => (
                    <div key={ep} className="flex items-center gap-2 text-xs text-sk-muted">
                      <span className="w-1 h-1 rounded-full bg-sk-accent flex-shrink-0" />
                      {ep}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
