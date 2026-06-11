import * as React from "react";
import { SourceKitMark } from "./SourceKitMark";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  size?: number; // height in px for the mark
  title?: string;
  className?: string;
  markClassName?: string;
  sourceClassName?: string;
  kitClassName?: string;
};

/**
 * SourceKitLogo
 * Mark + wordmark lockup (transparent background).
 * Typography assumes DM Sans is loaded in the app.
 */
export function SourceKitLogo({
  size = 24,
  title = "SourceKit",
  className,
  markClassName,
  sourceClassName,
  kitClassName,
  ...rest
}: Props) {
  return (
    <div
      aria-label={title}
      {...rest}
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 12, ...rest.style }}
    >
      <SourceKitMark
        width={size}
        height={size}
        className={markClassName}
        // canonical mark uses neutral foreground in UI lockups
      />
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 0 }}>
        <span
          className={sourceClassName}
          style={{ fontFamily: "DM Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", fontWeight: 600, color: "var(--accent-primary, #006EE6)" }}
        >
          Source
        </span>
        <span
          className={kitClassName}
          style={{ fontFamily: "DM Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", fontWeight: 500, color: "var(--fg-primary, #0F172A)" }}
        >
          Kit
        </span>
      </span>
    </div>
  );
}
