"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  BookOpen,
  Target,
  Shield,
  BarChart3,
  Award,
  Globe,
  ArrowRight,
  Download,
  Home,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  Heart,
  BookMarked,
  Lightbulb,
} from "lucide-react"

const ORANGE = "#ff6a1a"

interface Slide {
  number: number
  title: string
  content: React.ReactNode
}

function StatCard({ icon: Icon, value, label, color = ORANGE }: { icon: React.ElementType; value: string; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-gray-50 dark:bg-gray-900 p-6 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="mb-3 rounded-full p-3" style={{ backgroundColor: `${color}15` }}>
        <Icon className="size-7" style={{ color }} />
      </div>
      <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
      <span className="mt-1 text-sm text-gray-500 text-center">{label}</span>
    </div>
  )
}

function InfoCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex gap-4 rounded-xl bg-gray-50 dark:bg-gray-900 p-5 border border-gray-100 dark:border-gray-800">
      <div className="shrink-0 rounded-lg p-2.5" style={{ backgroundColor: `${ORANGE}15` }}>
        <Icon className="size-6" style={{ color: ORANGE }} />
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function NumberBadge({ n }: { n: number }) {
  return (
    <span
      className="inline-flex size-8 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ backgroundColor: ORANGE }}
    >
      {n}
    </span>
  )
}

