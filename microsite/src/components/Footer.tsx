import { SourceKitLogo } from "./SourceKitLogo";

export function Footer() {
  return (
    <footer className="border-t border-sk-border py-12">
      <div className="section-container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <SourceKitLogo size={20} color="var(--sk-muted)" />
            <span className="font-mono text-xs text-sk-muted">
              SourceKit Beta v2.0
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="#hero"
              className="font-mono text-xs text-sk-muted hover:text-sk-accent transition-colors duration-200"
            >
              Top
            </a>
            <a
              href="#overview"
              className="font-mono text-xs text-sk-muted hover:text-sk-accent transition-colors duration-200"
            >
              Overview
            </a>
            <a
              href="#features"
              className="font-mono text-xs text-sk-muted hover:text-sk-accent transition-colors duration-200"
            >
              Features
            </a>
            <a
              href="#stack"
              className="font-mono text-xs text-sk-muted hover:text-sk-accent transition-colors duration-200"
            >
              Stack
            </a>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://getsourcekit.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-sk-accent hover:text-white transition-colors duration-200 no-underline"
            >
              getsourcekit.vercel.app
            </a>
            <a
              href="https://sourcekit-docs.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-sk-muted/50 hover:text-sk-accent transition-colors duration-200 no-underline"
            >
              sourcekit-docs.netlify.app
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
