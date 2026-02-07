"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Footer from "@/components/footer";
import {
  LightningBoltIcon,
  RocketIcon,
  TargetIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { Zap } from "lucide-react";

export default function FeaturesPage() {
  const featureCategories = [
    {
      title: "Core Decision OS",
      subtitle: "Free Forever",
      icon: Zap,
      description: "The foundation that helps every founder think clearly.",
      features: [
        {
          name: "Startup Reality Lens",
          description: "Evaluate feasibility, economics, demand, distribution, and timing for any startup idea.",
        },
        {
          name: "Red Flag Detection",
          description: "Catch fatal flaws before they cost you time, money, and relationships.",
        },
        {
          name: "Strategy Reframing",
          description: "Transform scattered thoughts into structured, actionable strategies.",
        },
        {
          name: "Founder Wellbeing Support",
          description: "Non-therapeutic support for the mental load of building a company.",
        },
        {
          name: "Founder Intake Snapshot",
          description: "Lightweight assessment of where you are and what you need.",
        },
      ],
    },
    {
      title: "Investor Lens",
      subtitle: "$99/month",
      icon: TargetIcon,
      description: "Everything you need to become investor-ready.",
      features: [
        {
          name: "Investor Readiness Score",
          description: "Know exactly where you stand with a detailed explanation of what to fix.",
        },
        {
          name: "Pitch Deck Review Protocol",
          description: "Scorecard, objection list, and rewrite guidance for every section.",
        },
        {
          name: "Pre-Seed / Seed / Series A Lens",
          description: "Stage-specific guidance for each fundraising round.",
        },
        {
          name: "Strategy Documents",
          description: "Executive summary, diagnosis, options & tradeoffs, 30/60/90-day plans.",
        },
        {
          name: "Weekly SMS Check-Ins",
          description: "Automated accountability that keeps you on track.",
        },
        {
          name: "Persistent Founder Memory",
          description: "We remember your strategy and execution state across sessions.",
        },
      ],
    },
    {
      title: "Venture Studio",
      subtitle: "$249/month",
      icon: RocketIcon,
      description: "Leverage, execution, and capital connectivity.",
      features: [
        {
          name: "Boardy Integration",
          description: "Investor matching and warm-intro workflows to the right funds.",
        },
        {
          name: "Investor Targeting Guidance",
          description: "Find the funds that actually invest in your stage and sector.",
          comingSoon: true,
        },
        {
          name: "Outreach Sequencing",
          description: "Follow-up logic and fund-fit reality checks.",
          comingSoon: true,
        },
        {
          name: "Founder Ops Agent",
          description: "Weekly sprint planning, decision tracking, priority management.",
        },
        {
          name: "Fundraise Ops Agent",
          description: "Investor list building, email drafts, meeting prep & summaries.",
        },
        {
          name: "Growth Ops Agent",
          description: "Content calendars, social post drafting, landing page iterations.",
        },
        {
          name: "Inbox Ops Agent",
          description: "Email triage, draft responses, priority surfacing.",
          comingSoon: true,
        },
      ],
    },
  ];

  return (
    <main className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 py-24 md:px-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6">
            FEATURES
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-6 text-gray-900 dark:text-white">
            Everything Founders Need to <span className="text-[#ff6a1a]">Succeed</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            From first idea to Series A, the Decision OS supports you at every stage
            with tools built specifically for founders.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25">
              <Link href="/pricing">View Pricing</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]">
              <Link href="/get-started">Get Started Free</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Feature Categories */}
      {featureCategories.map((category, categoryIndex) => (
        <section
          key={category.title}
          className={`relative z-10 py-24 px-4 ${categoryIndex % 2 === 1 ? "bg-gray-50 dark:bg-gray-900/50" : ""}`}
        >
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col md:flex-row md:items-center gap-8 mb-12"
            >
              <div className="p-4 rounded-2xl bg-[#ff6a1a]/10 w-fit">
                <category.icon className="h-10 w-10 text-[#ff6a1a]" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{category.title}</h2>
                  <span className="text-sm font-medium text-[#ff6a1a] bg-[#ff6a1a]/10 px-3 py-1 rounded-full">
                    {category.subtitle}
                  </span>
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-400">{category.description}</p>
              </div>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.features.map((feature: { name: string; description: string; comingSoon?: boolean }, index) => (
                <motion.div
                  key={feature.name}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all">
                    <CardHeader>
                      <CardTitle className="flex items-start gap-3 text-gray-900 dark:text-white">
                        <CheckIcon className="h-5 w-5 text-[#ff6a1a] mt-1 flex-shrink-0" />
                        <span className="flex items-center gap-2">
                          {feature.name}
                          {feature.comingSoon && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                              Coming Soon
                            </span>
                          )}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="relative z-10 py-24 px-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Ready to Think Clearer?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Start with our free tier. No credit card required.
          </p>
          <Button asChild size="lg" className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25">
            <Link href="/get-started">Get Started Free</Link>
          </Button>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
