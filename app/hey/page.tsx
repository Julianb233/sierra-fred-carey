"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FUNNEL_URL } from "@/lib/constants";

/**
 * /hey — Short CTA landing page for Sahara
 *
 * Context: AI-11853 — A/B test variant.
 * Minimal friction. One clear message, one call to action.
 * Routes traffic from ads / social to a fast conversion path.
 */

export default function HeyPage() {
  return (
    <main className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-orange-50/30 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-[10%] w-96 h-96 bg-[#ff6a1a]/20 dark:bg-[#ff6a1a]/30 rounded-full blur-[120px]"
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-[10%] w-80 h-80 bg-orange-400/15 dark:bg-orange-500/25 rounded-full blur-[100px]"
          animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center max-w-3xl">
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 bg-[#ff6a1a]/10 dark:bg-[#ff6a1a]/20 px-4 py-2 rounded-full border border-[#ff6a1a]/30 text-sm font-semibold text-[#ff6a1a]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6a1a] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6a1a]" />
            </span>
            AI-Powered Founder Operating System
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[clamp(2.5rem,8vw,4rem)] sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white mb-6"
        >
          <span className="block">Think Clearer.</span>
          <span className="block text-[#ff6a1a]">Raise Smarter.</span>
          <span className="block">Scale Faster.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          The AI operating system that gives startup founders an unfair
          advantage. Built by Fred Cary — hundreds of founders coached, $3B+
          raised.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={FUNNEL_URL}
              className="inline-flex items-center gap-2 bg-[#ff6a1a] hover:bg-[#e85d12] text-white text-lg font-semibold px-10 py-4 rounded-full transition-all duration-300 shadow-lg shadow-[#ff6a1a]/25 hover:shadow-xl hover:shadow-[#ff6a1a]/30"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Trust bar */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-8 text-sm text-gray-400 dark:text-gray-500"
        >
          No credit card required. Join 500+ founders already ahead.
        </motion.p>
      </div>
    </main>
  );
}
