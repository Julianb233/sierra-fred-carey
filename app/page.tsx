"use client";

import dynamic from "next/dynamic";

// Dynamic imports with SSR disabled to prevent framer-motion@12 useContext crash
// during static generation (React 19 SSG compatibility issue)
const Hero = dynamic(() => import("@/components/hero"), { ssr: false });
const Features = dynamic(() => import("@/components/features"), { ssr: false });
const Stats = dynamic(() => import("@/components/stats"), { ssr: false });
const Testimonials = dynamic(() => import("@/components/testimonials"), { ssr: false });
const Pricing = dynamic(() => import("@/components/pricing"), { ssr: false });
const Faq = dynamic(() => import("@/components/faq"), { ssr: false });
const Footer = dynamic(() => import("@/components/footer"), { ssr: false });
const ScrollProgress = dynamic(
  () => import("@/components/premium/ScrollProgress").then((mod) => ({ default: mod.ScrollProgress })),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="flex flex-col min-h-dvh relative">
      {/* Scroll progress indicator */}
      <ScrollProgress />

      {/* Page sections */}
      <Hero />
      <Features />
      <Stats />
      <Testimonials />
      <Pricing />
      <Faq />
      <Footer />
    </main>
  );
}
