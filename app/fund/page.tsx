"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Footer from "@/components/footer";
import {
  Building2,
  TrendingUp,
  Shield,
  Users,
  DollarSign,
  BookOpen,
  Target,
  ArrowRight,
  Download,
  ChevronRight,
  Star,
  Award,
  Globe,
  Briefcase,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

const stats = [
  { label: "Years Experience", value: "40+", icon: Award },
  { label: "Businesses Founded", value: "100+", icon: Briefcase },
  { label: "Consultations", value: "57", icon: Users },
  { label: "Fund Pool", value: "$5.4M", icon: DollarSign },
];

const industries = [
  { name: "Real Estate & Development", icon: Building2 },
  { name: "Technology & SaaS", icon: BarChart3 },
  { name: "Retail & Consumer Goods", icon: Briefcase },
  { name: "International Trade", icon: Globe },
  { name: "Financial Services", icon: DollarSign },
  { name: "Education & Publishing", icon: BookOpen },
];

const problemStats = [
  {
    value: "90%",
    label: "of startups fail within the first 5 years",
    icon: TrendingUp,
  },
  {
    value: "$202K",
    label: "average financial loss per failed startup",
    icon: DollarSign,
  },
  {
    value: "3.5 yrs",
    label: "average time wasted before founders realize failure",
    icon: Target,
  },
];

const humanCosts = [
  "Destroyed personal savings and retirement funds",
  "Damaged credit scores and mounting debt",
  "Broken relationships and family strain",
  "Lost years of career momentum",
  "Severe mental health consequences",
];

const revenueStreams = [
  {
    title: "Warehouse Acquisitions",
    description:
      "Acquire undervalued commercial warehouses in high-growth logistics corridors, renovate and lease to e-commerce and distribution companies.",
    icon: Building2,
  },
  {
    title: "Long-Term Leasing",
    description:
      "Triple-net leases with annual escalators provide predictable, inflation-protected cash flow for investors.",
    icon: Shield,
  },
  {
    title: "Property Appreciation",
    description:
      "Strategic improvements and market timing drive significant equity gains at disposition.",
    icon: TrendingUp,
  },
];

const projections = [
  {
    year: "Year 1",
    revenue: "$21.77M",
    books: "$270K",
    consulting: "$500K",
    fund: "$21M",
  },
  {
    year: "Year 2",
    revenue: "$29M",
    books: "$500K",
    consulting: "$1.5M",
    fund: "$27M",
  },
  {
    year: "Year 3",
    revenue: "$40M",
    books: "$1M",
    consulting: "$3M",
    fund: "$36M",
  },
];

const visionPillars = [
  {
    title: "Protect Founders",
    description:
      "Save aspiring entrepreneurs from the devastating financial and personal consequences of preventable failure.",
    icon: Shield,
  },
  {
    title: "Build Wealth",
    description:
      "Create generational wealth through disciplined real estate investment and strategic fund management.",
    icon: TrendingUp,
  },
  {
    title: "Educate & Empower",
    description:
      "Provide world-class business education through books, consulting, and hands-on mentorship.",
    icon: BookOpen,
  },
];

export default function FundPage() {
  return (
    <main className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      {/* =========================================================
          SECTION 1 — HERO
          ========================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 pt-32 pb-24 md:px-8">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Tory Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mb-8 w-40 h-40 rounded-full bg-gradient-to-br from-[#ff6a1a] to-amber-500 flex items-center justify-center shadow-2xl shadow-[#ff6a1a]/30 ring-4 ring-white dark:ring-gray-900 ring-offset-4 ring-offset-white dark:ring-offset-gray-950"
          >
            <span className="text-5xl font-bold text-white tracking-wider">
              TZ
            </span>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-4 text-gray-900 dark:text-white"
          >
            Tory R <span className="text-[#ff6a1a]">Zweigle</span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl font-medium text-gray-500 dark:text-gray-400 mb-6 tracking-wide"
          >
            Serial Entrepreneur &bull; 40+ Years Experience &bull; 100+
            Businesses Founded
          </motion.p>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto"
          >
            Tory has spent four decades building, scaling, and advising
            businesses across industries and continents. Now he is channeling
            that expertise into <strong>A Start Up Biz</strong> &mdash; a
            consulting firm and investment fund designed to protect founders from
            costly mistakes and build generational wealth through strategic real
            estate.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Button
              asChild
              size="lg"
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 text-base px-8 py-6"
            >
              <Link href="#consultation">
                Sign Up for a Consultation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a] text-base px-8 py-6"
            >
              <Link href="/fund/presentation">
                View Investor Deck
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>

          {/* Mini stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
              >
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all text-center py-6">
                  <CardContent className="p-0">
                    <stat.icon className="h-6 w-6 text-[#ff6a1a] mx-auto mb-2" />
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* =========================================================
          SECTION 2 — ABOUT TORY (bg-gray-50)
          ========================================================= */}
      <section className="relative z-10 py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto md:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6">
              <Star className="h-4 w-4" />
              ABOUT THE FOUNDER
            </span>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-6 text-gray-900 dark:text-white">
              A Lifetime of <span className="text-[#ff6a1a]">Building</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Tory R Zweigle has built and operated businesses on four
              continents, spanning industries from real estate development to
              international trade. His unique perspective comes from decades of
              hands-on experience &mdash; not theory.
            </p>
          </motion.div>

          {/* Industries grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {industries.map((industry, i) => (
              <motion.div
                key={industry.name}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                      <div className="p-2 rounded-lg bg-[#ff6a1a]/10">
                        <industry.icon className="h-5 w-5 text-[#ff6a1a]" />
                      </div>
                      {industry.name}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Author section */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  <div className="p-4 rounded-2xl bg-[#ff6a1a]/10 flex-shrink-0">
                    <BookOpen className="h-12 w-12 text-[#ff6a1a]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Published Author
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Tory has distilled his decades of business wisdom into two
                      essential books for entrepreneurs:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">
                          &ldquo;Before You Start Up&rdquo;
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          The essential pre-launch evaluation guide that has
                          saved countless founders from costly mistakes.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">
                          &ldquo;The Startup Reality Check&rdquo;
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          A deep dive into the metrics, mindsets, and market
                          signals that separate winners from the 90% that fail.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          SECTION 3 — THE PROBLEM (white bg)
          ========================================================= */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-7xl mx-auto md:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6">
              <Target className="h-4 w-4" />
              THE PROBLEM
            </span>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-6 text-gray-900 dark:text-white">
              The Problem With{" "}
              <span className="text-[#ff6a1a]">Business Consulting</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Most consultants will happily take your money and tell you what you
              want to hear. The startup graveyard is full of founders who got bad
              advice &mdash; or no advice at all.
            </p>
          </motion.div>

          {/* Problem stat cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {problemStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all text-center py-10">
                  <CardContent className="p-0">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-[#ff6a1a]/10 flex items-center justify-center mb-4">
                      <stat.icon className="h-8 w-8 text-[#ff6a1a]" />
                    </div>
                    <p className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                      {stat.value}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 px-6">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Human cost */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900 dark:text-white">
                  The Human Cost of Startup Failure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {humanCosts.map((cost) => (
                    <li key={cost} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {cost}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          SECTION 4 — THE SOLUTION (bg-gray-50)
          ========================================================= */}
      <section className="relative z-10 py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto md:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6">
              <Shield className="h-4 w-4" />
              THE SOLUTION
            </span>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-6 text-gray-900 dark:text-white">
              The <span className="text-[#ff6a1a]">A Start Up Biz</span> Model
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Honest, experience-backed consulting that tells you what you
              <em> need</em> to hear &mdash; not what you <em>want</em> to hear.
              Two clear paths to protect your future.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Path 1 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-[#ff6a1a] to-amber-500" />
                <CardHeader>
                  <div className="p-3 rounded-xl bg-[#ff6a1a]/10 w-fit mb-4">
                    <Target className="h-8 w-8 text-[#ff6a1a]" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">
                    Startup Evaluation
                  </CardTitle>
                  <p className="text-4xl font-bold text-[#ff6a1a] mt-2">
                    $1,000
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    A comprehensive one-on-one evaluation of your business idea
                    with Tory. He will assess feasibility, market potential, your
                    competitive positioning, and whether you should proceed.
                  </p>
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      &ldquo;Tory Insurance&rdquo; &mdash; spend $1K now to
                      potentially save $202K later.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Path 2 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <Card className="h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader>
                  <div className="p-3 rounded-xl bg-[#ff6a1a]/10 w-fit mb-4">
                    <TrendingUp className="h-8 w-8 text-[#ff6a1a]" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">
                    Investment Strategy
                  </CardTitle>
                  <p className="text-4xl font-bold text-[#ff6a1a] mt-2">
                    Custom
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    For those looking to grow wealth through real estate and
                    strategic investments. Tory personally guides your portfolio
                    strategy based on your goals, risk tolerance, and timeline.
                  </p>
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Access to the A Start Up Biz real estate fund and
                      exclusive deal flow.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Track record */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 inline-block">
              <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-[#ff6a1a]">57</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Consultations
                  </p>
                </div>
                <div className="hidden sm:block w-px h-16 bg-gray-200 dark:bg-gray-700" />
                <p className="text-gray-600 dark:text-gray-400 max-w-md text-left">
                  Of the 57 startup consultations Tory has conducted, every
                  single founder was advised <strong>not</strong> to start their
                  business as planned &mdash; saving them from joining the 90%
                  failure statistic.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          SECTION 5 — INVESTOR PRESENTATION BANNER (white bg)
          ========================================================= */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-7xl mx-auto md:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#ff6a1a]/10 to-amber-500/10" />
              <CardContent className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-4">
                    <BarChart3 className="h-4 w-4" />
                    INVESTOR DECK
                  </span>
                  <h3 className="text-3xl font-bold text-white mb-3">
                    View the Full Investor Presentation
                  </h3>
                  <p className="text-gray-300 text-lg max-w-xl">
                    25-slide deck covering our vision, strategy, financial
                    projections, and the opportunity ahead. Everything you need
                    to make an informed decision.
                  </p>
                </div>
                <div className="flex flex-col gap-3 flex-shrink-0">
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 text-base px-8"
                  >
                    <Link href="/fund/presentation">
                      View Presentation
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-gray-600 text-gray-200 hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a] text-base px-8"
                  >
                    <Link href="/assets/tory/investor-deck.pdf">
                      <Download className="mr-2 h-5 w-5" />
                      Download PDF
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          SECTION 6 — THE FUND (bg-gray-50)
          ========================================================= */}
      <section className="relative z-10 py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto md:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6">
              <Building2 className="h-4 w-4" />
              THE FUND
            </span>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-6 text-gray-900 dark:text-white">
              Real Estate{" "}
              <span className="text-[#ff6a1a]">Investment Fund</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              A strategically managed fund focused on commercial warehouse
              acquisitions in high-growth logistics corridors across the United
              States.
            </p>
          </motion.div>

          {/* Fund stats */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all text-center py-10">
                <CardContent className="p-0">
                  <Users className="h-10 w-10 text-[#ff6a1a] mx-auto mb-3" />
                  <p className="text-5xl font-bold text-gray-900 dark:text-white">
                    28
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Interested Investors
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all text-center py-10">
                <CardContent className="p-0">
                  <DollarSign className="h-10 w-10 text-[#ff6a1a] mx-auto mb-3" />
                  <p className="text-5xl font-bold text-gray-900 dark:text-white">
                    $5.4M
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Initial Investment Pool
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Warehouse strategy */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  The Warehouse Strategy
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  E-commerce continues to drive unprecedented demand for
                  warehouse and distribution space. Our fund targets undervalued
                  properties in Tier 2 and Tier 3 logistics hubs &mdash; markets
                  with strong fundamentals but less institutional competition.
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Through strategic renovation, professional management, and
                  long-term triple-net leases, we generate consistent cash flow
                  while building significant equity through appreciation. This is
                  not speculation &mdash; it is disciplined, experienced real
                  estate investing.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Revenue streams */}
          <div className="grid md:grid-cols-3 gap-6">
            {revenueStreams.map((stream, i) => (
              <motion.div
                key={stream.title}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <Card className="h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="p-3 rounded-xl bg-[#ff6a1a]/10 w-fit mb-3">
                      <stream.icon className="h-6 w-6 text-[#ff6a1a]" />
                    </div>
                    <CardTitle className="text-gray-900 dark:text-white">
                      {stream.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stream.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 7 — FINANCIAL PROJECTIONS (white bg)
          ========================================================= */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-7xl mx-auto md:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6">
              <BarChart3 className="h-4 w-4" />
              PROJECTIONS
            </span>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-6 text-gray-900 dark:text-white">
              Financial{" "}
              <span className="text-[#ff6a1a]">Projections</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Three-year revenue projections across all business verticals.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {projections.map((proj, i) => (
              <motion.div
                key={proj.year}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-[#ff6a1a] to-amber-500" />
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg text-gray-500 dark:text-gray-400">
                      {proj.year}
                    </CardTitle>
                    <p className="text-4xl font-bold text-[#ff6a1a]">
                      {proj.revenue}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total Revenue
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Books
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {proj.books}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Consulting
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {proj.consulting}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Fund Management
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {proj.fund}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 8 — MISSION & VISION (bg-gray-50)
          ========================================================= */}
      <section className="relative z-10 py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto md:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6">
              <Globe className="h-4 w-4" />
              MISSION & VISION
            </span>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-6 text-gray-900 dark:text-white">
              Our <span className="text-[#ff6a1a]">Mission</span>
            </h2>
          </motion.div>

          {/* Mission quote */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-[#ff6a1a] to-amber-500" />
              <CardContent className="p-8 md:p-12 text-center">
                <div className="text-6xl text-[#ff6a1a]/30 mb-4">
                  &ldquo;
                </div>
                <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 dark:text-white leading-relaxed max-w-3xl mx-auto mb-6">
                  To protect aspiring entrepreneurs from preventable failure and
                  build generational wealth through disciplined investing and
                  world-class business education.
                </blockquote>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  &mdash; Tory R Zweigle, Founder & CEO
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Vision pillars */}
          <div className="grid md:grid-cols-3 gap-6">
            {visionPillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <Card className="h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="p-3 rounded-xl bg-[#ff6a1a]/10 w-fit mb-3">
                      <pillar.icon className="h-6 w-6 text-[#ff6a1a]" />
                    </div>
                    <CardTitle className="text-gray-900 dark:text-white">
                      {pillar.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {pillar.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 9 — CONSULTATION SIGNUP (white bg)
          ========================================================= */}
      <section id="consultation" className="relative z-10 py-24 px-4">
        <div className="max-w-7xl mx-auto md:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6">
              <Users className="h-4 w-4" />
              GET STARTED
            </span>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-6 text-gray-900 dark:text-white">
              Sign Up for a{" "}
              <span className="text-[#ff6a1a]">Consultation</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              Sit down with Tory for a comprehensive evaluation of your business
              idea. You will receive an honest, experience-backed assessment
              &mdash; including whether you should proceed, pivot, or walk away.
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-10">
              No fluff, no false encouragement. Just four decades of hard-won
              wisdom applied directly to your situation.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                asChild
                size="lg"
                className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 text-base px-8 py-6"
              >
                <Link href="#consultation">
                  Sign Up for a Consultation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]"
              >
                <Link href="/assets/tory/fund-overview.pdf">
                  <Download className="mr-2 h-5 w-5" />
                  Download Fund Overview (PDF)
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]"
              >
                <Link href="/fund/presentation">
                  View Full Investor Deck
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
