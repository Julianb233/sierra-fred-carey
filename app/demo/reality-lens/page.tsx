"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PhoneMockup, PhoneScreenDashboard } from "@/components/premium/PhoneMockup";
import { GradientBg, FloatingOrbs } from "@/components/premium/GradientBg";
import { Card3D, GlassCard3D } from "@/components/premium/Card3D";
import { FadeUpOnScroll, GradientText } from "@/components/premium/AnimatedText";
import Footer from "@/components/footer";
import { Zap, TrendingUp, AlertCircle, CheckCircle2, Target, Users, DollarSign } from "lucide-react";

export default function RealityLensDemo() {
  const [activeScore, setActiveScore] = useState(0);
  const [animateScores, setAnimateScores] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateScores(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (animateScores) {
      const interval = setInterval(() => {
        setActiveScore((prev) => (prev + 1) % scores.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [animateScores]);

  const scores = [
    { label: "Market Fit", score: 78, icon: Target, color: "from-blue-500 to-cyan-500" },
    { label: "Team Strength", score: 85, icon: Users, color: "from-purple-500 to-pink-500" },
    { label: "Revenue Model", score: 62, icon: DollarSign, color: "from-green-500 to-emerald-500" },
    { label: "Traction", score: 71, icon: TrendingUp, color: "from-orange-500 to-red-500" },
  ];

  const insights = [
    {
      type: "strength",
      icon: CheckCircle2,
      text: "Strong technical team with complementary skills",
      color: "text-green-400",
    },
    {
      type: "warning",
      icon: AlertCircle,
      text: "Market validation needed - only 12 user interviews",
      color: "text-yellow-400",
    },
    {
      type: "strength",
      icon: CheckCircle2,
      text: "Clear monetization path with proven pricing model",
      color: "text-green-400",
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
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full px-6 py-2 mb-6 border border-blue-500/30"
              >
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">Startup Reality Lens</span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                Get <GradientText>Brutally Honest</GradientText>
                <br />
                Startup Analysis
              </h1>

              <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                Stop lying to yourself. Get Fred Carey&apos;s no-BS analysis of your startup idea
                in under 60 seconds. Real scores. Real insights. Real talk.
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
                        <h3 className="text-lg font-bold text-white">
                          AI SaaS for Dentists
                        </h3>
                        <p className="text-xs text-gray-400">
                          Automated patient scheduling & reminders
                        </p>
                      </div>

                      {/* Overall Score */}
                      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20">
                        <div className="text-center space-y-2">
                          <p className="text-sm text-gray-400">Reality Score</p>
                          <div className="relative">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.8, delay: 0.3 }}
                              className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                            >
                              74
                            </motion.div>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: "74%" }}
                              transition={{ duration: 1.2, delay: 0.5 }}
                              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                              style={{ width: "100px" }}
                            />
                          </div>
                          <p className="text-xs text-gray-400">Promising, but needs work</p>
                        </div>
                      </div>

                      {/* Individual Scores */}
                      <div className="space-y-3">
                        {scores.map((item, index) => {
                          const Icon = item.icon;
                          const isActive = index === activeScore;
                          return (
                            <motion.div
                              key={item.label}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.6 + index * 0.1 }}
                              className={`bg-white/5 rounded-xl p-3 border transition-all duration-300 ${
                                isActive ? "border-blue-500/50 bg-blue-500/5" : "border-white/10"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-gray-400"}`} />
                                  <span className="text-xs font-medium text-white">
                                    {item.label}
                                  </span>
                                </div>
                                <span className={`text-sm font-bold ${isActive ? "text-blue-400" : "text-gray-300"}`}>
                                  {item.score}
                                </span>
                              </div>
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.score}%` }}
                                  transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                                  className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Quick Insights */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Key Insights
                        </p>
                        {insights.slice(0, 2).map((insight, index) => {
                          const Icon = insight.icon;
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 1.2 + index * 0.1 }}
                              className="flex items-start gap-2 bg-white/5 rounded-lg p-2"
                            >
                              <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${insight.color}`} />
                              <p className="text-xs text-gray-300 leading-relaxed">
                                {insight.text}
                              </p>
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
                  Stop Guessing.
                  <br />
                  Start <GradientText>Knowing.</GradientText>
                </h2>

                <div className="space-y-4">
                  <GlassCard3D className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-xl">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">4-Factor Analysis</h3>
                        <p className="text-gray-400">
                          Market fit, team strength, revenue model, and traction scored independently
                          using Fred&apos;s proven framework.
                        </p>
                      </div>
                    </div>
                  </GlassCard3D>

                  <GlassCard3D className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-xl">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">Actionable Insights</h3>
                        <p className="text-gray-400">
                          Not just scores—get specific, prioritized actions to improve your weakest
                          areas first.
                        </p>
                      </div>
                    </div>
                  </GlassCard3D>

                  <GlassCard3D className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl">
                        <AlertCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">Red Flag Detection</h3>
                        <p className="text-gray-400">
                          AI trained on 500+ startup post-mortems identifies the fatal flaws before
                          they kill you.
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
                  <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-4 px-8 rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300">
                    Analyze My Startup →
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
              <Card3D className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-8 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  60s
                </div>
                <p className="text-gray-400">Average analysis time</p>
              </Card3D>

              <Card3D className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-8 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                  94%
                </div>
                <p className="text-gray-400">Accuracy vs expert review</p>
              </Card3D>

              <Card3D className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-8 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
                  2,400+
                </div>
                <p className="text-gray-400">Startups analyzed</p>
              </Card3D>
            </div>
          </FadeUpOnScroll>
        </div>
      </section>

      <Footer />
    </div>
  );
}
