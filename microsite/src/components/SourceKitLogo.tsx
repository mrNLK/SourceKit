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
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="8"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M14 18L24 14L34 18V30L24 34L14 30V18Z"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M24 14V34"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.5"
      />
      <path
        d="M14 18L34 30"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.3"
      />
      <path
        d="M34 18L14 30"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.3"
      />
      <circle cx="24" cy="24" r="3" fill={color} opacity="0.8" />
    </svg>
  );
}
