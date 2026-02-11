"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RocketIcon,
  OpenInNewWindowIcon,
  PersonIcon,
  FileTextIcon,
  CheckCircledIcon,
  ArrowRightIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { WelcomeModal } from "@/components/dashboard/WelcomeModal";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useTier } from "@/lib/context/tier-context";
import { toast } from "sonner";
import { redirectToCheckoutByTier } from "@/lib/stripe/client";
import { RedFlagsWidget } from "@/components/dashboard/red-flags-widget";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string | null; email: string; tier: number } | null>(null);
  const { tier: contextTier, refresh: refreshTier, isLoading: tierLoading } = useTier();
  const [dashboardStats, setDashboardStats] = useState<{
    ideasAnalyzed: number;
    pitchDecksReviewed: number;
    checkInsCompleted: number;
    activeAgents: number;
    recentActivity: Array<{ action: string; item: string; time: string; score: number | null }>;
  } | null>(null);

  // Fetch real dashboard stats from API
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setDashboardStats(json.data);
          }
        }
      } catch (e) {
        console.error("Failed to fetch dashboard stats:", e);
      }
    }
    fetchStats();
  }, []);

  // Check for welcome parameter on mount
  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      setShowWelcome(true);
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("sahara_welcome_completed", "true");
  };

  useEffect(() => {
    async function getUserData() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push("/login");
          return;
        }

        // Fetch profile for name (tier comes from TierProvider context)
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", authUser.id)
          .single();

        setUser({
          name: profile?.name || authUser.email?.split("@")[0] || "Founder",
          email: authUser.email || "",
          tier: contextTier,
        });
      } catch (e) {
        console.error("Error fetching user", e);
      } finally {
        setLoading(false);
      }
    }
    getUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- contextTier synced by separate effect; re-fetching user on tier change is wasteful
  }, [router]);

  // Keep user.tier in sync with contextTier when it changes
  useEffect(() => {
    setUser(prev => prev ? { ...prev, tier: contextTier } : prev);
  }, [contextTier]);

  // Handle post-Stripe checkout success redirect
  useEffect(() => {
    const isSuccess = searchParams.get("success") === "true";
    if (isSuccess) {
      // Poll for tier update (webhook may not have processed yet)
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        await refreshTier();
        if (attempts >= 5) {
          clearInterval(pollInterval);
        }
      }, 2000);

      toast.success("Payment successful! Your plan has been upgraded.");
      // Clean up URL
      router.replace("/dashboard", { scroll: false });

      return () => clearInterval(pollInterval);
    }
  }, [searchParams, router, refreshTier]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  if (!user) return null; // Should have redirected

  // Dashboard stats from API (fallback to 0 while loading)
  const stats = [
    {
      label: "Ideas Analyzed",
      value: String(dashboardStats?.ideasAnalyzed ?? 0),
      icon: <OpenInNewWindowIcon className="h-5 w-5" />,
      color: "text-[#ff6a1a]",
    },
    {
      label: "Pitch Decks Reviewed",
      value: user.tier >= 1 ? String(dashboardStats?.pitchDecksReviewed ?? 0) : "0",
      icon: <FileTextIcon className="h-5 w-5" />,
      color: "text-amber-500",
      locked: user.tier < 1,
    },
    {
      label: "Check-ins Completed",
      value: user.tier >= 1 ? String(dashboardStats?.checkInsCompleted ?? 0) : "0",
      icon: <CheckCircledIcon className="h-5 w-5" />,
      color: "text-green-500",
      locked: user.tier < 1,
    },
    {
      label: "Active Agents",
      value: user.tier >= 2 ? String(dashboardStats?.activeAgents ?? 0) : "0",
      icon: <RocketIcon className="h-5 w-5" />,
      color: "text-purple-500",
      locked: user.tier < 2,
    },
  ];

  const quickActions = [
    {
      title: "Analyze New Idea",
      description: "Run your startup idea through the Reality Lens",
      icon: <OpenInNewWindowIcon className="h-6 w-6" />,
      href: "/dashboard/reality-lens",
      gradient: "from-[#ff6a1a] to-orange-400",
      tier: 0,
    },
    {
      title: "Check Investor Readiness",
      description: "Get your current fundraising score",
      icon: <PersonIcon className="h-6 w-6" />,
      href: "/dashboard/investor-readiness",
      gradient: "from-amber-500 to-[#ff6a1a]",
      tier: 1,
    },
    {
      title: "Review Pitch Deck",
      description: "Upload your deck for AI analysis",
      icon: <FileTextIcon className="h-6 w-6" />,
      href: "/dashboard/pitch-deck",
      gradient: "from-orange-500 to-red-500",
      tier: 1,
    },
    {
      title: "Activate AI Agent",
      description: "Deploy your virtual team members",
      icon: <RocketIcon className="h-6 w-6" />,
      href: "/dashboard/agents",
      gradient: "from-purple-500 to-[#ff6a1a]",
      tier: 2,
    },
  ];

  const recentActivity = dashboardStats?.recentActivity ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="relative">
        <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-2">
          Welcome back, {user.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here&apos;s what&apos;s happening with your startup today.
        </p>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6 relative overflow-hidden border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent pointer-events-none" />

            {stat.locked && (
              <div className="absolute top-2 right-2 z-10">
                <LockClosedIcon className="h-4 w-4 text-gray-400" />
              </div>
            )}
            <div className="flex items-center justify-between mb-2 relative z-10">
              <div className={`${stat.color} p-2 rounded-full bg-gray-100 dark:bg-white/10`}>{stat.icon}</div>
            </div>
            <div className="space-y-1 relative z-10">
              <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {stat.value}
              </p>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
            {stat.locked && (
              <div className="mt-3 relative z-10">
                <Link href="/pricing" className="inline-flex items-center gap-1 text-xs font-medium text-[#ff6a1a] hover:text-[#ea580c] transition-colors">
                  <LockClosedIcon className="h-3 w-3" />
                  Upgrade to {user.tier === 0 ? "Pro" : "Studio"}
                </Link>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Red Flag Alerts */}
      <RedFlagsWidget />

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const isLocked = user.tier < action.tier;
            return (
              <Card
                key={index}
                className="group relative overflow-hidden border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm p-6 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                {isLocked && (
                  <div className="absolute inset-0 bg-gray-900/10 dark:bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                    <div className="text-center bg-white dark:bg-gray-900 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800">
                      <LockClosedIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                      <Badge variant="secondary">
                        {action.tier === 1 ? "Pro" : "Studio"} Feature
                      </Badge>
                    </div>
                  </div>
                )}
                <Link href={isLocked ? "#" : action.href} className="relative z-10">
                  <div className="flex items-start gap-5">
                    <div
                      className={`p-3.5 rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg shadow-orange-500/20`}
                    >
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 group-hover:text-[#ff6a1a] transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {action.description}
                      </p>
                      <div className="mt-4 flex items-center text-[#ff6a1a] text-sm font-bold opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        Get started
                        <ArrowRightIcon className="ml-1 h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Recent Activity
        </h2>
        <Card className="divide-y divide-gray-100 dark:divide-gray-800 border-none shadow-lg bg-white/80 dark:bg-gray-900/50 backdrop-blur-md overflow-hidden">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">No recent activity yet. Start by analyzing an idea!</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} className="p-5 hover:bg-orange-50/50 dark:hover:bg-white/5 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-[#ff6a1a]" />
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-semibold">{activity.action}</span>{" "}
                        <span className="text-gray-600 dark:text-gray-400">
                          {activity.item}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                  {typeof activity.score === 'number' && activity.score > 0 && (
                    <div className="ml-4 text-right">
                      <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-[#ff6a1a] font-bold text-sm">
                        {activity.score}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Upgrade CTA for Free Users */}
      {user.tier === 0 && (
        <Card className="p-8 bg-gradient-to-br from-[#ff6a1a] to-[#ea580c] border-none text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-3xl flex flex-col md:flex-row items-center gap-8 justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                Ready to raise capital?
              </h3>
              <p className="text-orange-100 text-lg">
                Upgrade to Pro for investor readiness scoring, pitch deck reviews, and more.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
              <Button
                size="lg"
                className="bg-white text-[#ff6a1a] hover:bg-gray-100 border-none shadow-lg font-bold"
                onClick={async () => {
                  try {
                    await redirectToCheckoutByTier("pro");
                  } catch (e: any) {
                    toast.error(e.message || "Failed to start upgrade");
                  }
                }}
              >
                <RocketIcon className="mr-2 h-4 w-4" />
                Upgrade Now
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Welcome Modal for new users */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        userName={user.name!}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
