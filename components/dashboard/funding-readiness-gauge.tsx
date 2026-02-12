"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock } from "lucide-react";
import type { FundingReadinessData, DisplayRules } from "@/lib/dashboard/command-center";

// ============================================================================
// Constants
// ============================================================================

const ZONE_CONFIG = {
  red: {
    label: "Build",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    barColor: "bg-red-500",
    description: "Focus on building and validating your core proposition before fundraising.",
  },
  yellow: {
    label: "Prove",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    barColor: "bg-amber-500",
    description: "You have traction signals. Strengthen proof points to be raise-ready.",
  },
  green: {
    label: "Raise",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    barColor: "bg-green-500",
    description: "Your fundamentals support fundraising. Time to prepare for investor conversations.",
  },
} as const;

// ============================================================================
// Component
// ============================================================================

interface FundingReadinessGaugeProps {
  readiness: FundingReadinessData;
  displayRules: DisplayRules;
}

export function FundingReadinessGauge({
  readiness,
  displayRules,
}: FundingReadinessGaugeProps) {
  // Don't render at all if display rules say to hide
  if (!displayRules.showFundingGauge) {
    return null;
  }

  const config = ZONE_CONFIG[readiness.zone];

  // Blurred state: intake not completed
  if (displayRules.blurReadiness) {
    return (
      <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-950/60 backdrop-blur-md z-10 flex items-center justify-center">
          <div className="text-center p-6 max-w-xs">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Lock className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Funding Readiness Locked
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Complete an investor readiness review to unlock your gauge.
            </p>
            <Link href="/dashboard/investor-readiness">
              <Button
                size="sm"
                variant="outline"
                className="text-[#ff6a1a] border-[#ff6a1a]/30 hover:bg-[#ff6a1a]/5"
              >
                Run Readiness Review
              </Button>
            </Link>
          </div>
        </div>
        {/* Placeholder content behind the blur */}
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Funding Readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Funding Readiness</CardTitle>
          <span
            className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${config.bg} ${config.color}`}
          >
            {config.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zone gauge */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-red-500">Build</span>
            <span className="text-amber-500">Prove</span>
            <span className="text-green-500">Raise</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
            <div
              className={`h-full transition-all duration-700 ease-out ${config.barColor}`}
              style={{
                width:
                  readiness.zone === "red"
                    ? "33%"
                    : readiness.zone === "yellow"
                    ? "66%"
                    : "100%",
              }}
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {config.description}
        </p>

        {/* Top blockers */}
        {readiness.topBlockers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Top Blockers
            </p>
            <div className="space-y-1.5">
              {readiness.topBlockers.map((blocker, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>{blocker}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Link href="/dashboard/investor-readiness" className="block">
          <Button
            variant="outline"
            className="w-full border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/5"
          >
            Run Readiness Review
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
