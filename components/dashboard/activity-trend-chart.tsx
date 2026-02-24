"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendPeriod } from "@/lib/dashboard/trends";

const METRIC_CONFIG: Record<
  string,
  { label: string; color: string; gradientId: string }
> = {
  nextStepsCompleted: {
    label: "Next Steps Completed",
    color: "#ff6a1a",
    gradientId: "gradNextSteps",
  },
  checkIns: {
    label: "Check-Ins",
    color: "#8b5cf6",
    gradientId: "gradCheckIns",
  },
  decisionsScored: {
    label: "Readiness Scores",
    color: "#10b981",
    gradientId: "gradDecisions",
  },
  conversations: {
    label: "Conversations",
    color: "#3b82f6",
    gradientId: "gradConversations",
  },
};

interface ActivityTrendChartProps {
  data: TrendPeriod[];
  metric: string;
}

export function ActivityTrendChart({ data, metric }: ActivityTrendChartProps) {
  const config = METRIC_CONFIG[metric];
  if (!config) return null;

  if (!data || data.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center text-muted-foreground">
          No trend data available yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{config.label} Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id={config.gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={config.color}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={config.color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <p className="text-sm font-medium mb-1">
                      {payload[0].payload.period}
                    </p>
                    <p className="text-xs" style={{ color: config.color }}>
                      {config.label}: {payload[0].value}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={config.color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${config.gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
