import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

/**
 * SourceKitMark
 * Canonical mark geometry. Do not edit paths or stroke widths; scale only.
 */
export const SourceKitMark = React.forwardRef<SVGSVGElement, Props>(
  ({ title = "SourceKit", ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      aria-label={title}
      role="img"
      {...props}
    >
      <path
        d="M88 72 L56 128 L88 184"
        stroke="currentColor"
        strokeWidth={20}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M168 72 L200 128 L168 184"
        stroke="currentColor"
        strokeWidth={20}
        strokeLinecap="round"
        fill="none"
      />
      <line
        x1={128}
        y1={88}
        x2={128}
        y2={64}
        stroke="currentColor"
        strokeWidth={11}
        strokeLinecap="round"
      />
      <line
        x1={128}
        y1={192}
        x2={128}
        y2={168}
        stroke="currentColor"
        strokeWidth={11}
        strokeLinecap="round"
      />
      <circle cx={128} cy={128} r={10} fill="currentColor" />
    </svg>
  )
);
SourceKitMark.displayName = "SourceKitMark";
