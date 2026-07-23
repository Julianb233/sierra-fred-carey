"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserTier } from "@/lib/context/tier-context";
import { usePaywall } from "@/lib/context/paywall-context";
import { UserTier, TIER_NAMES, canAccessFeature } from "@/lib/constants";
import {
  Loader2,
  Trophy,
  Rocket,
  Users,
  BarChart3,
  Target,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface PostRoadmapOption {
  id: string;
  title: string;
  description: string;
  icon: typeof Rocket;
  href: string;
  requiredTier: UserTier;
  features: string[];
}

const POST_COMPLETION_OPTIONS: PostRoadmapOption[] = [
  {
    id: "investor-targeting",
    title: "Launch Investor Outreach",
    description:
      "Find and connect with investors who match your stage, sector, and geography.",
    icon: Target,
    href: "/dashboard/investor-targeting",
    requiredTier: UserTier.STUDIO,
    features: [
      "AI-matched investor recommendations",
      "Outreach sequence automation",
      "Pipeline tracking",
    ],
  },
  {
    id: "virtual-team",
    title: "Activate Virtual Team",
    description:
      "Deploy AI agents to handle ops, fundraising, growth, and inbox management.",
    icon: Users,
    href: "/agents",
    requiredTier: UserTier.STUDIO,
    features: [
      "Founder Ops Agent",
      "Fundraise Ops Agent",
      "Growth Ops Agent",
      "Inbox Ops Agent",
    ],
  },
  {
    id: "pitch-deck-generate",
    title: "Generate Pitch Deck",
    description:
      "Create an investor-grade pitch deck from your profile and FRED's insights.",
    icon: Sparkles,
    href: "/dashboard/pitch-deck/generate",
    requiredTier: UserTier.PRO,
    features: [
      "11-slide investor deck",
      "Speaker notes per slide",
      "Readiness scoring",
    ],
  },
  {
    id: "analytics",
    title: "Deep Analytics",
    description:
      "Track your progress, engagement, and investor readiness trends over time.",
    icon: BarChart3,
    href: "/dashboard/analytics",
    requiredTier: UserTier.PRO,
    features: [
      "Readiness score trends",
      "Engagement tracking",
      "Milestone history",
    ],
  },
  {
    id: "coaching",
    title: "Advanced Coaching",
    description:
      "Continue working with FRED on fundraising strategy and execution.",
    icon: MessageSquare,
    href: "/chat",
    requiredTier: UserTier.FREE,
    features: [
      "Unlimited coaching sessions",
      "Decision framework analysis",
      "Strategic planning",
    ],
  },
  {
    id: "check-ins",
    title: "Weekly SMS Check-Ins",
    description:
      "Get weekly accountability check-ins via SMS to stay on track.",
    icon: TrendingUp,
    href: "/check-ins",
    requiredTier: UserTier.STUDIO,
    features: [
      "Personalized weekly prompts",
      "Progress tracking",
      "Accountability nudges",
    ],
  },
];

export default function RoadmapCompletePage() {
  const { tier, isLoading: isTierLoading } = useUserTier();
  const { triggerPaywall } = usePaywall();
  const [journeyStats, setJourneyStats] = useState<{
    completedStages: number;
    totalStages: number;
    investorReadinessScore: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/journey-stats");
        if (res.ok) {
          const data = await res.json();
          setJourneyStats(data);
        }
      } catch {
        // Stats are supplementary, don't block render
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (isTierLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero celebration */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#ff6a1a]/5 via-orange-50/30 to-white dark:from-[#ff6a1a]/10 dark:via-gray-900 dark:to-gray-950 py-16 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-[#ff6a1a]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[200px] bg-orange-400/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#ff6a1a] to-orange-400 flex items-center justify-center shadow-2xl shadow-[#ff6a1a]/30"
          >
            <Trophy className="h-10 w-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3"
          >
            You&apos;ve Completed the Roadmap
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-gray-600 dark:text-gray-400 mb-6"
          >
            Outstanding work. You&apos;ve built a solid foundation. Here&apos;s
            what comes next.
          </motion.p>

          {/* Stats row */}
          {journeyStats && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-6 flex-wrap"
            >
              <div className="text-center">
                <p className="text-2xl font-bold text-[#ff6a1a]">
                  {journeyStats.completedStages}/{journeyStats.totalStages}
                </p>
                <p className="text-xs text-gray-500">Stages Complete</p>
              </div>
              {journeyStats.investorReadinessScore !== null && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#ff6a1a]">
                    {journeyStats.investorReadinessScore}/100
                  </p>
                  <p className="text-xs text-gray-500">Investor Readiness</p>
                </div>
              )}
              <div className="text-center">
                <Badge className="bg-[#ff6a1a] text-white">
                  {TIER_NAMES[tier]}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">Current Plan</p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Options grid */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What&apos;s Next?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Choose your path forward. Upgrade to unlock advanced tools.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {POST_COMPLETION_OPTIONS.map((option, index) => {
            const hasAccess = canAccessFeature(tier, option.requiredTier);
            const Icon = option.icon;

            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card
                  className={`h-full transition-all duration-300 hover:shadow-lg ${
                    hasAccess
                      ? "hover:border-[#ff6a1a]/30"
                      : "opacity-90 hover:opacity-100"
                  }`}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`p-3 rounded-xl ${
                          hasAccess
                            ? "bg-[#ff6a1a]/10"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            hasAccess ? "text-[#ff6a1a]" : "text-gray-400"
                          }`}
                        />
                      </div>
                      {!hasAccess && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-gray-100 dark:bg-gray-800"
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          {TIER_NAMES[option.requiredTier]}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {option.description}
                    </p>

                    <ul className="space-y-1.5 mb-6 flex-grow">
                      {option.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 shrink-0 ${
                              hasAccess
                                ? "text-[#ff6a1a]"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {hasAccess ? (
                      <Link href={option.href}>
                        <Button className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
                          Get Started
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() =>
                          triggerPaywall({
                            trigger: "feature-click",
                            featureName: option.title,
                            requiredTier: option.requiredTier,
                            currentTier: tier,
                          })
                        }
                      >
                        <Rocket className="h-4 w-4 mr-1" />
                        Upgrade to {TIER_NAMES[option.requiredTier]}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Upgrade CTA section */}
      {tier < UserTier.STUDIO && (
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <Card className="overflow-hidden border-[#ff6a1a]/20">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-[#ff6a1a] to-orange-400 p-8 text-center text-white">
                <Rocket className="h-8 w-8 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">
                  Unlock Everything with Studio
                </h3>
                <p className="text-white/80 mb-6 max-w-md mx-auto">
                  Get virtual team agents, investor matching, weekly check-ins,
                  and all Pro features included.
                </p>
                <Button
                  size="lg"
                  className="bg-white text-[#ff6a1a] hover:bg-white/90 shadow-lg"
                  onClick={() =>
                    triggerPaywall({
                      trigger: "feature-click",
                      featureName: "Studio Plan",
                      requiredTier: UserTier.STUDIO,
                      currentTier: tier,
                    })
                  }
                >
                  Upgrade to Studio - $249/mo
                </Button>
                <p className="text-xs text-white/60 mt-3">
                  14-day free trial. Cancel anytime.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
