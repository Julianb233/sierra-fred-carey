"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { CheckIcon, StarIcon, RocketIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { Hammer } from "lucide-react";
import { Card3D } from "@/components/premium/Card3D";
import { FadeUpOnScroll } from "@/components/premium/AnimatedText";
import { redirectToCheckout } from "@/lib/stripe/client";
import { PLANS, isTrialEnabled } from "@/lib/stripe/config";

export default function Pricing() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string | null | undefined, planName: string) => {
    if (!priceId) {
      // Free plan - redirect to you.joinsahara.com
      window.location.assign("https://you.joinsahara.com");
      return;
    }

    try {
      setLoadingPlan(planName);
      await redirectToCheckout(priceId);
    } catch (error) {
      console.error("Checkout error:", error);
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      name: "Free",
      desc: "For founders still figuring it out",
      tagline: "Build clarity. Avoid bad ideas. Think like a real founder.",
      price: 0,
      priceId: null,
      isMostPop: false,
      icon: LightningBoltIcon,
      gradient: "from-gray-400 to-gray-500",
      cta: "Start Free",
      features: [
        "Founder Decision Engine",
        "Feasibility + market reality checks",
        "Red flag detection (before you waste months)",
        "Founder well-being + mental clarity support",
        "Initial founder snapshot",
      ],
    },
    {
      name: "Builder",
      desc: "For founders starting to get serious",
      tagline: "Turn ideas into structured plans you can actually execute.",
      price: 39,
      priceId: PLANS.BUILDER.priceId,
      isMostPop: false,
      icon: Hammer,
      gradient: "from-amber-500 to-amber-600",
      cta: "Start Building",
      features: [
        "Everything in Free",
        "Saved founder profile + memory",
        "Limited Investor Readiness insights",
        "Strategy outputs (lean plans, early roadmap)",
        "Early-stage scoring + guidance",
        "Priority responses",
      ],
    },
    {
      name: "Pro",
      desc: "For founders preparing to raise or scale",
      tagline: "Become investor-ready — before you talk to investors.",
      price: 99,
      priceId: PLANS.FUNDRAISING.priceId,
      isMostPop: true,
      icon: StarIcon,
      gradient: "from-[#ff6a1a] to-orange-400",
      cta: "Get Investor Ready",
      features: [
        "Everything in Builder",
        "Full Investor Lens (Pre-seed → Series A)",
        "Investor Readiness Score",
        "Pitch deck teardown + scoring",
        "Executive summaries + 30/60/90 plans",
        "Deep founder memory + evolving context",
      ],
    },
    {
      name: "Studio",
      desc: "For founders who want execution, not just advice",
      tagline: "Run your company like you already raised.",
      price: 249,
      priceId: PLANS.VENTURE_STUDIO.priceId,
      isMostPop: false,
      icon: RocketIcon,
      gradient: "from-orange-600 to-[#ff6a1a]",
      cta: "Run My Company",
      features: [
        "Everything in Pro",
        "Investor targeting + outreach sequencing",
        "Boardy integration (investor matching)",
        "Weekly accountability check-ins (SMS)",
        "AI Operator Team: Founder Ops Agent",
        "AI Operator Team: Fundraise Ops Agent",
        "AI Operator Team: Growth Ops Agent",
        "AI Operator Team: Inbox Ops Agent",
        "Priority compute + deeper memory",
      ],
    },
  ];

  return (
    <section id="pricing" className="scroll-mt-20 relative w-full overflow-hidden py-16 sm:py-20 md:py-24 bg-gray-50 dark:bg-gray-900">
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden opacity-30">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-400/15 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <FadeUpOnScroll className="text-center mb-12 sm:mb-16">
          <motion.span className="inline-block text-xs sm:text-sm font-semibold text-[#ff6a1a] bg-[#ff6a1a]/10 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-4 border border-[#ff6a1a]/20">
            PRICING
          </motion.span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-4 text-gray-900 dark:text-white">
            Stop guessing. Start building like a{" "}
            <span className="text-[#ff6a1a]">fundable company.</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 px-4">
            Sahara is your founder operating system — from idea to investor readiness to execution.
          </p>
        </FadeUpOnScroll>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <FadeUpOnScroll key={plan.name} delay={index * 0.1}>
              <div className={`relative ${plan.isMostPop ? "pt-4 sm:pt-5" : ""}`}>
                {plan.isMostPop && (
                  <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
                  >
                    {/* Darker orange for AA contrast on white text (4.74:1 vs 2.86:1 on brand #ff6a1a). */}
                    <span className="bg-[#c2410c] text-white px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-lg shadow-[#ff6a1a]/30 whitespace-nowrap">
                      Most Popular
                    </span>
                  </motion.div>
                )}

                <Card3D
                  rotationIntensity={plan.isMostPop ? 6 : 8}
                  className={`relative h-full rounded-2xl overflow-hidden ${
                    plan.isMostPop
                      ? "bg-gradient-to-b from-[#ff6a1a]/10 to-white dark:to-gray-950 border-2 border-[#ff6a1a] shadow-xl shadow-[#ff6a1a]/20"
                      : "bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
                  }`}
                >
                  {plan.isMostPop && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff6a1a] via-orange-400 to-[#ff6a1a]" />
                  )}

                <div className="relative z-10 p-5 sm:p-6">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <plan.icon className="h-5 w-5 text-white" />
                  </div>

                  {/* Plan info */}
                  <div className="mb-3">
                    <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">{plan.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">{plan.desc}</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline mb-1">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1.5 text-sm">/month</span>
                  </div>

                  {/* Tagline */}
                  <p className="text-xs text-[#ff6a1a] font-medium mb-4 min-h-[2rem]">{plan.tagline}</p>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSubscribe(plan.priceId, plan.name)}
                    disabled={loadingPlan === plan.name}
                    className={`w-full mb-4 touch-target ${
                      plan.isMostPop
                        ? "bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40"
                        : "border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#ff6a1a] hover:text-[#ff6a1a] bg-transparent"
                    }`}
                    variant={plan.isMostPop ? "default" : "outline"}
                    size="lg"
                  >
                    {loadingPlan === plan.name
                      ? "Loading..."
                      : plan.cta}
                  </Button>

                  <Separator className="my-4 bg-gray-200 dark:bg-gray-800" />

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + featureIndex * 0.05 }}
                        className="flex items-start gap-2 text-xs"
                      >
                        <div className="mt-0.5 p-0.5 rounded-full bg-[#ff6a1a]/20 flex-shrink-0">
                          <CheckIcon className="h-3 w-3 text-[#ff6a1a]" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div className={`absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t ${plan.gradient} opacity-5 pointer-events-none`} />
              </Card3D>
              </div>
            </FadeUpOnScroll>
          ))}
        </div>

        {/* "When should I upgrade?" section */}
        <FadeUpOnScroll delay={0.4} className="max-w-3xl mx-auto mt-12 sm:mt-16">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              When should I upgrade?
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { stage: "Still exploring an idea?", tier: "Stay Free" },
                { stage: "Building seriously?", tier: "Go Builder" },
                { stage: "Planning to raise?", tier: "Go Pro" },
                { stage: "Actively raising or scaling?", tier: "Go Studio" },
              ].map((item) => (
                <div key={item.stage} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{item.stage}</span>
                  <span className="text-[#ff6a1a] font-semibold">→ {item.tier}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeUpOnScroll>

        {/* Risk reversal + Anchor */}
        <FadeUpOnScroll delay={0.5} className="text-center mt-8 sm:mt-10 space-y-3">
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">
            {isTrialEnabled()
              ? "Try any paid plan free for 14 days. If Sahara doesn\u2019t give you clarity you didn\u2019t have before, don\u2019t pay."
              : "Cancel anytime. No long-term commitment required."}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
            Founders spend $5K–$15K on advisors, tools, and consultants. Sahara replaces that with one system.
          </p>
        </FadeUpOnScroll>
      </div>
    </section>
  );
}
