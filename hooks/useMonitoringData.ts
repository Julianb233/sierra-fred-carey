"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  DashboardResponse,
  AlertsResponse,
  UIExperiment,
  UIAlert,
  DashboardMetrics,
} from "@/types/monitoring";
import {
  transformExperiment,
  transformAlert,
  calculateMetrics,
} from "@/types/monitoring";

export interface MonitoringData {
  experiments: UIExperiment[];
  alerts: UIAlert[];
  metrics: DashboardMetrics;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface UseMonitoringDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onUpdate?: (data: MonitoringData) => void;
}

const DEFAULT_OPTIONS: UseMonitoringDataOptions = {
  autoRefresh: true,
  refreshInterval: 30000,
};

export function useMonitoringData(options: UseMonitoringDataOptions = {}) {
  const { autoRefresh, refreshInterval, onError, onUpdate } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const [data, setData] = useState<MonitoringData>({
    experiments: [],
    alerts: [],
    metrics: {
      totalRequests: 0,
      avgLatency: 0,
      successRate: 0,
      errorRate: 0,
      activeExperiments: 0,
      criticalAlerts: 0,
    },
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch("/api/monitoring/dashboard");

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
      }

      const dashboardData: DashboardResponse = await response.json();

      if (!dashboardData.success) {
        throw new Error("Dashboard API returned error");
      }

      return dashboardData.data;
    } catch (err) {
      throw err instanceof Error ? err : new Error("Unknown error fetching dashboard");
    }
  }, []);

  const fetchAlertsData = useCallback(async () => {
    try {
      const response = await fetch("/api/monitoring/alerts");

      if (!response.ok) {
        console.error("[useMonitoringData] Failed to fetch alerts:", response.statusText);
        return null;
      }

      const alertsData: AlertsResponse = await response.json();

      if (!alertsData.success) {
        return null;
      }

      return alertsData.data;
    } catch (err) {
      console.error("[useMonitoringData] Error fetching alerts:", err);
      return null;
    }
  }, []);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }

    try {
      const [dashboardResult, alertsResult] = await Promise.all([
        fetchDashboardData(),
        fetchAlertsData(),
      ]);

      if (!isMountedRef.current) return;

      const { activeExperiments, totalActiveTests, totalRequests24h, criticalAlerts } = dashboardResult;

      const metrics = calculateMetrics(activeExperiments);
      const experiments = activeExperiments.map(transformExperiment);
      const alerts = alertsResult?.alerts.map(transformAlert) ||
        criticalAlerts.map((alert, index) => transformAlert(alert, index));

      const newData: MonitoringData = {
        experiments,
        alerts,
        metrics: {
          ...metrics,
          totalRequests: totalRequests24h,
          activeExperiments: totalActiveTests,
          criticalAlerts: criticalAlerts.length,
        },
        loading: false,
        error: null,
        lastUpdated: new Date(),
      };

      setData(newData);
      onUpdate?.(newData);

    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error("Unknown error");
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      onError?.(error);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchDashboardData, fetchAlertsData, onError, onUpdate]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchData();

    // Set up auto-refresh if enabled
    if (autoRefresh && refreshInterval) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refreshInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    ...data,
    isRefreshing,
    refresh,
  };
}

// Convenience hooks for specific data types
export function useExperiments(options?: UseMonitoringDataOptions) {
  const data = useMonitoringData(options);
  return {
    experiments: data.experiments,
    loading: data.loading,
    error: data.error,
    refresh: data.refresh,
  };
}

export function useAlerts(options?: UseMonitoringDataOptions) {
  const data = useMonitoringData(options);
  return {
    alerts: data.alerts,
    criticalCount: data.metrics.criticalAlerts,
    loading: data.loading,
    error: data.error,
    refresh: data.refresh,
  };
}

export function useMetrics(options?: UseMonitoringDataOptions) {
  const data = useMonitoringData(options);
  return {
    metrics: data.metrics,
    loading: data.loading,
    error: data.error,
    lastUpdated: data.lastUpdated,
    refresh: data.refresh,
  };
}
