"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Footer from "@/components/footer";
import {
  Mail,
  ChevronDown,
  ChevronUp,
  Clock,
  MousePointerClick,
  ArrowRight,
  Send,
  Calendar,
  BarChart3,
  Users,
  Shield,
  Building2,
  DollarSign,
  Target,
  CheckCircle2,
} from "lucide-react";

const emails = [
  {
    number: 1,
    day: 0,
    dayLabel: "Immediately",
    theme: "Welcome & Thank You",
    icon: Mail,
    subjectOptions: [
      "Welcome — Here's What Tory Zweigle Wishes Someone Told Him 40 Years Ago",
      "You Made a Smart Move. Here's What Comes Next.",
      "Thank You for Your Interest in A Start Up Biz",
    ],
    previewText:
      "Tory has started 100+ businesses. Now he's helping people protect their money.",
    cta: { text: "Learn More About A Start Up Biz", link: "/fund" },
    body: `Hi {{first_name}},

Thank you for your interest in A Start Up Biz and the investment fund. That one decision — to learn before you leap — already puts you ahead of most aspiring entrepreneurs.

My name is Tory Zweigle. I've spent 40+ years starting businesses. More than 100 of them, across manufacturing, restaurants, hotels, construction, automotive, retail, and international supply chains spanning the US, China, Vietnam, Mexico, and India.

I've seen what works. More importantly, I've seen what doesn't — and it's a lot more common than people think.

A Start Up Biz was built on one idea: the best investment you can make is in the right information before you risk your money.

Over the next couple of weeks, I'll share the hard truths about startups, what I've learned from evaluating dozens of business ideas, and how our investment fund was born from a question my own clients kept asking me.

Talk soon,
Tory R Zweigle
Founder, A Start Up Biz

P.S. If you want to get a head start, you can read more about our story and mission at joinsahara.com/fund.`,
  },
  {
    number: 2,
    day: 2,
    dayLabel: "Day 2",
    theme: "The Hard Truth About Startups",
    icon: BarChart3,
    subjectOptions: [
      "90% of Startups Fail. The Average Loss? $202,000.",
      "The Number Every Aspiring Entrepreneur Needs to See",
      "Before You Start a Business, Read This",
    ],
    previewText:
      "The real cost of a failed startup goes far beyond money.",
    cta: {
      text: "Watch the Investor Presentation",
      link: "/fund/presentation",
    },
    body: `Hi {{first_name}},

Here's a number that keeps me up at night: $202,000.

That's the average amount an entrepreneur invests before their startup fails. And it fails roughly 90% of the time.

• 20% of startups fail in year one
• 50% are gone within five years
• 65–70% don't survive a decade

But the financial loss is only part of the story. Behind every failed startup is a person who may have drained their savings, cashed out retirement accounts, borrowed from family, or taken on crushing debt.

The human cost — stress, strained relationships, bankruptcy, lost confidence — is what people don't talk about.

I've been on both sides of this. I've had successes and I've had failures. After 100+ businesses, the pattern is clear: most business ideas should never become businesses. Not because the person isn't smart or hardworking, but because the idea itself doesn't hold up under real scrutiny.

That's why I created A Start Up Biz — to give people an honest, experience-based evaluation before they risk everything.

In my next email, I'll tell you why my approach is different from the motivational speakers and online coaches flooding your feed.

Best,
Tory

P.S. Want to see the full picture? Our investor presentation breaks down exactly how we're turning this problem into an opportunity.`,
  },
  {
    number: 3,
    day: 5,
    dayLabel: "Day 5",
    theme: "Why Tory Is Different",
    icon: Shield,
    subjectOptions: [
      "I've Started 100+ Businesses. Most Consultants Have Started Zero.",
      "Experience vs. Theory — Why It Matters",
      "The Difference Between Advice and Real Knowledge",
    ],
    previewText:
      'Thousands of "business coaches" have never actually started a business.',
    cta: {
      text: "Download the Fund Overview",
      link: "/assets/tory/fund-overview.pdf",
    },
    body: `Hi {{first_name}},

There are thousands of people calling themselves business consultants who have never started a single business. They sell motivational courses, online programs, coaching packages, and startup seminars — all built on theory.

I'm not one of them.

Here's what 40+ years of real experience looks like:

• 100+ businesses started across manufacturing, food service, hospitality, construction, automotive, retail, and more
• International operations with supply chains in the US, China, Vietnam, Mexico, and India
• Two published books: The Art and Soul of Common Sense in Business and Wantrepreneur VS Entrepreneur (84 chapters, 300+ photographs, 100+ graphs — published in English, Mandarin, and Spanish)
• Entrepreneurial since age 11, selling avocados from my family's California orchard

Business isn't learned in a classroom. It's learned through real financial risk, operational challenges, competition in real markets, and years of trial and error.

That's the foundation A Start Up Biz is built on — not a motivational framework, but decades of scars, wins, and hard-earned pattern recognition.

When I evaluate a business idea, I'm not guessing. I'm comparing it against every mistake and success I've lived through.

Tory

P.S. Our Fund Overview PDF breaks down the full opportunity in detail.`,
  },
  {
    number: 4,
    day: 8,
    dayLabel: "Day 8",
    theme: "The $1,000 That Saves $202,000",
    icon: DollarSign,
    subjectOptions: [
      "57 People Paid Me $1,000. I Told All 57 Not to Start.",
      "The Cheapest Insurance for Your Business Idea",
      "What Happens When a 40-Year Entrepreneur Reviews Your Startup",
    ],
    previewText:
      "Every single one of my 57 consultation clients was advised not to proceed. Here's why that's a good thing.",
    cta: {
      text: "Book a $1,000 Consultation",
      link: "/fund#consultation",
    },
    body: `Hi {{first_name}},

I charge $1,000 for a 30-minute startup consultation. Some people think that's expensive.

I think it's the cheapest insurance you'll ever buy.

Here's how it works: I use a 25-question evaluation form that stress-tests a business idea from every angle — market viability, competitive landscape, financial projections, founder readiness, and more.

To date, I've completed 57 consultations. Every single one of them — all 57 — I advised the person not to start their business.

Not because I enjoy saying no. Because the numbers, the market, and my experience all pointed to the same conclusion: proceeding would likely mean losing their investment.

Think about that. If the average failed startup costs $202,000, then a $1,000 conversation that prevents that loss is a 200x return on investment. I call it "Tory Insurance."

And here's what happened next — something I didn't expect. Those 57 people came back to me and asked the same question:

"If I shouldn't start this business, what should I do with my money instead?"

That question changed everything. It's how our investment fund was born. More on that in my next email.

Tory

P.S. If you have a business idea you want evaluated honestly, you can sign up for a consultation. No sales pitch — just a straight answer.`,
  },
  {
    number: 5,
    day: 11,
    dayLabel: "Day 11",
    theme: "Where Smart Money Goes Instead",
    icon: Building2,
    subjectOptions: [
      "What 57 Clients Asked Me After I Said 'Don't Start'",
      "The Real Estate Strategy Born from Failed Startup Dreams",
      "If Not a Startup, Then What? Here's the Answer.",
    ],
    previewText:
      "When aspiring entrepreneurs asked where to put their money instead, the answer was clear.",
    cta: { text: "Learn About the Fund", link: "/fund" },
    body: `Hi {{first_name}},

When all 57 of my consultation clients asked "what should I do with my money instead?", I realized something: the biggest opportunity wasn't in starting businesses. It was in redirecting capital toward something that actually works.

The answer: real estate — specifically, small commercial warehouses.

Here's the strategy:

We target small commercial warehouse properties in the 1,000 to 2,000 square foot range. These aren't flashy. They're practical, in-demand, and remarkably stable.

Why warehouses?

The tenants are the backbone of the economy:
• Contractors who need space for tools and materials
• Storage businesses serving residential and commercial clients
• E-commerce companies shipping products
• Service companies needing operational hubs

These businesses need physical space. They sign leases. They pay rent. Unlike a startup hoping to find product-market fit, a warehouse with a tenant is a cash-flowing asset from day one.

The revenue model is straightforward:
• Rental income — monthly cash flow from tenants
• Property appreciation — real estate values trend upward over time
• Equity building — each mortgage payment increases ownership stake
• Stability — commercial leases are typically longer and more predictable than residential

This is where A Start Up Biz's investment fund comes in. Instead of losing $202,000 on a startup, our investors put their capital into tangible assets with proven demand.

Tory

P.S. Want the full breakdown? Learn more about the fund.`,
  },
  {
    number: 6,
    day: 14,
    dayLabel: "Day 14",
    theme: "The Numbers Behind the Fund",
    icon: Target,
    subjectOptions: [
      "28 Investors. $5.4M. Here Are the Numbers.",
      "The Fund Is Growing — Here's What the Projections Look Like",
      "From $5.4M to $40M: Our 3-Year Plan",
    ],
    previewText:
      "28 investors have already committed. Here's the financial breakdown.",
    cta: {
      text: "Download the Investor Deck",
      link: "/assets/tory/investor-deck.pdf",
    },
    body: `Hi {{first_name}},

I believe in transparency, so let me share exactly where we stand.

The fund today:
• 28 investors have expressed interest in participating
• $200,000 average investment per investor
• $5.4 million initial capital pool

Three revenue streams powering A Start Up Biz:

1. Books — Wantrepreneur VS Entrepreneur and The Art and Soul of Common Sense in Business, targeting $14.97M/year in sales across English, Mandarin, and Spanish markets

2. Consulting — Our $1,000 startup evaluations, projected at $4.8M/year as we scale the consultation model nationally

3. Fund Management — Fees and returns from the real estate investment fund, projected at $2M/year

3-year revenue projection:
• Year 1: $21.77M
• Year 2: $29M
• Year 3: $40M

These aren't hypothetical numbers pulled from a pitch template. They're built on existing demand — 57 consultations already completed, two published books with international distribution, and 28 investors ready to commit capital.

The foundation is already in place. We're building on traction, not assumptions.

Tory

P.S. For the complete financial breakdown and fund structure, download our Investor Deck.`,
  },
  {
    number: 7,
    day: 17,
    dayLabel: "Day 17",
    theme: "Your Next Step",
    icon: Send,
    subjectOptions: [
      "Two Paths Forward — Which One Is Right for You?",
      "Here's How to Get Started with A Start Up Biz",
      "Let's Talk About Your Next Move",
    ],
    previewText:
      "Whether you want to evaluate your business idea or invest in the fund, here's how to take the next step.",
    cta: {
      text: "Book a Consultation",
      link: "/fund#consultation",
    },
    body: `Hi {{first_name}},

Over the past two weeks, I've shared the hard truths about startups, why experience beats theory, and how our investment fund was born from a simple question my clients kept asking.

Now it's your turn.

There are two clear paths forward:

PATH 1: You have a business idea.
Book a consultation. For $1,000, you get 30 minutes of honest, experience-based evaluation using our 25-question assessment. If your idea has potential, I'll tell you. If it doesn't, I'll save you from a costly mistake. Consultation spots are limited — I evaluate each one personally.

PATH 2: You want to invest.
Join 28 other investors who are putting their capital into real assets with real returns. Our small commercial warehouse strategy is designed for stability, cash flow, and long-term growth. Reply to this email and I'll personally walk you through the details.

No matter which path you choose, you're making a smarter decision than 90% of aspiring entrepreneurs — because you're leading with information, not impulse.

I started my first business at 11 years old. Forty years and 100+ businesses later, the lesson is simple: the best time to get expert advice is before you spend the money, not after.

I look forward to hearing from you.

Tory R Zweigle
Founder, A Start Up Biz
toryzz@msn.com

P.S. Have questions? Just hit reply. I read every email personally.`,
  },
];

