"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateTrafficData } from "@/lib/utils/mockChartData";
import { CheckCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface TrafficPieChartProps {
  className?: string;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { variant: string; traffic: number; percentage: number } }> }) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-medium text-foreground">{data.variant}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Traffic:</span>
          <span className="font-medium text-foreground">
            {data.traffic.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Percentage:</span>
          <span className="font-medium text-foreground">
            {data.percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

interface LabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

const renderCustomLabel = ({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: LabelProps) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-sm font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function TrafficPieChart({ className }: TrafficPieChartProps) {
  const data = useMemo(() => {
    const trafficData = generateTrafficData();

    // Add expected vs actual comparison
    // Expected percentages based on A/B test config
    const expectedDistribution = {
      "Variant A": 33.3,
      "Variant B": 33.3,
      "Variant C": 33.4,
    };

    return trafficData.map(item => ({
      ...item,
      expected: expectedDistribution[item.variant as keyof typeof expectedDistribution] || 33.3,
      deviation: Math.abs(item.percentage - (expectedDistribution[item.variant as keyof typeof expectedDistribution] || 33.3)),
    }));
  }, []);

  // Check if traffic distribution is balanced (within 5% deviation)
  const isBalanced = data.every(item => item.deviation < 5);
  const maxDeviation = Math.max(...data.map(d => d.deviation));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Traffic Distribution
            </CardTitle>
            <CardDescription className="mt-1">
              Actual vs expected traffic split across variants
            </CardDescription>
          </div>
          {isBalanced ? (
            <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircledIcon className="h-3 w-3" />
              Balanced
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <ExclamationTriangleIcon className="h-3 w-3" />
              Imbalanced
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actual Distribution Pie Chart */}
          <div>
            <p className="text-sm font-medium text-center mb-4 text-muted-foreground">
              Actual Distribution
            </p>
            <ResponsiveContainer width="100%" height="100%" className="min-h-[250px] sm:min-h-[300px]">
              <PieChart>
                <Pie
                  data={data as unknown as Array<Record<string, unknown>>}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="traffic"
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-sm text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Expected vs Actual Comparison */}
          <div className="flex flex-col justify-center space-y-4">
            <p className="text-sm font-medium text-center text-muted-foreground">
              Expected vs Actual
            </p>
            {data.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {item.variant}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {item.percentage.toFixed(1)}%
                    </span>
                    {item.deviation > 2 && (
                      <ExclamationTriangleIcon className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                </div>

                {/* Progress bar showing actual vs expected */}
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  {/* Expected marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                    style={{ left: `${item.expected}%` }}
                  />
                  {/* Actual bar */}
                  <div
                    className="absolute top-0 bottom-0 rounded-full transition-all"
                    style={{
                      backgroundColor: item.fill,
                      width: `${item.percentage}%`,
                      opacity: 0.8,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Expected: {item.expected.toFixed(1)}%</span>
                  <span className={item.deviation > 2 ? "text-amber-500 font-medium" : ""}>
                    Δ {item.deviation.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {data.map((item, index) => (
            <div key={index} className="text-center p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <p className="text-sm font-medium text-muted-foreground">
                  {item.variant}
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground" style={{ color: item.fill }}>
                {item.traffic.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.percentage.toFixed(1)}% of total
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
