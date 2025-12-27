"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { RocketIcon, CheckIcon, LightningBoltIcon, TargetIcon, StarIcon } from "@radix-ui/react-icons";

export default function Hero() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Animated orange blob background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/25 rounded-full blur-[100px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-40 right-[15%] w-96 h-96 bg-orange-400/20 rounded-full blur-[120px]"
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 left-[20%] w-80 h-80 bg-amber-500/20 rounded-full blur-[100px]"
          animate={{
            x: [0, 40, 0],
            y: [0, -40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 right-[5%] w-64 h-64 bg-[#ff6a1a]/15 rounded-full blur-[80px]"
          animate={{
            x: [0, -60, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Main content */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-20">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">

          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-3 bg-[#ff6a1a]/10 dark:bg-[#ff6a1a]/20 px-5 py-2.5 rounded-full border border-[#ff6a1a]/30 hover:border-[#ff6a1a]/50 transition-all cursor-pointer backdrop-blur-sm"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6a1a] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff6a1a]"></span>
              </span>
              <span className="text-sm font-semibold text-[#ff6a1a]">
                By Fred Cary
              </span>
              <span className="text-sm text-gray-500 dark:text-muted-foreground">•</span>
              <span className="text-sm text-gray-600 dark:text-muted-foreground">10,000+ Founders Coached</span>
            </motion.div>
          </motion.div>

          {/* Main headline with animated gradient */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6"
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
              <span className="block">Think Clearer.</span>
              <span className="block text-[#ff6a1a] mt-2 relative inline-block">
                Raise Smarter.
                <motion.span
                  className="absolute -bottom-2 left-0 w-full h-3 bg-[#ff6a1a] opacity-20"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                  style={{ transformOrigin: "left" }}
                />
              </span>
              <span className="block mt-2 text-gray-700 dark:text-gray-300">Scale Faster.</span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mb-10 leading-relaxed"
          >
            The AI-powered{" "}
            <span className="text-gray-900 dark:text-white font-semibold">decision operating system</span>{" "}
            that helps founders build real businesses, prepare for fundraising, and scale with leverage.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 mb-12"
          >
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -15px rgba(255, 106, 26, 0.4)" }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                asChild
                size="lg"
                className="text-lg px-8 h-14 bg-[#ff6a1a] hover:bg-[#ea580c] text-white border-0 shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all duration-300"
              >
                <Link href="/get-started" className="flex items-center gap-2">
                  Get Started Free
                  <RocketIcon className="h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-8 h-14 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#ff6a1a] hover:text-[#ff6a1a] bg-transparent transition-all duration-300"
              >
                <Link href="#features" className="flex items-center gap-2">
                  See How It Works
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.span>
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-wrap justify-center gap-6 sm:gap-8 mb-16"
          >
            {[
              { icon: CheckIcon, text: "Free Forever Tier" },
              { icon: LightningBoltIcon, text: "Instant Clarity" },
              { icon: TargetIcon, text: "Investor-Ready" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <item.icon className="h-5 w-5 text-[#ff6a1a] flex-shrink-0" />
                <span className="font-medium">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Floating dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="relative w-full max-w-4xl"
          >
            {/* Glow effect behind card */}
            <div className="absolute inset-0 bg-[#ff6a1a]/10 blur-3xl" />

            {/* Main dashboard card */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-1 border border-gray-200 dark:border-gray-800 shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(255,106,26,0.2)] transition-shadow duration-500">
              <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-6 sm:p-8 backdrop-blur-sm">
                {/* Dashboard header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">founder-decision-os.app</div>
                </div>

                {/* Dashboard content */}
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Score card */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3 }}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <StarIcon className="h-5 w-5 text-[#ff6a1a]" />
                      <span className="font-medium text-gray-900 dark:text-white">Founder Readiness Score</span>
                    </div>
                    <div className="flex items-end gap-2 mb-4">
                      <span className="text-5xl font-bold text-[#ff6a1a]">87</span>
                      <span className="text-2xl text-gray-500 dark:text-gray-400 mb-1">/100</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "87%" }}
                        transition={{ duration: 1.5, delay: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[#ff6a1a] to-orange-400 rounded-full"
                      />
                    </div>
                  </motion.div>

                  {/* Metrics grid */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    {[
                      { label: "Business Model", value: "Validated", color: "text-green-600 dark:text-green-400" },
                      { label: "Market Timing", value: "Optimal", color: "text-green-600 dark:text-green-400" },
                      { label: "Team Readiness", value: "Strong", color: "text-[#ff6a1a]" },
                      { label: "Funding Stage", value: "Pre-Seed", color: "text-[#ff6a1a]" },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.5 + i * 0.1 }}
                        className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</div>
                        <div className={`text-sm font-semibold ${item.color}`}>{item.value}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Floating elements around dashboard */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.8 }}
              className="absolute -left-4 sm:-left-12 top-1/4 hidden lg:block"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-green-500/30 shadow-lg animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckIcon className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Reality Lens</div>
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">Validated</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2 }}
              className="absolute -right-4 sm:-right-12 bottom-1/4 hidden lg:block"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-[#ff6a1a]/30 shadow-lg animate-float-delayed">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#ff6a1a]/20 flex items-center justify-center">
                    <TargetIcon className="h-5 w-5 text-[#ff6a1a]" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Investor Ready</div>
                    <div className="text-sm font-semibold text-[#ff6a1a]">87/100</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 hidden lg:flex"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-gray-400"
        >
          <span className="text-xs uppercase tracking-wider">Scroll</span>
          <svg
            className="w-6 h-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
