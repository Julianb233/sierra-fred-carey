"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { CheckIcon, StarIcon, RocketIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { Card3D } from "@/components/premium/Card3D";
import { FadeUpOnScroll, GradientText } from "@/components/premium/AnimatedText";
import { GradientBg } from "@/components/premium/GradientBg";
import { redirectToCheckout } from "@/lib/stripe/client";
import { PLANS } from "@/lib/stripe/config";
import Link from "next/link";

export default function Pricing() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string | null | undefined, planName: string) => {
    if (!priceId) {
      // Free plan - redirect to dashboard/sign-up
      window.location.href = "/dashboard";
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
      name: "Sahara Starter",
      desc: "Free forever — build trust and habit",
      price: 0,
      priceId: null,
      isMostPop: false,
      icon: LightningBoltIcon,
      gradient: "from-gray-400 to-gray-500",
      features: [
        "Core Sahara Decision Engine",
        "Strategy & execution reframing",
        "Startup Reality Lens (feasibility, economics, timing)",
        "Red Flag Detection",
        "Founder wellbeing support",
        "Founder Intake Snapshot",
      ],
    },
    {
      name: "Fundraising & Strategy",
      desc: "Turn clarity into investor-grade readiness",
      price: 99,
      priceId: PLANS.FUNDRAISING.priceId,
      isMostPop: true,
      icon: StarIcon,
      gradient: "from-[#ff6a1a] to-orange-400",
      features: [
        "Everything in Free tier",
        "Full Investor Lens (Pre-Seed / Seed / Series A)",
        "Investor Readiness Score",
        "Pitch Deck Review & Scorecard",
        "Strategy Documents (Executive Summary, 30/60/90)",
        "Automated Weekly SMS Check-Ins",
        "Persistent founder memory",
      ],
    },
    {
      name: "Venture Studio",
      desc: "Leverage, execution & capital connectivity",
      price: 249,
      priceId: PLANS.VENTURE_STUDIO.priceId,
      isMostPop: false,
      icon: RocketIcon,
      gradient: "from-orange-600 to-[#ff6a1a]",
      features: [
        "Everything in Fundraising tier",
        "Boardy integration (investor matching)",
        "Investor targeting & outreach sequencing",
        "Virtual Team: Founder Ops Agent",
        "Virtual Team: Fundraise Ops Agent",
        "Virtual Team: Growth Ops Agent",
        "Virtual Team: Inbox Ops Agent",
        "Priority compute & deeper memory",
      ],
    },
  ];

  return (
    <section id="pricing" className="relative w-full overflow-hidden py-16 sm:py-20 md:py-24 bg-gray-50 dark:bg-gray-900">
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
            Simple, <span className="text-[#ff6a1a]">Transparent</span> Pricing
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 px-4">
            Each tier unlocks outcomes, not just features. Higher tiers reduce
            time-to-clarity and time-to-conviction.
          </p>
        </FadeUpOnScroll>

        {/* Pricing cards - Stack on mobile, grid on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <FadeUpOnScroll key={plan.name} delay={index * 0.15}>
              <Card3D
                rotationIntensity={plan.isMostPop ? 6 : 8}
                className={`relative h-full rounded-2xl overflow-hidden ${
                  plan.isMostPop
                    ? "bg-gradient-to-b from-[#ff6a1a]/10 to-white dark:to-gray-950 border-2 border-[#ff6a1a] shadow-xl shadow-[#ff6a1a]/20"
                    : "bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
                }`}
              >
                {/* Most popular badge */}
                {plan.isMostPop && (
                  <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-[#ff6a1a] via-orange-400 to-[#ff6a1a]" />
                )}

                <div className="relative z-10 p-6 sm:p-8">
                  {plan.isMostPop && (
                    <motion.div
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2"
                    >
                      <span className="bg-[#ff6a1a] text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-lg">
                        Most Popular
                      </span>
                    </motion.div>
                  )}

                  {/* Icon */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4 sm:mb-6 shadow-lg`}>
                    <plan.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>

                  {/* Plan info */}
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-900 dark:text-white">{plan.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">{plan.desc}</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline mb-4 sm:mb-6">
                    <span className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2 text-sm sm:text-base">/month</span>
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSubscribe(plan.priceId, plan.name)}
                    disabled={loadingPlan === plan.name}
                    className={`w-full mb-4 sm:mb-6 touch-target ${
                      plan.isMostPop
                        ? "bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40"
                        : "border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#ff6a1a] hover:text-[#ff6a1a] bg-transparent"
                    }`}
                    variant={plan.isMostPop ? "default" : "outline"}
                    size="lg"
                  >
                    {loadingPlan === plan.name
                      ? "Loading..."
                      : plan.price === 0
                      ? "Get Started Free"
                      : "Start 14-Day Trial"}
                  </Button>

                  <Separator className="my-4 sm:my-6 bg-gray-200 dark:bg-gray-800" />

                  {/* Features */}
                  <ul className="space-y-3 sm:space-y-4">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + featureIndex * 0.05 }}
                        className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm"
                      >
                        <div className="mt-0.5 p-0.5 rounded-full bg-[#ff6a1a]/20 flex-shrink-0">
                          <CheckIcon className="h-3 w-3 text-[#ff6a1a]" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Decorative gradient */}
                <div className={`absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t ${plan.gradient} opacity-5 pointer-events-none`} />
              </Card3D>
            </FadeUpOnScroll>
          ))}
        </div>

        {/* Bottom note */}
        <FadeUpOnScroll delay={0.5} className="text-center mt-8 sm:mt-12">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-4">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </FadeUpOnScroll>
      </div>
    </section>
  );
}
