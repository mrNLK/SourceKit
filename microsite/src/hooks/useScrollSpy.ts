import { useEffect, useState } from "react";

const SECTIONS = [
  "hero",
  "overview",
  "features",
  "eea",
  "screens",
  "stack",
] as const;

export type SectionId = (typeof SECTIONS)[number];

export function useScrollSpy(): SectionId {
  const [active, setActive] = useState<SectionId>("hero");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visible = new Map<string, boolean>();

    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          visible.set(id, entry.isIntersecting);

          for (const sectionId of SECTIONS) {
            if (visible.get(sectionId)) {
              setActive(sectionId);
              break;
            }
          }
        },
        { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  return active;
}
