"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateLatencyData } from "@/lib/utils/mockChartData";
import { TimerIcon } from "@radix-ui/react-icons";
import type { TimeRange, ChartTooltipProps } from "@/lib/types/charts";

interface LatencyChartProps {
  timeRange: TimeRange;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {entry.value}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function LatencyChart({ timeRange, className }: LatencyChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"distribution" | "trend">("distribution");
  const data = useMemo(() => generateLatencyData(timeRange), [timeRange]);

  const handleLegendClick = (dataKey: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  const series = [
    { dataKey: "p50", name: "P50 (Median)", color: "#3b82f6" },
    { dataKey: "p95", name: "P95", color: "#f59e0b" },
    { dataKey: "p99", name: "P99", color: "#ef4444" },
  ];

  // Calculate SLA thresholds
  const p95Threshold = 200;
  const p99Threshold = 500;

  // Check if exceeding SLA
  const latestP95 = data[data.length - 1]?.p95 || 0;
  const latestP99 = data[data.length - 1]?.p99 || 0;
  const exceedsSLA = latestP95 > p95Threshold || latestP99 > p99Threshold;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Latency Distribution
            </CardTitle>
            <CardDescription className="mt-1">
              P50, P95, P99 percentiles across variants
            </CardDescription>
          </div>
          {exceedsSLA && (
            <Badge variant="destructive" className="gap-1">
              <TimerIcon className="h-3 w-3" />
              SLA Exceeded
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height="100%" className="min-h-[280px] sm:min-h-[350px] md:min-h-[400px]">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="p50Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="p95Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="p99Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickMargin={10}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickFormatter={(value) => `${value}ms`}
              domain={[0, "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              onClick={(e) => handleLegendClick(e.dataKey as string)}
              formatter={(value, entry) => (
                <span
                  className={
                    hiddenSeries.has(entry.dataKey as string)
                      ? "text-muted-foreground line-through cursor-pointer"
                      : "text-foreground cursor-pointer hover:underline"
                  }
                >
                  {value}
                </span>
              )}
            />

            {/* P95 SLA Threshold */}
            <ReferenceLine
              y={p95Threshold}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "P95 SLA (200ms)",
                position: "right",
                fontSize: 11,
                fill: "#f59e0b",
              }}
            />

            {/* P99 SLA Threshold */}
            <ReferenceLine
              y={p99Threshold}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "P99 SLA (500ms)",
                position: "right",
                fontSize: 11,
                fill: "#ef4444",
              }}
            />

            {/* Histogram-style bars for distribution */}
            {!hiddenSeries.has("p50") && (
              <Bar
                dataKey="p50"
                name="P50 (Median)"
                fill="url(#p50Gradient)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            )}
            {!hiddenSeries.has("p95") && (
              <Bar
                dataKey="p95"
                name="P95"
                fill="url(#p95Gradient)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            )}
            {!hiddenSeries.has("p99") && (
              <Bar
                dataKey="p99"
                name="P99"
                fill="url(#p99Gradient)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Latency Percentile Summary */}
        <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full bg-[#10b981]" />
              <p className="text-sm font-medium text-muted-foreground">Average</p>
            </div>
            <p className="text-2xl font-bold text-[#10b981]">
              {data[data.length - 1]?.avg || 0}ms
            </p>
            <p className="text-xs text-muted-foreground mt-1">Mean Response</p>
          </div>
          <div className="text-center p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full bg-[#3b82f6]" />
              <p className="text-sm font-medium text-muted-foreground">P50</p>
            </div>
            <p className="text-2xl font-bold text-[#3b82f6]">
              {data[data.length - 1]?.p50 || 0}ms
            </p>
            <p className="text-xs text-muted-foreground mt-1">50% under</p>
          </div>
          <div className="text-center p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full bg-[#f59e0b]" />
              <p className="text-sm font-medium text-muted-foreground">P95</p>
            </div>
            <p className={`text-2xl font-bold ${latestP95 > p95Threshold ? "text-red-500" : "text-[#f59e0b]"}`}>
              {latestP95}ms
            </p>
            <p className="text-xs text-muted-foreground mt-1">95% under</p>
          </div>
          <div className="text-center p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
              <p className="text-sm font-medium text-muted-foreground">P99</p>
            </div>
            <p className={`text-2xl font-bold ${latestP99 > p99Threshold ? "text-red-500" : "text-[#ef4444]"}`}>
              {latestP99}ms
            </p>
            <p className="text-xs text-muted-foreground mt-1">99% under</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
