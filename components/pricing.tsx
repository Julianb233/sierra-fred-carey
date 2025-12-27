"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CheckIcon } from "@radix-ui/react-icons";

export default function Pricing() {
  const plans = [
    {
      name: "Founder Decision OS",
      desc: "Free forever — build trust and habit",
      price: 0,
      isMostPop: false,
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
    <section
      id="pricing"
      className="w-full max-w-7xl mx-auto px-4 py-24 md:px-6"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-16 flex flex-col gap-3"
      >
        <h2 className="text-xl font-semibold sm:text-2xl bg-linear-to-b from-foreground to-muted-foreground text-transparent bg-clip-text">
          Choose Your Plan
        </h2>
        <p className="mx-auto max-w-xl text-muted-foreground text-center">
          Select the perfect plan for your needs. Upgrade or downgrade at any
          time.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className={`relative ${plan.isMostPop ? "scale-105" : ""}`}
          >
            <Card
              className={`relative h-full ${
                plan.isMostPop ? "border-2 border-primary shadow-xl" : ""
              }`}
            >
              {plan.isMostPop && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-card border-2 border-primary px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <CardContent className="p-6 pt-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {plan.desc}
                  </p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground ml-1">/month</span>
                  </div>
                </div>

                <Separator className="my-6" />

                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="flex items-center text-sm"
                    >
                      <CheckIcon className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Button
                  className="w-full"
                  variant={plan.isMostPop ? "default" : "outline"}
                  size="lg"
                >
                  {plan.price === 0 ? "Get Started Free" : "Choose Plan"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
