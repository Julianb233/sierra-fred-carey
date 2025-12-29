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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateErrorRateData } from "@/lib/utils/mockChartData";
import type { TimeRange, ChartTooltipProps } from "@/lib/types/charts";
import { ExclamationTriangleIcon, CheckCircledIcon } from "@radix-ui/react-icons";

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

  // Multiple severity thresholds
  const warningThreshold = 1.0; // 1% warning
  const criticalThreshold = 2.0; // 2% critical

  // Calculate if any errors are above thresholds
  const hasWarnings = data.some((d) => d.errorRate > warningThreshold);
  const hasCritical = data.some((d) => d.errorRate > criticalThreshold);
  const maxErrorRate = Math.max(...data.map((d) => d.errorRate));
  const currentErrorRate = data[data.length - 1]?.errorRate || 0;

  // Determine severity level
  const getSeverity = (rate: number) => {
    if (rate >= criticalThreshold) return "critical";
    if (rate >= warningThreshold) return "warning";
    return "normal";
  };

  const currentSeverity = getSeverity(currentErrorRate);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Error Rate Trends</CardTitle>
            <CardDescription className="mt-1">
              Alert thresholds: Warning {warningThreshold}% | Critical {criticalThreshold}%
            </CardDescription>
          </div>
          {hasCritical ? (
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <ExclamationTriangleIcon className="h-3 w-3" />
              Critical Alert
            </Badge>
          ) : hasWarnings ? (
            <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <ExclamationTriangleIcon className="h-3 w-3" />
              Warning
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircledIcon className="h-3 w-3" />
              Normal
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              {/* Gradient based on severity */}
              <linearGradient id="colorErrorRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
              {/* Critical zone background */}
              <linearGradient id="criticalZone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0.05} />
              </linearGradient>
              {/* Warning zone background */}
              <linearGradient id="warningZone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
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

            {/* Warning Threshold Line */}
            <ReferenceLine
              y={warningThreshold}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "⚠ Warning (1%)",
                position: "right",
                fontSize: 11,
                fill: "#f59e0b",
                fontWeight: 600,
              }}
            />

            {/* Critical Threshold Line */}
            <ReferenceLine
              y={criticalThreshold}
              stroke="#dc2626"
              strokeDasharray="5 5"
              strokeWidth={3}
              label={{
                value: "🚨 Critical (2%)",
                position: "right",
                fontSize: 11,
                fill: "#dc2626",
                fontWeight: 700,
              }}
            />

            {/* Main Error Rate Area */}
            <Area
              type="monotone"
              dataKey="errorRate"
              name="Error Rate"
              stroke="#ef4444"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorErrorRate)"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Severity-coded Summary Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Current</p>
            <p
              className={`text-2xl font-bold ${
                currentSeverity === "critical"
                  ? "text-red-600 animate-pulse"
                  : currentSeverity === "warning"
                  ? "text-amber-600"
                  : "text-green-600"
              }`}
            >
              {currentErrorRate.toFixed(2)}%
            </p>
            <Badge
              variant={currentSeverity === "critical" ? "destructive" : "secondary"}
              className={`mt-2 text-xs ${
                currentSeverity === "warning"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : currentSeverity === "normal"
                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : ""
              }`}
            >
              {currentSeverity.toUpperCase()}
            </Badge>
          </div>
          <div className="text-center p-3 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Average</p>
            <p className="text-2xl font-bold text-foreground">
              {(
                data.reduce((sum, d) => sum + d.errorRate, 0) / data.length
              ).toFixed(2)}
              %
            </p>
            <p className="text-xs text-muted-foreground mt-2">Over {timeRange}</p>
          </div>
          <div className="text-center p-3 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Peak</p>
            <p className="text-2xl font-bold text-red-600">
              {maxErrorRate.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-2">Maximum</p>
          </div>
          <div className="text-center p-3 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Incidents</p>
            <p className="text-2xl font-bold text-foreground">
              {data.filter(d => d.errorRate > criticalThreshold).length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Critical events</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
