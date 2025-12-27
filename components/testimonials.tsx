"use client";

import { motion } from "framer-motion";
import { FadeUpOnScroll, GradientText } from "@/components/premium/AnimatedText";
import { QuoteIcon } from "@radix-ui/react-icons";

export default function Testimonials() {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Founder, HealthTech Startup",
      avatar: "SC",
      content:
        "The Decision OS told me honestly that I wasn't ready to raise. It hurt to hear, but 6 months later I closed my seed round in 3 weeks. That honesty saved me from burning bridges.",
      rating: 5,
      gradient: "from-purple-500 to-pink-500",
      glowColor: "rgba(168, 85, 247, 0.3)",
    },
    {
      name: "Marcus Rodriguez",
      role: "CEO, AI Infrastructure",
      avatar: "MR",
      content:
        "The Investor Readiness Score changed everything. I knew exactly what to fix before my first pitch. Went from 0% response rate to 40% meeting rate in one month.",
      rating: 5,
      gradient: "from-blue-500 to-cyan-500",
      glowColor: "rgba(56, 189, 248, 0.3)",
    },
    {
      name: "Emma Thompson",
      role: "Solo Founder, B2B SaaS",
      avatar: "ET",
      content:
        "The virtual team agents are like having a chief of staff. My inbox is managed, my fundraise is organized, and I can finally focus on building product.",
      rating: 5,
      gradient: "from-green-500 to-emerald-500",
      glowColor: "rgba(34, 197, 94, 0.3)",
    },
    {
      name: "James Wilson",
      role: "First-time Founder",
      avatar: "JW",
      content:
        "I started with the free tier just to think through my idea. The Reality Lens caught 3 fatal flaws I would have discovered the hard way. Worth every minute.",
      rating: 5,
      gradient: "from-orange-500 to-red-500",
      glowColor: "rgba(249, 115, 22, 0.3)",
    },
    {
      name: "Maria Garcia",
      role: "Founder, FinTech",
      avatar: "MG",
      content:
        "Boardy connected me with the perfect Series A leads. The warm intro workflow is what convinced me to upgrade — and it paid for itself in one meeting.",
      rating: 5,
      gradient: "from-indigo-500 to-violet-500",
      glowColor: "rgba(99, 102, 241, 0.3)",
    },
    {
      name: "Kevin Lee",
      role: "Technical Founder",
      avatar: "KL",
      content:
        "I'm a builder, not a fundraiser. The pitch deck review and strategy documents gave me the language and structure to communicate my vision. Closed $2M pre-seed.",
      rating: 5,
      gradient: "from-yellow-500 to-orange-500",
      glowColor: "rgba(251, 191, 36, 0.3)",
    },
    {
      name: "Sophie Anderson",
      role: "Second-time Founder",
      avatar: "SA",
      content:
        "Even as an experienced founder, the weekly check-ins keep me accountable. It's like having a co-founder who never misses a beat.",
      rating: 5,
      gradient: "from-pink-500 to-rose-500",
      glowColor: "rgba(236, 72, 153, 0.3)",
    },
    {
      name: "David Park",
      role: "Founder, Climate Tech",
      avatar: "DP",
      content:
        "The Red Flag Detection caught a co-founder issue I was ignoring. Hard conversation, but saved the company. This thing is brutally honest — exactly what founders need.",
      rating: 5,
      gradient: "from-teal-500 to-cyan-500",
      glowColor: "rgba(20, 184, 166, 0.3)",
    },
    {
      name: "Elena Petrov",
      role: "Founder, EdTech",
      avatar: "EP",
      content:
        "From idea validation to Series A strategy docs, this platform grew with me. The 30/60/90 planning alone is worth the subscription.",
      rating: 5,
      gradient: "from-fuchsia-500 to-purple-500",
      glowColor: "rgba(192, 38, 211, 0.3)",
    },
  ];

  const StarIcon = () => (
    <svg
      className="w-4 h-4 text-yellow-400 drop-shadow-sm"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );

  return (
    <section id="testimonials" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-mesh opacity-50" />
      <div className="absolute inset-0 cyber-grid opacity-20" />

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-[10%] w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]"
          animate={{ y: [0, 40, 0], x: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-[15%] w-80 h-80 bg-blue-500/15 rounded-full blur-[120px]"
          animate={{ y: [0, -50, 0], x: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-[50%] w-72 h-72 bg-pink-500/15 rounded-full blur-[100px]"
          animate={{ y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
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
            className="inline-block text-sm font-semibold tracking-wider text-purple-400 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20 mb-6"
          >
            TESTIMONIALS
          </motion.span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            Trusted by <GradientText>10,000+</GradientText> Founders
          </h2>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground">
            Real founders sharing their honest experience with the Decision OS.
            No filters. No BS.
          </p>
        </motion.div>

        {/* Testimonials masonry grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 sm:gap-8 space-y-6 sm:space-y-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.08,
                ease: "easeOut",
              }}
              className="break-inside-avoid"
            >
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="group relative"
              >
                {/* Glow effect on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
                  style={{ background: testimonial.glowColor }}
                />

                {/* Card */}
                <div className="relative glass rounded-2xl p-6 sm:p-8 border border-white/10 group-hover:border-white/20 transition-all duration-300 overflow-hidden">
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="shimmer absolute inset-0" />
                  </div>

                  {/* Quote icon */}
                  <div className={`absolute top-4 right-4 w-10 h-10 rounded-lg bg-gradient-to-br ${testimonial.gradient} opacity-20 flex items-center justify-center`}>
                    <QuoteIcon className="w-5 h-5 text-white" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Rating */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <StarIcon key={i} />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-muted-foreground leading-relaxed mb-6 text-sm sm:text-base">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                        style={{ boxShadow: `0 8px 24px ${testimonial.glowColor}` }}
                      >
                        {testimonial.avatar}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-gradient transition-all duration-300">
                          {testimonial.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Corner decoration */}
                  <div
                    className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-r ${testimonial.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}
                  />
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Social proof banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 sm:mt-24"
        >
          <div className="relative glass-strong rounded-2xl p-8 sm:p-12 border border-white/20 text-center overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10" />

            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Join <span className="text-gradient">10,000+</span> founders who think clearer
              </h3>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Start free. Upgrade when you&apos;re ready to raise or scale.
              </p>
              <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span>$50M+ raised by users</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span>89% investor meeting rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span>500+ decks reviewed</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
