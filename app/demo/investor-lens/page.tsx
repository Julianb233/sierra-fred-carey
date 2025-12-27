"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneMockup, PhoneScreenDashboard } from "@/components/premium/PhoneMockup";
import { GradientBg, FloatingOrbs } from "@/components/premium/GradientBg";
import { Card3D, GlassCard3D } from "@/components/premium/Card3D";
import { FadeUpOnScroll, GradientText } from "@/components/premium/AnimatedText";
import Footer from "@/components/footer";
import {
  TrendingUp,
  FileText,
  Users,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Rocket,
} from "lucide-react";

export default function InvestorLensDemo() {
  const [readinessScore, setReadinessScore] = useState(0);
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setReadinessScore((prev) => {
          if (prev >= 68) {
            clearInterval(interval);
            return 68;
          }
          return prev + 1;
        });
      }, 20);
      return () => clearInterval(interval);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCategory((prev) => (prev + 1) % categories.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const categories = [
    {
      name: "Pitch Deck",
      score: 85,
      icon: FileText,
      color: "from-blue-500 to-cyan-500",
      status: "ready",
      tasks: { completed: 8, total: 9 },
    },
    {
      name: "Team Story",
      score: 72,
      icon: Users,
      color: "from-purple-500 to-pink-500",
      status: "progress",
      tasks: { completed: 5, total: 7 },
    },
    {
      name: "Financial Model",
      score: 58,
      icon: BarChart3,
      color: "from-green-500 to-emerald-500",
      status: "needs-work",
      tasks: { completed: 4, total: 8 },
    },
    {
      name: "Traction Metrics",
      score: 91,
      icon: TrendingUp,
      color: "from-orange-500 to-red-500",
      status: "ready",
      tasks: { completed: 6, total: 6 },
    },
  ];

  const readinessLevel = readinessScore >= 80 ? "ready" : readinessScore >= 60 ? "close" : "not-ready";

  const recommendations = [
    {
      priority: "high",
      icon: XCircle,
      text: "Add 3-year revenue projections to financial model",
      category: "Financial Model",
    },
    {
      priority: "medium",
      icon: Clock,
      text: "Strengthen competitive analysis section",
      category: "Pitch Deck",
    },
    {
      priority: "high",
      icon: XCircle,
      text: "Document customer acquisition costs",
      category: "Traction Metrics",
    },
  ];

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
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full px-6 py-2 mb-6 border border-green-500/30"
              >
                <Rocket className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Investor Readiness Score</span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                Know If You&apos;re
                <br />
                <GradientText>Ready to Raise</GradientText>
              </h1>

              <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                Don&apos;t waste months pitching when you&apos;re not ready. Get a brutal assessment
                of your investor readiness across 8 critical dimensions.
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
                  <PhoneScreenDashboard>
                    <div className="p-6 space-y-6">
                      {/* Header */}
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-bold text-white">Investor Readiness</h3>
                        <p className="text-xs text-gray-400">Updated 2 minutes ago</p>
                      </div>

                      {/* Overall Readiness Score */}
                      <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-2xl p-6 border border-green-500/20">
                        <div className="text-center space-y-3">
                          <p className="text-sm text-gray-400">Overall Readiness</p>
                          <div className="relative">
                            <svg className="w-32 h-32 mx-auto" viewBox="0 0 120 120">
                              <circle
                                cx="60"
                                cy="60"
                                r="50"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="8"
                              />
                              <motion.circle
                                cx="60"
                                cy="60"
                                r="50"
                                fill="none"
                                stroke="url(#gradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 50}`}
                                initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                                animate={{
                                  strokeDashoffset: 2 * Math.PI * 50 * (1 - readinessScore / 100),
                                }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                transform="rotate(-90 60 60)"
                              />
                              <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#10b981" />
                                  <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                              </defs>
                              <text
                                x="60"
                                y="60"
                                textAnchor="middle"
                                dy="0.3em"
                                className="text-3xl font-bold fill-white"
                              >
                                {readinessScore}
                              </text>
                            </svg>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            {readinessLevel === "ready" && (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <p className="text-xs text-green-400 font-medium">
                                  Ready to pitch
                                </p>
                              </>
                            )}
                            {readinessLevel === "close" && (
                              <>
                                <Clock className="w-4 h-4 text-yellow-400" />
                                <p className="text-xs text-yellow-400 font-medium">
                                  Almost there
                                </p>
                              </>
                            )}
                            {readinessLevel === "not-ready" && (
                              <>
                                <XCircle className="w-4 h-4 text-red-400" />
                                <p className="text-xs text-red-400 font-medium">Needs work</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Category Scores */}
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Categories
                        </p>
                        {categories.map((category, index) => {
                          const Icon = category.icon;
                          const isActive = index === activeCategory;
                          return (
                            <motion.div
                              key={category.name}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.6 + index * 0.1 }}
                              className={`bg-white/5 rounded-xl p-3 border transition-all duration-300 ${
                                isActive ? "border-green-500/50 bg-green-500/5" : "border-white/10"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Icon
                                    className={`w-4 h-4 ${
                                      isActive ? "text-green-400" : "text-gray-400"
                                    }`}
                                  />
                                  <span className="text-xs font-medium text-white">
                                    {category.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">
                                    {category.tasks.completed}/{category.tasks.total}
                                  </span>
                                  <span
                                    className={`text-sm font-bold ${
                                      isActive ? "text-green-400" : "text-gray-300"
                                    }`}
                                  >
                                    {category.score}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${category.score}%` }}
                                  transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                                  className={`h-full bg-gradient-to-r ${category.color} rounded-full`}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Top Recommendations */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Priority Actions
                        </p>
                        {recommendations.slice(0, 2).map((rec, index) => {
                          const Icon = rec.icon;
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 1.4 + index * 0.1 }}
                              className="bg-white/5 rounded-lg p-2 border border-white/10"
                            >
                              <div className="flex items-start gap-2">
                                <Icon
                                  className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                                    rec.priority === "high" ? "text-red-400" : "text-yellow-400"
                                  }`}
                                />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-300 leading-relaxed">
                                    {rec.text}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">{rec.category}</p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </PhoneScreenDashboard>
                </PhoneMockup>
              </div>
            </FadeUpOnScroll>

            {/* Features Grid */}
            <FadeUpOnScroll delay={0.4}>
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold mb-8">
                  Don&apos;t Pitch
                  <br />
                  Until You&apos;re <GradientText>Ready</GradientText>
                </h2>

                <div className="space-y-4">
                  <GlassCard3D className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-green-500 to-blue-500 p-3 rounded-xl">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">8 Critical Dimensions</h3>
                        <p className="text-gray-400">
                          Pitch deck, team, financials, traction, market, product, competitive
                          positioning, and ask—all scored independently.
                        </p>
                      </div>
                    </div>
                  </GlassCard3D>

                  <GlassCard3D className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">Checklist-Driven</h3>
                        <p className="text-gray-400">
                          Track completion of every element investors look for. Know exactly
                          what&apos;s missing before you book meetings.
                        </p>
                      </div>
                    </div>
                  </GlassCard3D>

                  <GlassCard3D className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">Progress Tracking</h3>
                        <p className="text-gray-400">
                          Watch your readiness score improve in real-time as you complete tasks.
                          Gamified preparation actually works.
                        </p>
                      </div>
                    </div>
                  </GlassCard3D>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-8"
                >
                  <button className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-4 px-8 rounded-xl hover:shadow-2xl hover:shadow-green-500/50 transition-all duration-300">
                    Check My Readiness →
                  </button>
                </motion.div>
              </div>
            </FadeUpOnScroll>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <FadeUpOnScroll>
            <div className="grid md:grid-cols-3 gap-6">
              <Card3D className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 p-8 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  3.2x
                </div>
                <p className="text-gray-400">Higher close rate when ready</p>
              </Card3D>

              <Card3D className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-8 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  6 weeks
                </div>
                <p className="text-gray-400">Avg time saved vs trial & error</p>
              </Card3D>

              <Card3D className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-8 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
                  87%
                </div>
                <p className="text-gray-400">Users close round within 90 days</p>
              </Card3D>
            </div>
          </FadeUpOnScroll>
        </div>
      </section>

      <Footer />
    </div>
  );
}
