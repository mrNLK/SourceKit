import { useState } from "react";
import { AnimateOnScroll } from "./AnimateOnScroll";
import { Lightbox } from "./Lightbox";

interface ScreenItem {
  id: string;
  title: string;
  description: string;
  color: string;
}

const SCREENS: ScreenItem[] = [
  {
    id: "search",
    title: "Search",
    description: "Query repos by language, stars, activity",
    color: "#00E5A0",
  },
  {
    id: "pool",
    title: "Pool",
    description: "Ranked candidates with commit evidence",
    color: "#00B87A",
  },
  {
    id: "profile",
    title: "Profile",
    description: "Full GitHub activity breakdown",
    color: "#009966",
  },
  {
    id: "eval",
    title: "Eval report",
    description: "Technical assessment per candidate",
    color: "#00CC88",
  },
  {
    id: "webset",
    title: "Webset config",
    description: "Set up persistent search pipelines",
    color: "#00D699",
  },
  {
    id: "export",
    title: "Export",
    description: "Push to ATS or spreadsheet",
    color: "#00E5A0",
  },
];

function PlaceholderScreen({ item }: { item: ScreenItem }) {
  return (
    <svg
      viewBox="0 0 640 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <rect width="640" height="400" fill="#111116" />
      {/* Top bar */}
      <rect x="0" y="0" width="640" height="36" fill="#0A0A0F" />
      <circle cx="20" cy="18" r="4" fill={item.color} opacity="0.5" />
      <rect x="36" y="14" width="80" height="8" rx="2" fill="#1e1e28" />
      {/* Sidebar */}
      <rect x="0" y="36" width="160" height="364" fill="#0D0D12" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect
            x="16"
            y={56 + i * 36}
            width={100 + (i % 3) * 20}
            height="8"
            rx="2"
            fill="#1e1e28"
          />
        </g>
      ))}
      {/* Active sidebar item */}
      <rect x="8" y={56 + 2 * 36 - 8} width="144" height="24" rx="4" fill={item.color} opacity="0.1" />
      <rect x="16" y={56 + 2 * 36} width="80" height="8" rx="2" fill={item.color} opacity="0.4" />
      {/* Main content area */}
      <rect x="176" y="52" width="280" height="14" rx="3" fill="#1e1e28" />
      <rect x="176" y="76" width="200" height="8" rx="2" fill="#1a1a22" />
      {/* Cards */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x={176 + i * 152}
            y="104"
            width="140"
            height="100"
            rx="6"
            fill="#1a1a22"
            stroke="#1e1e28"
            strokeWidth="1"
          />
          <rect
            x={188 + i * 152}
            y="118"
            width="60"
            height="6"
            rx="2"
            fill={item.color}
            opacity={0.3 + i * 0.1}
          />
          <rect x={188 + i * 152} y="132" width="100" height="4" rx="1" fill="#1e1e28" />
          <rect x={188 + i * 152} y="142" width="80" height="4" rx="1" fill="#1e1e28" />
          <rect x={188 + i * 152} y="160" width="116" height="24" rx="4" fill="#1e1e28" />
        </g>
      ))}
      {/* Table rows */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="176" y={224 + i * 36} width="448" height="28" rx="4" fill={i % 2 === 0 ? "#131318" : "transparent"} />
          <rect x="188" y={232 + i * 36} width="120" height="6" rx="2" fill="#1e1e28" />
          <rect x="340" y={232 + i * 36} width="80" height="6" rx="2" fill="#1e1e28" />
          <rect x="460" y={232 + i * 36} width="60" height="6" rx="2" fill={item.color} opacity="0.2" />
          <rect x="560" y={230 + i * 36} width="48" height="12" rx="3" fill={item.color} opacity="0.15" />
        </g>
      ))}
      {/* Label */}
      <text
        x="320"
        y="388"
        textAnchor="middle"
        fill={item.color}
        fontSize="11"
        fontFamily="JetBrains Mono, monospace"
        opacity="0.5"
      >
        {item.title}
      </text>
    </svg>
  );
}

export function ScreensDemos() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <section id="screens" className="py-24 md:py-32">
      <div className="section-container">
        <AnimateOnScroll>
          <div className="mb-12">
            <span className="font-mono text-xs text-sk-accent tracking-widest uppercase">
              Screens
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 tracking-tight">
              Dense by default
            </h2>
            <p className="text-sk-muted text-sm mt-2 max-w-lg">
              High signal per pixel. Every screen shows what matters
              without burying it.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCREENS.map((screen, i) => (
            <AnimateOnScroll key={screen.id} delay={i * 80}>
              <button
                onClick={() => setLightboxIndex(i)}
                className="panel-card overflow-hidden w-full text-left group cursor-pointer"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <PlaceholderScreen item={screen} />
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
            content: <PlaceholderScreen item={s} />,
          }))}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </section>
  );
}
