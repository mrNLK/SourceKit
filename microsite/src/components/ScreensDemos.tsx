import { useState } from "react";
import { AnimateOnScroll } from "./AnimateOnScroll";
import { Lightbox } from "./Lightbox";

interface ScreenItem {
  id: string;
  title: string;
  description: string;
  src: string;
}

const SCREENS: ScreenItem[] = [
  {
    id: "strategy",
    title: "Strategy",
    description: "Role, company, generated search query, target repos",
    src: "/screens/strategy.png",
  },
  {
    id: "results",
    title: "Results",
    description: "Parsed criteria, matched engineers, scores",
    src: "/screens/results.png",
  },
  {
    id: "websets",
    title: "Websets",
    description: "Persistent search with criteria and enrichments",
    src: "/screens/websets.png",
  },
];

export function ScreensDemos() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <section id="screens" className="py-24 md:py-32">
      <div className="section-container">
        <AnimateOnScroll>
          <div className="mb-10">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              Screens
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              What it looks like
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-4">
          {SCREENS.map((screen, i) => (
            <AnimateOnScroll key={screen.id} delay={i * 100}>
              <button
                onClick={() => setLightboxIndex(i)}
                className="panel-card overflow-hidden w-full text-left group cursor-pointer"
              >
                <div className="aspect-[16/10] overflow-hidden bg-sk-panel">
                  <img
                    src={screen.src}
                    alt={screen.title}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <div className="font-mono text-xs font-semibold text-white group-hover:text-sk-accent transition-colors">
                    {screen.title}
                  </div>
                  <div className="text-xs text-sk-muted mt-1">
                    {screen.description}
                  </div>
                </div>
              </button>
            </AnimateOnScroll>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={SCREENS.map((s) => ({
            title: s.title,
            content: (
              <img
                src={s.src}
                alt={s.title}
                className="w-full h-full object-contain"
              />
            ),
          }))}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </section>
  );
}
