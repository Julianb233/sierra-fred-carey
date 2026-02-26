"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Zap, TrendingUp, AlertCircle, CheckCircle2, Target, Users, DollarSign, ArrowRight } from "lucide-react";
import Link from "next/link";

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
    { label: "Market Fit", score: 78, icon: Target, color: "bg-[#ff6a1a]" },
    { label: "Team Strength", score: 85, icon: Users, color: "bg-orange-500" },
    { label: "Revenue Model", score: 62, icon: DollarSign, color: "bg-amber-500" },
    { label: "Traction", score: 71, icon: TrendingUp, color: "bg-orange-600" },
  ];

  const insights = [
    {
      type: "strength",
      icon: CheckCircle2,
      text: "Strong technical team with complementary skills",
      color: "text-green-500",
    },
    {
      type: "warning",
      icon: AlertCircle,
      text: "Market validation needed - only 12 user interviews",
      color: "text-amber-500",
    },
    {
      type: "strength",
      icon: CheckCircle2,
      text: "Clear monetization path with proven pricing model",
      color: "text-green-500",
    },
  ];

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
              <Zap className="w-4 h-4" />
              Startup Reality Lens
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white"
            >
              Get <span className="text-[#ff6a1a]">Brutally Honest</span>
              <br />
              Startup Analysis
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
            >
              Stop lying to yourself. Get Fred Carey&apos;s no-BS analysis of your startup idea
              in under 60 seconds. Real scores. Real insights. Real talk.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Main Demo Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Demo Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-8"
            >
              {/* Header */}
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  AI SaaS for Dentists
                </h3>
                <p className="text-sm text-gray-500">
                  Automated patient scheduling & reminders
                </p>
              </div>

              {/* Overall Score */}
              <div className="bg-[#ff6a1a]/5 rounded-2xl p-6 border border-[#ff6a1a]/20 mb-8">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-500">Reality Score</p>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="text-6xl font-bold text-[#ff6a1a]"
                  >
                    74
                  </motion.div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "74%" }}
                      transition={{ duration: 1.2, delay: 0.5 }}
                      className="h-full bg-gradient-to-r from-[#ff6a1a] to-orange-400 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Promising, but needs work</p>
                </div>
              </div>

              {/* Individual Scores */}
              <div className="space-y-4">
                {scores.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = index === activeScore;
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border transition-all duration-300 ${
                        isActive ? "border-[#ff6a1a] shadow-lg" : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.label}
                          </span>
                        </div>
                        <span className={`text-lg font-bold ${isActive ? "text-[#ff6a1a]" : "text-gray-600 dark:text-gray-300"}`}>
                          {item.score}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.score}%` }}
                          transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                          className={`h-full ${item.color} rounded-full`}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
                Stop Guessing.
                <br />
                Start <span className="text-[#ff6a1a]">Knowing.</span>
              </h2>

              <div className="space-y-4">
                {[
                  { icon: Target, title: "4-Factor Analysis", desc: "Market fit, team strength, revenue model, and traction scored independently using Fred's proven framework." },
                  { icon: CheckCircle2, title: "Actionable Insights", desc: "Not just scores—get specific, prioritized actions to improve your weakest areas first." },
                  { icon: AlertCircle, title: "Red Flag Detection", desc: "AI trained on 500+ startup post-mortems identifies the fatal flaws before they kill you." },
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-[#ff6a1a] p-3 rounded-xl">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Button asChild size="lg" className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 mt-8">
                <Link href="/chat">
                  Sign Up Free & Analyze <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { value: "60s", label: "Average analysis time" },
              { value: "94%", label: "Accuracy vs expert review" },
              { value: "2,400+", label: "Startups analyzed" },
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
