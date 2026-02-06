import Hero from "@/components/hero";
import Features from "@/components/features";
import Stats from "@/components/stats";
import Testimonials from "@/components/testimonials";
import Pricing from "@/components/pricing";
import Faq from "@/components/faq";
import Footer from "@/components/footer";
import { ScrollProgress } from "@/components/premium/ScrollProgress";

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
