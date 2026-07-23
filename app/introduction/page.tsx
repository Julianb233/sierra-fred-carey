"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Brain,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Target,
  Rocket,
} from "lucide-react";
import { START_NOW_URL } from "@/lib/constants";

/**
 * /introduction — Long-form Sahara landing page for A/B test
 *
 * Context: AI-11853 — Full explainer variant.
 * Tells the complete Sahara story: what it is, how it works,
 * who it's for, and why it matters. Designed for traffic that
 * needs more context before converting.
 */

const steps = [
  {
    icon: Brain,
    title: "Investor Readiness Score",
    description:
      "AI evaluates your startup across 50+ dimensions—team, market, traction, product—and gives you an honest, actionable score with specific improvement steps.",
  },
  {
    icon: Sparkles,
    title: "Pitch Deck Intelligence",
    description:
      "Upload your deck. Sahara's AI analyzes every slide against what top-tier VCs look for. Get line-by-line feedback and a rewrite plan.",
  },
  {
    icon: Users,
    title: "Virtual Team Agents",
    description:
      "Specialized AI agents act as your extended team—market researcher, financial modeler, competitive analyst, and more. Available 24/7.",
  },
  {
    icon: Zap,
    title: "AI Founder Coach",
    description:
      "Your personal AI mentor trained on Fred Cary's methodology. Daily check-ins, strategic guidance, and pattern recognition from 500+ founder journeys.",
  },
];

const proof = [
  { stat: "$3B+", label: "Capital Raised by Founders" },
  { stat: "500+", label: "Founders Coached" },
  { stat: "24/7", label: "AI-Powered Support" },
  { stat: "50+", label: "Assessment Dimensions" },
];

const differentiators = [
  {
    icon: Target,
    title: "Built by Founders, for Founders",
    description:
      "Fred Cary has been in your shoes—multiple exits, investor rejections, pivots. Sahara encodes decades of real founder experience, not generic business advice.",
  },
  {
    icon: Shield,
    title: "Honest, Not Optimistic",
    description:
      "Most platforms tell you what you want to hear. Sahara tells you what investors actually need to see. Brutal honesty, delivered constructively.",
  },
  {
    icon: TrendingUp,
    title: "Actionable, Not Theoretical",
    description:
      "Every insight comes with a specific next step. Not \"improve your pitch\" — but \"your financial projections lack a bottom-up TAM calculation; here's how to build one.\"",
  },
];

export default function IntroductionPage() {
  return (
    <main className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-[10%] w-96 h-96 bg-[#ff6a1a]/15 dark:bg-[#ff6a1a]/25 rounded-full blur-[130px]"
          animate={{ x: [0, 40, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-[10%] w-80 h-80 bg-orange-400/10 dark:bg-orange-500/20 rounded-full blur-[100px]"
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        {/* ===== HERO SECTION ===== */}
        <section className="text-center max-w-4xl mx-auto mb-24 sm:mb-32">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 bg-[#ff6a1a]/10 dark:bg-[#ff6a1a]/20 px-4 py-2 rounded-full border border-[#ff6a1a]/30 text-sm font-semibold text-[#ff6a1a]">
              <Rocket className="w-4 h-4" />
              AI-Powered Founder Operating System
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[clamp(2.5rem,8vw,4.5rem)] sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white mb-6"
          >
            <span className="block">From Idea to</span>
            <span className="block text-[#ff6a1a]">Funded Startup</span>
            <span className="block">— Faster Than Ever</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Sahara is the AI operating system that gives startup founders
            everything they need to go from napkin sketch to term sheet —
            investor readiness scoring, pitch deck intelligence, virtual
            team agents, and 24/7 AI coaching. Built by Fred Cary, who has
            coached hundreds of founders to raise over $3 billion.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href={START_NOW_URL}
                className="inline-flex items-center gap-2 bg-[#ff6a1a] hover:bg-[#e85d12] text-white text-lg font-semibold px-10 py-4 rounded-full transition-all duration-300 shadow-lg shadow-[#ff6a1a]/25 hover:shadow-xl hover:shadow-[#ff6a1a]/30"
              >
                Start Your Founder Journey
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ===== SOCIAL PROOF BAR ===== */}
        <section className="mb-24 sm:mb-32">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {proof.map((item) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="text-center p-6 rounded-2xl bg-white/60 dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
              >
                <div className="text-3xl sm:text-4xl font-bold text-[#ff6a1a] mb-1">
                  {item.stat}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="mb-24 sm:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How Sahara Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Four core capabilities that work together to accelerate your
              startup journey — from first principles to first check.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group p-8 rounded-2xl bg-white/60 dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:border-[#ff6a1a]/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[#ff6a1a]/10 dark:bg-[#ff6a1a]/20 flex items-center justify-center mb-4 group-hover:bg-[#ff6a1a]/20 transition-colors">
                  <step.icon className="w-6 h-6 text-[#ff6a1a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== WHY SAHARA IS DIFFERENT ===== */}
        <section className="mb-24 sm:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Sahara Is Different
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              There are plenty of AI tools. There&apos;s only one built by someone
              who&apos;s done it — repeatedly.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {differentiators.map((d, i) => (
              <motion.div
                key={d.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white/60 dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
              >
                <d.icon className="w-8 h-8 text-[#ff6a1a] mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {d.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {d.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== BOTTOM CTA ===== */}
        <section className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="p-10 sm:p-16 rounded-3xl bg-[#ff6a1a]/5 dark:bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 backdrop-blur-sm"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Stop Guessing?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
              Your first investor readiness score is free. See where you
              actually stand — and exactly what to do next.
            </p>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <Link
                href={START_NOW_URL}
                className="inline-flex items-center gap-2 bg-[#ff6a1a] hover:bg-[#e85d12] text-white text-lg font-semibold px-10 py-4 rounded-full transition-all duration-300 shadow-lg shadow-[#ff6a1a]/25 hover:shadow-xl hover:shadow-[#ff6a1a]/30"
              >
                Get Your Free Score
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
              No credit card required. Join 500+ founders who are already
              ahead.
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
