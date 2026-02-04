"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import {
  PersonIcon,
  ArrowRightIcon,
  RocketIcon,
  CheckCircledIcon,
  StarFilledIcon,
  EnvelopeClosedIcon,
  LinkedInLogoIcon,
} from "@radix-ui/react-icons";

const mockInvestors = [
  {
    name: "Sarah Chen",
    firm: "Gradient Ventures",
    role: "Partner",
    match: 94,
    focus: ["AI/ML", "SaaS", "Developer Tools"],
    checkSize: "$500K - $2M",
    stage: "Seed",
    recentInvestments: ["Jasper", "Runway", "Hugging Face"],
    introPath: "Warm intro via John Smith (2nd connection)",
  },
  {
    name: "Michael Rodriguez",
    firm: "Founders Fund",
    role: "Principal",
    match: 87,
    focus: ["Deep Tech", "Enterprise", "AI"],
    checkSize: "$1M - $5M",
    stage: "Seed - Series A",
    recentInvestments: ["Anduril", "Figma", "Notion"],
    introPath: "Cold outreach (high response rate)",
  },
  {
    name: "Emily Watson",
    firm: "First Round Capital",
    role: "Partner",
    match: 82,
    focus: ["SaaS", "Marketplaces", "Fintech"],
    checkSize: "$500K - $3M",
    stage: "Pre-Seed - Seed",
    recentInvestments: ["Notion", "Ramp", "Vanta"],
    introPath: "Warm intro via Jane Doe (1st connection)",
  },
  {
    name: "David Kim",
    firm: "Andreessen Horowitz",
    role: "Deal Partner",
    match: 78,
    focus: ["Consumer", "AI", "Crypto"],
    checkSize: "$2M - $10M",
    stage: "Seed - Series A",
    recentInvestments: ["OpenAI", "Coinbase", "Clubhouse"],
    introPath: "Apply via a]crypto scout program",
  },
];

const outreachStats = [
  { label: "Investors Matched", value: "47" },
  { label: "Warm Intros Available", value: "12" },
  { label: "Avg. Response Rate", value: "34%" },
  { label: "Meetings Scheduled", value: "8" },
];

export default function BoardyDemo() {
  const [activeTab, setActiveTab] = useState<"match" | "outreach">("match");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
            Studio Feature
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
            Boardy Integration
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            AI-powered investor matching with warm intro discovery and automated
            outreach sequencing to the right funds for your stage and sector.
          </p>
        </motion.div>

        {/* Tab Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("match")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "match"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Investor Matching
            </button>
            <button
              onClick={() => setActiveTab("outreach")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "outreach"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Outreach Sequences
            </button>
          </div>
        </div>

        {activeTab === "match" ? (
          /* Investor Matching Tab */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {outreachStats.map((stat, index) => (
                <Card
                  key={stat.label}
                  className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-3xl font-bold text-orange-500"
                  >
                    {stat.value}
                  </motion.div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                </Card>
              ))}
            </div>

            {/* Investor Cards */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Top Matches for Your Startup
              </h2>
              {mockInvestors.map((investor, index) => (
                <motion.div
                  key={investor.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-orange-500/50 transition-all">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      {/* Avatar & Basic Info */}
                      <div className="flex items-center gap-4 md:w-64">
                        <Avatar className="h-14 w-14 border-2 border-orange-500/30">
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold">
                            {investor.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {investor.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {investor.role} @ {investor.firm}
                          </p>
                        </div>
                      </div>

                      {/* Match Score */}
                      <div className="md:w-24 flex items-center gap-2">
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
                          <StarFilledIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-bold text-green-700 dark:text-green-400">
                            {investor.match}%
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {investor.focus.map((f) => (
                            <Badge
                              key={f}
                              variant="outline"
                              className="border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                            >
                              {f}
                            </Badge>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-500">
                              Check Size:
                            </span>{" "}
                            <span className="text-gray-900 dark:text-white">
                              {investor.checkSize}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-500">Stage:</span>{" "}
                            <span className="text-gray-900 dark:text-white">
                              {investor.stage}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                          <PersonIcon className="w-4 h-4" />
                          {investor.introPath}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 md:flex-col">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-300 dark:border-gray-600"
                        >
                          <EnvelopeClosedIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-300 dark:border-gray-600"
                        >
                          <LinkedInLogoIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Outreach Tab */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-8 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Automated Outreach Sequence
              </h2>
              <div className="space-y-4">
                {[
                  { day: 1, type: "Email", status: "sent", subject: "Quick intro - AI startup in your focus area" },
                  { day: 3, type: "LinkedIn", status: "sent", subject: "Connection request with personalized note" },
                  { day: 5, type: "Email", status: "scheduled", subject: "Follow-up with traction update" },
                  { day: 8, type: "Email", status: "pending", subject: "Case study from similar portfolio company" },
                  { day: 12, type: "LinkedIn", status: "pending", subject: "Engage with their recent post" },
                ].map((step, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-12 text-center">
                      <span className="text-sm text-gray-500 dark:text-gray-500">
                        Day {step.day}
                      </span>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        step.status === "sent"
                          ? "bg-green-500"
                          : step.status === "scheduled"
                          ? "bg-amber-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {step.type}
                        </Badge>
                        <span className="text-gray-900 dark:text-white">{step.subject}</span>
                      </div>
                    </div>
                    <Badge
                      className={
                        step.status === "sent"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : step.status === "scheduled"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }
                    >
                      {step.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Features Included
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  "AI-personalized email copy",
                  "Optimal send time detection",
                  "Response tracking & alerts",
                  "Auto follow-up scheduling",
                  "Multi-channel sequences",
                  "A/B testing templates",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircledIcon className="w-4 h-4 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="mt-12 p-8 bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Ready to Meet Your Perfect Investors?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
                Get access to our full investor database, warm intro network, and
                automated outreach tools with a Studio subscription.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90">
                  <Link href="/get-started">
                    Start Free Trial
                    <RocketIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-gray-300 dark:border-gray-700">
                  <Link href="/pricing">
                    View Pricing
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
