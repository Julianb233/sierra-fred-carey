"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ActivityLogIcon,
  TimerIcon,
  RocketIcon,
  ExclamationTriangleIcon,
  MixIcon,
  CheckCircledIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { formatNumber, formatLatency, formatPercentage } from "./utils/formatters";

export interface MetricsData {
  totalRequests: number;
  avgLatency: number;
  successRate: number;
  errorRate: number;
  activeExperiments: number;
  criticalAlerts: number;
}

export interface MetricChange {
  value: number;
  trend: "up" | "down" | "neutral";
}

export interface MetricsOverviewProps {
  metrics: MetricsData;
  changes?: {
    requests?: MetricChange;
    latency?: MetricChange;
    successRate?: MetricChange;
    experiments?: MetricChange;
  };
  loading?: boolean;
  compact?: boolean;
  showAlertStatus?: boolean;
  className?: string;
}

export function MetricsOverview({
  metrics,
  changes,
  loading = false,
  compact = false,
  showAlertStatus = true,
  className,
}: MetricsOverviewProps) {
  const getTrendColor = (trend: "up" | "down" | "neutral", inverse = false) => {
    if (trend === "neutral") return "text-gray-500";
    const isPositive = inverse ? trend === "down" : trend === "up";
    return isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  const TrendIndicator = ({
    change,
    inverse = false,
  }: {
    change?: MetricChange;
    inverse?: boolean;
  }) => {
    if (!change) return null;

    const Icon = change.trend === "up" ? ArrowUpIcon : change.trend === "down" ? ArrowDownIcon : null;

    return (
      <div className={cn("flex items-center gap-0.5 text-xs font-medium", getTrendColor(change.trend, inverse))}>
        {Icon && <Icon className="h-3 w-3" />}
        <span>{Math.abs(change.value).toFixed(1)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-2">
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
        </CardHeader>
        <CardContent>
          <div className={cn("grid gap-4", compact ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4")}>
            {[...Array(compact ? 3 : 4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricItems = [
    {
      label: "Total Requests",
      value: formatNumber(metrics.totalRequests),
      icon: <ActivityLogIcon className="h-4 w-4" />,
      color: "text-[#ff6a1a]",
      change: changes?.requests,
    },
    {
      label: "Avg Latency",
      value: formatLatency(metrics.avgLatency),
      icon: <TimerIcon className="h-4 w-4" />,
      color: "text-blue-600 dark:text-blue-400",
      change: changes?.latency,
      inverse: true, // Lower is better
    },
    {
      label: "Success Rate",
      value: formatPercentage(metrics.successRate),
      icon: <RocketIcon className="h-4 w-4" />,
      color: metrics.successRate >= 99 ? "text-green-600 dark:text-green-400" : metrics.successRate >= 95 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400",
      change: changes?.successRate,
      progress: metrics.successRate,
    },
    {
      label: "Active Tests",
      value: metrics.activeExperiments.toString(),
      icon: <MixIcon className="h-4 w-4" />,
      color: "text-purple-600 dark:text-purple-400",
      change: changes?.experiments,
    },
  ];

  if (compact) {
    return (
      <div className={cn("flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg", className)}>
        {metricItems.slice(0, 3).map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={cn("shrink-0", item.color)}>{item.icon}</div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
                <TrendIndicator change={item.change} inverse={item.inverse} />
              </div>
            </div>
          </div>
        ))}
        {showAlertStatus && metrics.criticalAlerts > 0 && (
          <Badge className="ml-auto bg-red-600 text-white animate-pulse">
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
            {metrics.criticalAlerts} Alert{metrics.criticalAlerts !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">System Overview</CardTitle>
          {showAlertStatus && (
            <Badge
              variant={metrics.criticalAlerts > 0 ? "destructive" : "secondary"}
              className={cn(
                "gap-1",
                metrics.criticalAlerts > 0 && "animate-pulse"
              )}
            >
              {metrics.criticalAlerts > 0 ? (
                <>
                  <ExclamationTriangleIcon className="h-3 w-3" />
                  {metrics.criticalAlerts} Alert{metrics.criticalAlerts !== 1 ? "s" : ""}
                </>
              ) : (
                <>
                  <CheckCircledIcon className="h-3 w-3" />
                  Healthy
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {metricItems.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn("shrink-0", item.color)}>{item.icon}</div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {item.value}
                </span>
                <TrendIndicator change={item.change} inverse={item.inverse} />
              </div>
              {item.progress !== undefined && (
                <Progress
                  value={item.progress}
                  className={cn(
                    "h-1.5",
                    item.progress >= 99
                      ? "[&>div]:bg-green-500"
                      : item.progress >= 95
                      ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-red-500"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Mini version for headers/nav
export function MetricsMini({
  metrics,
  className,
}: {
  metrics: MetricsData;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      <div className="flex items-center gap-1.5">
        <ActivityLogIcon className="h-3.5 w-3.5 text-gray-400" />
        <span className="font-medium">{formatNumber(metrics.totalRequests)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <TimerIcon className="h-3.5 w-3.5 text-gray-400" />
        <span className="font-medium">{formatLatency(metrics.avgLatency)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <RocketIcon
          className={cn(
            "h-3.5 w-3.5",
            metrics.successRate >= 99
              ? "text-green-500"
              : metrics.successRate >= 95
              ? "text-yellow-500"
              : "text-red-500"
          )}
        />
        <span className="font-medium">{formatPercentage(metrics.successRate)}</span>
      </div>
      {metrics.criticalAlerts > 0 && (
        <Badge variant="destructive" className="h-5 text-xs animate-pulse">
          {metrics.criticalAlerts}
        </Badge>
      )}
    </div>
  );
}
