"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  ReloadIcon,
  DotFilledIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

export type HealthStatus = "healthy" | "degraded" | "critical";
export type ServiceStatus = "operational" | "degraded" | "down";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  responseTime?: number;
  lastCheck?: Date;
  message?: string;
}

export interface SystemHealthData {
  overallStatus: HealthStatus;
  services: ServiceHealth[];
  avgResponseTime: number;
  lastIncident?: {
    timestamp: Date;
    severity: "warning" | "critical";
    message: string;
  };
  uptime?: number; // percentage
}

export interface SystemHealthProps {
  refreshInterval?: number; // milliseconds, default 30000 (30s)
  onError?: (error: Error) => void;
  className?: string;
}

export function SystemHealth({
  refreshInterval = 30000,
  onError,
  className,
}: SystemHealthProps) {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchHealthData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/monitoring/health");

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Health check API returned error");
      }

      setHealthData(data.data);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setLoading(false);
      onError?.(err instanceof Error ? err : new Error(errorMessage));

      console.error("[SystemHealth] Failed to fetch health data:", err);
    }
  }, [onError]);

  useEffect(() => {
    // Initial fetch
    fetchHealthData();

    // Set up auto-refresh
    const interval = setInterval(() => {
      fetchHealthData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchHealthData, refreshInterval]);

  const getStatusColor = (status: HealthStatus | ServiceStatus): string => {
    switch (status) {
      case "healthy":
      case "operational":
        return "text-green-600 dark:text-green-400";
      case "degraded":
        return "text-yellow-600 dark:text-yellow-400";
      case "critical":
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: HealthStatus | ServiceStatus) => {
    switch (status) {
      case "healthy":
      case "operational":
        return <CheckCircledIcon className="h-5 w-5" />;
      case "degraded":
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case "critical":
      case "down":
        return <CrossCircledIcon className="h-5 w-5" />;
      default:
        return <DotFilledIcon className="h-5 w-5" />;
    }
  };

  const getStatusBadgeVariant = (
    status: HealthStatus | ServiceStatus
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "healthy":
      case "operational":
        return "default";
      case "degraded":
        return "secondary";
      case "critical":
      case "down":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatTimeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-3">
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-20 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-6 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-shadow",
        error && "border-red-200 dark:border-red-800",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">System Health</CardTitle>
          <ReloadIcon
            className={cn(
              "h-4 w-4 text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors",
              loading && "animate-spin"
            )}
            onClick={() => !loading && fetchHealthData()}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-md">
            <CrossCircledIcon className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                Health Check Failed
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        ) : healthData ? (
          <>
            {/* Overall Status */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className={cn("flex-shrink-0", getStatusColor(healthData.overallStatus))}>
                  {getStatusIcon(healthData.overallStatus)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Overall Status
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                    {healthData.overallStatus}
                  </p>
                </div>
              </div>
              <Badge
                variant={getStatusBadgeVariant(healthData.overallStatus)}
                className={cn(
                  "capitalize",
                  healthData.overallStatus === "healthy" &&
                    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                  healthData.overallStatus === "degraded" &&
                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                )}
              >
                {healthData.overallStatus}
              </Badge>
            </div>

            {/* Service Health Checks */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Service Status
              </p>
              <div className="space-y-2">
                {healthData.services.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 bg-white dark:bg-neutral-950 rounded-md border border-neutral-200 dark:border-neutral-800"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("flex-shrink-0", getStatusColor(service.status))}>
                        {getStatusIcon(service.status)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {service.name}
                        </p>
                        {service.message && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {service.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {service.responseTime !== undefined && (
                        <p className="text-xs font-medium text-gray-900 dark:text-white">
                          {service.responseTime}ms
                        </p>
                      )}
                      {service.lastCheck && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeSince(new Date(service.lastCheck))}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                  Avg Response Time
                </p>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  {healthData.avgResponseTime}ms
                </p>
              </div>
              {healthData.uptime !== undefined && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-md">
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                    Uptime
                  </p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-100">
                    {healthData.uptime.toFixed(2)}%
                  </p>
                </div>
              )}
            </div>

            {/* Last Incident */}
            {healthData.lastIncident && (
              <div
                className={cn(
                  "p-3 rounded-md border",
                  healthData.lastIncident.severity === "critical"
                    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                    : "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
                )}
              >
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon
                    className={cn(
                      "h-4 w-4 mt-0.5",
                      healthData.lastIncident.severity === "critical"
                        ? "text-red-600 dark:text-red-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                      Last Incident
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                      {healthData.lastIncident.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatTimeSince(new Date(healthData.lastIncident.timestamp))}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
