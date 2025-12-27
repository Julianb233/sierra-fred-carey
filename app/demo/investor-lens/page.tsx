"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  FileText,
  Users,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Rocket,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

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
    { name: "Pitch Deck", score: 85, icon: FileText, color: "bg-[#ff6a1a]", tasks: { completed: 8, total: 9 } },
    { name: "Team Story", score: 72, icon: Users, color: "bg-orange-500", tasks: { completed: 5, total: 7 } },
    { name: "Financial Model", score: 58, icon: BarChart3, color: "bg-amber-500", tasks: { completed: 4, total: 8 } },
    { name: "Traction Metrics", score: 91, icon: TrendingUp, color: "bg-orange-600", tasks: { completed: 6, total: 6 } },
  ];

  const readinessLevel = readinessScore >= 80 ? "ready" : readinessScore >= 60 ? "close" : "not-ready";

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
              <Rocket className="w-4 h-4" />
              Investor Readiness Score
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white"
            >
              Know If You&apos;re
              <br />
              <span className="text-[#ff6a1a]">Ready to Raise</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
            >
              Don&apos;t waste months pitching when you&apos;re not ready. Get a brutal assessment
              of your investor readiness across 8 critical dimensions.
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Investor Readiness</h3>
                <p className="text-sm text-gray-500">Updated 2 minutes ago</p>
              </div>

              {/* Overall Readiness Score */}
              <div className="bg-[#ff6a1a]/5 rounded-2xl p-6 border border-[#ff6a1a]/20 mb-8">
                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-500">Overall Readiness</p>
                  <div className="relative inline-block">
                    <svg className="w-32 h-32 mx-auto" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,106,26,0.1)" strokeWidth="8" />
                      <motion.circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#ff6a1a"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - readinessScore / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        transform="rotate(-90 60 60)"
                      />
                      <text x="60" y="60" textAnchor="middle" dy="0.3em" className="text-3xl font-bold fill-gray-900 dark:fill-white">
                        {readinessScore}
                      </text>
                    </svg>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {readinessLevel === "ready" && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <p className="text-sm text-green-500 font-medium">Ready to pitch</p>
                      </>
                    )}
                    {readinessLevel === "close" && (
                      <>
                        <Clock className="w-4 h-4 text-amber-500" />
                        <p className="text-sm text-amber-500 font-medium">Almost there</p>
                      </>
                    )}
                    {readinessLevel === "not-ready" && (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <p className="text-sm text-red-500 font-medium">Needs work</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Scores */}
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Categories</p>
                {categories.map((category, index) => {
                  const Icon = category.icon;
                  const isActive = index === activeCategory;
                  return (
                    <motion.div
                      key={category.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border transition-all duration-300 ${
                        isActive ? "border-[#ff6a1a] shadow-lg" : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{category.tasks.completed}/{category.tasks.total}</span>
                          <span className={`text-lg font-bold ${isActive ? "text-[#ff6a1a]" : "text-gray-600 dark:text-gray-300"}`}>
                            {category.score}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${category.score}%` }}
                          transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                          className={`h-full ${category.color} rounded-full`}
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
                Don&apos;t Pitch
                <br />
                Until You&apos;re <span className="text-[#ff6a1a]">Ready</span>
              </h2>

              <div className="space-y-4">
                {[
                  { icon: BarChart3, title: "8 Critical Dimensions", desc: "Pitch deck, team, financials, traction, market, product, competitive positioning, and ask—all scored independently." },
                  { icon: CheckCircle2, title: "Checklist-Driven", desc: "Track completion of every element investors look for. Know exactly what's missing before you book meetings." },
                  { icon: TrendingUp, title: "Progress Tracking", desc: "Watch your readiness score improve in real-time as you complete tasks. Gamified preparation actually works." },
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
                <Link href="/pricing">
                  Check My Readiness <ArrowRight className="ml-2 w-4 h-4" />
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
              { value: "3.2x", label: "Higher close rate when ready" },
              { value: "6 weeks", label: "Avg time saved vs trial & error" },
              { value: "87%", label: "Users close round within 90 days" },
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
