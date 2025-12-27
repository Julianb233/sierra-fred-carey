"use client";

import { motion } from "framer-motion";
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
      gradient: "from-[#ff6a1a] to-orange-400",
      glowColor: "rgba(255, 106, 26, 0.3)",
    },
    {
      icon: TargetIcon,
      title: "Investor Readiness Score",
      description:
        "Know exactly where you stand before approaching investors. Get clear guidance on what to fix first.",
      gradient: "from-amber-500 to-[#ff6a1a]",
      glowColor: "rgba(245, 158, 11, 0.3)",
    },
    {
      icon: RocketIcon,
      title: "Pitch Deck Review",
      description:
        "Detailed scorecard, objection list, and rewrite guidance. Prepare for every investor question.",
      gradient: "from-orange-500 to-red-500",
      glowColor: "rgba(249, 115, 22, 0.3)",
    },
    {
      icon: LayersIcon,
      title: "Strategy Documents",
      description:
        "Executive summaries, diagnosis frameworks, options & tradeoffs, and 30/60/90-day action plans.",
      gradient: "from-[#ff6a1a] to-amber-400",
      glowColor: "rgba(255, 106, 26, 0.25)",
    },
    {
      icon: PersonIcon,
      title: "Virtual Team Agents",
      description:
        "AI agents for Founder Ops, Fundraise Ops, Growth Ops, and Inbox management. Replace scattered tools.",
      gradient: "from-orange-600 to-[#ff6a1a]",
      glowColor: "rgba(234, 88, 12, 0.3)",
    },
    {
      icon: ChatBubbleIcon,
      title: "Weekly Check-Ins",
      description:
        "Automated SMS check-ins that keep you accountable. Persistent memory tracks your progress over time.",
      gradient: "from-amber-400 to-orange-500",
      glowColor: "rgba(251, 191, 36, 0.3)",
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32 overflow-hidden bg-white dark:bg-gray-950">
      {/* Subtle background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <motion.div
          className="absolute top-1/4 left-[5%] w-64 h-64 bg-[#ff6a1a]/20 rounded-full blur-[100px]"
          animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-[10%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]"
          animate={{ y: [0, -40, 0], x: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 sm:mb-20"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block text-sm font-semibold tracking-wider text-[#ff6a1a] bg-[#ff6a1a]/10 px-4 py-2 rounded-full border border-[#ff6a1a]/20 mb-6"
          >
            CAPABILITIES
          </motion.span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
            <span className="text-[#ff6a1a]">Everything</span> Founders Need
          </h2>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-600 dark:text-gray-400">
            From ideation to fundraising to scaling — the Decision OS supports you at every stage
            with tools built by someone who&apos;s been there.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="group relative h-full"
              >
                {/* Glow effect on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                  style={{ background: feature.glowColor }}
                />

                {/* Card */}
                <div className="relative h-full bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 group-hover:border-[#ff6a1a]/30 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-lg">
                  {/* Animated border gradient */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-10`} />
                  </div>

                  {/* Shimmer effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
                    <div className="shimmer absolute inset-0" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}
                      style={{ boxShadow: `0 10px 30px ${feature.glowColor}` }}
                    >
                      <feature.icon className="h-7 w-7 text-white" />
                    </motion.div>

                    {/* Title */}
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-[#ff6a1a] transition-all duration-300">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Learn more link */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      whileHover={{ x: 5 }}
                      className="mt-6 flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className={`bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                        Learn more
                      </span>
                      <span className={`bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                        →
                      </span>
                    </motion.div>
                  </div>

                  {/* Corner decoration */}
                  <div className={`absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-r ${feature.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Interactive demo section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-24 sm:mt-32"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              See It <span className="text-[#ff6a1a]">In Action</span>
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Real conversations with the Founder Decision OS that help you make better decisions.
            </p>
          </div>

          {/* Chat demo */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              {/* Glow behind */}
              <div className="absolute inset-0 bg-[#ff6a1a]/10 blur-3xl" />

              {/* Chat container */}
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-xl">
                {/* Chat header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="w-10 h-10 rounded-full bg-[#ff6a1a] flex items-center justify-center">
                    <span className="text-sm font-bold text-white">FC</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Fred Cary AI</div>
                    <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Online
                    </div>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="space-y-4">
                  {[
                    { role: "user", text: "Should I raise funding now?" },
                    { role: "ai", text: "Let me analyze your readiness. Based on your metrics, you're at 73% investor readiness. Here's what I found..." },
                    { role: "user", text: "What should I focus on first?" },
                    { role: "ai", text: "Priority: Validate unit economics. Your CAC/LTV ratio needs work before approaching VCs. Let me show you how." },
                  ].map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.2 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-[#ff6a1a] text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        }`}
                      >
                        <p className="text-sm sm:text-base">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Input area */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Ask about your startup..."
                      className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#ff6a1a] transition-colors"
                    />
                    <button className="w-12 h-12 rounded-xl bg-[#ff6a1a] flex items-center justify-center hover:shadow-lg hover:shadow-[#ff6a1a]/25 transition-shadow">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
