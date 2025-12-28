"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateLatencyData } from "@/lib/utils/mockChartData";
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
    { dataKey: "p50", name: "P50", color: "#3b82f6", opacity: 0.8 },
    { dataKey: "p95", name: "P95", color: "#f59e0b", opacity: 0.6 },
    { dataKey: "p99", name: "P99", color: "#ef4444", opacity: 0.4 },
    { dataKey: "avg", name: "Average", color: "#10b981", opacity: 0.5 },
  ];

  // Calculate SLA threshold (e.g., P95 should be under 200ms)
  const slaThreshold = 200;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Latency Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.dataKey}
                  id={`color${s.dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.1} />
                </linearGradient>
              ))}
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
                      : "text-foreground cursor-pointer"
                  }
                >
                  {value}
                </span>
              )}
            />
            <ReferenceLine
              y={slaThreshold}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{
                value: "SLA Threshold",
                position: "right",
                fontSize: 11,
                fill: "#ef4444",
              }}
            />
            {series.map(
              (s) =>
                !hiddenSeries.has(s.dataKey) && (
                  <Area
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    fillOpacity={s.opacity}
                    fill={`url(#color${s.dataKey})`}
                  />
                )
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
