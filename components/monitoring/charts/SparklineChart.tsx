"use client";

import { useMemo } from "react";
import { LineChart, Line, Area, AreaChart, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export interface SparklineDataPoint {
  value: number;
  timestamp: number | Date | string;
}

export interface SparklineChartProps {
  data: SparklineDataPoint[];
  color?: string;
  height?: number;
  showTooltip?: boolean;
  showArea?: boolean;
  strokeWidth?: number;
  animate?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
  timestampFormatter?: (timestamp: number | Date | string) => string;
}

export function SparklineChart({
  data,
  color = "hsl(var(--chart-1))",
  height = 60,
  showTooltip = true,
  showArea = true,
  strokeWidth = 2,
  animate = true,
  className,
  valueFormatter = (value: number) => value.toLocaleString(),
  timestampFormatter = (timestamp: number | Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },
}: SparklineChartProps) {
  const processedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      timestamp: typeof point.timestamp === 'number'
        ? point.timestamp
        : new Date(point.timestamp).getTime(),
    }));
  }, [data]);

  const strokeColor = color.startsWith('hsl')
    ? color
    : color.startsWith('#')
    ? color
    : `hsl(var(--${color}))`;

  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const dataPoint = payload[0].payload as SparklineDataPoint & { timestamp: number };
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {valueFormatter(dataPoint.value)}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {timestampFormatter(dataPoint.timestamp)}
        </p>
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-gray-400 dark:text-gray-600", className)} style={{ height }}>
        <p className="text-xs">No data available</p>
      </div>
    );
  }

  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={processedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showTooltip && (
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }}
              animationDuration={200}
            />
          )}
          {showArea && (
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill={`url(#${gradientId})`}
              isAnimationActive={animate}
              animationDuration={1000}
              animationBegin={0}
              animationEasing="ease-out"
            />
          )}
          {!showArea && (
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dot={false}
              isAnimationActive={animate}
              animationDuration={1000}
              animationBegin={0}
              animationEasing="ease-out"
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

export type { SparklineDataPoint as SparklineData };
