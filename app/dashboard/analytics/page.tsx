"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SparklineCard } from "@/components/dashboard/sparkline-card";
import { ActivityTrendChart } from "@/components/dashboard/activity-trend-chart";
import { MomentumIndicator } from "@/components/dashboard/momentum-indicator";
import { DashboardExportMenu } from "@/components/dashboard/dashboard-export-menu";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import type { TrendPeriod } from "@/lib/dashboard/trends";
import type { MomentumIndicator as MomentumIndicatorType } from "@/lib/dashboard/engagement-score";

type TimeRange = "7d" | "30d" | "90d" | "all";

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

export default function AnalyticsPage() {
  const [trends, setTrends] = useState<TrendPeriod[]>([]);
  const [momentum, setMomentum] = useState<MomentumIndicatorType | null>(null);
  const [range, setRange] = useState<TimeRange>("30d");
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrends = useCallback(async (r: TimeRange) => {
    try {
      const res = await fetch(`/api/dashboard/trends?range=${r}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTrends(json.data.trends);
        }
      }
    } catch (e) {
      console.error("Failed to fetch trends:", e);
    }
  }, []);

  // Initial load: fetch both trends and momentum in parallel
  useEffect(() => {
    async function loadData() {
      try {
        const [trendsRes, momentumRes] = await Promise.all([
          fetch(`/api/dashboard/trends?range=${range}`),
          fetch("/api/dashboard/engagement"),
        ]);

        if (trendsRes.ok) {
          const json = await trendsRes.json();
          if (json.success) setTrends(json.data.trends);
        }

        if (momentumRes.ok) {
          const json = await momentumRes.json();
          if (json.success) setMomentum(json.data);
        }
      } catch (e) {
        console.error("Failed to load analytics:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch trends when range changes (skip initial)
  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    fetchTrends(newRange);
  };

  // Sparkline data extractors
  const sparklineData = (key: keyof TrendPeriod) =>
    trends.map((t) => ({ value: Number(t[key]) || 0 }));

  const latestValue = (key: keyof TrendPeriod) => {
    if (trends.length === 0) return 0;
    return trends.reduce((sum, t) => sum + (Number(t[key]) || 0), 0);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Empty state
  if (trends.length === 0 && (!momentum || momentum.summary === "No activity yet")) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            Start working with Fred to see your analytics
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            As you chat with Fred, complete next steps, and check in, your
            activity trends will appear here.
          </p>
          <Button asChild>
            <a href="/chat">Chat with Fred</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header + Time Range + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                variant={range === r.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleRangeChange(r.value)}
                className="text-xs px-3"
              >
                {r.label}
              </Button>
            ))}
          </div>
          <DashboardExportMenu trends={trends} momentum={momentum} />
        </div>
      </div>

      {/* Momentum indicator (full mode) */}
      {momentum && (
        <MomentumIndicator trend={momentum.trend} summary={momentum.summary} />
      )}

      {/* Sparkline grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SparklineCard
          title="Next Steps Completed"
          value={latestValue("nextStepsCompleted")}
          data={sparklineData("nextStepsCompleted")}
          color="#ff6a1a"
          expanded={expandedMetric === "nextStepsCompleted"}
          onToggle={() =>
            setExpandedMetric(
              expandedMetric === "nextStepsCompleted"
                ? null
                : "nextStepsCompleted"
            )
          }
        />
        <SparklineCard
          title="Check-in Streaks"
          value={latestValue("checkIns")}
          data={sparklineData("checkIns")}
          color="#8b5cf6"
          expanded={expandedMetric === "checkIns"}
          onToggle={() =>
            setExpandedMetric(
              expandedMetric === "checkIns" ? null : "checkIns"
            )
          }
        />
        <SparklineCard
          title="Readiness Scores"
          value={latestValue("decisionsScored")}
          data={sparklineData("decisionsScored")}
          color="#10b981"
          expanded={expandedMetric === "decisionsScored"}
          onToggle={() =>
            setExpandedMetric(
              expandedMetric === "decisionsScored"
                ? null
                : "decisionsScored"
            )
          }
        />
        <SparklineCard
          title="Conversations"
          value={latestValue("conversations")}
          data={sparklineData("conversations")}
          color="#3b82f6"
          expanded={expandedMetric === "conversations"}
          onToggle={() =>
            setExpandedMetric(
              expandedMetric === "conversations" ? null : "conversations"
            )
          }
        />
      </div>

      {/* Expanded chart */}
      {expandedMetric && (
        <ActivityTrendChart data={trends} metric={expandedMetric} />
      )}

      {/* User Journey Funnel */}
      <FunnelChart />
    </div>
  );
}
