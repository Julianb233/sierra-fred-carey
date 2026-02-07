/**
 * Monitoring Dashboard Types
 * Centralized type definitions for the monitoring system
 */

import type { ExperimentComparison, Alert as MonitoringAlert, VariantMetrics } from "@/lib/monitoring/ab-test-metrics";

// API Response Types
export interface DashboardResponse {
  success: boolean;
  data: {
    activeExperiments: ExperimentComparison[];
    totalActiveTests: number;
    totalRequests24h: number;
    criticalAlerts: MonitoringAlert[];
  };
  timestamp: string;
}

export interface AlertsResponse {
  success: boolean;
  data: {
    alerts: MonitoringAlert[];
    total: number;
    breakdown: {
      critical: number;
      warning: number;
      info: number;
    };
  };
  timestamp: string;
}

export interface ExperimentDetailResponse {
  success: boolean;
  data: ExperimentComparison;
  timeRange: {
    startDate: string;
    endDate: string;
  };
  timestamp: string;
}

// UI Component Types
export interface DashboardMetrics {
  totalRequests: number;
  avgLatency: number;
  successRate: number;
  errorRate: number;
  activeExperiments: number;
  criticalAlerts: number;
}

export interface UIExperiment {
  id: string;
  name: string;
  status: "active" | "completed" | "paused" | "draft";
  variants: string[];
  traffic: number;
  startDate: string;
  endDate?: string;
  winner?: string;
  significance?: number;
  isActive?: boolean;
  variantCount?: number;
  totalRequests?: number;
  avgLatency?: number;
  errorRate?: number;
}

export interface UIAlert {
  id: string;
  type: "error" | "warning" | "info" | "success";
  message: string;
  timestamp: string;
  source?: string;
  resolved?: boolean;
}

export interface UIVariant {
  name: string;
  conversions: number;
  visitors: number;
  conversionRate: number;
  improvement?: number;
  isControl?: boolean;
  isWinner?: boolean;
  latency?: number;
  errorRate?: number;
}

// Chart Data Types
export interface ChartDataPoint {
  time: string;
  requests: number;
  latency: number;
  errors: number;
}

export interface VariantChartData {
  variant: string;
  conversions: number;
  conversionRate: number;
  latency: number;
}

// Transformer Functions
export function transformExperiment(exp: ExperimentComparison): UIExperiment {
  const variantNames = exp.variants.map(v => v.variantName);
  const avgTraffic = exp.variants.length > 0
    ? exp.variants.reduce((sum, v) => sum + v.trafficPercentage, 0) / exp.variants.length
    : 0;

  const totalRequests = exp.variants.reduce((sum, v) => sum + v.totalRequests, 0);
  const avgLatency = exp.variants.length > 0
    ? exp.variants.reduce((sum, v) => sum + v.avgLatencyMs, 0) / exp.variants.length
    : 0;
  const avgErrorRate = exp.variants.length > 0
    ? exp.variants.reduce((sum, v) => sum + v.errorRate, 0) / exp.variants.length
    : 0;

  return {
    id: exp.experimentId,
    name: exp.experimentName,
    status: exp.isActive ? "active" : "completed",
    variants: variantNames,
    traffic: avgTraffic,
    startDate: exp.startDate.toISOString(),
    endDate: exp.endDate?.toISOString(),
    winner: exp.winningVariant,
    significance: exp.confidenceLevel,
    isActive: exp.isActive,
    variantCount: exp.variants.length,
    totalRequests,
    avgLatency: Math.round(avgLatency),
    errorRate: avgErrorRate,
  };
}

export function transformAlert(alert: MonitoringAlert, index: number): UIAlert {
  const typeMap: Record<string, "error" | "warning" | "info" | "success"> = {
    critical: "error",
    warning: "warning",
    info: "info",
  };

  return {
    id: `alert-${index}-${alert.timestamp.getTime()}`,
    type: typeMap[alert.level] || "info",
    message: alert.message,
    timestamp: alert.timestamp.toISOString(),
    source: alert.type,
    resolved: false,
  };
}

export function transformVariant(variant: VariantMetrics, controlRate?: number): UIVariant {
  const conversionRate = variant.conversionRate || 0;
  const improvement = controlRate && controlRate > 0
    ? ((conversionRate - controlRate) / controlRate) * 100
    : undefined;

  return {
    name: variant.variantName,
    conversions: variant.conversions || 0,
    visitors: variant.totalRequests,
    conversionRate,
    improvement,
    isControl: variant.variantName.toLowerCase() === "control",
    isWinner: false, // Will be set by caller
    latency: variant.avgLatencyMs,
    errorRate: variant.errorRate,
  };
}

// Utility Functions
export function calculateMetrics(experiments: ExperimentComparison[]): DashboardMetrics {
  const allVariants = experiments.flatMap(exp => exp.variants);
  const totalVariants = allVariants.length;

  const avgLatency = totalVariants > 0
    ? allVariants.reduce((sum, v) => sum + v.avgLatencyMs, 0) / totalVariants
    : 0;

  const avgErrorRate = totalVariants > 0
    ? allVariants.reduce((sum, v) => sum + v.errorRate, 0) / totalVariants
    : 0;

  const totalRequests = experiments.reduce((sum, exp) => sum + exp.totalRequests, 0);
  const criticalAlerts = experiments.flatMap(exp => exp.alerts).filter(a => a.level === "critical").length;

  return {
    totalRequests,
    avgLatency: Math.round(avgLatency),
    successRate: (1 - avgErrorRate) * 100,
    errorRate: avgErrorRate,
    activeExperiments: experiments.filter(e => e.isActive).length,
    criticalAlerts,
  };
}

export function generateChartData(
  totalRequests: number,
  avgLatency: number,
  errorRate: number,
  hours: number = 24
): ChartDataPoint[] {
  const now = Date.now();
  const data: ChartDataPoint[] = [];

  for (let i = hours - 1; i >= 0; i--) {
    const hour = new Date(now - i * 60 * 60 * 1000);
    const hourStr = hour.getHours().toString().padStart(2, '0') + ':00';

    data.push({
      time: hourStr,
      requests: Math.floor(totalRequests / hours * (0.8 + Math.random() * 0.4)),
      latency: Math.floor(avgLatency * (0.8 + Math.random() * 0.4)),
      errors: Math.floor(totalRequests * errorRate / hours * (0.5 + Math.random() * 1.5)),
    });
  }

  return data;
}
