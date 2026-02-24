"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrendPeriod } from "@/lib/dashboard/trends";

export function FunnelChart() {
  const [trends, setTrends] = useState<TrendPeriod[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/trends?range=all");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setTrends(json.data.trends);
          }
        }
      } catch (e) {
        console.error("Failed to fetch funnel data:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const funnelData = useMemo(() => {
    if (!trends) return [];

    // Sum across all periods to see if user ever did these activities
    const totals = trends.reduce(
      (acc, t) => ({
        conversations: acc.conversations + t.conversations,
        checkIns: acc.checkIns + t.checkIns,
        nextStepsCompleted: acc.nextStepsCompleted + t.nextStepsCompleted,
        decisionsScored: acc.decisionsScored + t.decisionsScored,
      }),
      { conversations: 0, checkIns: 0, nextStepsCompleted: 0, decisionsScored: 0 }
    );

    return [
      { step: "Signed Up", complete: true, value: 100 },
      {
        step: "First Chat",
        complete: totals.conversations > 0,
        value: totals.conversations > 0 ? 80 : 0,
      },
      {
        step: "First Check-In",
        complete: totals.checkIns > 0,
        value: totals.checkIns > 0 ? 60 : 0,
      },
      {
        step: "Next Step Completed",
        complete: totals.nextStepsCompleted > 0,
        value: totals.nextStepsCompleted > 0 ? 40 : 0,
      },
      {
        step: "Readiness Review",
        complete: totals.decisionsScored > 0,
        value: totals.decisionsScored > 0 ? 20 : 0,
      },
    ];
  }, [trends]);

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  const allIncomplete =
    funnelData.length > 0 && funnelData.filter((d) => d.complete).length <= 1;

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base">Your Journey</CardTitle>
        <CardDescription>
          Steps completed on your founder path
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allIncomplete ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Start your journey by chatting with Fred
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="step"
                type="category"
                tick={{ fontSize: 12 }}
                width={140}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof funnelData)[number];
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm font-medium">{d.step}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.complete ? "Complete" : "Not yet"}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                {funnelData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.complete ? "#ff6a1a" : "var(--muted)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
