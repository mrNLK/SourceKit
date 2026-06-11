import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

/**
 * SellKitMark
 * Canonical mark geometry: radar arcs over an origin point. Scale only.
 */
export const SellKitMark = React.forwardRef<SVGSVGElement, Props>(
  ({ title = "SellKit", ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      aria-label={title}
      role="img"
      {...props}
    >
      <path
        d="M76 136 A 44 44 0 0 1 120 180"
        stroke="currentColor"
        strokeWidth={20}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M76 104 A 76 76 0 0 1 152 180"
        stroke="currentColor"
        strokeWidth={20}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M76 72 A 108 108 0 0 1 184 180"
        stroke="currentColor"
        strokeWidth={20}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={76} cy={180} r={12} fill="currentColor" />
    </svg>
  )
);
SellKitMark.displayName = "SellKitMark";
