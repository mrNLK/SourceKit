import { useEffect, useCallback, type ReactNode } from "react";

interface LightboxItem {
  title: string;
  content: ReactNode;
}

interface LightboxProps {
  items: LightboxItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function Lightbox({
  items,
  currentIndex,
  onClose,
  onNavigate,
}: LightboxProps) {
  const goNext = useCallback(() => {
    onNavigate((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, onNavigate]);

  const goPrev = useCallback(() => {
    onNavigate((currentIndex - 1 + items.length) % items.length);
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  const item = items[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-sk-bg/90 backdrop-blur-sm" />

      {/* Content */}
      <div
        className="relative z-10 w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-sk-muted hover:text-white font-mono text-xs transition-colors"
        >
          ESC to close
        </button>

        {/* Image container */}
        <div className="panel-card overflow-hidden">
          <div className="aspect-[16/10]">{item.content}</div>
          <div className="p-4 flex items-center justify-between">
            <span className="font-mono text-sm text-white">{item.title}</span>
            <span className="font-mono text-xs text-sk-muted">
              {currentIndex + 1} / {items.length}
            </span>
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="flex justify-between mt-4">
          <button
            onClick={goPrev}
            className="panel-card px-4 py-2 font-mono text-xs text-sk-muted hover:text-sk-accent transition-colors"
          >
            Prev
          </button>
          <button
            onClick={goNext}
            className="panel-card px-4 py-2 font-mono text-xs text-sk-muted hover:text-sk-accent transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
