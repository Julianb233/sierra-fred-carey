"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
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
    },
    {
      icon: TargetIcon,
      title: "Investor Readiness Score",
      description:
        "Know exactly where you stand before approaching investors. Get clear guidance on what to fix first.",
    },
    {
      icon: RocketIcon,
      title: "Pitch Deck Review",
      description:
        "Detailed scorecard, objection list, and rewrite guidance. Prepare for every investor question.",
    },
    {
      icon: LayersIcon,
      title: "Strategy Documents",
      description:
        "Executive summaries, diagnosis frameworks, options & tradeoffs, and 30/60/90-day action plans.",
    },
    {
      icon: PersonIcon,
      title: "Virtual Team Agents",
      description:
        "AI agents for Founder Ops, Fundraise Ops, Growth Ops, and Inbox management. Replace scattered tools.",
    },
    {
      icon: ChatBubbleIcon,
      title: "Weekly Check-Ins",
      description:
        "Automated SMS check-ins that keep you accountable. Persistent memory tracks your progress over time.",
    },
  ];

  return (
    <section id="features" className="w-full max-w-7xl mx-auto px-4 py-24 md:px-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-16 flex flex-col gap-3"
      >
        <span className="text-sm font-medium text-primary">CAPABILITIES</span>
        <h2 className="text-3xl font-semibold sm:text-4xl bg-linear-to-b from-foreground to-muted-foreground text-transparent bg-clip-text">
          Everything Founders Need
        </h2>
        <p className="mx-auto max-w-xl text-muted-foreground text-center">
          From ideation to fundraising to scaling — the Decision OS supports you at every stage.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow duration-300 group">
              <CardContent className="p-6">
                <div className="mb-4 p-3 rounded-lg bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
