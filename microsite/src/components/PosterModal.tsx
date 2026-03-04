import { useEffect } from "react";

interface PosterModalProps {
  onClose: () => void;
}

export function PosterModal({ onClose }: PosterModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-sk-bg/90 backdrop-blur-sm" />

      {/* Poster */}
      <div
        className="relative z-10 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-sk-muted hover:text-white font-mono text-xs transition-colors"
        >
          ESC to close
        </button>

        <div className="panel-card p-8 md:p-10">
          <svg
            viewBox="0 0 500 700"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
          >
            <defs>
              <pattern
                id="poster-grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="#1e1e28"
                  strokeWidth="0.3"
                />
              </pattern>
              <radialGradient
                id="poster-logo-glow"
                cx="250"
                cy="56"
                r="100"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="#00E5A0" stopOpacity="0.08" />
                <stop offset="1" stopColor="#00E5A0" stopOpacity="0" />
              </radialGradient>
              <filter
                id="poster-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background */}
            <rect width="500" height="700" rx="8" fill="#0A0A0F" />
            <rect
              width="500"
              height="700"
              rx="8"
              fill="url(#poster-grid)"
              opacity="0.4"
            />
            <rect
              x="1"
              y="1"
              width="498"
              height="698"
              rx="7"
              stroke="#1e1e28"
              strokeWidth="1"
              fill="none"
            />

            {/* Logo ambient glow */}
            <circle cx="250" cy="56" r="100" fill="url(#poster-logo-glow)" />

            {/* Native SourceKit logo — centered at (250, 56), ~56px */}
            <g
              transform="translate(222, 28) scale(1.167)"
              filter="url(#poster-glow)"
            >
              <line
                x1="17"
                y1="8"
                x2="6"
                y2="20"
                stroke="#00E5A0"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <line
                x1="6"
                y1="28"
                x2="17"
                y2="40"
                stroke="#00E5A0"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <line
                x1="31"
                y1="8"
                x2="42"
                y2="20"
                stroke="#00E5A0"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <line
                x1="42"
                y1="28"
                x2="31"
                y2="40"
                stroke="#00E5A0"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <line
                x1="24"
                y1="9"
                x2="24"
                y2="17"
                stroke="#00E5A0"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="24" cy="24" r="3.5" fill="#00E5A0" />
              <line
                x1="24"
                y1="31"
                x2="24"
                y2="39"
                stroke="#00E5A0"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>

            {/* Wordmark */}
            <text
              x="250"
              y="105"
              fill="#F0F0F5"
              fontSize="22"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
              textAnchor="middle"
              letterSpacing="1"
            >
              SourceKit
            </text>
            <text
              x="250"
              y="126"
              fill="#9E9E9E"
              fontSize="11"
              fontFamily="DM Sans, sans-serif"
              textAnchor="middle"
            >
              Technical sourcing on GitHub signal
            </text>

            {/* Divider */}
            <line
              x1="150"
              y1="148"
              x2="350"
              y2="148"
              stroke="#1e1e28"
              strokeWidth="0.5"
            />

            {/* === WORKFLOW === */}
            <text
              x="46"
              y="176"
              fill="#00E5A0"
              fontSize="8"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="2"
            >
              WORKFLOW
            </text>
            {["Criteria", "Search", "Extract"].map((step, i) => (
              <g key={step}>
                <rect
                  x={46 + i * 148}
                  y="188"
                  width="136"
                  height="40"
                  rx="4"
                  fill="#111116"
                  stroke="#1e1e28"
                />
                <text
                  x={114 + i * 148}
                  y="213"
                  fill="#F0F0F5"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {step}
                </text>
                {i < 2 && (
                  <>
                    <line
                      x1={184 + i * 148}
                      y1="208"
                      x2={192 + i * 148}
                      y2="208"
                      stroke="#00E5A0"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                    <path
                      d={`M${190 + i * 148},205 L${194 + i * 148},208 L${190 + i * 148},211`}
                      stroke="#00E5A0"
                      strokeWidth="1"
                      fill="none"
                      opacity="0.5"
                    />
                  </>
                )}
              </g>
            ))}

            {/* === CAPABILITIES === */}
            <text
              x="46"
              y="262"
              fill="#00E5A0"
              fontSize="8"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="2"
            >
              CAPABILITIES
            </text>
            {[
              { title: "Repo Discovery", provider: "Exa Search" },
              { title: "Persistent Pools", provider: "Exa Websets" },
              { title: "Parallel Eval", provider: "Claude" },
            ].map((feat, i) => (
              <g key={feat.title}>
                <rect
                  x={46 + i * 148}
                  y="274"
                  width="136"
                  height="64"
                  rx="4"
                  fill="#111116"
                  stroke="#1e1e28"
                />
                <text
                  x={58 + i * 148}
                  y="298"
                  fill="#F0F0F5"
                  fontSize="10"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight="600"
                >
                  {feat.title}
                </text>
                <text
                  x={58 + i * 148}
                  y="316"
                  fill="#9E9E9E"
                  fontSize="8"
                  fontFamily="DM Sans, sans-serif"
                >
                  {feat.provider}
                </text>
                <rect
                  x={58 + i * 148}
                  y="326"
                  width="36"
                  height="2"
                  rx="1"
                  fill="#00E5A0"
                  opacity="0.3"
                />
              </g>
            ))}

            {/* === EEA SIGNALS === */}
            <text
              x="46"
              y="372"
              fill="#00E5A0"
              fontSize="8"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="2"
            >
              EEA SIGNALS
            </text>
            {[
              {
                title: "Experience",
                bars: [
                  { l: "Streaks", v: 92 },
                  { l: "Collab", v: 78 },
                  { l: "Maintained", v: 65 },
                ],
              },
              {
                title: "Expertise",
                bars: [
                  { l: "Code", v: 88 },
                  { l: "Tests", v: 83 },
                  { l: "Docs", v: 71 },
                ],
              },
            ].map((card, ci) => (
              <g key={card.title}>
                <rect
                  x={46 + ci * 220}
                  y="384"
                  width="208"
                  height="120"
                  rx="4"
                  fill="#111116"
                  stroke="#1e1e28"
                />
                <text
                  x={60 + ci * 220}
                  y="408"
                  fill="#F0F0F5"
                  fontSize="10"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight="600"
                >
                  {card.title}
                </text>
                {card.bars.map((bar, bi) => (
                  <g key={bar.l}>
                    <text
                      x={60 + ci * 220}
                      y={434 + bi * 24}
                      fill="#9E9E9E"
                      fontSize="7"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {bar.l}
                    </text>
                    <rect
                      x={118 + ci * 220}
                      y={428 + bi * 24}
                      width="108"
                      height="4"
                      rx="2"
                      fill="#1e1e28"
                    />
                    <rect
                      x={118 + ci * 220}
                      y={428 + bi * 24}
                      width={(108 * bar.v) / 100}
                      height="4"
                      rx="2"
                      fill="#00E5A0"
                      opacity="0.7"
                    />
                    <text
                      x={234 + ci * 220}
                      y={434 + bi * 24}
                      fill="#00E5A0"
                      fontSize="7"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="end"
                    >
                      {bar.v}%
                    </text>
                  </g>
                ))}
              </g>
            ))}

            {/* === STACK === */}
            <text
              x="46"
              y="538"
              fill="#00E5A0"
              fontSize="8"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="2"
            >
              STACK
            </text>
            {[
              ["React", "TypeScript", "Tailwind", "Claude"],
              ["Exa", "Supabase", "Node.js", "Vercel"],
            ].map((row, ri) =>
              row.map((tech, ti) => (
                <g key={tech}>
                  <rect
                    x={46 + ti * 110}
                    y={550 + ri * 32}
                    width="100"
                    height="24"
                    rx="12"
                    fill="#111116"
                    stroke="#1e1e28"
                  />
                  <text
                    x={96 + ti * 110}
                    y={566 + ri * 32}
                    fill="#9E9E9E"
                    fontSize="8"
                    fontFamily="JetBrains Mono, monospace"
                    textAnchor="middle"
                  >
                    {tech}
                  </text>
                </g>
              ))
            )}

            {/* === FOOTER === */}
            <line
              x1="46"
              y1="628"
              x2="454"
              y2="628"
              stroke="#1e1e28"
              strokeWidth="0.5"
            />
            <text
              x="46"
              y="652"
              fill="#9E9E9E"
              fontSize="9"
              fontFamily="DM Sans, sans-serif"
            >
              sourcekit.dev
            </text>
            <text
              x="454"
              y="652"
              fill="#9E9E9E"
              fontSize="7"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="end"
              opacity="0.5"
            >
              Built with signal
            </text>

            {/* Corner accents */}
            <path
              d="M12,24 L12,12 L24,12"
              stroke="#00E5A0"
              strokeWidth="1"
              fill="none"
              opacity="0.15"
            />
            <path
              d="M476,12 L488,12 L488,24"
              stroke="#00E5A0"
              strokeWidth="1"
              fill="none"
              opacity="0.15"
            />
            <path
              d="M12,676 L12,688 L24,688"
              stroke="#00E5A0"
              strokeWidth="1"
              fill="none"
              opacity="0.15"
            />
            <path
              d="M476,688 L488,688 L488,676"
              stroke="#00E5A0"
              strokeWidth="1"
              fill="none"
              opacity="0.15"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
