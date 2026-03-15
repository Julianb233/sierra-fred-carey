"use client";

import dynamic from "next/dynamic";
import Hero from "@/components/hero";

// Hero is imported directly so it SSR-renders immediately (no blank flash).
// Below-fold sections are lazy-loaded to keep the initial bundle small.
const Features = dynamic(() => import("@/components/features"));
const Pricing = dynamic(() => import("@/components/pricing"));
const Faq = dynamic(() => import("@/components/faq"));
const Footer = dynamic(() => import("@/components/footer"));
const ScrollProgress = dynamic(
  () => import("@/components/premium/ScrollProgress").then((mod) => ({ default: mod.ScrollProgress })),
);

export default function Home() {
  return (
    <main className="flex flex-col min-h-dvh relative">
      {/* Scroll progress indicator */}
      <ScrollProgress />

      {/* Page sections with anchor IDs for navigation */}
      <div id="hero"><Hero /></div>
      <Features />
      <Pricing />
      <Faq />
      <Footer />
    </main>
  );
}
