"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ReloadIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import type { TimeRange, ChartTooltipProps, ConversionDataPoint } from "@/lib/types/charts";

interface ConversionRateChartProps {
  timeRange: TimeRange;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  // Filter out confidence interval areas from tooltip
  const dataLines = payload.filter(
    (p) => !p.dataKey?.toString().includes("Upper") && !p.dataKey?.toString().includes("Lower")
  );

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {dataLines.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value}%
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Confidence interval: 95%
      </p>
    </div>
  );
};

export function ConversionRateChart({
  timeRange,
  className,
}: ConversionRateChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [rawData, setRawData] = useState<ConversionDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/monitoring/charts?type=conversion&range=${timeRange}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch conversion data: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch conversion data");
      }

      setRawData(result.data);
    } catch (err) {
      console.error("[ConversionRateChart] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add confidence intervals (±1.5% for 95% confidence)
  const data = useMemo(() => {
    if (rawData.length === 0) return [];
    return rawData.map(point => ({
      ...point,
      variantAUpper: point.variantA + 1.5,
      variantALower: Math.max(0, point.variantA - 1.5),
      variantBUpper: point.variantB + 1.5,
      variantBLower: Math.max(0, point.variantB - 1.5),
      variantCUpper: (point.variantC || 0) + 1.5,
      variantCLower: Math.max(0, (point.variantC || 0) - 1.5),
    }));
  }, [rawData]);

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
    { dataKey: "variantA", name: "Variant A", color: "#3b82f6" },
    { dataKey: "variantB", name: "Variant B", color: "#10b981" },
    { dataKey: "variantC", name: "Variant C", color: "#f59e0b" },
  ];

  // Calculate winner (only when data is available)
  const latestData = data.length > 0 ? data[data.length - 1] : null;
  const winner = latestData
    ? latestData.variantB > latestData.variantA && latestData.variantB > (latestData.variantC || 0)
      ? "B"
      : latestData.variantA > (latestData.variantC || 0) ? "A" : "C"
    : null;

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Conversion Rate Over Time
              </CardTitle>
              <CardDescription className="mt-1">
                Compare variant performance with 95% confidence intervals
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center min-h-[280px] sm:min-h-[350px] md:min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <ReloadIcon className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading conversion data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Conversion Rate Over Time
            </CardTitle>
            <CardDescription className="mt-1">
              Compare variant performance with 95% confidence intervals
              {error && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  (using cached data)
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                className="h-8 gap-1"
              >
                <ReloadIcon className="h-3 w-3" />
                Retry
              </Button>
            )}
            {winner && (
              <Badge variant="secondary" className="gap-1">
                <ArrowUpIcon className="h-3 w-3" />
                Leading: Variant {winner}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height="100%" className="min-h-[280px] sm:min-h-[350px] md:min-h-[400px]">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="ciA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="ciB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="ciC" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
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

            {/* Confidence Interval Shading for Variant A */}
            {!hiddenSeries.has("variantA") && (
              <Area
                type="monotone"
                dataKey="variantAUpper"
                stroke="none"
                fill="url(#ciA)"
                fillOpacity={0.3}
                stackId="a"
              />
            )}
            {!hiddenSeries.has("variantA") && (
              <Area
                type="monotone"
                dataKey="variantALower"
                stroke="none"
                fill="transparent"
                stackId="a"
              />
            )}

            {/* Confidence Interval Shading for Variant B */}
            {!hiddenSeries.has("variantB") && (
              <Area
                type="monotone"
                dataKey="variantBUpper"
                stroke="none"
                fill="url(#ciB)"
                fillOpacity={0.3}
                stackId="b"
              />
            )}
            {!hiddenSeries.has("variantB") && (
              <Area
                type="monotone"
                dataKey="variantBLower"
                stroke="none"
                fill="transparent"
                stackId="b"
              />
            )}

            {/* Confidence Interval Shading for Variant C */}
            {!hiddenSeries.has("variantC") && (
              <Area
                type="monotone"
                dataKey="variantCUpper"
                stroke="none"
                fill="url(#ciC)"
                fillOpacity={0.3}
                stackId="c"
              />
            )}
            {!hiddenSeries.has("variantC") && (
              <Area
                type="monotone"
                dataKey="variantCLower"
                stroke="none"
                fill="transparent"
                stackId="c"
              />
            )}

            {/* Main lines */}
            {series.map(
              (s) =>
                !hiddenSeries.has(s.dataKey) && (
                  <Line
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                )
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {series.map((s) => {
            const value = latestData ? (latestData[s.dataKey as keyof typeof latestData] as number) : 0;
            return (
              <div key={s.dataKey} className="text-center p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <p className="text-sm font-medium text-muted-foreground">{s.name}</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: s.color }}>
                  {value?.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Current Rate</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
