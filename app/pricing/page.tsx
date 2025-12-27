"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import Footer from "@/components/footer";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";

export default function PricingPage() {
  const plans = [
    {
      name: "Founder Decision OS",
      subtitle: "Free Forever",
      price: 0,
      description: "Maximum adoption, trust, and habit formation.",
      audience: "First-time founders, early ideation, founders not yet considering fundraising.",
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
      features: [
        { name: "Everything in Free tier", included: true },
        { name: "Full Investor Lens (Pre-Seed/Seed/A)", included: true },
        { name: "Investor Readiness Score", included: true },
        { name: "Pitch Deck Review Protocol", included: true },
        { name: "Strategy Documents", included: true },
        { name: "Executive Summary", included: true },
        { name: "30/60/90-day Plans", included: true },
        { name: "Weekly SMS Check-Ins", included: true },
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
      features: [
        { name: "Everything in Fundraising tier", included: true },
        { name: "Boardy Integration", included: true },
        { name: "Investor Matching & Warm Intros", included: true },
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
    { name: "Weekly SMS Check-Ins", free: false, fundraising: true, studio: true },
    { name: "Boardy Integration", free: false, fundraising: false, studio: true },
    { name: "Virtual Team Agents", free: false, fundraising: false, studio: true },
  ];

  return (
    <main className="flex flex-col min-h-dvh">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-24 md:px-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="text-sm font-medium text-primary">PRICING</span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Each tier unlocks outcomes, not just features. Higher tiers reduce
            time-to-clarity and time-to-conviction.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Pricing is about access to judgment, leverage, and continuity.
          </p>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 pb-24 md:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
            >
              <Card
                className={`h-full flex flex-col ${
                  plan.popular ? "border-2 border-primary shadow-xl" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="pt-8">
                  <div className="text-center">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-primary font-medium">{plan.subtitle}</p>
                    <div className="mt-4">
                      <span className="text-5xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <p className="text-xs text-muted-foreground mb-6 italic">
                    Best for: {plan.audience}
                  </p>

                  <Separator className="mb-6" />

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature.name} className="flex items-center text-sm">
                        {feature.included ? (
                          <CheckIcon className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        ) : (
                          <Cross2Icon className="h-4 w-4 text-muted-foreground/50 mr-3 flex-shrink-0" />
                        )}
                        <span className={feature.included ? "" : "text-muted-foreground/50"}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    asChild
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    <Link href="/get-started">{plan.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="bg-muted/30 py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Feature Comparison</h2>
            <p className="text-muted-foreground">
              See exactly what&apos;s included in each tier.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold">Free</th>
                      <th className="text-center p-4 font-semibold text-primary">$99</th>
                      <th className="text-center p-4 font-semibold">$249</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((feature, index) => (
                      <tr key={feature.name} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="p-4 text-sm">{feature.name}</td>
                        <td className="text-center p-4">
                          {feature.free ? (
                            <CheckIcon className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <Cross2Icon className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                          )}
                        </td>
                        <td className="text-center p-4">
                          {feature.fundraising ? (
                            <CheckIcon className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <Cross2Icon className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                          )}
                        </td>
                        <td className="text-center p-4">
                          {feature.studio ? (
                            <CheckIcon className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <Cross2Icon className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Guardrails */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Our Guiding Principles</h2>
            <p className="text-muted-foreground">Non-negotiable values that shape everything we build.</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {[
              "Founders earn access to capital tooling by building real businesses.",
              "Fundraising is never positioned as success by default.",
              "Free tier builds trust and habit. Paid tiers deliver leverage and judgment.",
              "Each tier unlocks outcomes, not just features.",
              "Higher tiers reduce time-to-clarity and time-to-conviction.",
            ].map((principle, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
                <span className="text-primary font-bold text-lg">{index + 1}.</span>
                <p className="text-muted-foreground">{principle}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
