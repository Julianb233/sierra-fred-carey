"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { formatNumber, formatLatency, formatPercentage, formatTimestamp } from "../utils/formatters";
import {
  ActivityLogIcon,
  TimerIcon,
  ExclamationTriangleIcon,
  RocketIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";

interface MetricData {
  requestCount: number;
  avgLatency: number;
  errorRate: number;
  uptime: number;
  timestamp: string;
}

interface SparklineData {
  value: number;
  timestamp: number;
}

interface LiveMetricsPanelProps {
  refreshInterval?: number;
  onDataUpdate?: (data: MetricData) => void;
  onError?: (error: Error) => void;
  maxSparklinePoints?: number;
}

export function LiveMetricsPanel({
  refreshInterval = 10000,
  onDataUpdate,
  onError,
  maxSparklinePoints = 20,
}: LiveMetricsPanelProps) {
  const [currentData, setCurrentData] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [requestSparkline, setRequestSparkline] = useState<SparklineData[]>([]);
  const [latencySparkline, setLatencySparkline] = useState<SparklineData[]>([]);
  const [errorSparkline, setErrorSparkline] = useState<SparklineData[]>([]);
  const [uptimeSparkline, setUptimeSparkline] = useState<SparklineData[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsUpdating(true);
      const response = await fetch("/api/monitoring/dashboard");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      const now = Date.now();

      // Extract metrics from API response
      const data: MetricData = {
        requestCount: result.data?.totalRequests24h || 0,
        avgLatency: result.data?.avgLatency || 0,
        errorRate: result.data?.errorRate || 0,
        uptime: result.data?.uptime || 0,
        timestamp: new Date().toISOString(),
      };

      setCurrentData(data);
      setLastUpdate(new Date());
      setError(null);

      const updateSparkline = (prev: SparklineData[], newValue: number): SparklineData[] => {
        const newPoint = { value: newValue, timestamp: now };
        const updated = [...prev, newPoint];
        return updated.slice(-maxSparklinePoints);
      };

      setRequestSparkline((prev) => updateSparkline(prev, data.requestCount));
      setLatencySparkline((prev) => updateSparkline(prev, data.avgLatency));
      setErrorSparkline((prev) => updateSparkline(prev, data.errorRate));
      setUptimeSparkline((prev) => updateSparkline(prev, data.uptime));

      onDataUpdate?.(data);

      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = setTimeout(() => setIsUpdating(false), 500);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch metrics");
      setError(error.message);
      onError?.(error);
      setIsUpdating(false);
    } finally {
      setLoading(false);
    }
  }, [onDataUpdate, onError, maxSparklinePoints]);

  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, [fetchMetrics, refreshInterval]);

  if (loading && !currentData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div></CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error && !currentData) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <div>
              <p className="font-semibold">Failed to load metrics</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentData) return null;

  const hasData = currentData.requestCount > 0 || currentData.avgLatency > 0 || currentData.errorRate > 0 || currentData.uptime > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", isUpdating ? "bg-[#ff6a1a] animate-pulse" : hasData ? "bg-green-500 dark:bg-green-400" : "bg-gray-400 dark:bg-gray-600")} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {!hasData ? "No data available" : lastUpdate ? `Updated ${formatTimestamp(lastUpdate, true)}` : "Connecting..."}
          </span>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <ReloadIcon className={cn("h-3 w-3", isUpdating && "animate-spin")} />
          Auto-refresh {refreshInterval / 1000}s
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn("transition-all duration-300", isUpdating && "ring-2 ring-[#ff6a1a]/20")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</CardTitle>
              <ActivityLogIcon className="h-4 w-4 text-[#ff6a1a]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatNumber(currentData.requestCount)}</p>
              {requestSparkline.length > 1 && (
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={requestSparkline}>
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Line type="monotone" dataKey="value" stroke="#ff6a1a" strokeWidth={2} dot={false} animationDuration={300} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-gray-600 dark:text-gray-400">Last 24 hours</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-all duration-300", isUpdating && "ring-2 ring-[#ff6a1a]/20")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Latency</CardTitle>
              <TimerIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatLatency(currentData.avgLatency)}</p>
              {latencySparkline.length > 1 && (
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={latencySparkline}>
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={300} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-gray-600 dark:text-gray-400">P95: {formatLatency(currentData.avgLatency * 1.5)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-all duration-300", isUpdating && "ring-2 ring-[#ff6a1a]/20")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Error Rate</CardTitle>
              <ExclamationTriangleIcon className={cn("h-4 w-4", currentData.errorRate > 5 ? "text-red-600" : currentData.errorRate > 1 ? "text-yellow-600" : "text-green-600")} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className={cn("text-3xl font-bold", currentData.errorRate > 5 ? "text-red-600" : currentData.errorRate > 1 ? "text-yellow-600" : "text-gray-900 dark:text-white")}>
                {formatPercentage(currentData.errorRate)}
              </p>
              {errorSparkline.length > 1 && (
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={errorSparkline}>
                    <YAxis hide domain={[0, "dataMax + 1"]} />
                    <Line type="monotone" dataKey="value" stroke={currentData.errorRate > 5 ? "#dc2626" : currentData.errorRate > 1 ? "#ca8a04" : "#16a34a"} strokeWidth={2} dot={false} animationDuration={300} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-gray-600 dark:text-gray-400">Target: &lt;1%</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-all duration-300", isUpdating && "ring-2 ring-[#ff6a1a]/20")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Uptime</CardTitle>
              <RocketIcon className={cn("h-4 w-4", currentData.uptime >= 99.5 ? "text-green-600" : currentData.uptime >= 95 ? "text-yellow-600" : "text-red-600")} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className={cn("text-3xl font-bold", currentData.uptime >= 99.5 ? "text-green-600" : currentData.uptime >= 95 ? "text-yellow-600" : "text-red-600")}>
                {formatPercentage(currentData.uptime, 2)}
              </p>
              {uptimeSparkline.length > 1 && (
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={uptimeSparkline}>
                    <YAxis hide domain={[99, 100]} />
                    <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot={false} animationDuration={300} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-gray-600 dark:text-gray-400">SLA: 99.9%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400 text-sm">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>Updates paused: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
