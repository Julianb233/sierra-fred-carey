"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  MessageSquare,
  Loader2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type {
  CommandCenterData,
  ReadinessZone,
  DisplayRules,
} from "@/lib/dashboard/command-center";

// ============================================================================
// Zone Config (simplified for horizontal bar)
// ============================================================================

const ZONE_BAR_CONFIG: Record<
  ReadinessZone,
  { label: string; color: string; barColor: string; width: string }
> = {
  red: {
    label: "Build",
    color: "text-red-600 dark:text-red-400",
    barColor: "bg-red-500",
    width: "33%",
  },
  yellow: {
    label: "Prove",
    color: "text-amber-600 dark:text-amber-400",
    barColor: "bg-amber-500",
    width: "66%",
  },
  green: {
    label: "Raise",
    color: "text-green-600 dark:text-green-400",
    barColor: "bg-green-500",
    width: "100%",
  },
};

// ============================================================================
// Component
// ============================================================================

export function MobileHome() {
  const router = useRouter();
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [nextSteps, setNextSteps] = useState<
    Array<{ id: string; description: string; priority: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Founder");

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

        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", authUser.id)
          .single();

        setUserName(
          profile?.name || authUser.email?.split("@")[0] || "Founder"
        );

        // Fetch command center data and next steps in parallel
        const [ccRes, nsRes] = await Promise.all([
          fetch("/api/dashboard/command-center"),
          fetch("/api/dashboard/next-steps"),
        ]);

        if (ccRes.ok) {
          const json = await ccRes.json();
          if (json.success) setData(json.data);
        }

        if (nsRes.ok) {
          const json = await nsRes.json();
          if (json.success) {
            // Flatten and take top 3 active steps
            const all = [
              ...(json.data.critical || []),
              ...(json.data.important || []),
              ...(json.data.optional || []),
            ]
              .filter((s: { completed: boolean }) => !s.completed)
              .slice(0, 3);
            setNextSteps(all);
          }
        }
      } catch (e) {
        console.error("Failed to fetch mobile home data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-4 px-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Hey, {userName}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Here is what matters today.
        </p>
      </div>

      {/* Today's Focus -- most important decision */}
      <TodaysFocus
        stepName={data.currentStep.name}
        objective={data.currentStep.objective}
        blockers={data.currentStep.blockers}
      />

      {/* Start Check-In CTA */}
      <Link href="/dashboard/sms" className="block">
        <Button className="w-full h-12 bg-[#ff6a1a] hover:bg-[#ea580c] text-white text-base font-semibold">
          Start Check-In
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>

      {/* Active Next Steps (top 3) */}
      {nextSteps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Active Next Steps
            </h2>
            <Link
              href="/dashboard/next-steps"
              className="text-xs text-[#ff6a1a] font-medium"
            >
              View all
            </Link>
          </div>
          {nextSteps.map((step) => (
            <CompactNextStep
              key={step.id}
              description={step.description}
              priority={step.priority}
            />
          ))}
        </div>
      )}

      {/* Simplified Funding Gauge */}
      <SimplifiedFundingGauge
        readiness={data.fundingReadiness}
        displayRules={data.displayRules}
      />
    </div>
  );
}

// ============================================================================
// Today's Focus
// ============================================================================

function TodaysFocus({
  stepName,
  objective,
  blockers,
}: {
  stepName: string;
  objective: string;
  blockers: string[];
}) {
  return (
    <Card className="border-[#ff6a1a]/20 bg-gradient-to-br from-[#ff6a1a]/5 to-transparent dark:from-[#ff6a1a]/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#ff6a1a]/10 text-[#ff6a1a] text-xs">
            Today&apos;s Focus
          </Badge>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug">
          {stepName}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
          {objective}
        </p>
        {blockers.length > 0 && (
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-red-600 dark:text-red-400 line-clamp-1">
              {blockers[0]}
            </span>
          </div>
        )}
        <Link href="/chat" className="block">
          <Button
            size="sm"
            className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white min-h-[44px]"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Work on this with Fred
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Compact Next Step Card
// ============================================================================

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  important: "bg-amber-500",
  optional: "bg-blue-500",
};

function CompactNextStep({
  description,
  priority,
}: {
  description: string;
  priority: string;
}) {
  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardContent className="p-3 flex items-start gap-3">
        <div
          className={cn(
            "h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
            PRIORITY_DOT[priority] || "bg-gray-400"
          )}
        />
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Simplified Funding Gauge (horizontal bar)
// ============================================================================

function SimplifiedFundingGauge({
  readiness,
  displayRules,
}: {
  readiness: CommandCenterData["fundingReadiness"];
  displayRules: DisplayRules;
}) {
  // Dynamic display rules: hide for early stage
  if (!displayRules.showFundingGauge) {
    return null;
  }

  const config = ZONE_BAR_CONFIG[readiness.zone];

  // Blurred state
  if (displayRules.blurReadiness) {
    return (
      <Card className="border-gray-200 dark:border-gray-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-950/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center px-4">
            <Lock className="h-5 w-5 text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">
              Complete a readiness review to unlock
            </p>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Funding Readiness
          </span>
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              readiness.zone === "red"
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : readiness.zone === "yellow"
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            )}
          >
            {config.label}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              config.barColor
            )}
            style={{ width: config.width }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Build</span>
          <span>Prove</span>
          <span>Raise</span>
        </div>
      </CardContent>
    </Card>
  );
}
