import { useEffect } from "react";
import { SourceKitLogo } from "./SourceKitLogo";

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
          {/* Poster SVG */}
          <svg
            viewBox="0 0 500 700"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
          >
            {/* Background */}
            <rect width="500" height="700" rx="8" fill="#0A0A0F" />
            <rect
              x="1"
              y="1"
              width="498"
              height="698"
              rx="7"
              stroke="#1e1e28"
              strokeWidth="1"
            />

            {/* Header */}
            <g>
              <rect x="24" y="24" width="452" height="80" rx="6" fill="#111116" />
              <foreignObject x="36" y="36" width="40" height="40">
                <div>
                  <SourceKitLogo size={40} glow />
                </div>
              </foreignObject>
              <text
                x="88"
                y="55"
                fill="#F0F0F5"
                fontSize="18"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                SourceKit
              </text>
              <text
                x="88"
                y="78"
                fill="#9E9E9E"
                fontSize="10"
                fontFamily="DM Sans, sans-serif"
              >
                Technical sourcing on GitHub signal
              </text>
              <text
                x="420"
                y="55"
                fill="#00E5A0"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="end"
                opacity="0.6"
              >
                v1.0
              </text>
            </g>

            {/* Workflow section */}
            <text
              x="36"
              y="136"
              fill="#00E5A0"
              fontSize="8"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="2"
            >
              WORKFLOW
            </text>
            {["Define criteria", "Search repos", "Extract candidates", "Evaluate", "Engage"].map(
              (step, i) => (
                <g key={step}>
                  <rect
                    x={36 + i * 90}
                    y="148"
                    width="80"
                    height="36"
                    rx="4"
                    fill="#111116"
                    stroke="#1e1e28"
                  />
                  <text
                    x={76 + i * 90}
                    y="170"
                    fill="#F0F0F5"
                    fontSize="8"
                    fontFamily="DM Sans, sans-serif"
                    textAnchor="middle"
                  >
                    {step}
                  </text>
                  {i < 4 && (
                    <line
                      x1={116 + i * 90}
                      y1="166"
                      x2={126 + i * 90}
                      y2="166"
                      stroke="#00E5A0"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  )}
                </g>
              )
            )}

            {/* Features section */}
            <text
              x="36"
              y="220"
              fill="#00E5A0"
              fontSize="8"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="2"
            >
              FEATURES
            </text>
            {[
              { title: "Repo Discovery", desc: "Exa Search across GitHub" },
              { title: "Persistent Pools", desc: "Exa Websets monitoring" },
              { title: "Strategy + Eval", desc: "Claude parallel analysis" },
            ].map((feature, i) => (
              <g key={feature.title}>
                <rect
                  x={36 + i * 152}
                  y="232"
                  width="140"
                  height="64"
                  rx="4"
                  fill="#111116"
                  stroke="#1e1e28"
                />
                <text
                  x={50 + i * 152}
                  y="254"
                  fill="#F0F0F5"
                  fontSize="10"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight="600"
                >
                  {feature.title}
                </text>
                <text
                  x={50 + i * 152}
                  y="272"
                  fill="#9E9E9E"
                  fontSize="8"
                  fontFamily="DM Sans, sans-serif"
                >
                  {feature.desc}
                </text>
              </g>
            ))}

            {/* EEA section */}
            <text
              x="36"
              y="332"
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
                  { l: "Commits", v: 92 },
                  { l: "Reviews", v: 78 },
                  { l: "Issues", v: 65 },
                ],
              },
              {
                title: "Expertise",
                bars: [
                  { l: "Code", v: 88 },
                  { l: "Docs", v: 71 },
                  { l: "Tests", v: 83 },
                ],
              },
            ].map((card, ci) => (
              <g key={card.title}>
                <rect
                  x={36 + ci * 228}
                  y="344"
                  width="216"
                  height="120"
                  rx="4"
                  fill="#111116"
                  stroke="#1e1e28"
                />
                <text
                  x={50 + ci * 228}
                  y="366"
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
                      x={50 + ci * 228}
                      y={390 + bi * 22}
                      fill="#9E9E9E"
                      fontSize="7"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {bar.l}
                    </text>
                    <rect
                      x={100 + ci * 228}
                      y={384 + bi * 22}
                      width="120"
                      height="4"
                      rx="2"
                      fill="#1e1e28"
                    />
                    <rect
                      x={100 + ci * 228}
                      y={384 + bi * 22}
                      width={(120 * bar.v) / 100}
                      height="4"
                      rx="2"
                      fill="#00E5A0"
                      opacity="0.7"
                    />
                    <text
                      x={228 + ci * 228}
                      y={390 + bi * 22}
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

            {/* Stack section */}
            <text
              x="36"
              y="500"
              fill="#00E5A0"
              fontSize="8"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="2"
            >
              STACK
            </text>
            {[
              "React",
              "TypeScript",
              "Tailwind",
              "Vite",
              "Claude",
              "Exa",
              "Supabase",
              "Vercel",
            ].map((tech, i) => (
              <g key={tech}>
                <rect
                  x={36 + (i % 4) * 114}
                  y={512 + Math.floor(i / 4) * 32}
                  width="104"
                  height="24"
                  rx="12"
                  fill="#111116"
                  stroke="#1e1e28"
                />
                <text
                  x={88 + (i % 4) * 114}
                  y={528 + Math.floor(i / 4) * 32}
                  fill="#9E9E9E"
                  fontSize="8"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="middle"
                >
                  {tech}
                </text>
              </g>
            ))}

            {/* Footer */}
            <line
              x1="36"
              y1="600"
              x2="464"
              y2="600"
              stroke="#1e1e28"
              strokeWidth="0.5"
            />
            <text
              x="36"
              y="624"
              fill="#9E9E9E"
              fontSize="8"
              fontFamily="DM Sans, sans-serif"
            >
              sourcekit.dev
            </text>
            <text
              x="464"
              y="624"
              fill="#9E9E9E"
              fontSize="7"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="end"
              opacity="0.5"
            >
              Technical sourcing on GitHub signal
            </text>

            {/* Decorative corner accents */}
            <path
              d="M12,24 L12,12 L24,12"
              stroke="#00E5A0"
              strokeWidth="1"
              fill="none"
              opacity="0.2"
            />
            <path
              d="M488,12 L488,24"
              stroke="#00E5A0"
              strokeWidth="1"
              fill="none"
              opacity="0.2"
            />
            <path
              d="M476,12 L488,12"
              stroke="#00E5A0"
              strokeWidth="1"
              fill="none"
              opacity="0.2"
            />
            <path
              d="M12,676 L12,688 L24,688"
              stroke="#00E5A0"
              strokeWidth="1"
              fill="none"
              opacity="0.2"
            />
            <path
              d="M476,688 L488,688 L488,676"
              stroke="#00E5A0"
              strokeWidth="1"
              fill="none"
              opacity="0.2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
