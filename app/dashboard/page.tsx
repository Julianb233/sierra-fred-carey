"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTier } from "@/lib/context/tier-context";
import { toast } from "sonner";
import { WelcomeModal } from "@/components/dashboard/WelcomeModal";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { RedFlagsWidget } from "@/components/dashboard/red-flags-widget";
import { FounderSnapshotCard } from "@/components/dashboard/founder-snapshot-card";
import { DecisionBox } from "@/components/dashboard/decision-box";
import { FundingReadinessGauge } from "@/components/dashboard/funding-readiness-gauge";
import { WeeklyMomentum } from "@/components/dashboard/weekly-momentum";
import { Skeleton } from "@/components/ui/skeleton";
import type { CommandCenterData } from "@/lib/dashboard/command-center";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Founder");
  const { refresh: refreshTier } = useTier();
  const [data, setData] = useState<CommandCenterData | null>(null);

  // Fetch command center data
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push("/login");
          return;
        }

        // Fetch profile name
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", authUser.id)
          .single();

        setUserName(
          profile?.name || authUser.email?.split("@")[0] || "Founder"
        );

        // Fetch command center data
        const res = await fetch("/api/dashboard/command-center");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setData(json.data);
          }
        }
      } catch (e) {
        console.error("Failed to fetch dashboard data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

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

  // Handle post-Stripe checkout success redirect
  useEffect(() => {
    const isSuccess = searchParams.get("success") === "true";
    if (isSuccess) {
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        await refreshTier();
        if (attempts >= 5) {
          clearInterval(pollInterval);
        }
      }, 2000);

      toast.success("Payment successful! Your plan has been upgraded.");
      router.replace("/dashboard", { scroll: false });

      return () => clearInterval(pollInterval);
    }
  }, [searchParams, router, refreshTier]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-1">
          Welcome back, {userName}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Your Founder Command Center
        </p>
      </div>

      {/* Onboarding Checklist (dismissible) */}
      <OnboardingChecklist />

      {/* Top: Founder Snapshot Card */}
      <FounderSnapshotCard snapshot={data.founderSnapshot} />

      {/* Red Flag Alerts */}
      <RedFlagsWidget />

      {/* Center: Decision Box (left) + Funding Gauge (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DecisionBox
          currentStep={data.currentStep}
          processProgress={data.processProgress}
        />
        <FundingReadinessGauge
          readiness={data.fundingReadiness}
          displayRules={data.displayRules}
        />
      </div>

      {/* Bottom: Weekly Momentum */}
      <WeeklyMomentum momentum={data.weeklyMomentum} />

      {/* Welcome Modal for new users */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        userName={userName}
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
