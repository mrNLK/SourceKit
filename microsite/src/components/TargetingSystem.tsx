export function TargetingSystem() {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80">
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer rotating ring */}
        <g className="origin-center animate-target-rotate">
          <circle
            cx="100"
            cy="100"
            r="90"
            stroke="var(--sk-accent)"
            strokeWidth="0.5"
            opacity="0.2"
          />
          {[0, 90, 180, 270].map((deg) => (
            <line
              key={deg}
              x1="100"
              y1="6"
              x2="100"
              y2="16"
              stroke="var(--sk-accent)"
              strokeWidth="1"
              opacity="0.4"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
        </g>

        {/* Middle ring with dashes */}
        <circle
          cx="100"
          cy="100"
          r="65"
          stroke="var(--sk-accent)"
          strokeWidth="0.5"
          strokeDasharray="4 8"
          opacity="0.25"
        />

        {/* Pulsing ring */}
        <circle
          cx="100"
          cy="100"
          r="40"
          stroke="var(--sk-accent)"
          strokeWidth="1"
          opacity="0.2"
          className="animate-ring-pulse"
        />

        {/* Inner targeting reticle */}
        <circle
          cx="100"
          cy="100"
          r="20"
          stroke="var(--sk-accent)"
          strokeWidth="1"
          opacity="0.5"
        />

        {/* Crosshairs */}
        <line
          x1="100"
          y1="72"
          x2="100"
          y2="88"
          stroke="var(--sk-accent)"
          strokeWidth="1"
          opacity="0.6"
        />
        <line
          x1="100"
          y1="112"
          x2="100"
          y2="128"
          stroke="var(--sk-accent)"
          strokeWidth="1"
          opacity="0.6"
        />
        <line
          x1="72"
          y1="100"
          x2="88"
          y2="100"
          stroke="var(--sk-accent)"
          strokeWidth="1"
          opacity="0.6"
        />
        <line
          x1="112"
          y1="100"
          x2="128"
          y2="100"
          stroke="var(--sk-accent)"
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Center dot */}
        <circle
          cx="100"
          cy="100"
          r="3"
          fill="var(--sk-accent)"
          className="animate-pulse"
        />

        {/* Corner bracket marks (static) */}
        {[
          { x: 30, y: 30, path: "M40,30 L30,30 L30,40" },
          { x: 170, y: 30, path: "M160,30 L170,30 L170,40" },
          { x: 30, y: 170, path: "M30,160 L30,170 L40,170" },
          { x: 170, y: 170, path: "M170,160 L170,170 L160,170" },
        ].map(({ path }, i) => (
          <path
            key={i}
            d={path}
            stroke="var(--sk-accent)"
            strokeWidth="1.5"
            fill="none"
            opacity="0.35"
          />
        ))}

        {/* Data labels */}
        <text
          x="155"
          y="45"
          fill="var(--sk-accent)"
          fontSize="6"
          fontFamily="JetBrains Mono, monospace"
          opacity="0.4"
        >
          SRC.01
        </text>
        <text
          x="30"
          y="170"
          fill="var(--sk-accent)"
          fontSize="6"
          fontFamily="JetBrains Mono, monospace"
          opacity="0.4"
        >
          LOCK
        </text>
      </svg>

      {/* Subtle glow behind */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--sk-accent) 0%, transparent 70%)" }}
      />
    </div>
  );
}
