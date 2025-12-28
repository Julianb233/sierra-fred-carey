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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateTrafficData } from "@/lib/utils/mockChartData";

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
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
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
  const data = useMemo(() => generateTrafficData(), []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Traffic Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={120}
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
        <div className="mt-4 grid grid-cols-3 gap-4">
          {data.map((item, index) => (
            <div key={index} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <p className="text-sm font-medium text-foreground">
                  {item.variant}
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {item.traffic.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">requests</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
