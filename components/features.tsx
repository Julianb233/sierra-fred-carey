"use client";

import { motion } from "framer-motion";
import { Card3D } from "@/components/premium/Card3D";
import { FadeUpOnScroll } from "@/components/premium/AnimatedText";
import { Parallax } from "@/components/premium/ParallaxSection";
import { GradientBg } from "@/components/premium/GradientBg";
import { PhoneMockup, PhoneScreenChat } from "@/components/premium/PhoneMockup";
import {
  LightningBoltIcon,
  RocketIcon,
  PersonIcon,
  TargetIcon,
  ChatBubbleIcon,
  LayersIcon,
} from "@radix-ui/react-icons";

export default function Features() {
  const features = [
    {
      icon: LightningBoltIcon,
      title: "Startup Reality Lens",
      description:
        "Evaluate feasibility, economics, demand, distribution, and timing for any startup idea. No sugarcoating.",
      color: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      icon: TargetIcon,
      title: "Investor Readiness Score",
      description:
        "Know exactly where you stand before approaching investors. Get clear guidance on what to fix first.",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: RocketIcon,
      title: "Pitch Deck Review",
      description:
        "Detailed scorecard, objection list, and rewrite guidance. Prepare for every investor question.",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: LayersIcon,
      title: "Strategy Documents",
      description:
        "Executive summaries, diagnosis frameworks, options & tradeoffs, and 30/60/90-day action plans.",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: PersonIcon,
      title: "Virtual Team Agents",
      description:
        "AI agents for Founder Ops, Fundraise Ops, Growth Ops, and Inbox management. Replace scattered tools.",
      color: "from-red-500 to-rose-500",
      bgColor: "bg-red-500/10",
    },
    {
      icon: ChatBubbleIcon,
      title: "Weekly Check-Ins",
      description:
        "Automated SMS check-ins that keep you accountable. Persistent memory tracks your progress over time.",
      color: "from-indigo-500 to-violet-500",
      bgColor: "bg-indigo-500/10",
    },
  ];

  const chatMessages = [
    { role: "user" as const, text: "Should I raise funding now?" },
    { role: "ai" as const, text: "Let me analyze your readiness. Based on your metrics, you're at 73% investor readiness..." },
    { role: "user" as const, text: "What should I focus on?" },
    { role: "ai" as const, text: "Priority: Validate unit economics. Your CAC/LTV ratio needs work before approaching VCs." },
  ];

  return (
    <section id="features" className="relative w-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <GradientBg variant="aurora" className="opacity-30" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24">
        {/* Section header */}
        <FadeUpOnScroll className="text-center mb-12 sm:mb-16 md:mb-20">
          <motion.span
            className="inline-block text-xs sm:text-sm font-medium text-primary bg-primary/10 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-4"
          >
            CAPABILITIES
          </motion.span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            Everything Founders Need
          </h2>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground px-4">
            From ideation to fundraising to scaling — the Decision OS supports you at every stage
            with tools built by someone who&apos;s been there.
          </p>
        </FadeUpOnScroll>

        {/* Features grid with 3D cards - Single column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-16 sm:mb-20 md:mb-24">
          {features.map((feature, index) => (
            <FadeUpOnScroll key={feature.title} delay={index * 0.1}>
              <Card3D
                className="h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 sm:p-6 group hover:border-primary/30 transition-colors touch-target"
                rotationIntensity={8}
              >
                <div className="relative z-10">
                  {/* Icon with gradient background */}
                  <div className={`mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-xl ${feature.bgColor} w-fit group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
                  </div>

                  {/* Title with gradient on hover */}
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300"
                      style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}>
                    {feature.title}
                  </h3>

                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Hover indicator - Hidden on mobile */}
                  <motion.div
                    className="mt-3 sm:mt-4 hidden sm:flex items-center gap-2 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    whileHover={{ x: 5 }}
                  >
                    Learn more →
                  </motion.div>
                </div>

                {/* Decorative gradient orb */}
                <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-r ${feature.color} rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500`} />
              </Card3D>
            </FadeUpOnScroll>
          ))}
        </div>

        {/* Interactive demo section */}
        <div className="relative">
          <FadeUpOnScroll className="text-center mb-8 sm:mb-12 px-4">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">
              See It In Action
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Real conversations with the Founder Decision OS that help you make better decisions.
            </p>
          </FadeUpOnScroll>

          <div className="flex justify-center px-4">
            <Parallax speed={0.2}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative max-w-sm mx-auto"
              >
                {/* Glow behind phone - Smaller on mobile */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] bg-primary/15 rounded-full blur-[60px] sm:blur-[80px]" />

                <PhoneMockup floating={true} className="relative z-10">
                  <PhoneScreenChat messages={chatMessages} />
                </PhoneMockup>
              </motion.div>
            </Parallax>
          </div>
        </div>
      </div>
    </section>
  );
}
