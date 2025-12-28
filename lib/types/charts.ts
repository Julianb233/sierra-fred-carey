/**
 * Chart data types for monitoring dashboard
 */

export type TimeRange = "24h" | "7d" | "30d";

export interface BaseChartDataPoint {
  timestamp: number;
  date: string;
}

export interface ConversionDataPoint extends BaseChartDataPoint {
  variantA: number;
  variantB: number;
  variantC?: number;
}

export interface LatencyDataPoint extends BaseChartDataPoint {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}

export interface TrafficDataPoint {
  variant: string;
  traffic: number;
  percentage: number;
  fill: string;
}

export interface ErrorRateDataPoint extends BaseChartDataPoint {
  errorRate: number;
  threshold: number;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

export interface ChartLegendProps {
  payload?: Array<{
    value: string;
    type: string;
    id: string;
    color: string;
    dataKey: string;
  }>;
  onClick?: (dataKey: string) => void;
  hiddenSeries?: Set<string>;
}
