"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTier } from "@/lib/context/tier-context";
import { toast } from "sonner";
import { WelcomeModal } from "@/components/dashboard/WelcomeModal";
import { FredHero } from "@/components/dashboard/fred-hero";
import { GetStartedWithFred } from "@/components/dashboard/get-started-with-fred";
import { RedFlagsWidget } from "@/components/dashboard/red-flags-widget";
import { FounderSnapshotCard } from "@/components/dashboard/founder-snapshot-card";
import { DecisionBox } from "@/components/dashboard/decision-box";
import { FundingReadinessGauge } from "@/components/dashboard/funding-readiness-gauge";
import { WeeklyMomentum } from "@/components/dashboard/weekly-momentum";
import { CallFredModal } from "@/components/dashboard/call-fred-modal";
import { MomentumIndicator } from "@/components/dashboard/momentum-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MobileHome } from "@/components/mobile/mobile-home";
import { FadeIn } from "@/components/animations/FadeIn";
import { UserTier } from "@/lib/constants";
import type { CommandCenterData } from "@/lib/dashboard/command-center";
import type { MomentumIndicator as MomentumIndicatorType } from "@/lib/dashboard/engagement-score";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Founder");
  const { tier, refresh: refreshTier } = useTier();
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [momentumData, setMomentumData] = useState<MomentumIndicatorType | null>(null);
  const canCallFred = tier >= UserTier.PRO;

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

        // Fetch command center data and momentum in parallel with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const [ccRes, momentumRes] = await Promise.all([
            fetch("/api/dashboard/command-center", {
              signal: controller.signal,
            }),
            fetch("/api/dashboard/engagement", {
              signal: controller.signal,
            }),
          ]);
          if (ccRes.ok) {
            const json = await ccRes.json();
            if (json.success) {
              setData(json.data);
            }
          } else {
            console.warn("Command center API returned status:", ccRes.status);
          }
          if (momentumRes.ok) {
            const json = await momentumRes.json();
            if (json.success) {
              setMomentumData(json.data);
            }
          }
        } finally {
          clearTimeout(timeoutId);
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
      <div className="space-y-6 animate-in fade-in duration-500">
        <FredHero
          userName={userName}
          canCallFred={canCallFred}
          onCallFred={() => setShowCallModal(true)}
          onVoiceChat={() => window.dispatchEvent(new CustomEvent("fred:voice"))}
          hasHadConversations={false}
        />
        <GetStartedWithFred />
        <WelcomeModal
          isOpen={showWelcome}
          onClose={handleCloseWelcome}
          userName={userName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* FRED HERO — front and center, the reason you're here */}
      <FredHero
        userName={userName}
        canCallFred={canCallFred}
        onCallFred={() => setShowCallModal(true)}
        onVoiceChat={() => window.dispatchEvent(new CustomEvent("fred:voice"))}
        hasHadConversations={!!data.weeklyMomentum?.lastCheckinDate}
      />

      {/* Get Started checklist — only shows until core steps complete */}
      <FadeIn>
        <GetStartedWithFred />
      </FadeIn>

      {/* Everything below is the OUTPUT of your Fred conversations */}
      {/* Divider label */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        <span className="text-xs font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider whitespace-nowrap">
          From your conversations
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Founder Snapshot */}
      <FounderSnapshotCard snapshot={data.founderSnapshot} />

      {/* Red Flag Alerts */}
      <FadeIn delay={0.1}>
        <RedFlagsWidget />
      </FadeIn>

      {/* Decision Box + Funding Gauge */}
      <FadeIn delay={0.2}>
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
      </FadeIn>

      {/* Weekly Momentum */}
      <FadeIn delay={0.3}>
        <WeeklyMomentum momentum={data.weeklyMomentum} />
      </FadeIn>

      {/* Momentum Indicator (compact) */}
      {momentumData && (
        <MomentumIndicator
          trend={momentumData.trend}
          summary={momentumData.summary}
          compact
        />
      )}

      {/* Welcome Modal for new users */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        userName={userName}
      />

      {/* Call Fred Modal (Pro+ tier) */}
      {canCallFred && (
        <CallFredModal
          open={showCallModal}
          onOpenChange={setShowCallModal}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      {/* Mobile view */}
      <div className="md:hidden">
        <MobileHome />
      </div>

      {/* Desktop view */}
      <div className="hidden md:block">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
            </div>
          }
        >
          <DashboardContent />
        </Suspense>
      </div>
    </>
  );
}
