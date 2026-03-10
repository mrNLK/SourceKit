import { SourceKitLogo } from "./SourceKitLogo";
import type { SectionId } from "@/hooks/useScrollSpy";

interface HeaderProps {
  activeSection: SectionId;
}

const NAV_ITEMS: { id: SectionId; label: string }[] = [
  { id: "overview", label: "How it Works" },
  { id: "features", label: "Features" },
  { id: "eea", label: "Builder Score" },
  { id: "screens", label: "Screens" },
  { id: "stack", label: "Stack" },
];

export function Header({ activeSection }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-sk-border bg-sk-bg/80 backdrop-blur-md">
      <div className="section-container flex items-center justify-between h-14">
        <a
          href="#hero"
          className="flex items-center gap-2.5 text-white no-underline"
        >
          <SourceKitLogo size={28} glow />
          <span className="font-mono text-sm font-semibold tracking-tight">
            SourceKit
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`
                relative px-3 py-1.5 text-xs font-mono tracking-wide transition-colors duration-200
                ${activeSection === id
                  ? "text-sk-accent"
                  : "text-sk-muted hover:text-white"
                }
              `}
            >
              {label}
              {activeSection === id && (
                <span className="absolute bottom-0 left-3 right-3 h-px bg-sk-accent" />
              )}
            </a>
          ))}
        </nav>

        <a
          href="#hero"
          className="text-xs font-mono text-sk-accent hover:text-white transition-colors duration-200"
        >
          Open SourceKit
        </a>
      </div>
    </header>
  );
}
