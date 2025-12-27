"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneMockup, PhoneScreenChat } from "@/components/premium/PhoneMockup";
import { GradientBg, FloatingOrbs } from "@/components/premium/GradientBg";
import { Card3D, GlassCard3D } from "@/components/premium/Card3D";
import { FadeUpOnScroll, GradientText } from "@/components/premium/AnimatedText";
import Footer from "@/components/footer";
import {
  Bot,
  Briefcase,
  TrendingUp,
  Mail,
  Sparkles,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";

export default function VirtualTeamDemo() {
  const [activeAgent, setActiveAgent] = useState(0);
  const [chatIndex, setChatIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAgent((prev) => (prev + 1) % agents.length);
      setChatIndex(0);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatIndex < agents[activeAgent].messages.length - 1) {
      const timer = setTimeout(() => {
        setChatIndex((prev) => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [chatIndex, activeAgent]);

  const agents = [
    {
      name: "Founder Ops",
      icon: Briefcase,
      color: "from-blue-500 to-cyan-500",
      role: "Chief of Staff AI",
      description: "Handles your calendar, tasks, and daily operations",
      messages: [
        { from: "agent", text: "Morning! You have 3 investor meetings today. Prepped briefs for each." },
        { from: "user", text: "What's the priority today?" },
        {
          from: "agent",
          text: "1) Finalize Q4 financials (due tomorrow)\n2) Review Sarah's product roadmap\n3) Prep for Thursday's board meeting",
        },
      ],
      stats: { tasksCompleted: 47, timeSaved: "18h" },
    },
    {
      name: "Fundraise Ops",
      icon: TrendingUp,
      color: "from-purple-500 to-pink-500",
      role: "Fundraising AI",
      description: "Manages your investor pipeline and outreach",
      messages: [
        { from: "agent", text: "Great news! 3 investors opened your deck. 1 replied asking for metrics." },
        { from: "user", text: "Send them the traction doc" },
        {
          from: "agent",
          text: "Done. Also booked 2 intro calls for next week. Added prep notes to your calendar.",
        },
      ],
      stats: { investorsMet: 23, meetingsBooked: 8 },
    },
    {
      name: "Growth Ops",
      icon: Sparkles,
      color: "from-green-500 to-emerald-500",
      role: "Growth AI",
      description: "Monitors metrics and suggests growth experiments",
      messages: [
        { from: "agent", text: "MRR hit $12.4k! Up 18% from last week. Churn dropped to 3.2%." },
        { from: "user", text: "What's driving it?" },
        {
          from: "agent",
          text: "New onboarding flow + email sequence. Suggesting we A/B test pricing page next.",
        },
      ],
      stats: { experimentsRun: 12, mrrGrowth: "+34%" },
    },
    {
      name: "Inbox Ops",
      icon: Mail,
      color: "from-orange-500 to-red-500",
      role: "Email AI",
      description: "Triages emails and drafts responses",
      messages: [
        { from: "agent", text: "Triaged 47 emails. 3 need your attention, 12 auto-responded." },
        { from: "user", text: "Show me the important ones" },
        {
          from: "agent",
          text: "1) Enterprise lead asking for demo\n2) Customer escalation\n3) Partnership inquiry from TechCorp",
        },
      ],
      stats: { emailsTriaged: 342, hoursReclaimed: "6h" },
    },
  ];

  const currentAgent = agents[activeAgent];
  const Icon = currentAgent.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden">
      <GradientBg />
      <FloatingOrbs />

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <FadeUpOnScroll>
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full px-6 py-2 mb-6 border border-purple-500/30"
              >
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">Virtual Team Agents</span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                Your <GradientText>AI Co-Founders</GradientText>
                <br />
                Work While You Sleep
              </h1>

              <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                Stop drowning in operations. Get 4 AI agents that handle your calendar, fundraising,
                growth, and inbox—so you can focus on building.
              </p>
            </div>
          </FadeUpOnScroll>
        </div>
      </section>

      {/* Main Demo Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Phone Mockup */}
            <FadeUpOnScroll delay={0.2}>
              <div className="flex justify-center lg:justify-end">
                <PhoneMockup>
                  <PhoneScreenChat>
                    <div className="flex flex-col h-full">
                      {/* Chat Header */}
                      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <div className={`bg-gradient-to-br ${currentAgent.color} p-2 rounded-full`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-white">
                              {currentAgent.name}
                            </h3>
                            <p className="text-xs text-gray-400">{currentAgent.role}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-xs text-gray-400">Active</span>
                          </div>
                        </div>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                        <AnimatePresence mode="wait">
                          {currentAgent.messages.slice(0, chatIndex + 1).map((msg, index) => (
                            <motion.div
                              key={`${activeAgent}-${index}`}
                              initial={{ opacity: 0, y: 20, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.8 }}
                              transition={{ duration: 0.3 }}
                              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                  msg.from === "user"
                                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                                    : "bg-white/10 text-white border border-white/20"
                                }`}
                              >
                                <p className="text-xs leading-relaxed whitespace-pre-line">
                                  {msg.text}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {/* Typing Indicator */}
                        {chatIndex < currentAgent.messages.length - 1 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                          >
                            <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/20">
                              <div className="flex gap-1">
                                {[0, 1, 2].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="w-2 h-2 bg-gray-400 rounded-full"
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{
                                      duration: 0.6,
                                      repeat: Infinity,
                                      delay: i * 0.1,
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Agent Stats */}
                      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          {Object.entries(currentAgent.stats).map(([key, value]) => (
                            <div key={key}>
                              <div className="text-lg font-bold text-white">{value}</div>
                              <div className="text-xs text-gray-400 capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PhoneScreenChat>
                </PhoneMockup>
              </div>
            </FadeUpOnScroll>

            {/* Agent Selector */}
            <FadeUpOnScroll delay={0.4}>
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold mb-8">
                  Meet Your <GradientText>Virtual Team</GradientText>
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
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setActiveAgent(index);
                          setChatIndex(0);
                        }}
                        className="cursor-pointer"
                      >
                        <GlassCard3D
                          className={`p-4 transition-all duration-300 ${
                            isActive
                              ? "border-purple-500/50 bg-purple-500/10"
                              : "border-white/10"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`bg-gradient-to-br ${agent.color} p-3 rounded-xl`}>
                              <AgentIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-lg font-bold">{agent.name}</h3>
                                {isActive && (
                                  <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-xs text-green-400">Live</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-gray-400 mb-2">{agent.role}</p>
                              <p className="text-xs text-gray-500">{agent.description}</p>
                            </div>
                          </div>
                        </GlassCard3D>
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-8"
                >
                  <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-8 rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300">
                    Activate My Team →
                  </button>
                </motion.div>
              </div>
            </FadeUpOnScroll>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <FadeUpOnScroll>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              How Your <GradientText>Virtual Team</GradientText> Works
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card3D className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-6">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-xl w-fit mb-4">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Founder Ops</h3>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Calendar management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Task prioritization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Meeting prep</span>
                  </li>
                </ul>
              </Card3D>

              <Card3D className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-6">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl w-fit mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Fundraise Ops</h3>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>Investor outreach</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>Pipeline tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>Follow-up automation</span>
                  </li>
                </ul>
              </Card3D>

              <Card3D className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-xl w-fit mb-4">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Growth Ops</h3>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Metrics monitoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Experiment suggestions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Growth insights</span>
                  </li>
                </ul>
              </Card3D>

              <Card3D className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-6">
                <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl w-fit mb-4">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Inbox Ops</h3>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span>Email triage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span>Draft responses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span>Priority alerts</span>
                  </li>
                </ul>
              </Card3D>
            </div>
          </FadeUpOnScroll>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <FadeUpOnScroll>
            <div className="grid md:grid-cols-3 gap-6">
              <Card3D className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-8 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  32h
                </div>
                <p className="text-gray-400">Saved per week on average</p>
              </Card3D>

              <Card3D className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-8 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                  4x
                </div>
                <p className="text-gray-400">More investor meetings booked</p>
              </Card3D>

              <Card3D className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-8 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  97%
                </div>
                <p className="text-gray-400">Users say they&apos;d be lost without it</p>
              </Card3D>
            </div>
          </FadeUpOnScroll>
        </div>
      </section>

      <Footer />
    </div>
  );
}
