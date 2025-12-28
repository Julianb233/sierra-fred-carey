"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Briefcase,
  TrendingUp,
  Mail,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Clock,
  Zap,
  Users,
  Quote,
  Star,
} from "lucide-react";
import Link from "next/link";

export default function VirtualTeamDemo() {
  const [activeAgent, setActiveAgent] = useState(0);
  const [chatIndex, setChatIndex] = useState(0);

  const agents = [
    {
      name: "Founder Ops",
      icon: Briefcase,
      color: "bg-[#ff6a1a]",
      role: "Chief of Staff AI",
      description: "Your 24/7 executive assistant that handles calendar, tasks, and daily operations",
      capabilities: [
        "Prioritizes your daily tasks based on urgency and impact",
        "Preps briefing docs before every meeting",
        "Tracks action items and follows up automatically",
        "Manages your calendar conflicts intelligently",
      ],
      messages: [
        { from: "agent", text: "Morning! You have 3 investor meetings today. I've prepped one-pagers for each—including their recent portfolio moves." },
        { from: "user", text: "What's the priority today?" },
        { from: "agent", text: "🔴 Critical: Finalize Q4 financials (due tomorrow)\n🟡 High: Review Sarah's product roadmap\n🟢 Normal: Prep for Thursday's board meeting\n\nI've blocked 2 hours this morning for financials." },
      ],
      stats: { tasksCompleted: 47, timeSaved: "18h" },
      testimonial: "It's like having a chief of staff who never sleeps. I get 4 extra hours a day now.",
    },
    {
      name: "Fundraise Ops",
      icon: TrendingUp,
      color: "bg-orange-500",
      role: "Fundraising AI",
      description: "Manages your entire investor pipeline from outreach to close",
      capabilities: [
        "Tracks investor engagement (deck opens, link clicks)",
        "Drafts personalized follow-up emails",
        "Books meetings and adds prep notes automatically",
        "Identifies warm intros from your network",
      ],
      messages: [
        { from: "agent", text: "🎯 Hot lead alert! Sarah Chen at Sequoia opened your deck 3 times and spent 12 min on the financials slide." },
        { from: "user", text: "Send them the traction doc" },
        { from: "agent", text: "Done. I also noticed she's connected to your advisor Mark. Want me to ask him for a warm intro? Also booked 2 intro calls for next week." },
      ],
      stats: { investorsMet: 23, meetingsBooked: 8 },
      testimonial: "Went from 5% reply rate to 42% in one month. The personalization is incredible.",
    },
    {
      name: "Growth Ops",
      icon: Sparkles,
      color: "bg-amber-500",
      role: "Growth AI",
      description: "Your data-driven growth strategist monitoring metrics 24/7",
      capabilities: [
        "Real-time dashboard of key metrics (MRR, churn, CAC, LTV)",
        "Automated weekly growth reports",
        "A/B test recommendations based on data patterns",
        "Competitor monitoring and market analysis",
      ],
      messages: [
        { from: "agent", text: "📈 MRR hit $12.4k! Up 18% from last week. But I noticed something—your trial-to-paid conversion dropped 3% since Tuesday." },
        { from: "user", text: "What's driving it?" },
        { from: "agent", text: "Users are dropping off at the pricing page. I compared it to last month—the new layout has 23% less engagement. Suggest we A/B test a simplified version. Want me to set it up?" },
      ],
      stats: { experimentsRun: 12, mrrGrowth: "+34%" },
      testimonial: "Like having a full-time data analyst who actually tells me what to DO, not just what the numbers say.",
    },
    {
      name: "Inbox Ops",
      icon: Mail,
      color: "bg-orange-600",
      role: "Email AI",
      description: "Tames your inbox—triages, drafts, and responds intelligently",
      capabilities: [
        "Auto-categorizes emails by priority and type",
        "Drafts responses in your voice and tone",
        "Identifies sales opportunities and customer issues",
        "Unsubscribes from noise and blocks spam",
      ],
      messages: [
        { from: "agent", text: "📬 Triaged 47 emails. 3 need you, 12 auto-responded, 32 archived/snoozed.\n\n🔥 VIP: Enterprise lead ($50k ARR potential) asking for demo" },
        { from: "user", text: "Draft a reply to the enterprise lead" },
        { from: "agent", text: "Done. I've drafted a personalized response referencing their recent Series B and how we helped similar companies. Also attached the enterprise case study. Want to review before I send?" },
      ],
      stats: { emailsTriaged: 342, hoursReclaimed: "6h" },
      testimonial: "I used to spend 2 hours a day on email. Now it's 15 minutes. Game changer.",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAgent((prev) => (prev + 1) % agents.length);
      setChatIndex(0);
    }, 5000);
    return () => clearInterval(interval);
  }, [agents.length]);

  useEffect(() => {
    if (chatIndex < agents[activeAgent].messages.length - 1) {
      const timer = setTimeout(() => {
        setChatIndex((prev) => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [chatIndex, activeAgent, agents]);

  const currentAgent = agents[activeAgent];
  const Icon = currentAgent.icon;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6"
            >
              <Bot className="w-4 h-4" />
              Virtual Team Agents
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white"
            >
              Your <span className="text-[#ff6a1a]">AI Co-Founders</span>
              <br />
              Work While You Sleep
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
            >
              Stop drowning in operations. Get 4 AI agents that handle your calendar, fundraising,
              growth, and inbox—so you can focus on building.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Main Demo Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Chat Demo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`${currentAgent.color} p-2 rounded-full`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">{currentAgent.name}</h3>
                    <p className="text-xs text-gray-500">{currentAgent.role}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-500">Active</span>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-6 space-y-4 min-h-[300px]">
                <AnimatePresence mode="wait">
                  {currentAgent.messages.slice(0, chatIndex + 1).map((msg, index) => (
                    <motion.div
                      key={`${activeAgent}-${index}`}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.from === "user"
                            ? "bg-[#ff6a1a] text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing Indicator */}
                {chatIndex < currentAgent.messages.length - 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 bg-gray-400 rounded-full"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Agent Stats */}
              <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-center">
                  {Object.entries(currentAgent.stats).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-xl font-bold text-[#ff6a1a]">{value}</div>
                      <div className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Agent Selector */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
                Meet Your <span className="text-[#ff6a1a]">Virtual Team</span>
              </h2>

              <div className="space-y-4">
                {agents.map((agent, index) => {
                  const AgentIcon = agent.icon;
                  const isActive = index === activeAgent;
                  return (
                    <motion.div
                      key={agent.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => { setActiveAgent(index); setChatIndex(0); }}
                      className="cursor-pointer"
                    >
                      <div
                        className={`bg-white dark:bg-gray-900 rounded-xl p-4 border-2 transition-all duration-300 ${
                          isActive
                            ? "border-[#ff6a1a] shadow-lg shadow-[#ff6a1a]/10"
                            : "border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`${agent.color} p-3 rounded-xl`}>
                            <AgentIcon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{agent.name}</h3>
                              {isActive && (
                                <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  <span className="text-xs text-green-600 dark:text-green-400">Live</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mb-1">{agent.role}</p>
                            <p className="text-xs text-gray-400">{agent.description}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <Button asChild size="lg" className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 mt-8">
                <Link href="/pricing">
                  Activate My Team <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Agent Deep Dive Section */}
      <section className="relative z-10 py-20 px-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-4"
            >
              <Zap className="w-4 h-4" />
              What Each Agent Does
            </motion.span>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Your Team&apos;s <span className="text-[#ff6a1a]">Superpowers</span>
            </h2>
          </div>

          <div className="space-y-8">
            {agents.map((agent, index) => {
              const AgentIcon = agent.icon;
              return (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-lg ${
                    index % 2 === 1 ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  <div className="grid lg:grid-cols-2 gap-8 items-center">
                    {/* Agent Info */}
                    <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`${agent.color} p-4 rounded-2xl shadow-lg`}>
                          <AgentIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{agent.name}</h3>
                          <p className="text-[#ff6a1a] font-medium">{agent.role}</p>
                        </div>
                      </div>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">{agent.description}</p>

                      {/* Capabilities List */}
                      <div className="space-y-3">
                        {agent.capabilities.map((capability, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + i * 0.1 }}
                            className="flex items-start gap-3"
                          >
                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{capability}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Stats & Testimonial */}
                    <div className={`space-y-6 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                      {/* Stats Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(agent.stats).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-[#ff6a1a]">{value}</div>
                            <div className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                          </div>
                        ))}
                      </div>

                      {/* Testimonial */}
                      <div className="bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/5 rounded-xl p-6 border border-[#ff6a1a]/20">
                        <Quote className="w-8 h-8 text-[#ff6a1a]/30 mb-3" />
                        <p className="text-gray-700 dark:text-gray-300 italic mb-4">&quot;{agent.testimonial}&quot;</p>
                        <div className="flex items-center gap-2">
                          <div className="flex text-yellow-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className="w-4 h-4 fill-current" />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">— Sahara User</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-4"
            >
              <Clock className="w-4 h-4" />
              Get Started in Minutes
            </motion.span>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
              How It <span className="text-[#ff6a1a]">Works</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Connect Your Tools", description: "Link your calendar, email, and CRM. Takes 2 minutes.", icon: Zap },
              { step: "2", title: "Meet Your Agents", description: "Each AI agent learns your preferences and communication style.", icon: Users },
              { step: "3", title: "Set Your Priorities", description: "Tell them what matters most—fundraising, growth, operations.", icon: TrendingUp },
              { step: "4", title: "Reclaim Your Time", description: "Watch 30+ hours return to your week, every week.", icon: Clock },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                {/* Connection Line */}
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#ff6a1a] to-orange-300" />
                )}

                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-lg relative z-10 text-center">
                  <div className="flex flex-col items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#ff6a1a] text-white font-bold text-xl flex items-center justify-center">
                      {item.step}
                    </div>
                    <item.icon className="w-6 h-6 text-[#ff6a1a]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Stats Section */}
      <section className="relative z-10 py-20 px-4 bg-gradient-to-br from-[#ff6a1a] to-orange-600">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              The Numbers Don&apos;t Lie
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              Real results from real founders using their Virtual Team
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { value: "32h", label: "Saved per week", subtext: "on average" },
              { value: "4x", label: "More investor meetings", subtext: "booked" },
              { value: "87%", label: "Faster email response", subtext: "time" },
              { value: "97%", label: "Would be lost", subtext: "without it" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20"
              >
                <div className="text-5xl md:text-6xl font-bold text-white mb-2">{stat.value}</div>
                <p className="text-white font-medium">{stat.label}</p>
                <p className="text-white/60 text-sm">{stat.subtext}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Perfect For <span className="text-[#ff6a1a]">Every Stage</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Whether you&apos;re just starting out or scaling to Series A, your Virtual Team adapts to your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                stage: "Pre-Seed",
                title: "Validate & Launch",
                agents: ["Founder Ops", "Growth Ops"],
                benefits: ["Focus on product while agents handle admin", "Track early metrics and user feedback", "Prep for your first investor conversations"],
              },
              {
                stage: "Seed",
                title: "Raise & Scale",
                agents: ["All 4 Agents"],
                benefits: ["Full fundraising pipeline management", "Scale outreach without hiring", "Keep investors updated automatically"],
                featured: true,
              },
              {
                stage: "Series A",
                title: "Optimize & Grow",
                agents: ["Inbox Ops", "Growth Ops"],
                benefits: ["Handle 10x more communication", "Data-driven growth experiments", "Board prep and reporting automated"],
              },
            ].map((useCase, index) => (
              <motion.div
                key={useCase.stage}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-2xl p-8 border ${
                  useCase.featured
                    ? "bg-gradient-to-br from-[#ff6a1a] to-orange-600 border-[#ff6a1a] text-white"
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                }`}
              >
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                  useCase.featured ? "bg-white/20 text-white" : "bg-[#ff6a1a]/10 text-[#ff6a1a]"
                }`}>
                  {useCase.stage}
                </span>
                <h3 className={`text-2xl font-bold mb-2 ${useCase.featured ? "" : "text-gray-900 dark:text-white"}`}>
                  {useCase.title}
                </h3>
                <p className={`text-sm mb-4 ${useCase.featured ? "text-white/80" : "text-[#ff6a1a]"}`}>
                  Best with: {useCase.agents.join(", ")}
                </p>
                <ul className="space-y-3">
                  {useCase.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${useCase.featured ? "text-white" : "text-green-500"}`} />
                      <span className={useCase.featured ? "" : "text-gray-700 dark:text-gray-300"}>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-12 border border-gray-200 dark:border-gray-800 shadow-2xl text-center"
          >
            <div className="flex justify-center gap-2 mb-6">
              {agents.map((agent) => {
                const AgentIcon = agent.icon;
                return (
                  <div key={agent.name} className={`${agent.color} p-3 rounded-full`}>
                    <AgentIcon className="w-6 h-6 text-white" />
                  </div>
                );
              })}
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to 10x Your Productivity?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of founders who&apos;ve already reclaimed their time with AI co-founders that never sleep.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25">
                <Link href="/get-started">
                  Activate My Team <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-gray-300 dark:border-gray-700">
                <Link href="/pricing">
                  View Pricing
                </Link>
              </Button>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