const timelineSteps = [
  { day: 0, label: "Sign Up", icon: Users },
  { day: 2, label: "Day 2", icon: BarChart3 },
  { day: 5, label: "Day 5", icon: Shield },
  { day: 8, label: "Day 8", icon: DollarSign },
  { day: 11, label: "Day 11", icon: Building2 },
  { day: 14, label: "Day 14", icon: Target },
  { day: 17, label: "Day 17", icon: Send },
];

export default function EmailSequencePage() {
  const [expandedEmail, setExpandedEmail] = useState<number | null>(0);

  return (
    <main className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pt-24 pb-12 md:px-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6">
            <Mail className="h-4 w-4" />
            EMAIL FOLLOW-UP SEQUENCE
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mt-4 mb-6 text-gray-900 dark:text-white">
            Fund Interest{" "}
            <span className="text-[#ff6a1a]">Email Sequence</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            A 7-email automated sequence sent over 17 days to nurture people who
            express interest in learning about the fund and how to get involved.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
            Review each email below — click to expand and see the full content,
            subject line options, and CTA.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
            >
              <Link href="/fund">View Fund Page</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]"
            >
              <Link href="/fund/presentation">View Presentation</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Overview Stats */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pb-12 md:px-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: "Total Emails", value: "7", icon: Mail },
            { label: "Sequence Length", value: "17 days", icon: Calendar },
            { label: "Avg. Spacing", value: "2-3 days", icon: Clock },
            {
              label: "Goal",
              value: "Consultation",
              icon: MousePointerClick,
            },
          ].map((stat, i) => (
            <Card
              key={stat.label}
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
            >
              <CardContent className="p-4 text-center">
                <stat.icon className="h-5 w-5 text-[#ff6a1a] mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </section>

      {/* Visual Timeline */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pb-16 md:px-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6 text-center">
            Sequence Timeline
          </h2>
          <div className="relative flex items-center justify-between">
            {/* Connecting line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-[#ff6a1a]/20 via-[#ff6a1a]/40 to-[#ff6a1a] rounded-full" />

            {timelineSteps.map((step, i) => (
              <button
                key={step.day}
                onClick={() => setExpandedEmail(i)}
                className="relative z-10 flex flex-col items-center gap-1 group cursor-pointer"
              >
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all border-2 ${
                    expandedEmail === i
                      ? "bg-[#ff6a1a] border-[#ff6a1a] text-white scale-110 shadow-lg shadow-[#ff6a1a]/30"
                      : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 group-hover:border-[#ff6a1a]/50 group-hover:text-[#ff6a1a]"
                  }`}
                >
                  <step.icon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <span
                  className={`text-[10px] md:text-xs font-medium ${
                    expandedEmail === i
                      ? "text-[#ff6a1a]"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Email Cards */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pb-24 md:px-8">
        <div className="space-y-4">
          {emails.map((email, index) => {
            const isExpanded = expandedEmail === index;
            const Icon = email.icon;

            return (
              <motion.div
                key={email.number}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card
                  className={`overflow-hidden transition-all duration-300 ${
                    isExpanded
                      ? "border-[#ff6a1a]/40 shadow-xl shadow-[#ff6a1a]/10"
                      : "border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/20 hover:shadow-md"
                  } bg-white dark:bg-gray-900`}
                >
                  {/* Header - always visible */}
                  <button
                    onClick={() =>
                      setExpandedEmail(isExpanded ? null : index)
                    }
                    className="w-full flex items-center gap-4 p-5 md:p-6 text-left cursor-pointer"
                  >
                    {/* Email number badge */}
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                        isExpanded
                          ? "bg-[#ff6a1a] text-white"
                          : "bg-[#ff6a1a]/10 text-[#ff6a1a]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#ff6a1a] bg-[#ff6a1a]/10 px-2 py-0.5 rounded-full">
                          Email {email.number}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {email.dayLabel}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {email.theme}
                      </h3>
                    </div>

                    <div className="flex-shrink-0 text-gray-400">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-6 md:px-6 space-y-6 border-t border-gray-100 dark:border-gray-800 pt-5">
                          {/* Subject Lines */}
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                              Subject Line Options
                            </h4>
                            <div className="space-y-2">
                              {email.subjectOptions.map((subject, si) => (
                                <div
                                  key={si}
                                  className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
                                >
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#ff6a1a]/10 text-[#ff6a1a] text-xs font-bold flex items-center justify-center mt-0.5">
                                    {si + 1}
                                  </span>
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {subject}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Preview Text */}
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                              Preview Text
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                              &ldquo;{email.previewText}&rdquo;
                            </p>
                          </div>

                          {/* Email Body */}
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                              Email Body
                            </h4>
                            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-inner">
                              {/* Simulated email header */}
                              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff6a1a] to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                                  TZ
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    Tory R Zweigle
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    toryzz@msn.com
                                  </p>
                                </div>
                              </div>

                              {/* Email content */}
                              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                {email.body}
                              </div>
                            </div>
                          </div>

                          {/* CTA */}
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                              Call to Action
                            </h4>
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6a1a]/5 border border-[#ff6a1a]/20">
                              <MousePointerClick className="h-5 w-5 text-[#ff6a1a] flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {email.cta.text}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  {email.cta.link}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-[#ff6a1a]" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Implementation Notes */}
      <section className="relative z-10 bg-gray-50 dark:bg-gray-900/50 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              Implementation Details
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#ff6a1a] mb-4">
                    Sequence Setup
                  </h3>
                  <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Merge tag:</strong>{" "}
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {"{{first_name}}"}
                        </code>{" "}
                        with fallback &ldquo;there&rdquo;
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Sender:</strong> Tory R Zweigle
                        (toryzz@msn.com)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Reply-to:</strong> toryzz@msn.com
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Unsubscribe:</strong> Required per CAN-SPAM
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#ff6a1a] mb-4">
                    Testing & Optimization
                  </h3>
                  <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>A/B test:</strong> Subject lines on Email 1 &
                        Email 4 (highest impact)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Tracking:</strong> Open and click tracking on all
                        emails
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Goal:</strong> Drive consultations and fund
                        inquiries
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Conversion:</strong> Track CTA clicks per email
                        to optimize
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Summary Table */}
            <Card className="mt-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">
                          Email
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">
                          Day
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">
                          Theme
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">
                          Primary CTA
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {emails.map((email) => (
                        <tr
                          key={email.number}
                          className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="p-4">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ff6a1a]/10 text-[#ff6a1a] text-xs font-bold">
                              {email.number}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">
                            {email.dayLabel}
                          </td>
                          <td className="p-4 font-medium text-gray-900 dark:text-white">
                            {email.theme}
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">
                            {email.cta.text}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Back to Fund CTA */}
      <section className="relative z-10 py-16 px-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Ready to Set This Up?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Once approved, we can configure this sequence in any email platform
            — Mailchimp, ConvertKit, ActiveCampaign, or custom.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              asChild
              size="lg"
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
            >
              <Link href="/fund">
                View Fund Page
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]"
            >
              <Link href="/fund/presentation">View Presentation</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