const slides: Slide[] = [
  // Slide 1
  {
    number: 1,
    title: "Founder — Tory R Zweigle",
    content: (
      <div className="flex flex-col items-center gap-8">
        <div
          className="flex size-32 items-center justify-center rounded-full text-5xl font-bold text-white shadow-xl"
          style={{ background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` }}
        >
          TZ
        </div>
        <p className="max-w-xl text-center text-lg text-gray-600 dark:text-gray-400">
          Serial entrepreneur with <span className="font-semibold text-gray-900 dark:text-white">40+ years</span> of experience
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 w-full max-w-2xl">
          <StatCard icon={Briefcase} value="100+" label="Businesses Built" />
          <StatCard icon={Globe} value="5" label="Countries" />
          <StatCard icon={Award} value="40+" label="Years Experience" />
          <StatCard icon={Building2} value="Intl." label="Manufacturing" />
        </div>
        <p className="text-sm text-gray-500 text-center max-w-lg">
          International manufacturing operations spanning the US, China, Vietnam, Mexico, and India
        </p>
      </div>
    ),
  },
  // Slide 2
  {
    number: 2,
    title: "Author — Tory R Zweigle",
    content: (
      <div className="flex flex-col items-center gap-8">
        <div className="grid gap-6 sm:grid-cols-2 w-full max-w-2xl">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 text-center shadow-sm">
            <BookOpen className="mx-auto mb-4 size-12" style={{ color: ORANGE }} />
            <h4 className="font-bold text-gray-900 dark:text-white text-lg">&ldquo;The Art and Soul of Common Sense in Business&rdquo;</h4>
            <p className="mt-2 text-sm text-gray-500">Practical wisdom from decades of real-world entrepreneurship</p>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 text-center shadow-sm">
            <BookMarked className="mx-auto mb-4 size-12" style={{ color: ORANGE }} />
            <h4 className="font-bold text-gray-900 dark:text-white text-lg">&ldquo;Wantrepreneur VS Entrepreneur&rdquo;</h4>
            <p className="mt-2 text-sm text-gray-500">84 chapters &middot; 300+ photos &middot; 100+ graphs</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {["English", "Mandarin", "Spanish"].map((lang) => (
            <span
              key={lang}
              className="rounded-full px-5 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: ORANGE }}
            >
              {lang}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  // Slide 3
  {
    number: 3,
    title: "The Problem With Business Consulting",
    content: (
      <div className="flex flex-col items-center gap-8">
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-8 max-w-2xl w-full">
          <AlertTriangle className="mx-auto mb-4 size-16 text-red-500" />
          <p className="text-center text-xl font-semibold text-gray-900 dark:text-white">
            Thousands claim to be consultants who have <span className="text-red-500">never started a business</span>.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 w-full max-w-2xl">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-5 border border-gray-100 dark:border-gray-800 text-center">
            <AlertTriangle className="mx-auto mb-2 size-8 text-red-400" />
            <p className="font-medium text-gray-900 dark:text-white">Sell motivational courses</p>
            <p className="mt-1 text-sm text-gray-500">Not real operational experience</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-5 border border-gray-100 dark:border-gray-800 text-center">
            <AlertTriangle className="mx-auto mb-2 size-8 text-red-400" />
            <p className="font-medium text-gray-900 dark:text-white">Theory over practice</p>
            <p className="mt-1 text-sm text-gray-500">No skin in the game</p>
          </div>
        </div>
      </div>
    ),
  },
  // Slide 4
  {
    number: 4,
    title: "Experience vs Theory",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="grid gap-4 w-full sm:grid-cols-2">
          <div className="rounded-2xl p-6 text-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` }}>
            <CheckCircle2 className="mx-auto mb-3 size-12" />
            <h4 className="text-xl font-bold">Real Experience</h4>
            <p className="mt-2 text-sm opacity-90">Learned through risk, operations, and competition</p>
          </div>
          <div className="rounded-2xl bg-gray-100 dark:bg-gray-900 p-6 text-center border border-gray-200 dark:border-gray-800">
            <AlertTriangle className="mx-auto mb-3 size-12 text-gray-400" />
            <h4 className="text-xl font-bold text-gray-400">Theory Only</h4>
            <p className="mt-2 text-sm text-gray-400">Classroom knowledge without real stakes</p>
          </div>
        </div>
        <div className="space-y-3 w-full">
          {["Real financial risk", "Operational challenges", "Competitive battles", "Trial and error over decades"].map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-900 p-4 border border-gray-100 dark:border-gray-800">
              <CheckCircle2 className="size-5 shrink-0" style={{ color: ORANGE }} />
              <span className="text-gray-700 dark:text-gray-300">{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // Slide 5
  {
    number: 5,
    title: "The Reality of Entrepreneurship",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-8 text-center w-full border border-gray-100 dark:border-gray-800">
          <TrendingUp className="mx-auto mb-4 size-16 text-red-500 rotate-180" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">Most startups fail.</p>
          <p className="mt-3 text-gray-600 dark:text-gray-400 text-lg">
            People invest their life savings into companies with little chance of success.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 w-full">
          <StatCard icon={DollarSign} value="Life" label="Savings at Risk" color="#ef4444" />
          <StatCard icon={Heart} value="Dreams" label="On the Line" color="#ef4444" />
          <StatCard icon={AlertTriangle} value="High" label="Failure Rate" color="#ef4444" />
        </div>
      </div>
    ),
  },
  // Slide 6
  {
    number: 6,
    title: "Startup Failure Statistics",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-3xl mx-auto">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
          {[
            { value: "90%", label: "Of Startups Fail", sub: "Overall" },
            { value: "20%", label: "Fail in Year 1", sub: "First year" },
            { value: "50%", label: "Fail in 5 Years", sub: "Half decade" },
            { value: "65-70%", label: "Fail in 10 Years", sub: "Decade mark" },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl border-2 p-6 text-center shadow-sm" style={{ borderColor: ORANGE }}>
              <span className="text-4xl font-black" style={{ color: ORANGE }}>{stat.value}</span>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">{stat.label}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>
        <div className="w-full rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">The odds are stacked against new entrepreneurs</p>
        </div>
      </div>
    ),
  },
  // Slide 7
  {
    number: 7,
    title: "Average Startup Financial Loss",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-8 text-center w-full border border-gray-100 dark:border-gray-800">
          <DollarSign className="mx-auto mb-2 size-16" style={{ color: ORANGE }} />
          <span className="text-6xl font-black text-gray-900 dark:text-white">$202,000</span>
          <p className="mt-2 text-lg text-gray-500">Average investment lost per failed startup</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 w-full">
          {[
            { icon: DollarSign, label: "Personal Savings" },
            { icon: Shield, label: "Retirement Funds" },
            { icon: Building2, label: "Home Equity" },
            { icon: Users, label: "Friends & Family" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-900 p-4 border border-gray-100 dark:border-gray-800">
              <item.icon className="size-6 shrink-0" style={{ color: ORANGE }} />
              <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 text-center">Sources include credit cards and personal loans</p>
      </div>
    ),
  },
  // Slide 8
  {
    number: 8,
    title: "The Human Cost",
    content: (
      <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
        <p className="text-lg text-center text-gray-600 dark:text-gray-400">
          Beyond the money, startup failure devastates lives.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 w-full">
          {[
            { icon: AlertTriangle, label: "Bankruptcy", desc: "Financial ruin and legal burden" },
            { icon: Heart, label: "Divorce", desc: "Relationships torn apart by stress" },
            { icon: AlertTriangle, label: "Stress & Health", desc: "Mental and physical health decline" },
            { icon: Shield, label: "Damaged Credit", desc: "Years to rebuild creditworthiness" },
          ].map((item, i) => (
            <div key={i} className="rounded-xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-5 text-center">
              <item.icon className="mx-auto mb-2 size-10 text-red-500" />
              <h4 className="font-bold text-gray-900 dark:text-white">{item.label}</h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // Slide 9
  {
    number: 9,
    title: "The Philosophy",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="rounded-2xl p-10 text-center text-white shadow-xl w-full" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` }}>
          <Lightbulb className="mx-auto mb-6 size-16" />
          <blockquote className="text-3xl font-bold leading-tight">
            &ldquo;Most startups should never start.&rdquo;
          </blockquote>
        </div>
        <p className="text-center text-lg text-gray-600 dark:text-gray-400 max-w-lg">
          Honest expert feedback <span className="font-semibold text-gray-900 dark:text-white">before</span> investing life savings — not after it&apos;s too late.
        </p>
      </div>
    ),
  },
  // Slide 10
  {
    number: 10,
    title: "Top 10 Reasons Startups Fail",
    content: (
      <div className="grid gap-3 sm:grid-cols-2 max-w-3xl mx-auto w-full">
        {[
          { icon: Target, label: "No market demand" },
          { icon: DollarSign, label: "Running out of cash" },
          { icon: BarChart3, label: "Weak business model" },
          { icon: Briefcase, label: "No real experience" },
          { icon: Users, label: "Poor management" },
          { icon: Shield, label: "Too much competition" },
          { icon: DollarSign, label: "Pricing problems" },
          { icon: Globe, label: "Weak marketing" },
          { icon: TrendingUp, label: "Expanding too fast" },
          { icon: Heart, label: "Founder burnout" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl bg-gray-50 dark:bg-gray-900 p-4 border border-gray-100 dark:border-gray-800">
            <NumberBadge n={i + 1} />
            <item.icon className="size-5 shrink-0 text-gray-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
          </div>
        ))}
      </div>
    ),
  },
  // Slide 11
  {
    number: 11,
    title: "A Start Up Biz Consulting Model",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <p className="text-center text-lg text-gray-600 dark:text-gray-400">Two clear paths for every client</p>
        <div className="grid gap-6 sm:grid-cols-2 w-full">
          <div className="rounded-2xl border-2 p-6 text-center shadow-md" style={{ borderColor: ORANGE }}>
            <Target className="mx-auto mb-4 size-14" style={{ color: ORANGE }} />
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">Startup Idea Evaluation</h4>
            <p className="mt-2 text-gray-500">Expert assessment of your business idea before you invest</p>
            <div className="mt-4 inline-block rounded-full px-4 py-1 text-sm font-medium text-white" style={{ backgroundColor: ORANGE }}>
              Path 1
            </div>
          </div>
          <div className="rounded-2xl border-2 p-6 text-center shadow-md" style={{ borderColor: ORANGE }}>
            <Building2 className="mx-auto mb-4 size-14" style={{ color: ORANGE }} />
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">Alternative Investment Strategy</h4>
            <p className="mt-2 text-gray-500">Smart real estate alternatives for your capital</p>
            <div className="mt-4 inline-block rounded-full px-4 py-1 text-sm font-medium text-white" style={{ backgroundColor: ORANGE }}>
              Path 2
            </div>
          </div>
        </div>
      </div>
    ),
  },
  // Slide 12
  {
    number: 12,
    title: "Startup Idea Evaluation",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="grid gap-4 sm:grid-cols-3 w-full">
          <StatCard icon={Users} value="30 min" label="Consultation" />
          <StatCard icon={DollarSign} value="$1,000" label="Flat Fee" />
          <StatCard icon={BookOpen} value="25" label="Question Form" />
        </div>
        <div className="w-full space-y-4">
          {[
            "Complete a 25-question pre-consultation form",
            "30-minute one-on-one with Tory",
            "Receive a direct, honest answer — go or no-go",
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl bg-gray-50 dark:bg-gray-900 p-5 border border-gray-100 dark:border-gray-800">
              <NumberBadge n={i + 1} />
              <span className="text-gray-700 dark:text-gray-300 font-medium">{step}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // Slide 13
  {
    number: 13,
    title: '"Tory Insurance"',
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="rounded-2xl p-8 text-center text-white shadow-xl w-full" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` }}>
          <Shield className="mx-auto mb-4 size-16" />
          <div className="flex items-center justify-center gap-4 text-5xl font-black">
            <span>$1K</span>
            <ArrowRight className="size-10" />
            <span>$202K</span>
          </div>
          <p className="mt-4 text-lg opacity-90">Spend a little now to potentially save everything</p>
        </div>
        <p className="text-center text-lg text-gray-600 dark:text-gray-400 max-w-lg">
          Think of it as <span className="font-semibold text-gray-900 dark:text-white">insurance</span> — a $1,000 consultation that could save you from a $202,000 loss.
        </p>
      </div>
    ),
  },
  // Slide 14
  {
    number: 14,
    title: "Real Consulting Results",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-10 text-center w-full border border-gray-100 dark:border-gray-800">
          <span className="text-8xl font-black" style={{ color: ORANGE }}>57</span>
          <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">Consultations Completed</p>
        </div>
        <div className="rounded-2xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-6 text-center w-full">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            All 57 advised <span className="underline">not to start</span>
          </p>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Potentially saving $11.5M+ in combined losses
          </p>
        </div>
      </div>
    ),
  },
  // Slide 15
  {
    number: 15,
    title: "What Clients Asked Next",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-8 text-center w-full border border-gray-100 dark:border-gray-800">
          <Users className="mx-auto mb-4 size-14" style={{ color: ORANGE }} />
          <blockquote className="text-2xl font-bold text-gray-900 dark:text-white italic">
            &ldquo;What should we do with our money instead?&rdquo;
          </blockquote>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-0.5 w-16 bg-gray-300" />
          <ArrowRight className="size-8" style={{ color: ORANGE }} />
          <div className="h-0.5 w-16 bg-gray-300" />
        </div>
        <div className="rounded-2xl p-6 text-center text-white shadow-lg w-full" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` }}>
          <Building2 className="mx-auto mb-3 size-12" />
          <h4 className="text-2xl font-bold">Real Estate Investing</h4>
          <p className="mt-2 opacity-90">A proven, tangible alternative to high-risk startups</p>
        </div>
      </div>
    ),
  },
  // Slide 16
  {
    number: 16,
    title: "Real Estate as an Alternative",
    content: (
      <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
        <p className="text-center text-lg text-gray-600 dark:text-gray-400">
          Why real estate outperforms most startup gambles
        </p>
        <div className="grid gap-4 sm:grid-cols-2 w-full">
          <InfoCard icon={DollarSign} title="Rental Income" description="Consistent monthly cash flow from tenants" />
          <InfoCard icon={TrendingUp} title="Appreciation" description="Property values grow over time" />
          <InfoCard icon={BarChart3} title="Equity Growth" description="Build wealth as mortgages are paid down" />
          <InfoCard icon={Shield} title="Stability" description="Tangible asset with lower volatility" />
        </div>
      </div>
    ),
  },
  // Slide 17
  {
    number: 17,
    title: "Real Estate Investment Fund",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <p className="text-center text-lg text-gray-600 dark:text-gray-400">
          A pooled fund for clients who chose the smarter path
        </p>
        <div className="grid gap-4 sm:grid-cols-3 w-full">
          <StatCard icon={Users} value="28" label="Clients Interested" />
          <StatCard icon={DollarSign} value="$200K" label="Avg. Investment" />
          <StatCard icon={BarChart3} value="$5.4M" label="Initial Pool" />
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-5 text-center w-full border border-gray-100 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400">
            Redirecting startup capital into <span className="font-bold" style={{ color: ORANGE }}>real, income-producing assets</span>
          </p>
        </div>
      </div>
    ),
  },
  // Slide 18
  {
    number: 18,
    title: "Investment Strategy",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="rounded-2xl p-6 text-center text-white shadow-lg w-full" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` }}>
          <Building2 className="mx-auto mb-4 size-14" />
          <h4 className="text-2xl font-bold">Small Commercial Warehouses</h4>
          <p className="mt-2 opacity-90">1,000 - 2,000 sq ft units</p>
        </div>
        <div className="space-y-4 w-full">
          <InfoCard icon={Building2} title="Target Properties" description="Small commercial warehouses ideal for local businesses" />
          <InfoCard icon={Users} title="Target Tenants" description="E-commerce, small manufacturers, storage businesses" />
          <InfoCard icon={TrendingUp} title="Strong Demand" description="Growing need for last-mile fulfillment and small warehouse space" />
        </div>
      </div>
    ),
  },
  // Slide 19
  {
    number: 19,
    title: "Three Revenue Streams",
    content: (
      <div className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
        <p className="text-center text-lg text-gray-600 dark:text-gray-400">A diversified business model</p>
        <div className="grid gap-6 sm:grid-cols-3 w-full">
          {[
            { icon: BookOpen, title: "Books", desc: "Published in 3 languages, sold worldwide", color: "#3b82f6" },
            { icon: Users, title: "Consulting", desc: "$1K per session, high-value honest evaluations", color: ORANGE },
            { icon: Building2, title: "Real Estate Fund", desc: "Pooled capital in commercial warehouses", color: "#10b981" },
          ].map((stream, i) => (
            <div key={i} className="rounded-2xl border-2 p-6 text-center shadow-sm" style={{ borderColor: stream.color }}>
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full" style={{ backgroundColor: `${stream.color}15` }}>
                <stream.icon className="size-8" style={{ color: stream.color }} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">{stream.title}</h4>
              <p className="mt-2 text-sm text-gray-500">{stream.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // Slide 20
  {
    number: 20,
    title: "Book Revenue Model",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="grid gap-4 sm:grid-cols-2 w-full">
          <StatCard icon={BookOpen} value="50K" label="Books / Month" />
          <StatCard icon={DollarSign} value="$24.95" label="Retail Price" />
        </div>
        <div className="w-full rounded-2xl border-2 p-6 text-center" style={{ borderColor: ORANGE }}>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Monthly Revenue</p>
          <span className="text-5xl font-black" style={{ color: ORANGE }}>$1.25M</span>
          <div className="mt-4 h-px bg-gray-200 dark:bg-gray-700" />
          <p className="mt-4 text-sm text-gray-500 uppercase tracking-wider">Annual Revenue</p>
          <span className="text-3xl font-bold text-gray-900 dark:text-white">$14.97M</span>
        </div>
      </div>
    ),
  },
  // Slide 21
  {
    number: 21,
    title: "Consulting Revenue Model",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
          <StatCard icon={DollarSign} value="$1K" label="Per Session" />
          <StatCard icon={Users} value="20" label="Daily Max" />
          <StatCard icon={BarChart3} value="400" label="Monthly" />
          <StatCard icon={TrendingUp} value="$400K" label="Monthly Rev" />
        </div>
        <div className="w-full rounded-2xl border-2 p-8 text-center" style={{ borderColor: ORANGE }}>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Annual Revenue Potential</p>
          <span className="text-5xl font-black" style={{ color: ORANGE }}>$4.8M</span>
        </div>
      </div>
    ),
  },
  // Slide 22
  {
    number: 22,
    title: "Fund Growth Potential",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="grid gap-4 sm:grid-cols-2 w-full">
          <StatCard icon={Users} value="200" label="Investors / Month" />
          <StatCard icon={DollarSign} value="$200K" label="Avg. Investment" />
        </div>
        <div className="w-full rounded-2xl p-6 text-center text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` }}>
          <p className="text-sm uppercase tracking-wider opacity-80">Monthly Inflow</p>
          <span className="text-5xl font-black">$40M</span>
          <div className="my-4 h-px bg-white/20" />
          <p className="text-sm uppercase tracking-wider opacity-80">Annual Inflow</p>
          <span className="text-4xl font-bold">$480M</span>
        </div>
      </div>
    ),
  },
  // Slide 23
  {
    number: 23,
    title: "Three-Year Financial Projection",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-3xl mx-auto">
        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left">
            <thead>
              <tr style={{ backgroundColor: ORANGE }}>
                <th className="p-4 text-white font-bold">Stream</th>
                <th className="p-4 text-white font-bold text-right">Year 1</th>
                <th className="p-4 text-white font-bold text-right">Year 2</th>
                <th className="p-4 text-white font-bold text-right">Year 3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr className="bg-white dark:bg-gray-950">
                <td className="p-4 font-medium text-gray-900 dark:text-white">Books</td>
                <td className="p-4 text-right text-gray-600 dark:text-gray-400">$14.97M</td>
                <td className="p-4 text-right text-gray-600 dark:text-gray-400">$18M</td>
                <td className="p-4 text-right text-gray-600 dark:text-gray-400">$22M</td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <td className="p-4 font-medium text-gray-900 dark:text-white">Consulting</td>
                <td className="p-4 text-right text-gray-600 dark:text-gray-400">$4.8M</td>
                <td className="p-4 text-right text-gray-600 dark:text-gray-400">$6M</td>
                <td className="p-4 text-right text-gray-600 dark:text-gray-400">$8M</td>
              </tr>
              <tr className="bg-white dark:bg-gray-950">
                <td className="p-4 font-medium text-gray-900 dark:text-white">RE Fund</td>
                <td className="p-4 text-right text-gray-600 dark:text-gray-400">$2M</td>
                <td className="p-4 text-right text-gray-600 dark:text-gray-400">$5M</td>
                <td className="p-4 text-right text-gray-600 dark:text-gray-400">$10M</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2" style={{ borderColor: ORANGE }}>
                <td className="p-4 font-bold text-gray-900 dark:text-white text-lg">Total</td>
                <td className="p-4 text-right font-bold text-lg" style={{ color: ORANGE }}>$21.77M</td>
                <td className="p-4 text-right font-bold text-lg" style={{ color: ORANGE }}>$29M</td>
                <td className="p-4 text-right font-bold text-lg" style={{ color: ORANGE }}>$40M</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    ),
  },
  // Slide 24
  {
    number: 24,
    title: "Mission",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="rounded-2xl p-10 text-center text-white shadow-xl w-full" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` }}>
          <Heart className="mx-auto mb-6 size-16" />
          <h3 className="text-3xl font-bold">Protect Entrepreneurs</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 w-full">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-6 text-center border border-gray-100 dark:border-gray-800">
            <span className="text-4xl font-black" style={{ color: ORANGE }}>1,000</span>
            <p className="mt-1 text-gray-500">Failures Prevented</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-6 text-center border border-gray-100 dark:border-gray-800">
            <span className="text-4xl font-black" style={{ color: ORANGE }}>$200M</span>
            <p className="mt-1 text-gray-500">Capital Saved</p>
          </div>
        </div>
        <p className="text-center text-lg text-gray-600 dark:text-gray-400">
          If we prevent 1,000 startup failures, that&apos;s <span className="font-bold text-gray-900 dark:text-white">$200 million</span> kept in people&apos;s pockets.
        </p>
      </div>
    ),
  },
  // Slide 25
  {
    number: 25,
    title: "Vision & Next Steps",
    content: (
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        <div className="space-y-4 w-full">
          {[
            { icon: Award, label: "World's most honest startup advisory" },
            { icon: Globe, label: "Global education brand across 3+ languages" },
            { icon: Building2, label: "Major real estate investment fund" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl bg-gray-50 dark:bg-gray-900 p-5 border border-gray-100 dark:border-gray-800">
              <div className="rounded-full p-3" style={{ backgroundColor: `${ORANGE}15` }}>
                <item.icon className="size-7" style={{ color: ORANGE }} />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button asChild variant="orange" size="lg" className="flex-1 text-base">
            <Link href="/fund#consultation">
              Sign Up for a Consultation <ArrowRight className="ml-2 size-5" />
            </Link>
          </Button>
          <Button asChild variant="orange-outline" size="lg" className="flex-1 text-base">
            <Link href="/fund">
              Learn More About the Fund
            </Link>
          </Button>
        </div>
      </div>
    ),
  },
]

export default function PresentationPage() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= slides.length) return
      setDirection(index > current ? 1 : -1)
      setCurrent(index)
    },
    [current],
  )

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next()
      if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [next, prev])

  const slide = slides[current]
  const progress = ((current + 1) / slides.length) * 100

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      {/* Slide area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.number}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-full max-w-4xl"
          >
            {/* Slide number badge */}
            <div className="mb-6 flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ backgroundColor: ORANGE }}
              >
                {slide.number} / {slides.length}
              </span>
            </div>

            {/* Title */}
            <h2 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {slide.title.split(" ").map((word, i) => {
                const accentWords = ["Tory", "Problem", "Experience", "Reality", "Failure", "Financial", "Human", "Philosophy", "Top", "Consulting", "Evaluation", "Insurance", "Results", "Next", "Alternative", "Fund", "Three", "Book", "Growth", "Projection", "Mission", "Vision", "Revenue"]
                if (accentWords.some((a) => word.startsWith(a))) {
                  return (
                    <span key={i} style={{ color: ORANGE }}>
                      {word}{" "}
                    </span>
                  )
                }
                return <span key={i}>{word} </span>
              })}
            </h2>

            {/* Content */}
            {slide.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation bar */}
      <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md">
        {/* Progress bar */}
        <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
          <motion.div
            className="h-full"
            style={{ background: `linear-gradient(90deg, ${ORANGE}, #ea580c)` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          {/* Left — home + download */}
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/fund">
                <Home className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/assets/tory/investor-deck.pdf" target="_blank">
                <Download className="size-4" />
              </Link>
            </Button>
          </div>

          {/* Center — prev / counter / next */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={current === 0}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <span className="min-w-[4rem] text-center text-sm font-medium text-gray-500">
              {current + 1} / {slides.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={next}
              disabled={current === slides.length - 1}
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>

          {/* Right — spacer for symmetry */}
          <div className="w-20" />
        </div>
      </div>
    </div>
  )
}
