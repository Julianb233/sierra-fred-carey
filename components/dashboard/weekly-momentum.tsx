"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Calendar } from "lucide-react";
import type { WeeklyMomentumData } from "@/lib/dashboard/command-center";

// ============================================================================
// Component
// ============================================================================

interface WeeklyMomentumProps {
  momentum: WeeklyMomentumData;
}

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

export function WeeklyMomentum({ momentum }: WeeklyMomentumProps) {
  const hasCheckins = momentum.totalCheckins > 0;

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Weekly Momentum</CardTitle>
          {momentum.streak > 0 && (
            <Badge
              variant="secondary"
              className="bg-orange-100 dark:bg-orange-900/30 text-[#ff6a1a] gap-1"
            >
              <Flame className="h-3 w-3" />
              {momentum.streak} week{momentum.streak !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCheckins ? (
          <>
            {/* Last check-in */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Last check-in:{" "}
                  {momentum.lastCheckinDate
                    ? formatRelativeDate(momentum.lastCheckinDate)
                    : "N/A"}
                </span>
              </div>
              {momentum.lastCheckinSummary && (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                  {momentum.lastCheckinSummary}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>{momentum.totalCheckins} total check-ins</span>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              No check-ins yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Weekly check-ins help you maintain momentum and track progress.
            </p>
          </div>
        )}

        {/* CTA Button */}
        <Link href="/dashboard/sms" className="block">
          <Button
            variant="outline"
            className="w-full border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/5"
          >
            Start Weekly Check-In
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
