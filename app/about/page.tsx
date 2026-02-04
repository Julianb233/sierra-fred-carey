"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  RocketIcon,
  LightningBoltIcon,
  TargetIcon,
  CheckCircledIcon,
  PersonIcon,
  HeartIcon
} from "@radix-ui/react-icons";

const stats = [
  { value: "10,000+", label: "Founders Coached" },
  { value: "20+", label: "Years Experience" },
  { value: "$100M+", label: "Capital Raised" },
  { value: "500+", label: "Startups Launched" },
];

const timeline = [
  {
    year: "2004",
    title: "The Beginning",
    description: "Started coaching founders on decision-making frameworks after selling first startup.",
    icon: RocketIcon,
  },
  {
    year: "2010",
    title: "Scaling Impact",
    description: "Developed systematic approach to founder decision-making after working with 1,000+ founders.",
    icon: TargetIcon,
  },
  {
    year: "2018",
    title: "AI Integration",
    description: "Began researching how AI could enhance founder decision-making processes.",
    icon: LightningBoltIcon,
  },
  {
    year: "2024",
    title: "Decision OS Launch",
    description: "Launched the AI-powered Founder Decision OS to democratize access to world-class decision frameworks.",
    icon: CheckCircledIcon,
  },
];

const values = [
  {
    icon: TargetIcon,
    title: "Clarity First",
    description: "We believe the best decisions come from absolute clarity on what matters most.",
  },
  {
    icon: LightningBoltIcon,
    title: "Speed Matters",
    description: "In startups, the cost of slow decisions compounds. We help you move fast with confidence.",
  },
  {
    icon: HeartIcon,
    title: "Founder-Centric",
    description: "Built by a founder, for founders. Every feature serves your unique journey.",
  },
  {
    icon: CheckCircledIcon,
    title: "Data-Driven",
    description: "Decisions informed by 20+ years of founder patterns, powered by AI insights.",
  },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-gray-950">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <motion.div
          className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]"
          animate={{ y: [0, 40, 0], x: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]"
          animate={{ y: [0, -50, 0], x: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center py-20">
        <div className="relative z-20 max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-block"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a]">
                <PersonIcon className="w-4 h-4" />
                Meet Fred Cary
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-white">
              <span className="text-[#ff6a1a]">Empowering Founders</span>
              <br />
              Through Better Decisions
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              After coaching <span className="text-[#ff6a1a] font-semibold">10,000+ founders</span> over two decades,
              I built the AI-powered decision system I wish I had when starting my first company.
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-6">
              <Button size="lg" asChild className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25">
                <Link href="#story">
                  Read My Story
                  <motion.span
                    className="ml-2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-gray-300 dark:border-gray-700 hover:border-[#ff6a1a] hover:text-[#ff6a1a]">
                <Link href="#mission">Our Mission</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 bg-gray-50 dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="space-y-2">
                  <div className="text-4xl md:text-5xl font-bold text-[#ff6a1a]">
                    {stat.value}
                  </div>
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section id="story" className="relative py-32 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                The <span className="text-[#ff6a1a]">Journey</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                From founder to coach to AI pioneer
              </p>
            </div>
          </motion.div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-[#ff6a1a]/30 transition-colors shadow-sm">
                <CardContent className="p-8 space-y-4">
                  <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                    I started my first company in 1999, fresh out of college with more passion than sense.
                    Like most founders, I made decisions by gut feeling, copying what worked for others,
                    and hoping for the best. Some decisions turned out brilliantly. Others nearly sank the company.
                  </p>
                  <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                    After successfully exiting that startup, I became obsessed with understanding{" "}
                    <span className="font-semibold text-[#ff6a1a]">why some founders consistently made better decisions than others</span>.
                    Was it pattern recognition? Mental models? Or something else entirely?
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-[#ff6a1a]/30 transition-colors shadow-sm">
                <CardContent className="p-8 space-y-4">
                  <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                    Over the next 20 years, I had the privilege of coaching over 10,000 founders.
                    I noticed patterns emerging - certain decision frameworks worked consistently across
                    industries, stages, and founder personalities. I codified these into a systematic approach.
                  </p>
                  <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                    But there was a problem: <span className="text-[#ff6a1a] font-semibold">scaling one-on-one coaching was impossible</span>.
                    The founders who needed help most couldn't access it. That's when I realized AI could change everything.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-2 border-[#ff6a1a]/30 bg-gradient-to-br from-[#ff6a1a]/5 to-orange-400/5 dark:from-[#ff6a1a]/10 dark:to-orange-400/10">
                <CardContent className="p-8 space-y-4">
                  <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                    <span className="font-bold text-xl text-[#ff6a1a]">The Founder Decision OS</span> is the culmination
                    of this journey. It combines two decades of founder coaching insights with cutting-edge AI to
                    give every founder access to world-class decision-making frameworks.
                  </p>
                  <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                    Not as a replacement for human judgment, but as a tool to enhance it.
                    To help you see patterns faster, avoid common pitfalls, and make decisions with confidence.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="relative py-32 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4 mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                <span className="text-[#ff6a1a]">Timeline</span> of Impact
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Key milestones in the journey to Decision OS
              </p>
            </div>
          </motion.div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#ff6a1a]/50 to-transparent hidden md:block" />

            <div className="space-y-20">
              {timeline.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <div className={`flex items-center gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    {/* Content */}
                    <div className="flex-1">
                      <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-all hover:shadow-xl hover:shadow-[#ff6a1a]/10 bg-white dark:bg-gray-950">
                        <CardHeader>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 rounded-lg bg-[#ff6a1a]/10">
                              <item.icon className="w-6 h-6 text-[#ff6a1a]" />
                            </div>
                            <span className="text-sm font-bold text-[#ff6a1a]">{item.year}</span>
                          </div>
                          <CardTitle className="text-2xl text-gray-900 dark:text-white">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {item.description}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Timeline Dot */}
                    <div className="hidden md:flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-4 h-4 rounded-full bg-[#ff6a1a] ring-4 ring-white dark:ring-gray-900 shadow-lg shadow-[#ff6a1a]/50"
                      />
                    </div>

                    {/* Spacer */}
                    <div className="flex-1 hidden md:block" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="relative py-32 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                Our <span className="text-[#ff6a1a]">Mission</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Democratize access to world-class decision-making frameworks for every founder
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <Card className="border-2 border-[#ff6a1a]/30 bg-gradient-to-br from-[#ff6a1a]/5 to-orange-400/5">
              <CardContent className="p-12 text-center space-y-6">
                <p className="text-2xl md:text-3xl font-semibold leading-relaxed text-gray-900 dark:text-white">
                  "Every founder deserves access to the decision-making frameworks that
                  billion-dollar companies use - not just the privileged few."
                </p>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  — Fred Cary, Founder
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-2 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-all hover:shadow-xl hover:shadow-[#ff6a1a]/10 bg-white dark:bg-gray-950">
                  <CardHeader>
                    <div className="p-3 rounded-lg bg-[#ff6a1a]/10 w-fit mb-4">
                      <value.icon className="w-6 h-6 text-[#ff6a1a]" />
                    </div>
                    <CardTitle className="text-2xl text-gray-900 dark:text-white">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="relative py-32 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                The <span className="text-[#ff6a1a]">Vision</span>
              </h2>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              <p>
                Imagine a world where every founder has instant access to decision frameworks
                refined by thousands of successful entrepreneurs. Where you can get clarity on
                your hardest decisions in minutes, not months.
              </p>
              <p>
                Where AI doesn't replace your judgment but enhances it - helping you see blind spots,
                identify patterns, and make decisions with confidence backed by data from 10,000+ founder journeys.
              </p>
              <p className="text-xl font-semibold text-[#ff6a1a]">
                That's the world we're building with the Founder Decision OS.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 bg-white dark:bg-gray-950">
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Card className="border-2 border-[#ff6a1a]/30 bg-gradient-to-br from-[#ff6a1a]/5 via-orange-400/5 to-amber-500/5">
              <CardContent className="p-12 space-y-8">
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
                  Ready to <span className="text-[#ff6a1a]">Transform</span> Your Decision-Making?
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Join thousands of founders who are making better, faster decisions
                  with AI-powered insights.
                </p>
                <div className="flex flex-wrap gap-4 justify-center pt-4">
                  <Button size="lg" asChild className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25">
                    <Link href="/#pricing">
                      Get Started Today
                      <motion.span
                        className="ml-2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        →
                      </motion.span>
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="border-gray-300 dark:border-gray-700 hover:border-[#ff6a1a] hover:text-[#ff6a1a]">
                    <Link href="/#features">Explore Features</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
