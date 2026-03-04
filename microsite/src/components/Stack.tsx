import { AnimateOnScroll } from "./AnimateOnScroll";

const STACK_ITEMS = [
  { label: "React", category: "frontend" },
  { label: "TypeScript", category: "frontend" },
  { label: "Tailwind CSS", category: "frontend" },
  { label: "Vite", category: "tooling" },
  { label: "Claude API", category: "ai" },
  { label: "Exa Search", category: "ai" },
  { label: "Exa Websets", category: "ai" },
  { label: "Supabase", category: "backend" },
  { label: "PostgreSQL", category: "backend" },
  { label: "Vercel", category: "infra" },
  { label: "GitHub API", category: "data" },
  { label: "Node.js", category: "backend" },
] as const;

export function Stack() {
  return (
    <section id="stack" className="py-24 md:py-32">
      <div className="section-container">
        <AnimateOnScroll>
          <div className="mb-10">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              Stack
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              Under the hood
            </h2>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <div className="flex flex-wrap gap-2.5 overflow-x-auto pb-2">
            {STACK_ITEMS.map((item) => (
              <span
                key={item.label}
                className="
                  inline-flex items-center px-4 py-2
                  font-mono text-xs font-medium
                  text-sk-muted
                  bg-sk-panel border border-sk-border rounded-full
                  hover:text-sk-accent hover:border-sk-accent/30
                  transition-colors duration-200
                  whitespace-nowrap flex-shrink-0
                "
              >
                {item.label}
              </span>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
