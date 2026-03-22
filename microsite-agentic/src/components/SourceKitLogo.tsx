interface SourceKitLogoProps {
  size?: number;
  color?: string;
  glow?: boolean;
}

export function SourceKitLogo({
  size = 32,
  color = "var(--sk-accent)",
  glow = false,
}: SourceKitLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={glow ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}
    >
      {/* Left bracket — top segment */}
      <line
        x1="17" y1="8" x2="6" y2="20"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Left bracket — bottom segment */}
      <line
        x1="6" y1="28" x2="17" y2="40"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Right bracket — top segment */}
      <line
        x1="31" y1="8" x2="42" y2="20"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Right bracket — bottom segment */}
      <line
        x1="42" y1="28" x2="31" y2="40"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Center — top bar */}
      <line
        x1="24" y1="9" x2="24" y2="17"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Center — dot */}
      <circle cx="24" cy="24" r="3.5" fill={color} />
      {/* Center — bottom bar */}
      <line
        x1="24" y1="31" x2="24" y2="39"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
