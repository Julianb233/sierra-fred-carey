/**
 * Monitoring Components Test Suite
 * Tests for the monitoring dashboard components
 */

import { describe, it, expect, vi } from "vitest";
import type { UIExperiment, UIAlert } from "@/types/monitoring";
import {
  transformExperiment,
  transformAlert,
  calculateMetrics,
  generateChartData,
} from "@/types/monitoring";
import type { ExperimentComparison, VariantMetrics, Alert } from "@/lib/monitoring/ab-test-metrics";

// Mock experiment data
const mockVariant: VariantMetrics = {
  variantName: "control",
  totalRequests: 1000,
  conversions: 100,
  conversionRate: 0.10,
  avgLatencyMs: 120,
  errorRate: 0.01,
  trafficPercentage: 50,
};

const mockExperiment: ExperimentComparison = {
  experimentId: "exp-001",
  experimentName: "Hero CTA Test",
  isActive: true,
  startDate: new Date("2025-01-01"),
  endDate: undefined,
  totalRequests: 2000,
  variants: [
    mockVariant,
    {
      ...mockVariant,
      variantName: "variant-a",
      conversionRate: 0.15,
    },
  ],
  winningVariant: "variant-a",
  confidenceLevel: 95,
  alerts: [],
};

const mockAlert: Alert = {
  level: "critical",
  message: "High error rate detected",
  type: "error_rate",
  timestamp: new Date("2025-01-15T10:00:00Z"),
};

describe("Monitoring Type Transformers", () => {
  it("should transform experiment to UI format", () => {
    const uiExperiment = transformExperiment(mockExperiment);

    expect(uiExperiment).toMatchObject({
      id: "exp-001",
      name: "Hero CTA Test",
      status: "active",
      variants: ["control", "variant-a"],
      winner: "variant-a",
      significance: 95,
    });
  });

  it("should transform alert to UI format", () => {
    const uiAlert = transformAlert(mockAlert, 0);

    expect(uiAlert).toMatchObject({
      type: "error",
      message: "High error rate detected",
      source: "error_rate",
      resolved: false,
    });
  });

  it("should calculate aggregate metrics correctly", () => {
    const experiments = [mockExperiment];
    const metrics = calculateMetrics(experiments);

    expect(metrics.totalRequests).toBe(2000);
    expect(metrics.activeExperiments).toBe(1);
    expect(metrics.avgLatency).toBeGreaterThan(0);
    expect(metrics.errorRate).toBeGreaterThan(0);
    expect(metrics.successRate).toBeLessThan(100);
  });

  it("should generate chart data with correct structure", () => {
    const chartData = generateChartData(10000, 120, 0.02, 24);

    expect(chartData).toHaveLength(24);
    chartData.forEach((point) => {
      expect(point).toHaveProperty("time");
      expect(point).toHaveProperty("requests");
      expect(point).toHaveProperty("latency");
      expect(point).toHaveProperty("errors");
    });
  });
});

describe("Experiment Filtering", () => {
  const mockExperiments: UIExperiment[] = [
    {
      id: "exp-001",
      name: "Hero CTA Test",
      status: "active",
      variants: ["control", "variant-a"],
      traffic: 50,
      startDate: "2025-01-01T00:00:00Z",
      significance: 95,
    },
    {
      id: "exp-002",
      name: "Pricing Page Layout",
      status: "completed",
      variants: ["control", "variant-b"],
      traffic: 100,
      startDate: "2024-12-01T00:00:00Z",
      endDate: "2024-12-15T00:00:00Z",
      winner: "variant-b",
      significance: 98,
    },
    {
      id: "exp-003",
      name: "Navigation Test",
      status: "paused",
      variants: ["control", "variant-c"],
      traffic: 25,
      startDate: "2024-11-01T00:00:00Z",
      significance: 45,
    },
  ];

  it("should filter experiments by search term", () => {
    const filtered = mockExperiments.filter((exp) =>
      exp.name.toLowerCase().includes("pricing")
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Pricing Page Layout");
  });

  it("should filter experiments by status", () => {
    const activeExperiments = mockExperiments.filter((exp) => exp.status === "active");
    expect(activeExperiments).toHaveLength(1);

    const completedExperiments = mockExperiments.filter((exp) => exp.status === "completed");
    expect(completedExperiments).toHaveLength(1);
  });

  it("should filter experiments by minimum significance", () => {
    const significantExperiments = mockExperiments.filter(
      (exp) => exp.significance && exp.significance >= 90
    );
    expect(significantExperiments).toHaveLength(2);
  });

  it("should sort experiments by name", () => {
    const sorted = [...mockExperiments].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted[0].name).toBe("Hero CTA Test");
    expect(sorted[2].name).toBe("Pricing Page Layout");
  });

  it("should sort experiments by date", () => {
    const sorted = [...mockExperiments].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    expect(sorted[0].name).toBe("Hero CTA Test");
    expect(sorted[2].name).toBe("Navigation Test");
  });

  it("should sort experiments by significance", () => {
    const sorted = [...mockExperiments].sort(
      (a, b) => (b.significance || 0) - (a.significance || 0)
    );
    expect(sorted[0].significance).toBe(98);
    expect(sorted[2].significance).toBe(45);
  });
});

describe("Export Functionality", () => {
  const mockExperiments: UIExperiment[] = [
    {
      id: "exp-001",
      name: "Test Experiment",
      status: "active",
      variants: ["control", "variant-a"],
      traffic: 50,
      startDate: "2025-01-01T00:00:00Z",
      significance: 95,
    },
  ];

  it("should convert experiments to CSV format", () => {
    const csv = convertToCSV(mockExperiments);
    expect(csv).toContain("Name,Status,Variants");
    expect(csv).toContain("Test Experiment");
    expect(csv).toContain("active");
  });

  it("should convert experiments to JSON format", () => {
    const json = JSON.stringify(mockExperiments, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Test Experiment");
  });
});

// Helper function for CSV conversion (mirrors component logic)
function convertToCSV(data: UIExperiment[]): string {
  if (data.length === 0) return "";

  const headers = ["Name", "Status", "Variants", "Traffic %", "Start Date", "End Date", "Winner", "Significance %"];
  const rows = data.map((exp) => [
    exp.name,
    exp.status,
    exp.variants.join("; "),
    exp.traffic,
    exp.startDate,
    exp.endDate || "",
    exp.winner || "",
    exp.significance || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

describe("Date Range Utilities", () => {
  it("should calculate correct date range for 1 hour", () => {
    const now = new Date();
    const from = new Date();
    from.setHours(now.getHours() - 1);

    expect(from.getTime()).toBeLessThan(now.getTime());
    expect(now.getTime() - from.getTime()).toBeCloseTo(3600000, -3); // ~1 hour in ms
  });

  it("should calculate correct date range for 7 days", () => {
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - 7);

    expect(from.getTime()).toBeLessThan(now.getTime());
    expect(now.getTime() - from.getTime()).toBeCloseTo(604800000, -5); // ~7 days in ms
  });

  it("should format date range correctly", () => {
    const from = new Date("2025-01-01");
    const to = new Date("2025-01-07");

    const fromStr = from.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const toStr = to.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    expect(fromStr).toMatch(/Jan/);
    expect(toStr).toMatch(/Jan/);
  });
});
