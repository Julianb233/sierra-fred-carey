import {
  ConversionDataPoint,
  LatencyDataPoint,
  TrafficDataPoint,
  ErrorRateDataPoint,
  TimeRange,
} from "@/lib/types/charts";

const HOURS_IN_DAY = 24;
const DAYS_IN_WEEK = 7;
const DAYS_IN_MONTH = 30;

function getDataPointsCount(range: TimeRange): number {
  switch (range) {
    case "24h":
      return HOURS_IN_DAY;
    case "7d":
      return DAYS_IN_WEEK;
    case "30d":
      return DAYS_IN_MONTH;
  }
}

function getIntervalMs(range: TimeRange): number {
  switch (range) {
    case "24h":
      return 60 * 60 * 1000; // 1 hour
    case "7d":
      return 24 * 60 * 60 * 1000; // 1 day
    case "30d":
      return 24 * 60 * 60 * 1000; // 1 day
  }
}

export function generateConversionData(range: TimeRange): ConversionDataPoint[] {
  const count = getDataPointsCount(range);
  const interval = getIntervalMs(range);
  const now = Date.now();
  const data: ConversionDataPoint[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i - 1) * interval;
    const date = new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: range === "24h" ? "numeric" : undefined,
    });

    // Generate realistic conversion rates with trends
    const baseA = 3.5;
    const baseB = 4.2;
    const noise = () => (Math.random() - 0.5) * 0.5;

    data.push({
      timestamp,
      date,
      variantA: Number((baseA + noise() + (i / count) * 0.3).toFixed(2)),
      variantB: Number((baseB + noise() + (i / count) * 0.5).toFixed(2)),
      variantC: Number(((baseA + baseB) / 2 + noise()).toFixed(2)),
    });
  }

  return data;
}

export function generateLatencyData(range: TimeRange): LatencyDataPoint[] {
  const count = getDataPointsCount(range);
  const interval = getIntervalMs(range);
  const now = Date.now();
  const data: LatencyDataPoint[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i - 1) * interval;
    const date = new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: range === "24h" ? "numeric" : undefined,
    });

    // Generate realistic latency distribution
    const baseLatency = 120;
    const spike = i % 8 === 0 ? 50 : 0; // Occasional spikes
    const trend = (i / count) * 20; // Slight upward trend

    const avg = baseLatency + trend + spike + (Math.random() - 0.5) * 10;

    data.push({
      timestamp,
      date,
      avg: Number(avg.toFixed(0)),
      p50: Number((avg * 0.7).toFixed(0)),
      p95: Number((avg * 1.5).toFixed(0)),
      p99: Number((avg * 2.2).toFixed(0)),
    });
  }

  return data;
}

export function generateTrafficData(): TrafficDataPoint[] {
  const variants = [
    { name: "Variant A", percentage: 45, color: "#3b82f6" },
    { name: "Variant B", percentage: 35, color: "#10b981" },
    { name: "Variant C", percentage: 20, color: "#f59e0b" },
  ];

  return variants.map((variant) => ({
    variant: variant.name,
    traffic: variant.percentage * 1000, // Simulate actual traffic numbers
    percentage: variant.percentage,
    fill: variant.color,
  }));
}

export function generateErrorRateData(range: TimeRange): ErrorRateDataPoint[] {
  const count = getDataPointsCount(range);
  const interval = getIntervalMs(range);
  const now = Date.now();
  const data: ErrorRateDataPoint[] = [];
  const threshold = 2.0; // 2% error rate threshold

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i - 1) * interval;
    const date = new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: range === "24h" ? "numeric" : undefined,
    });

    // Generate error rates with occasional spikes
    const baseRate = 0.5;
    const spike = Math.random() > 0.9 ? 2.5 : 0; // 10% chance of spike
    const errorRate = baseRate + spike + (Math.random() - 0.5) * 0.3;

    data.push({
      timestamp,
      date,
      errorRate: Number(errorRate.toFixed(2)),
      threshold,
    });
  }

  return data;
}
