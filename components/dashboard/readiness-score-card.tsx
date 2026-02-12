"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReadinessZone } from "@/lib/dashboard/command-center";
import type { IRSCategory } from "@/lib/fred/irs/types";

// ============================================================================
// Types
// ============================================================================

export interface CategoryBreakdownItem {
  category: IRSCategory;
  label: string;
  score: number;
  benchmark: number;
}

interface ReadinessScoreCardProps {
  score: number | null;
  zone: ReadinessZone;
  zoneLabel: string;
  categories: CategoryBreakdownItem[];
  onReassess: () => void;
  reassessing: boolean;
}

// ============================================================================
// Zone Config
// ============================================================================

const ZONE_CONFIG: Record<
  ReadinessZone,
  { color: string; bg: string; barColor: string; description: string }
> = {
  red: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    barColor: "bg-red-500",
    description: "Focus on building and validating your foundation before fundraising.",
  },
  yellow: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    barColor: "bg-amber-500",
    description: "You have traction signals. Strengthen proof points to be raise-ready.",
  },
  green: {
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    barColor: "bg-green-500",
    description: "Your fundamentals support fundraising. Prepare for investor conversations.",
  },
};

// ============================================================================
// Component
// ============================================================================

export function ReadinessScoreCard({
  score,
  zone,
  zoneLabel,
  categories,
  onReassess,
  reassessing,
}: ReadinessScoreCardProps) {
  const config = ZONE_CONFIG[zone];

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Investor Readiness</CardTitle>
          <Badge className={cn("text-xs", config.bg, config.color)}>
            {zoneLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score display */}
        {score !== null ? (
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex items-center justify-center w-20 h-20 rounded-2xl text-3xl font-bold",
                score >= 70
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : score >= 50
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              )}
            >
              {score}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No score calculated yet. Run a readiness review to get your score.
          </p>
        )}

        {/* Zone gauge */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-red-500">Build</span>
            <span className="text-amber-500">Prove</span>
            <span className="text-green-500">Raise</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
            <div
              className={cn(
                "h-full transition-all duration-700 ease-out rounded-full",
                config.barColor
              )}
              style={{
                width:
                  zone === "red"
                    ? "33%"
                    : zone === "yellow"
                    ? "66%"
                    : "100%",
              }}
            />
          </div>
        </div>

        {/* Category breakdown bars */}
        {categories.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Category Breakdown
            </p>
            {categories.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {cat.label}
                  </span>
                  <span className="text-gray-500">
                    {cat.score}/100
                    <span className="text-gray-400 ml-1">
                      (benchmark: {cat.benchmark})
                    </span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      cat.score >= cat.benchmark
                        ? "bg-green-500"
                        : cat.score >= cat.benchmark * 0.8
                        ? "bg-amber-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${Math.min(cat.score, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reassess button */}
        <Button
          variant="outline"
          onClick={onReassess}
          disabled={reassessing}
          className="w-full border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/5"
        >
          {reassessing ? "Reassessing..." : "Reassess Readiness"}
        </Button>
      </CardContent>
    </Card>
  );
}
