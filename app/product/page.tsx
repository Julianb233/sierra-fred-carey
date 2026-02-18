"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard3D } from "@/components/premium/Card3D";
import { PhoneMockup, PhoneScreenChat } from "@/components/premium/PhoneMockup";
import { FadeUpOnScroll } from "@/components/premium/AnimatedText";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ChevronRightIcon,
  FileTextIcon,
  LightningBoltIcon,
  RocketIcon,
  BarChartIcon,
  ChatBubbleIcon,
  ReaderIcon,
  CheckIcon,
} from "@radix-ui/react-icons";

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a1a]/5 via-transparent to-amber-500/5 dark:from-[#ff6a1a]/10 dark:to-amber-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,106,26,0.1),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <FadeUpOnScroll>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-8">
              <Link href="/" className="hover:text-[#ff6a1a] transition-colors">
                Home
              </Link>
              <ChevronRightIcon className="h-4 w-4" />
              <span className="text-gray-900 dark:text-white font-medium">Product</span>
            </div>
          </FadeUpOnScroll>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <FadeUpOnScroll delay={0.1}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                See{" "}
                <span className="bg-gradient-to-r from-[#ff6a1a] via-orange-500 to-[#ff6a1a] bg-clip-text text-transparent">
                  Sahara
                </span>{" "}
                in Action
              </h1>
            </FadeUpOnScroll>

            <FadeUpOnScroll delay={0.2}>
              <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Your AI-powered founder operating system. Turn founder chaos into
                founder clarity with intelligent tools built by Fred Cary.
              </p>
            </FadeUpOnScroll>

            <FadeUpOnScroll delay={0.3}>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all"
                >
                  <Link href="/signup">
                    Get Started
                    <RocketIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#features">
                    Explore Features
                    <ChevronRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </FadeUpOnScroll>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <FadeUpOnScroll>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-[#ff6a1a]/10 text-[#ff6a1a] border-[#ff6a1a]/20">
                Six Powerful Tools
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                Everything You Need to{" "}
                <span className="text-[#ff6a1a]">Build Better</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Realistic dashboard mockups showing how Sahara transforms your founder journey
              </p>
            </div>
          </FadeUpOnScroll>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Feature 1: Reality Lens */}
            <FadeUpOnScroll delay={0.1}>
              <GlassCard3D className="p-6 sm:p-8 h-full">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[#ff6a1a]/10">
                      <BarChartIcon className="h-6 w-6 text-[#ff6a1a]" />
                    </div>
                    <h3 className="text-2xl font-bold">Reality Lens</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    5-dimensional analysis of your startup idea with AI-powered scoring
                  </p>
                </div>

                {/* Reality Lens Dashboard Mockup */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-semibold text-lg">Idea Analysis</h4>
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-bold text-[#ff6a1a]">72</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">/100</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: "Feasibility", value: 85, color: "bg-green-500" },
                      { label: "Economics", value: 65, color: "bg-yellow-500" },
                      { label: "Demand", value: 78, color: "bg-green-500" },
                      { label: "Distribution", value: 55, color: "bg-orange-500" },
                      { label: "Timing", value: 80, color: "bg-green-500" },
                    ].map((dimension, i) => (
                      <motion.div
                        key={dimension.label}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{dimension.label}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {dimension.value}%
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${dimension.value}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className={`h-full ${dimension.color} rounded-full`}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <LightningBoltIcon className="h-5 w-5 text-[#ff6a1a] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-1">Key Insight</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Strong feasibility and timing, but distribution strategy needs work.
                          Consider partnering with established players.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard3D>
            </FadeUpOnScroll>

            {/* Feature 2: Investor Readiness Score */}
            <FadeUpOnScroll delay={0.2}>
              <GlassCard3D className="p-6 sm:p-8 h-full">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[#ff6a1a]/10">
                      <RocketIcon className="h-6 w-6 text-[#ff6a1a]" />
                    </div>
                    <h3 className="text-2xl font-bold">Investor Readiness Score</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    8-dimension scoring grid to track fundraising readiness
                  </p>
                </div>

                {/* Investor Readiness Dashboard Mockup */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="mb-6">
                    <h4 className="font-semibold text-lg mb-4">Readiness Overview</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Team Strength", score: 8.5, color: "text-green-500" },
                        { label: "Market Opportunity", score: 7.2, color: "text-green-500" },
                        { label: "Product-Market Fit", score: 6.8, color: "text-yellow-500" },
                        { label: "Traction", score: 5.5, color: "text-orange-500" },
                        { label: "Business Model", score: 7.8, color: "text-green-500" },
                        { label: "Competitive Moat", score: 6.2, color: "text-yellow-500" },
                        { label: "Use of Funds", score: 8.0, color: "text-green-500" },
                        { label: "Pitch Quality", score: 7.4, color: "text-green-500" },
                      ].map((item, i) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {item.label}
                          </div>
                          <div className={`text-xl font-bold ${item.color}`}>
                            {item.score}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#ff6a1a]/10 to-orange-400/10 rounded-lg p-4 border border-[#ff6a1a]/20">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium mb-1">Overall Score</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Above average readiness
                        </p>
                      </div>
                      <div className="text-3xl font-bold text-[#ff6a1a]">
                        7.2
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard3D>
            </FadeUpOnScroll>

            {/* Feature 3: Pitch Deck Review */}
            <FadeUpOnScroll delay={0.3}>
              <GlassCard3D className="p-6 sm:p-8 h-full">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <ReaderIcon className="h-6 w-6 text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-bold">Pitch Deck Review</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Slide-by-slide analysis with actionable feedback
                  </p>
                </div>

                {/* Pitch Deck Dashboard Mockup */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="font-semibold text-lg">Deck Score</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Based on 500+ successful decks
                      </p>
                    </div>
                    <div className="text-3xl font-bold text-blue-500">74/100</div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { slide: "Cover Slide", score: 85, status: "excellent" },
                      { slide: "Problem", score: 78, status: "good" },
                      { slide: "Solution", score: 72, status: "good" },
                      { slide: "Market Size", score: 68, status: "needs-work" },
                      { slide: "Business Model", score: 75, status: "good" },
                      { slide: "Traction", score: 65, status: "needs-work" },
                      { slide: "Team", score: 82, status: "excellent" },
                      { slide: "Ask & Use of Funds", score: 71, status: "good" },
                    ].map((slide, i) => (
                      <motion.div
                        key={slide.slide}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          {slide.status === "excellent" ? (
                            <CheckCircledIcon className="h-4 w-4 text-green-500" />
                          ) : slide.status === "good" ? (
                            <CheckIcon className="h-4 w-4 text-blue-500" />
                          ) : (
                            <CrossCircledIcon className="h-4 w-4 text-orange-500" />
                          )}
                          <span className="text-sm font-medium">{slide.slide}</span>
                        </div>
                        <Badge
                          variant={
                            slide.status === "excellent"
                              ? "default"
                              : slide.status === "good"
                              ? "secondary"
                              : "outline"
                          }
                          className={
                            slide.status === "excellent"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : slide.status === "good"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          }
                        >
                          {slide.score}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GlassCard3D>
            </FadeUpOnScroll>

            {/* Feature 4: Virtual Team Agents */}
            <FadeUpOnScroll delay={0.4}>
              <GlassCard3D className="p-6 sm:p-8 h-full">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <ChatBubbleIcon className="h-6 w-6 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold">Virtual Team Agents</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    AI agents working 24/7 on your founder operations
                  </p>
                </div>

                {/* Virtual Agents Dashboard Mockup */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        name: "Founder Ops",
                        status: "active",
                        tasks: 12,
                        icon: "🚀",
                        color: "text-[#ff6a1a]",
                      },
                      {
                        name: "Fundraise Ops",
                        status: "active",
                        tasks: 8,
                        icon: "💰",
                        color: "text-orange-500",
                      },
                      {
                        name: "Growth Ops",
                        status: "active",
                        tasks: 15,
                        icon: "📈",
                        color: "text-blue-500",
                      },
                      {
                        name: "Inbox Agent",
                        status: "active",
                        tasks: 24,
                        icon: "📧",
                        color: "text-green-500",
                      },
                    ].map((agent, i) => (
                      <motion.div
                        key={agent.name}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{agent.icon}</span>
                            <div>
                              <h5 className="font-semibold text-sm">{agent.name}</h5>
                              <div className="flex items-center gap-1.5 mt-1">
                                <motion.div
                                  animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [1, 0.7, 1],
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                  }}
                                  className="w-2 h-2 bg-green-500 rounded-full"
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  Active
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Active Tasks
                          </span>
                          <Badge
                            className={`${agent.color} bg-opacity-10 border-opacity-20`}
                          >
                            {agent.tasks}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Total Tasks Automated</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          This month
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-green-500">59</div>
                    </div>
                  </div>
                </div>
              </GlassCard3D>
            </FadeUpOnScroll>

            {/* Feature 5: Weekly Check-ins */}
            <FadeUpOnScroll delay={0.5}>
              <GlassCard3D className="p-6 sm:p-8 h-full">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-pink-500/10">
                      <ChatBubbleIcon className="h-6 w-6 text-pink-500" />
                    </div>
                    <h3 className="text-2xl font-bold">Weekly Check-ins</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    SMS-based coaching sessions with Fred&apos;s AI coach
                  </p>
                </div>

                {/* iPhone Mockup with SMS */}
                <div className="flex justify-center">
                  <PhoneMockup floating={true} className="scale-90">
                    <PhoneScreenChat>
                      <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#ff6a1a]/20 to-pink-500/20 backdrop-blur-sm px-4 py-3 pt-10 border-b border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff6a1a] to-pink-500 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">FC</span>
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">
                                Fred Cary AI
                              </p>
                              <p className="text-white/60 text-xs">Weekly Check-in</p>
                            </div>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-3 space-y-3 overflow-hidden">
                          {[
                            {
                              role: "ai" as const,
                              text: "Hey! Ready for your weekly check-in? How did last week go?",
                            },
                            {
                              role: "user" as const,
                              text: "Great! Closed 2 new enterprise pilots 🎉",
                            },
                            {
                              role: "ai" as const,
                              text: "That's awesome! What were the key factors that helped you close them?",
                            },
                            {
                              role: "user" as const,
                              text: "The new pricing model we discussed last week made all the difference",
                            },
                            {
                              role: "ai" as const,
                              text: "Perfect execution! Let's discuss scaling this for next week. What's your biggest blocker right now?",
                            },
                          ].map((msg, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.2 }}
                              className={`flex ${
                                msg.role === "user" ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                                  msg.role === "user"
                                    ? "bg-[#ff6a1a] text-white rounded-br-none"
                                    : "bg-white/10 text-white rounded-bl-none"
                                }`}
                              >
                                {msg.text}
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Stats footer */}
                        <div className="p-3 bg-black/30 border-t border-white/10">
                          <div className="flex justify-between text-xs text-white/60 mb-2">
                            <span>6 week streak 🔥</span>
                            <span>92% completion rate</span>
                          </div>
                          <div className="bg-white/10 rounded-full px-4 py-2 text-white/50 text-xs">
                            Ask Fred anything...
                          </div>
                        </div>
                      </div>
                    </PhoneScreenChat>
                  </PhoneMockup>
                </div>
              </GlassCard3D>
            </FadeUpOnScroll>

            {/* Feature 6: Strategy Documents */}
            <FadeUpOnScroll delay={0.6}>
              <GlassCard3D className="p-6 sm:p-8 h-full">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[#ff6a1a]/10">
                      <FileTextIcon className="h-6 w-6 text-[#ff6a1a]" />
                    </div>
                    <h3 className="text-2xl font-bold">Strategy Documents</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    AI-generated strategic documents for your startup
                  </p>
                </div>

                {/* Strategy Docs Dashboard Mockup */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { name: "Go-to-Market", icon: "🎯", color: "from-[#ff6a1a] to-orange-500" },
                      {
                        name: "Fundraising",
                        icon: "💼",
                        color: "from-orange-500 to-amber-500",
                      },
                      { name: "Product Roadmap", icon: "🗺️", color: "from-blue-500 to-cyan-500" },
                      {
                        name: "Hiring Plan",
                        icon: "👥",
                        color: "from-green-500 to-emerald-500",
                      },
                    ].map((doc, i) => (
                      <motion.button
                        key={doc.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`bg-gradient-to-br ${doc.color} p-4 rounded-xl text-white text-left shadow-lg hover:shadow-xl transition-all`}
                      >
                        <div className="text-2xl mb-2">{doc.icon}</div>
                        <div className="text-xs font-medium">{doc.name}</div>
                      </motion.button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold mb-3">Recent Documents</h5>
                    {[
                      {
                        name: "Q1 2024 GTM Strategy",
                        date: "2 days ago",
                        status: "Updated",
                      },
                      {
                        name: "Series A Fundraising Plan",
                        date: "1 week ago",
                        status: "Complete",
                      },
                      {
                        name: "Product Vision & Roadmap",
                        date: "2 weeks ago",
                        status: "Complete",
                      },
                    ].map((doc, i) => (
                      <motion.div
                        key={doc.name}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#ff6a1a]/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <FileTextIcon className="h-4 w-4 text-[#ff6a1a]" />
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {doc.date}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-[#ff6a1a]/10 text-[#ff6a1a] border-[#ff6a1a]/20">
                          {doc.status}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GlassCard3D>
            </FadeUpOnScroll>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a1a]/10 via-orange-400/10 to-amber-500/10" />

        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUpOnScroll>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              Ready to Transform Your{" "}
              <span className="text-[#ff6a1a]">
                Founder Journey?
              </span>
            </h2>
          </FadeUpOnScroll>

          <FadeUpOnScroll delay={0.1}>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of founders who are building better companies with AI-powered
              decision intelligence.
            </p>
          </FadeUpOnScroll>

          <FadeUpOnScroll delay={0.2}>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all text-lg px-8"
              >
                <Link href="/signup">
                  Get Started Free
                  <RocketIcon className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8">
                <Link href="/#pricing">View Pricing</Link>
              </Button>
            </div>
          </FadeUpOnScroll>

          <FadeUpOnScroll delay={0.3}>
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircledIcon className="h-5 w-5 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircledIcon className="h-5 w-5 text-green-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircledIcon className="h-5 w-5 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </FadeUpOnScroll>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
