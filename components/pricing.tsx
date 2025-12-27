"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { CheckIcon, StarIcon, RocketIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { Card3D } from "@/components/premium/Card3D";
import { FadeUpOnScroll, GradientText } from "@/components/premium/AnimatedText";
import { GradientBg } from "@/components/premium/GradientBg";
import Link from "next/link";

export default function Pricing() {
  const plans = [
    {
      name: "Founder Decision OS",
      desc: "Free forever — build trust and habit",
      price: 0,
      isMostPop: false,
      icon: LightningBoltIcon,
      gradient: "from-gray-500 to-gray-600",
      features: [
        "Core Fred Cary Decision OS",
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
      isMostPop: true,
      icon: StarIcon,
      gradient: "from-primary to-blue-500",
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
      isMostPop: false,
      icon: RocketIcon,
      gradient: "from-purple-500 to-pink-500",
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
    <section id="pricing" className="relative w-full overflow-hidden py-24">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <GradientBg variant="radial" className="opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Section header */}
        <FadeUpOnScroll className="text-center mb-16">
          <motion.span className="inline-block text-sm font-medium text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">
            PRICING
          </motion.span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Simple, <GradientText>Transparent</GradientText> Pricing
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Each tier unlocks outcomes, not just features. Higher tiers reduce
            time-to-clarity and time-to-conviction.
          </p>
        </FadeUpOnScroll>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <FadeUpOnScroll key={plan.name} delay={index * 0.15}>
              <Card3D
                rotationIntensity={plan.isMostPop ? 6 : 8}
                className={`relative h-full rounded-2xl overflow-hidden ${
                  plan.isMostPop
                    ? "bg-gradient-to-b from-primary/10 to-card border-2 border-primary shadow-xl shadow-primary/20"
                    : "bg-card/90 backdrop-blur-sm border border-border/50"
                }`}
              >
                {/* Most popular badge */}
                {plan.isMostPop && (
                  <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-primary" />
                )}

                <div className="relative z-10 p-8">
                  {plan.isMostPop && (
                    <motion.div
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute -top-4 left-1/2 -translate-x-1/2"
                    >
                      <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium shadow-lg">
                        Most Popular
                      </span>
                    </motion.div>
                  )}

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                    <plan.icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Plan info */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm">{plan.desc}</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline mb-6">
                    <span className="text-5xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>

                  {/* CTA Button */}
                  <Button
                    asChild
                    className={`w-full mb-6 ${
                      plan.isMostPop
                        ? "shadow-lg shadow-primary/25 hover:shadow-primary/40"
                        : ""
                    }`}
                    variant={plan.isMostPop ? "default" : "outline"}
                    size="lg"
                  >
                    <Link href="/get-started">
                      {plan.price === 0 ? "Get Started Free" : "Start 14-Day Trial"}
                    </Link>
                  </Button>

                  <Separator className="my-6" />

                  {/* Features */}
                  <ul className="space-y-4">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + featureIndex * 0.05 }}
                        className="flex items-start gap-3 text-sm"
                      >
                        <div className="mt-0.5 p-0.5 rounded-full bg-green-500/20">
                          <CheckIcon className="h-3 w-3 text-green-500" />
                        </div>
                        <span className="text-muted-foreground">{feature}</span>
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
        <FadeUpOnScroll delay={0.5} className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </FadeUpOnScroll>
      </div>
    </section>
  );
}
