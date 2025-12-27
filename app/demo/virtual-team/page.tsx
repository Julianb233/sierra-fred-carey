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
      description: "Handles your calendar, tasks, and daily operations",
      messages: [
        { from: "agent", text: "Morning! You have 3 investor meetings today. Prepped briefs for each." },
        { from: "user", text: "What's the priority today?" },
        { from: "agent", text: "1) Finalize Q4 financials (due tomorrow)\n2) Review Sarah's product roadmap\n3) Prep for Thursday's board meeting" },
      ],
      stats: { tasksCompleted: 47, timeSaved: "18h" },
    },
    {
      name: "Fundraise Ops",
      icon: TrendingUp,
      color: "bg-orange-500",
      role: "Fundraising AI",
      description: "Manages your investor pipeline and outreach",
      messages: [
        { from: "agent", text: "Great news! 3 investors opened your deck. 1 replied asking for metrics." },
        { from: "user", text: "Send them the traction doc" },
        { from: "agent", text: "Done. Also booked 2 intro calls for next week. Added prep notes to your calendar." },
      ],
      stats: { investorsMet: 23, meetingsBooked: 8 },
    },
    {
      name: "Growth Ops",
      icon: Sparkles,
      color: "bg-amber-500",
      role: "Growth AI",
      description: "Monitors metrics and suggests growth experiments",
      messages: [
        { from: "agent", text: "MRR hit $12.4k! Up 18% from last week. Churn dropped to 3.2%." },
        { from: "user", text: "What's driving it?" },
        { from: "agent", text: "New onboarding flow + email sequence. Suggesting we A/B test pricing page next." },
      ],
      stats: { experimentsRun: 12, mrrGrowth: "+34%" },
    },
    {
      name: "Inbox Ops",
      icon: Mail,
      color: "bg-orange-600",
      role: "Email AI",
      description: "Triages emails and drafts responses",
      messages: [
        { from: "agent", text: "Triaged 47 emails. 3 need your attention, 12 auto-responded." },
        { from: "user", text: "Show me the important ones" },
        { from: "agent", text: "1) Enterprise lead asking for demo\n2) Customer escalation\n3) Partnership inquiry from TechCorp" },
      ],
      stats: { emailsTriaged: 342, hoursReclaimed: "6h" },
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

      {/* Features Grid */}
      <section className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            How Your <span className="text-[#ff6a1a]">Virtual Team</span> Works
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map((agent, index) => {
              const AgentIcon = agent.icon;
              return (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800"
                >
                  <div className={`${agent.color} p-3 rounded-xl w-fit mb-4`}>
                    <AgentIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{agent.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{agent.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { value: "32h", label: "Saved per week on average" },
              { value: "4x", label: "More investor meetings booked" },
              { value: "97%", label: "Users say they'd be lost without it" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-800 shadow-lg"
              >
                <div className="text-5xl font-bold text-[#ff6a1a] mb-2">{stat.value}</div>
                <p className="text-gray-600 dark:text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
