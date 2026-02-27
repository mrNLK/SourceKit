interface SourceKitLogoProps {
  size?: number
  className?: string
}

export function SourceKitLogo({ size = 32, className }: SourceKitLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-140 -95 280 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="sourcekit-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00E5C3" />
          <stop offset="100%" stopColor="#00BFA5" />
        </linearGradient>
      </defs>
      {/* Left chevron */}
      <path
        d="M-55,-75 L-120,0 L-55,75"
        stroke="url(#sourcekit-grad)"
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center slash */}
      <line
        x1="25"
        y1="-70"
        x2="-25"
        y2="70"
        stroke="url(#sourcekit-grad)"
        strokeWidth={18}
        strokeLinecap="round"
        opacity={0.55}
      />
      {/* Right chevron */}
      <path
        d="M55,-75 L120,0 L55,75"
        stroke="url(#sourcekit-grad)"
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
