"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DashboardResponse, UIExperiment, UIAlert } from "@/types/monitoring";
import { transformExperiment, transformAlert } from "@/types/monitoring";

export interface MonitoringData {
  experiments: UIExperiment[];
  alerts: UIAlert[];
  metrics: {
    totalRequests: number;
    avgLatency: number;
    errorRate: number;
    activeExperimentCount: number;
    criticalAlertCount: number;
  };
}

export interface UseMonitoringDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

export interface UseMonitoringDataReturn {
  data: MonitoringData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

export function useMonitoringData(
  options: UseMonitoringDataOptions = {}
): UseMonitoringDataReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    onError,
  } = options;

  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const [dashboardRes, alertsRes] = await Promise.all([
        fetch("/api/monitoring/dashboard", {
          signal: abortControllerRef.current.signal,
        }),
        fetch("/api/monitoring/alerts", {
          signal: abortControllerRef.current.signal,
        }),
      ]);

      if (!dashboardRes.ok || !alertsRes.ok) {
        throw new Error("Failed to fetch monitoring data");
      }

      const dashboardData: DashboardResponse = await dashboardRes.json();
      const alertsData = await alertsRes.json();

      if (!dashboardData.success) {
        throw new Error("Dashboard API returned error");
      }

      const { activeExperiments, totalActiveTests, totalRequests24h, criticalAlerts } =
        dashboardData.data;

      // Calculate metrics
      const allVariants = activeExperiments.flatMap((exp) => exp.variants);
      const totalVariants = allVariants.length;

      const avgLatency =
        totalVariants > 0
          ? Math.round(
              allVariants.reduce((sum, v) => sum + v.avgLatencyMs, 0) / totalVariants
            )
          : 0;

      const avgErrorRate =
        totalVariants > 0
          ? allVariants.reduce((sum, v) => sum + v.errorRate, 0) / totalVariants
          : 0;

      setData({
        experiments: activeExperiments.map(transformExperiment),
        alerts: alertsData.success
          ? alertsData.data.alerts.map(transformAlert)
          : [],
        metrics: {
          totalRequests: totalRequests24h,
          avgLatency,
          errorRate: avgErrorRate,
          activeExperimentCount: totalActiveTests,
          criticalAlertCount: criticalAlerts.length,
        },
      });

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Request was cancelled, ignore
      }

      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error.message);
      onError?.(error);
      console.error("[useMonitoringData] Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onError]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchData(true);
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, autoRefresh, refreshInterval]);

  return {
    data,
    loading,
    error,
    refreshing,
    lastUpdate,
    refresh,
  };
}
