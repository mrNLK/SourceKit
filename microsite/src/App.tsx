import { useState } from "react";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ProductOverview } from "@/components/ProductOverview";
import { Features } from "@/components/Features";
import { EEASourcing } from "@/components/EEASourcing";
import { ScreensDemos } from "@/components/ScreensDemos";
import { Stack } from "@/components/Stack";
import { Footer } from "@/components/Footer";
import { PosterModal } from "@/components/PosterModal";

export default function App() {
  const activeSection = useScrollSpy();
  const [posterOpen, setPosterOpen] = useState(false);

  return (
    <>
      <Header activeSection={activeSection} />
      <main>
        <Hero onOpenPoster={() => setPosterOpen(true)} />
        <ProductOverview />
        <Features />
        <EEASourcing />
        <ScreensDemos />
        <Stack />
      </main>
      <Footer />
      {posterOpen && <PosterModal onClose={() => setPosterOpen(false)} />}
    </>
  );
}
