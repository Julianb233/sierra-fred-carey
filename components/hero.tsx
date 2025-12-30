"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Brain, Clock, Users, ArrowRight, CheckIcon } from "lucide-react";
import NightModeParticles from "@/components/effects/NightModeParticles";

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Night mode particle effects - stars, sparks, and glowing orbs */}
      <NightModeParticles />

      {/* Animated orange blob background - enhanced for dark mode */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/25 dark:bg-[#ff6a1a]/40 rounded-full blur-[100px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-40 right-[15%] w-96 h-96 bg-orange-400/20 dark:bg-orange-500/35 rounded-full blur-[120px]"
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 left-[20%] w-80 h-80 bg-amber-500/20 dark:bg-amber-500/35 rounded-full blur-[100px]"
          animate={{
            x: [0, 40, 0],
            y: [0, -40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 right-[5%] w-64 h-64 bg-[#ff6a1a]/15 dark:bg-[#ff6a1a]/30 rounded-full blur-[80px]"
          animate={{
            x: [0, -60, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Additional dark mode glow effects */}
        <motion.div
          className="absolute top-[60%] left-[50%] w-48 h-48 bg-purple-500/0 dark:bg-purple-500/20 rounded-full blur-[80px] hidden dark:block"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[10%] left-[60%] w-56 h-56 bg-blue-500/0 dark:bg-blue-500/15 rounded-full blur-[90px] hidden dark:block"
          animate={{
            x: [0, 20, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Main content */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-12">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">

          {/* Opening Badge */}
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
                We&apos;re building something bold
              </span>
            </motion.div>
          </motion.div>

          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6"
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
              <span className="block">What if you could</span>
              <span className="block text-[#ff6a1a] mt-2 relative inline-block">
                create a unicorn,
                <motion.span
                  className="absolute -bottom-2 left-0 w-full h-3 bg-[#ff6a1a] opacity-20"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                  style={{ transformOrigin: "left" }}
                />
              </span>
              <span className="block mt-2 text-gray-700 dark:text-gray-300">all by yourself?</span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mb-10 leading-relaxed"
          >
            Imagine a mentor who truly understands you, a co-founder who works 24/7, and insights that give you an unfair advantage—all delivered effortlessly, every day.
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
                <Link href="/waitlist" className="flex items-center gap-2">
                  Join the Waitlist
                  <ArrowRight className="h-5 w-5" />
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
                <Link href="/chat" className="flex items-center gap-2">
                  Talk to Fred
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
              { icon: Users, text: "10,000+ Founders Coached" },
              { icon: CheckIcon, text: "$50M+ Raised" },
              { icon: Sparkles, text: "By Fred Cary" },
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
        </div>
      </section>

      {/* Meet Fred Cary Card */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="relative max-w-6xl mx-auto"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-[#ff6a1a]/10 blur-3xl" />

          {/* Main card */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-1 border border-gray-200 dark:border-gray-800 shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(255,106,26,0.2)] transition-shadow duration-500">
            <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-8 sm:p-12 backdrop-blur-sm">

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="inline-flex items-center gap-2 bg-[#ff6a1a]/10 dark:bg-[#ff6a1a]/20 px-4 py-2 rounded-full border border-[#ff6a1a]/30 mb-6"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6a1a] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6a1a]"></span>
                </span>
                <span className="text-sm font-semibold text-[#ff6a1a]">Live Interactive Agent</span>
              </motion.div>

              <div className="grid lg:grid-cols-2 gap-12">
                {/* Left side - Text */}
                <div>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 }}
                    className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4"
                  >
                    Meet Fred Cary
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4 }}
                    className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed"
                  >
                    Our live, interactive agent powered by decades of real entrepreneurial experience. Ask him anything—business, mindset, funding, or even your next big move.
                  </motion.p>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="text-xl font-semibold text-[#ff6a1a] mb-8"
                  >
                    He&apos;s not just AI. He&apos;s you—five years ahead.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6 }}
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
                        <Link href="/chat" className="flex items-center gap-2">
                          Start a Conversation
                          <ArrowRight className="h-5 w-5" />
                        </Link>
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>

                {/* Right side - Feature cards */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Brain, title: "Learns How You Think", color: "from-purple-500 to-purple-600" },
                    { icon: Clock, title: "Works 24/7", color: "from-blue-500 to-blue-600" },
                    { icon: Users, title: "Grows With You", color: "from-green-500 to-green-600" },
                    { icon: Sparkles, title: "Unfair Advantage", color: "from-[#ff6a1a] to-orange-600" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.7 + i * 0.1 }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-[#ff6a1a]/50 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                        <item.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Vision Section */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-4xl sm:text-5xl font-bold text-center text-gray-900 dark:text-white mb-12"
          >
            We think you can. And we&apos;re here to prove it.
          </motion.h2>

          <div className="space-y-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              There are millions of dreamers out there. People with ideas that could change industries, reshape markets, even transform lives. But most of them never make it.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Why? Because being an entrepreneur is lonely. It&apos;s hard. And the advice you need is either too expensive, too generic, or just not there when you need it most.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-2xl font-bold text-[#ff6a1a] text-center py-8"
            >
              We believe that&apos;s about to change.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Different Kind of AI Section */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-4xl sm:text-5xl font-bold text-center text-gray-900 dark:text-white mb-12"
          >
            We&apos;re building a different kind of AI
          </motion.h2>

          <div className="space-y-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Not one that spits out generic templates or cookie-cutter advice. An AI that adapts to the way you think. That learns from your decisions. That grows as you grow.
            </motion.p>

            <motion.blockquote
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="border-l-4 border-[#ff6a1a] pl-6 py-4 my-8 italic text-xl text-gray-700 dark:text-gray-300"
            >
              Imagine waking up to a partner who worked through the night—clarifying your thoughts, analyzing your market, refining your pitch—so you can hit the ground running every single day.
            </motion.blockquote>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl font-semibold text-gray-900 dark:text-white text-center"
            >
              This isn&apos;t just another tool. It&apos;s a quiet revolution in how businesses are built.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            This is that moment.
          </h2>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
            Every founder deserves a partner who understands them. Who believes in them. Who&apos;s there at 2 AM when doubt creeps in, and at 9 AM when opportunity knocks.
          </p>

          <motion.div
            whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(255, 106, 26, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            className="mb-8"
          >
            <Button
              asChild
              size="lg"
              className="text-xl px-12 h-16 bg-[#ff6a1a] hover:bg-[#ea580c] text-white border-0 shadow-2xl shadow-[#ff6a1a]/30 hover:shadow-[#ff6a1a]/50 transition-all duration-300"
            >
              <Link href="/waitlist" className="flex items-center gap-3">
                Join the Waitlist
                <ArrowRight className="h-6 w-6" />
              </Link>
            </Button>
          </motion.div>

          <p className="text-lg text-gray-500 dark:text-gray-400 italic">
            We&apos;d be honored to build it with you.
          </p>
        </motion.div>
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
