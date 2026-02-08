"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Footer from "@/components/footer";
import { CheckIcon, Cross2Icon, RocketIcon, StarIcon, LightningBoltIcon } from "@radix-ui/react-icons";

export default function PricingPage() {
  const plans = [
    {
      name: "Founder Decision OS",
      subtitle: "Free Forever",
      price: 0,
      description: "Maximum adoption, trust, and habit formation.",
      audience: "First-time founders, early ideation, founders not yet considering fundraising.",
      gradient: "from-gray-400 to-gray-500",
      glowColor: "rgba(156, 163, 175, 0.3)",
      icon: StarIcon,
      features: [
        { name: "Core Fred Cary Decision OS", included: true },
        { name: "Strategy & execution reframing", included: true },
        { name: "Startup Reality Lens", included: true },
        { name: "Founder wellbeing support", included: true },
        { name: "Red Flag Detection", included: true },
        { name: "Founder Intake Snapshot", included: true },
        { name: "Investor Lens", included: false },
        { name: "Investor Readiness Score", included: false },
        { name: "Pitch Deck Review", included: false },
        { name: "Strategy Documents", included: false },
        { name: "Weekly SMS Check-Ins", included: false },
        { name: "Boardy Integration", included: false },
        { name: "Virtual Team Agents", included: false },
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Fundraising & Strategy",
      subtitle: "For Active Fundraisers",
      price: 99,
      description: "Turn clarity into investor-grade readiness.",
      audience: "Pre-seed and seed founders, founders preparing for fundraising.",
      gradient: "from-[#ff6a1a] to-orange-400",
      glowColor: "rgba(255, 106, 26, 0.4)",
      icon: RocketIcon,
      features: [
        { name: "Everything in Free tier", included: true },
        { name: "Full Investor Lens (Pre-Seed/Seed/A)", included: true },
        { name: "Investor Readiness Score", included: true },
        { name: "Pitch Deck Review Protocol", included: true },
        { name: "Strategy Documents", included: true },
        { name: "Executive Summary", included: true },
        { name: "30/60/90-day Plans", included: true },
        { name: "Persistent Founder Memory", included: true },
        { name: "Boardy Integration", included: false },
        { name: "Investor Introductions", included: false },
        { name: "Outreach Automation", included: false },
        { name: "Virtual Team Agents", included: false },
      ],
      cta: "Start 14-Day Trial",
      popular: true,
    },
    {
      name: "Venture Studio",
      subtitle: "Full Leverage Mode",
      price: 249,
      description: "Deliver leverage, execution support, and capital connectivity.",
      audience: "Founders actively fundraising, scaling operations, small teams replacing headcount.",
      gradient: "from-orange-600 to-[#ff6a1a]",
      glowColor: "rgba(234, 88, 12, 0.3)",
      icon: LightningBoltIcon,
      features: [
        { name: "Everything in Fundraising tier", included: true },
        { name: "Weekly SMS Check-Ins", included: true },
        { name: "Boardy Integration", included: true, comingSoon: true },
        { name: "Investor Matching & Warm Intros", included: true, comingSoon: true },
        { name: "Investor Targeting Guidance", included: true },
        { name: "Outreach Sequencing", included: true },
        { name: "Founder Ops Agent", included: true },
        { name: "Fundraise Ops Agent", included: true },
        { name: "Growth Ops Agent", included: true },
        { name: "Inbox Ops Agent", included: true },
        { name: "Higher Usage Limits", included: true },
        { name: "Priority Compute", included: true },
        { name: "Deeper Memory Persistence", included: true },
      ],
      cta: "Start 14-Day Trial",
      popular: false,
    },
  ];

  const comparisonFeatures = [
    { name: "Core OS", free: true, fundraising: true, studio: true },
    { name: "Investor Lens", free: false, fundraising: true, studio: true },
    { name: "Investor Readiness Score", free: false, fundraising: true, studio: true },
    { name: "Deck Review", free: false, fundraising: true, studio: true },
    { name: "Strategy Docs", free: false, fundraising: true, studio: true },
    { name: "Weekly SMS Check-Ins", free: false, fundraising: false, studio: true },
    { name: "Boardy Integration", free: false, fundraising: false, studio: true },
    { name: "Virtual Team Agents", free: false, fundraising: false, studio: true },
  ];

  return (
    <main className="flex flex-col min-h-dvh relative overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <motion.div
          className="absolute top-1/4 left-[10%] w-96 h-96 bg-[#ff6a1a]/20 rounded-full blur-[120px]"
          animate={{ y: [0, 50, 0], x: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-[10%] w-80 h-80 bg-orange-400/15 rounded-full blur-[100px]"
          animate={{ y: [0, -40, 0], x: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 right-[30%] w-64 h-64 bg-amber-500/15 rounded-full blur-[80px]"
          animate={{ y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 py-24 md:px-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block text-sm font-semibold tracking-wider text-[#ff6a1a] bg-[#ff6a1a]/10 px-4 py-2 rounded-full border border-[#ff6a1a]/20 mb-6"
          >
            PRICING
          </motion.span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-gray-900 dark:text-white">
            Simple, <span className="text-[#ff6a1a]">Transparent</span> Pricing
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-4">
            Each tier unlocks outcomes, not just features. Higher tiers reduce
            time-to-clarity and time-to-conviction.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 italic">
            Pricing is about access to judgment, leverage, and continuity.
          </p>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 pb-24 md:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className={`relative ${plan.popular ? "md:-mt-8 md:mb-8" : ""}`}
            >
              <motion.div
                whileHover={{ y: -10, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="group relative h-full"
              >
                {/* Glow effect */}
                <div
                  className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ${plan.popular ? 'opacity-50' : ''}`}
                  style={{ background: plan.glowColor }}
                />

                {/* Card */}
                <div className={`relative h-full bg-white dark:bg-gray-950 rounded-2xl border ${plan.popular ? 'border-[#ff6a1a] border-2' : 'border-gray-200 dark:border-gray-800'} group-hover:border-[#ff6a1a]/30 transition-all duration-300 overflow-hidden flex flex-col shadow-sm hover:shadow-lg`}>
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-[#ff6a1a] via-orange-400 to-[#ff6a1a]" />
                  )}

                  {plan.popular && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20"
                    >
                      <span className="bg-[#ff6a1a] text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg shadow-[#ff6a1a]/25">
                        Most Popular
                      </span>
                    </motion.div>
                  )}

                  {/* Animated border gradient for popular */}
                  {plan.popular && (
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#ff6a1a] via-orange-400 to-[#ff6a1a] opacity-10" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="relative z-10 p-6 sm:p-8 flex flex-col flex-grow">
                    {/* Icon */}
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6 shadow-lg`}
                      style={{ boxShadow: `0 10px 30px ${plan.glowColor}` }}
                    >
                      <plan.icon className="h-7 w-7 text-white" />
                    </motion.div>

                    {/* Header */}
                    <div className="mb-6">
                      <h3 className="text-xl sm:text-2xl font-bold mb-1 text-gray-900 dark:text-white">{plan.name}</h3>
                      <p className={`text-sm font-medium bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                        {plan.subtitle}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-end gap-1">
                        <span className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                        <span className="text-gray-500 dark:text-gray-400 mb-2">/month</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{plan.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 italic mb-6">
                      Best for: {plan.audience}
                    </p>

                    {/* Separator */}
                    <div className="h-px bg-gray-200 dark:bg-gray-800 mb-6" />

                    {/* Features */}
                    <ul className="space-y-3 flex-grow">
                      {plan.features.map((feature: { name: string; included: boolean; comingSoon?: boolean }) => (
                        <li key={feature.name} className="flex items-center text-sm">
                          {feature.included ? (
                            <div className="w-5 h-5 rounded-full bg-[#ff6a1a]/20 flex items-center justify-center mr-3 flex-shrink-0">
                              <CheckIcon className="h-3 w-3 text-[#ff6a1a]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-3 flex-shrink-0">
                              <Cross2Icon className="h-3 w-3 text-gray-400 dark:text-gray-600" />
                            </div>
                          )}
                          <span className={feature.included ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}>
                            {feature.name}
                          </span>
                          {feature.comingSoon && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                              Coming Soon
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="mt-8">
                      <Button
                        asChild
                        className={`w-full h-12 text-base font-medium ${
                          plan.popular
                            ? "bg-[#ff6a1a] hover:bg-[#ea580c] text-white border-0 shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40"
                            : "border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#ff6a1a] hover:text-[#ff6a1a] bg-transparent"
                        } transition-all duration-300`}
                        variant={plan.popular ? "default" : "outline"}
                        size="lg"
                      >
                        <Link href="/get-started">{plan.cta}</Link>
                      </Button>
                    </div>
                  </div>

                  {/* Corner decoration */}
                  <div className={`absolute -bottom-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-r ${plan.gradient} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="relative z-10 py-24 px-4 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Feature <span className="text-[#ff6a1a]">Comparison</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              See exactly what&apos;s included in each tier.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Mobile card layout */}
              <div className="md:hidden space-y-3 p-4">
                {comparisonFeatures.map((feature) => (
                  <div key={feature.name} className="bg-white dark:bg-gray-950 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                    <h4 className="font-medium text-sm mb-3 text-gray-900 dark:text-white">{feature.name}</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Free</span>
                        {feature.free ? (
                          <div className="w-6 h-6 rounded-full bg-[#ff6a1a]/20 flex items-center justify-center mx-auto">
                            <CheckIcon className="h-4 w-4 text-[#ff6a1a]" />
                          </div>
                        ) : (
                          <Cross2Icon className="h-5 w-5 text-gray-400 dark:text-gray-600 mx-auto" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs text-[#ff6a1a] block mb-1">$99</span>
                        {feature.fundraising ? (
                          <div className="w-6 h-6 rounded-full bg-[#ff6a1a]/20 flex items-center justify-center mx-auto">
                            <CheckIcon className="h-4 w-4 text-[#ff6a1a]" />
                          </div>
                        ) : (
                          <Cross2Icon className="h-5 w-5 text-gray-400 dark:text-gray-600 mx-auto" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs text-orange-600 block mb-1">$249</span>
                        {feature.studio ? (
                          <div className="w-6 h-6 rounded-full bg-[#ff6a1a]/20 flex items-center justify-center mx-auto">
                            <CheckIcon className="h-4 w-4 text-[#ff6a1a]" />
                          </div>
                        ) : (
                          <Cross2Icon className="h-5 w-5 text-gray-400 dark:text-gray-600 mx-auto" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table layout */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left p-4 sm:p-6 font-semibold text-gray-900 dark:text-white">Feature</th>
                      <th className="text-center p-4 sm:p-6 font-semibold text-gray-600 dark:text-gray-400">Free</th>
                      <th className="text-center p-4 sm:p-6 font-semibold text-[#ff6a1a]">$99</th>
                      <th className="text-center p-4 sm:p-6 font-semibold text-orange-600">$249</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((feature, index) => (
                      <tr
                        key={feature.name}
                        className={`${index % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50 dark:bg-gray-900"} hover:bg-[#ff6a1a]/5 transition-colors`}
                      >
                        <td className="p-4 sm:p-6 text-sm text-gray-700 dark:text-gray-300">{feature.name}</td>
                        <td className="text-center p-4 sm:p-6">
                          {feature.free ? (
                            <div className="w-6 h-6 rounded-full bg-[#ff6a1a]/20 flex items-center justify-center mx-auto">
                              <CheckIcon className="h-4 w-4 text-[#ff6a1a]" />
                            </div>
                          ) : (
                            <Cross2Icon className="h-5 w-5 text-gray-400 dark:text-gray-600 mx-auto" />
                          )}
                        </td>
                        <td className="text-center p-4 sm:p-6">
                          {feature.fundraising ? (
                            <div className="w-6 h-6 rounded-full bg-[#ff6a1a]/20 flex items-center justify-center mx-auto">
                              <CheckIcon className="h-4 w-4 text-[#ff6a1a]" />
                            </div>
                          ) : (
                            <Cross2Icon className="h-5 w-5 text-gray-400 dark:text-gray-600 mx-auto" />
                          )}
                        </td>
                        <td className="text-center p-4 sm:p-6">
                          {feature.studio ? (
                            <div className="w-6 h-6 rounded-full bg-[#ff6a1a]/20 flex items-center justify-center mx-auto">
                              <CheckIcon className="h-4 w-4 text-[#ff6a1a]" />
                            </div>
                          ) : (
                            <Cross2Icon className="h-5 w-5 text-gray-400 dark:text-gray-600 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Guardrails */}
      <section className="relative z-10 py-24 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Our <span className="text-[#ff6a1a]">Guiding Principles</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400">Non-negotiable values that shape everything we build.</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {[
              "Founders earn access to capital tooling by building real businesses.",
              "Fundraising is never positioned as success by default.",
              "Free tier builds trust and habit. Paid tiers deliver leverage and judgment.",
              "Each tier unlocks outcomes, not just features.",
              "Higher tiers reduce time-to-clarity and time-to-conviction.",
            ].map((principle, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 10 }}
                className="group"
              >
                <div className="bg-white dark:bg-gray-950 rounded-xl p-5 border border-gray-200 dark:border-gray-800 group-hover:border-[#ff6a1a]/30 transition-all duration-300 flex items-start gap-4 shadow-sm hover:shadow-md">
                  <span className="text-[#ff6a1a] font-bold text-xl">{index + 1}.</span>
                  <p className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{principle}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
