"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TrendDataPoint } from "@/lib/types/insights";

interface TrendChartsProps {
  data: TrendDataPoint[];
}

export function TrendCharts({ data }: TrendChartsProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center text-muted-foreground">
          No trend data available yet. Start using AI features to see trends.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* AI Activity Trend */}
      <Card>
        <CardHeader>
          <CardTitle>AI Activity Over Time</CardTitle>
          <CardDescription>Total requests and insights generated</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6a1a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff6a1a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInsights" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm font-medium mb-2">
                        {new Date(payload[0].payload.date).toLocaleDateString()}
                      </p>
                      {payload.map((entry, index) => (
                        <p key={index} className="text-xs" style={{ color: entry.color }}>
                          {entry.name}: {entry.value}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="totalRequests"
                stroke="#ff6a1a"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRequests)"
                name="AI Requests"
              />
              <Area
                type="monotone"
                dataKey="insights"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInsights)"
                name="Insights"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Success Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Success Rate Trend</CardTitle>
          <CardDescription>AI request success rate over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm font-medium mb-2">
                        {new Date(payload[0].payload.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-green-600">
                        Success Rate: {payload[0].value}%
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="successRate"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: "#10b981", r: 4 }}
                activeDot={{ r: 6 }}
                name="Success Rate %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Response Time Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Performance</CardTitle>
          <CardDescription>Average AI response time in milliseconds</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm font-medium mb-2">
                        {new Date(payload[0].payload.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-blue-600">
                        Avg Response: {payload[0].value}ms
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="avgResponseTime"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                name="Avg Response Time (ms)"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Activity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity Breakdown</CardTitle>
          <CardDescription>Combined view of all metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm font-medium mb-2">
                        {new Date(payload[0].payload.date).toLocaleDateString()}
                      </p>
                      {payload.map((entry, index) => (
                        <p key={index} className="text-xs" style={{ color: entry.color }}>
                          {entry.name}: {entry.value}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalRequests"
                stroke="#ff6a1a"
                strokeWidth={2}
                name="Requests"
              />
              <Line
                type="monotone"
                dataKey="insights"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Insights"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
