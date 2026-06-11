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
    title: "AI Strategy",
    description: "Role analysis, company context, and generated search strategy",
    src: "/screens/screenshot_strategy.png",
  },
  {
    id: "skills",
    title: "Skills & Criteria",
    description: "Parsed skills, experience requirements, and weighted criteria",
    src: "/screens/screenshot_skills.png",
  },
  {
    id: "search-analyzing",
    title: "Search — Analyzing",
    description: "Real-time AI analysis of candidate repositories",
    src: "/screens/screenshot_search_analyzing.png",
  },
  {
    id: "search-progress",
    title: "Search — Progress",
    description: "Live pipeline tracking as candidates are scored",
    src: "/screens/screenshot_search_progress.png",
  },
  {
    id: "search-results",
    title: "Search Results",
    description: "Ranked engineers with match scores and skill breakdowns",
    src: "/screens/screenshot_search_results.png",
  },
  {
    id: "repositories",
    title: "Repos & Companies",
    description: "Repository analysis with company and contribution context",
    src: "/screens/screenshot_repositories_companies.png",
  },
  {
    id: "websets",
    title: "Websets",
    description: "Persistent Exa-powered searches with enrichment criteria",
    src: "/screens/screenshot_websets.png",
  },
  {
    id: "eea-webset",
    title: "EEA Webset",
    description: "Webset creation with custom search and enrichment rules",
    src: "/screens/screenshot_eea_webset.png",
  },
  {
    id: "eea-signals-top",
    title: "EEA Signals",
    description: "Enrichment signals and candidate intelligence overview",
    src: "/screens/screenshot_eea_signals_top.png",
  },
  {
    id: "eea-signals-bottom",
    title: "EEA Details",
    description: "Detailed enrichment results and extracted data points",
    src: "/screens/screenshot_eea_signals_bottom.png",
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
