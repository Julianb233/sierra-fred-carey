"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { PhoneMockup, PhoneScreenDashboard } from "@/components/premium/PhoneMockup";
import { GradientBg, FloatingOrbs, GridPattern } from "@/components/premium/GradientBg";
import { GradientText, FadeUp, StaggerContainer, StaggerItem, HighlightText } from "@/components/premium/AnimatedText";
import { GlassCard3D } from "@/components/premium/Card3D";
import { CheckIcon, RocketIcon, LightningBoltIcon, TargetIcon } from "@radix-ui/react-icons";

export default function Hero() {
  const dashboardItems = [
    { label: "Business Model", value: "Validated", color: "text-green-400" },
    { label: "Market Timing", value: "Optimal", color: "text-green-400" },
    { label: "Team Readiness", value: "Strong", color: "text-blue-400" },
    { label: "Funding Strategy", value: "Pre-Seed", color: "text-purple-400" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <GradientBg variant="mesh" className="opacity-50" />
      <FloatingOrbs />
      <GridPattern className="opacity-30" />

      {/* Main content */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 pt-20 pb-32 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left side - Text content */}
          <div className="flex flex-col space-y-8">
            <FadeUp delay={0.1}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 w-fit bg-primary/10 border border-primary/20 px-4 py-2 rounded-full"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-sm font-medium text-primary">By Fred Cary • 10,000+ Founders Coached</span>
              </motion.div>
            </FadeUp>

            <FadeUp delay={0.2}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Think Clearer.{" "}
                <GradientText from="from-primary" via="via-blue-500" to="to-purple-500">
                  Raise Smarter.
                </GradientText>{" "}
                Scale Faster.
              </h1>
            </FadeUp>

            <FadeUp delay={0.3}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                The AI-powered <HighlightText color="primary">decision operating system</HighlightText> that helps founders
                build real businesses, prepare for fundraising, and scale with leverage.
              </p>
            </FadeUp>

            <FadeUp delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="text-lg px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                  <Link href="/get-started">
                    Get Started Free
                    <RocketIcon className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 group">
                  <Link href="#features">
                    See How It Works
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="ml-2"
                    >
                      →
                    </motion.span>
                  </Link>
                </Button>
              </div>
            </FadeUp>

            {/* Trust indicators */}
            <FadeUp delay={0.5}>
              <div className="flex flex-wrap gap-6 pt-4">
                <StaggerContainer staggerDelay={0.1} className="flex flex-wrap gap-4 md:gap-8">
                  {[
                    { icon: CheckIcon, text: "Free Forever Tier" },
                    { icon: LightningBoltIcon, text: "Instant Clarity" },
                    { icon: TargetIcon, text: "Investor-Ready" },
                  ].map((item, i) => (
                    <StaggerItem key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.text}
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </FadeUp>
          </div>

          {/* Right side - Phone mockup */}
          <div className="relative flex justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              {/* Glow effect behind phone */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]" />

              {/* Main phone */}
              <PhoneMockup rotate={5} className="relative z-10">
                <PhoneScreenDashboard
                  title="Founder Readiness Score"
                  score={87}
                  items={dashboardItems}
                />
              </PhoneMockup>

              {/* Floating cards around phone */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute -left-20 top-20 z-20"
              >
                <GlassCard3D className="p-4 min-w-[180px]" glowColor="green">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <CheckIcon className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reality Lens</p>
                      <p className="font-semibold text-sm">Validated</p>
                    </div>
                  </div>
                </GlassCard3D>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -right-16 bottom-32 z-20"
              >
                <GlassCard3D className="p-4 min-w-[160px]" glowColor="purple">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <TargetIcon className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Investor Ready</p>
                      <p className="font-semibold text-sm">87/100</p>
                    </div>
                  </div>
                </GlassCard3D>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-sm text-muted-foreground">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
        >
          <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" />
        </motion.div>
      </motion.div>
    </div>
  );
}
