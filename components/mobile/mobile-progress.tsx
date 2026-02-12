"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  Calendar,
  BarChart3,
  Target,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeeklyMomentumData } from "@/lib/dashboard/command-center";

// ============================================================================
// Types (mirrors readiness API response)
// ============================================================================

type Zone = "red" | "yellow" | "green";

interface ReadinessResponse {
  investorReadiness: {
    score: number | null;
    zone: Zone | null;
    categories: { name: string; score: number; benchmark: number }[];
    strengths: string[];
    weaknesses: string[];
    trend: { score: number; date: string }[];
  } | null;
  positioningReadiness: {
    grade: string | null;
    narrativeTightness: number | null;
    categories: { name: string; grade: string; score: number }[];
    gaps: string[];
    nextActions: string[];
  } | null;
  hasIRS: boolean;
  hasPositioning: boolean;
}

// ============================================================================
// Zone Config
// ============================================================================

const ZONE_CONFIG: Record<
  Zone,
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

const GRADE_COLORS: Record<string, { color: string; bg: string }> = {
  A: {
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  B: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  C: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  D: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  F: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
};

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

// ============================================================================
// Component
// ============================================================================

export function MobileProgress() {
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [momentum, setMomentum] = useState<WeeklyMomentumData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [readinessRes, ccRes] = await Promise.all([
          fetch("/api/dashboard/readiness"),
          fetch("/api/dashboard/command-center"),
        ]);

        if (readinessRes.ok) {
          const json = await readinessRes.json();
          if (json.success) setReadiness(json.data);
        }

        if (ccRes.ok) {
          const json = await ccRes.json();
          if (json.success) setMomentum(json.data.weeklyMomentum);
        }
      } catch (e) {
        console.error("Failed to fetch progress data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 px-1">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const ir = readiness?.investorReadiness;
  const pr = readiness?.positioningReadiness;
  const zone: Zone = ir?.zone || "red";
  const zoneConfig = ZONE_CONFIG[zone];
  const grade = pr?.grade || null;
  const gradeConfig = grade ? GRADE_COLORS[grade] : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        Progress
      </h1>

      {/* Funding Readiness Bar */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#ff6a1a]" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Funding Readiness
            </span>
            {readiness?.hasIRS && (
              <Badge
                className={cn(
                  "ml-auto text-xs",
                  zone === "red"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    : zone === "yellow"
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                )}
              >
                {zoneConfig.label}
              </Badge>
            )}
          </div>

          {readiness?.hasIRS ? (
            <>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    zoneConfig.barColor
                  )}
                  style={{ width: zoneConfig.width }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Build</span>
                <span>Prove</span>
                <span>Raise</span>
              </div>
              {ir?.score !== null && ir?.score !== undefined && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Score: {ir.score}/100
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No assessment yet
              </p>
              <Link href="/dashboard/readiness">
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-[#ff6a1a] border-[#ff6a1a]/30 min-h-[44px]"
                >
                  Run Assessment
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Positioning Grade Badge */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Target className="h-4 w-4 text-[#ff6a1a]" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1">
              Positioning Grade
            </span>
            {grade && gradeConfig ? (
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold",
                  gradeConfig.bg,
                  gradeConfig.color
                )}
              >
                {grade}
              </div>
            ) : (
              <span className="text-xs text-gray-400">Not assessed</span>
            )}
          </div>
          {pr?.narrativeTightness !== null &&
            pr?.narrativeTightness !== undefined && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Narrative Tightness</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {pr.narrativeTightness}/10
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      pr.narrativeTightness >= 7
                        ? "bg-green-500"
                        : pr.narrativeTightness >= 5
                        ? "bg-amber-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${pr.narrativeTightness * 10}%` }}
                  />
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Momentum Streak */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Flame className="h-4 w-4 text-[#ff6a1a]" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1">
              Momentum Streak
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-[#ff6a1a]">
                {momentum?.streak ?? 0}
              </span>
              <span className="text-xs text-gray-400">
                week{(momentum?.streak ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Last check-in */}
          {momentum?.lastCheckinDate && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3 w-3" />
                <span>
                  Last check-in:{" "}
                  {formatRelativeDate(momentum.lastCheckinDate)}
                </span>
              </div>
              {momentum.lastCheckinSummary && (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                  {momentum.lastCheckinSummary}
                </p>
              )}
            </div>
          )}

          {!momentum?.lastCheckinDate && (
            <p className="text-xs text-gray-400">No check-ins yet</p>
          )}
        </CardContent>
      </Card>

      {/* View Full Readiness CTA */}
      <Link href="/dashboard/readiness" className="block">
        <Button
          variant="outline"
          className="w-full border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/5 min-h-[44px]"
        >
          View Full Readiness
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
