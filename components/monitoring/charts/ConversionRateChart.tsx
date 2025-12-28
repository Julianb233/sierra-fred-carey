"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateConversionData } from "@/lib/utils/mockChartData";
import type { TimeRange, ChartTooltipProps } from "@/lib/types/charts";

interface ConversionRateChartProps {
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
              {entry.value.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function ConversionRateChart({
  timeRange,
  className,
}: ConversionRateChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const data = useMemo(() => generateConversionData(timeRange), [timeRange]);

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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Conversion Rate Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
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
                      : "text-foreground cursor-pointer"
                  }
                >
                  {value}
                </span>
              )}
            />
            {series.map(
              (s) =>
                !hiddenSeries.has(s.dataKey) && (
                  <Line
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
