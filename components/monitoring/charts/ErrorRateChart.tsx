"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateErrorRateData } from "@/lib/utils/mockChartData";
import type { TimeRange, ChartTooltipProps } from "@/lib/types/charts";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface ErrorRateChartProps {
  timeRange: TimeRange;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const errorRate = payload.find((p) => p.dataKey === "errorRate");
  const threshold = payload.find((p) => p.dataKey === "threshold");
  const isAboveThreshold =
    errorRate && threshold && errorRate.value > threshold.value;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Error Rate:</span>
          <span
            className={`font-medium ${
              isAboveThreshold ? "text-red-500" : "text-foreground"
            }`}
          >
            {errorRate?.value.toFixed(2)}%
          </span>
        </div>
        {isAboveThreshold && (
          <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
            <ExclamationTriangleIcon className="h-3 w-3" />
            <span>Above threshold</span>
          </div>
        )}
      </div>
    </div>
  );
};

export function ErrorRateChart({ timeRange, className }: ErrorRateChartProps) {
  const data = useMemo(() => generateErrorRateData(timeRange), [timeRange]);

  // Calculate if any errors are above threshold
  const hasAlerts = data.some((d) => d.errorRate > d.threshold);
  const maxErrorRate = Math.max(...data.map((d) => d.errorRate));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Error Rate</CardTitle>
          {hasAlerts && (
            <Badge variant="destructive" className="gap-1">
              <ExclamationTriangleIcon className="h-3 w-3" />
              Threshold Exceeded
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorErrorRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
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
              tickFormatter={(value) => `${value}%`}
              domain={[0, Math.max(maxErrorRate * 1.2, 3)]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={data[0]?.threshold || 2}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "Threshold (2%)",
                position: "right",
                fontSize: 11,
                fill: "#ef4444",
              }}
            />
            <Area
              type="monotone"
              dataKey="errorRate"
              name="Error Rate"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorErrorRate)"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Current</p>
            <p className="text-2xl font-bold text-foreground">
              {data[data.length - 1]?.errorRate.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Average</p>
            <p className="text-2xl font-bold text-foreground">
              {(
                data.reduce((sum, d) => sum + d.errorRate, 0) / data.length
              ).toFixed(2)}
              %
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Peak</p>
            <p className="text-2xl font-bold text-red-500">
              {maxErrorRate.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
