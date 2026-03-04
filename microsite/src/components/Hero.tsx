import { SourceKitLogo } from "./SourceKitLogo";
import { TargetingSystem } from "./TargetingSystem";
import { AnimateOnScroll } from "./AnimateOnScroll";

interface HeroProps {
  onOpenPoster: () => void;
}

export function Hero({ onOpenPoster }: HeroProps) {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center pt-14"
    >
      <div className="section-container w-full">
        <div className="grid md:grid-cols-2 gap-12 md:gap-8 items-center">
          {/* Left: wordmark + positioning */}
          <AnimateOnScroll direction="left">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <SourceKitLogo size={44} glow />
                <span className="font-mono text-2xl font-bold tracking-tight text-white">
                  SourceKit
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-semibold leading-tight tracking-tight text-white">
                Technical sourcing on GitHub signal.
              </h1>

              <p className="text-sk-muted text-base max-w-md leading-relaxed">
                Find engineers through what they actually build. SourceKit
                reads GitHub activity — commits, reviews, code quality — and
                turns it into a ranked shortlist.
              </p>

              <div className="flex items-center gap-4 pt-2">
                <button className="accent-gradient px-6 py-2.5 rounded-lg text-sk-bg font-mono text-sm font-semibold transition-shadow hover:shadow-lg hover:shadow-sk-accent/20">
                  Open SourceKit
                </button>
                <button
                  onClick={onOpenPoster}
                  className="px-4 py-2.5 text-sm font-mono text-sk-muted hover:text-sk-accent transition-colors duration-200 border border-sk-border rounded-lg hover:border-sk-accent/30"
                >
                  View Poster
                </button>
              </div>
            </div>
          </AnimateOnScroll>

          {/* Right: targeting system */}
          <AnimateOnScroll direction="right" delay={200}>
            <div className="flex justify-center md:justify-end">
              <TargetingSystem />
            </div>
          </AnimateOnScroll>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <span className="font-mono text-[10px] text-sk-muted tracking-widest uppercase">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-sk-accent to-transparent" />
      </div>
    </section>
  );
}
