/**
 * Auto-Promotion System Tests
 * Comprehensive tests for experiment winner promotion logic
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PromotionConfig, PromotionEligibility } from "../auto-promotion";

// Mock dependencies
vi.mock("@/lib/db/supabase-sql", () => ({
  sql: vi.fn(),
}));

vi.mock("../ab-test-metrics", () => ({
  compareExperimentVariants: vi.fn(),
}));

vi.mock("@/lib/notifications");

// Import the module under test after setting up mocks
import {
  checkPromotionEligibility,
  promoteWinner,
  rollbackPromotion,
  getPromotionHistory,
  DEFAULT_PROMOTION_CONFIG,
} from "../auto-promotion";

// Import the mocked module to get access to the mock function
import { compareExperimentVariants } from "../ab-test-metrics";
const mockCompareExperimentVariants = vi.mocked(compareExperimentVariants);

describe("Auto-Promotion System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkPromotionEligibility", () => {
    it("should pass all safety checks for a winning variant", async () => {
      // Mock comparison result with clear winner
      const mockComparison = {
        experimentName: "test-experiment",
        experimentId: "exp-123",
        isActive: true,
        startDate: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours ago
        variants: [
          {
            variantId: "control-id",
            variantName: "control",
            successRate: 0.8,
            errorRate: 0.02,
            sampleSize: 2000,
            p95LatencyMs: 200,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 150,
            p50LatencyMs: 140,
            p99LatencyMs: 250,
            errorCount: 40,
            startDate: new Date(),
            endDate: new Date(),
          },
          {
            variantId: "variant-a-id",
            variantName: "variant-a",
            successRate: 0.9, // 12.5% improvement
            errorRate: 0.015,
            sampleSize: 2000,
            p95LatencyMs: 180,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 140,
            p50LatencyMs: 130,
            p99LatencyMs: 220,
            errorCount: 30,
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
        hasStatisticalSignificance: true,
        winningVariant: "variant-a",
        confidenceLevel: 95.5,
        totalRequests: 4000,
        totalUsers: 3000,
        alerts: [],
      };

      mockCompareExperimentVariants.mockResolvedValue(mockComparison);

      const eligibility = await checkPromotionEligibility("test-experiment");

      expect(eligibility.isEligible).toBe(true);
      expect(eligibility.winner).toBe("variant-a");
      expect(eligibility.confidence).toBe(95.5);
      expect(eligibility.safetyChecks.minSampleSize).toBe(true);
      expect(eligibility.safetyChecks.minConfidence).toBe(true);
      expect(eligibility.safetyChecks.minImprovement).toBe(true);
      expect(eligibility.safetyChecks.minRuntime).toBe(true);
      expect(eligibility.safetyChecks.errorRateAcceptable).toBe(true);
    });

    it("should reject when sample size is insufficient", async () => {
      const mockComparison = {
        experimentName: "test-experiment",
        experimentId: "exp-123",
        isActive: true,
        startDate: new Date(Date.now() - 72 * 60 * 60 * 1000),
        variants: [
          {
            variantId: "control-id",
            variantName: "control",
            successRate: 0.8,
            errorRate: 0.02,
            sampleSize: 50, // Too small
            p95LatencyMs: 200,
            totalRequests: 50,
            uniqueUsers: 40,
            trafficPercentage: 50,
            avgLatencyMs: 150,
            p50LatencyMs: 140,
            p99LatencyMs: 250,
            errorCount: 1,
            startDate: new Date(),
            endDate: new Date(),
          },
          {
            variantId: "variant-a-id",
            variantName: "variant-a",
            successRate: 0.9,
            errorRate: 0.01,
            sampleSize: 50, // Too small
            p95LatencyMs: 180,
            totalRequests: 50,
            uniqueUsers: 40,
            trafficPercentage: 50,
            avgLatencyMs: 140,
            p50LatencyMs: 130,
            p99LatencyMs: 220,
            errorCount: 1,
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
        hasStatisticalSignificance: false,
        confidenceLevel: 60.0,
        totalRequests: 100,
        totalUsers: 80,
        alerts: [],
      };

      mockCompareExperimentVariants.mockResolvedValue(mockComparison);

      const eligibility = await checkPromotionEligibility("test-experiment");

      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.safetyChecks.minSampleSize).toBe(false);
      expect(eligibility.reasons.some(r => r.includes("Insufficient sample size"))).toBe(true);
    });

    it("should reject when improvement is below threshold", async () => {
      const mockComparison = {
        experimentName: "test-experiment",
        experimentId: "exp-123",
        isActive: true,
        startDate: new Date(Date.now() - 72 * 60 * 60 * 1000),
        variants: [
          {
            variantId: "control-id",
            variantName: "control",
            successRate: 0.8,
            errorRate: 0.02,
            sampleSize: 2000,
            p95LatencyMs: 200,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 150,
            p50LatencyMs: 140,
            p99LatencyMs: 250,
            errorCount: 40,
            startDate: new Date(),
            endDate: new Date(),
          },
          {
            variantId: "variant-a-id",
            variantName: "variant-a",
            successRate: 0.82, // Only 2.5% improvement - below 5% threshold
            errorRate: 0.015,
            sampleSize: 2000,
            p95LatencyMs: 180,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 140,
            p50LatencyMs: 130,
            p99LatencyMs: 220,
            errorCount: 30,
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
        hasStatisticalSignificance: true,
        winningVariant: "variant-a",
        confidenceLevel: 95.0,
        totalRequests: 4000,
        totalUsers: 3000,
        alerts: [],
      };

      mockCompareExperimentVariants.mockResolvedValue(mockComparison);

      const eligibility = await checkPromotionEligibility("test-experiment");

      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.safetyChecks.minImprovement).toBe(false);
      expect(eligibility.reasons.some(r => r.includes("Improvement below threshold"))).toBe(true);
    });

    it("should reject when runtime is too short", async () => {
      const mockComparison = {
        experimentName: "test-experiment",
        experimentId: "exp-123",
        isActive: true,
        startDate: new Date(Date.now() - 12 * 60 * 60 * 1000), // Only 12 hours ago
        variants: [
          {
            variantId: "control-id",
            variantName: "control",
            successRate: 0.8,
            errorRate: 0.02,
            sampleSize: 2000,
            p95LatencyMs: 200,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 150,
            p50LatencyMs: 140,
            p99LatencyMs: 250,
            errorCount: 40,
            startDate: new Date(),
            endDate: new Date(),
          },
          {
            variantId: "variant-a-id",
            variantName: "variant-a",
            successRate: 0.9,
            errorRate: 0.015,
            sampleSize: 2000,
            p95LatencyMs: 180,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 140,
            p50LatencyMs: 130,
            p99LatencyMs: 220,
            errorCount: 30,
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
        hasStatisticalSignificance: true,
        winningVariant: "variant-a",
        confidenceLevel: 95.5,
        totalRequests: 4000,
        totalUsers: 3000,
        alerts: [],
      };

      mockCompareExperimentVariants.mockResolvedValue(mockComparison);

      const eligibility = await checkPromotionEligibility("test-experiment");

      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.safetyChecks.minRuntime).toBe(false);
      expect(eligibility.reasons.some(r => r.includes("runtime too short"))).toBe(true);
    });

    it("should warn when winner has higher error rate than control", async () => {
      const mockComparison = {
        experimentName: "test-experiment",
        experimentId: "exp-123",
        isActive: true,
        startDate: new Date(Date.now() - 72 * 60 * 60 * 1000),
        variants: [
          {
            variantId: "control-id",
            variantName: "control",
            successRate: 0.8,
            errorRate: 0.01, // Lower than winner
            sampleSize: 2000,
            p95LatencyMs: 200,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 150,
            p50LatencyMs: 140,
            p99LatencyMs: 250,
            errorCount: 20,
            startDate: new Date(),
            endDate: new Date(),
          },
          {
            variantId: "variant-a-id",
            variantName: "variant-a",
            successRate: 0.9,
            errorRate: 0.03, // Higher than control but still acceptable
            sampleSize: 2000,
            p95LatencyMs: 180,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 140,
            p50LatencyMs: 130,
            p99LatencyMs: 220,
            errorCount: 60,
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
        hasStatisticalSignificance: true,
        winningVariant: "variant-a",
        confidenceLevel: 95.5,
        totalRequests: 4000,
        totalUsers: 3000,
        alerts: [],
      };

      mockCompareExperimentVariants.mockResolvedValue(mockComparison);

      const eligibility = await checkPromotionEligibility("test-experiment");

      expect(eligibility.isEligible).toBe(true);
      expect(eligibility.warnings.some(w => w.includes("higher error rate than control"))).toBe(true);
    });

    it("should handle control being the winner gracefully", async () => {
      const mockComparison = {
        experimentName: "test-experiment",
        experimentId: "exp-123",
        isActive: true,
        startDate: new Date(Date.now() - 72 * 60 * 60 * 1000),
        variants: [
          {
            variantId: "control-id",
            variantName: "control",
            successRate: 0.9, // Control is best
            errorRate: 0.01,
            sampleSize: 2000,
            p95LatencyMs: 180,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 140,
            p50LatencyMs: 130,
            p99LatencyMs: 220,
            errorCount: 20,
            startDate: new Date(),
            endDate: new Date(),
          },
          {
            variantId: "variant-a-id",
            variantName: "variant-a",
            successRate: 0.8,
            errorRate: 0.02,
            sampleSize: 2000,
            p95LatencyMs: 200,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 150,
            p50LatencyMs: 140,
            p99LatencyMs: 250,
            errorCount: 40,
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
        hasStatisticalSignificance: false,
        totalRequests: 4000,
        totalUsers: 3000,
        alerts: [],
      };

      mockCompareExperimentVariants.mockResolvedValue(mockComparison);

      const eligibility = await checkPromotionEligibility("test-experiment");

      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.reasons.some(r => r.includes("Control is the best performing variant"))).toBe(true);
    });
  });

  describe("Custom promotion config", () => {
    it("should respect custom thresholds", async () => {
      const customConfig: PromotionConfig = {
        minSampleSize: 5000, // Much higher
        minConfidenceLevel: 99.0, // Much higher
        minImprovementPercent: 10.0, // Much higher
        minRuntimeHours: 168, // 1 week
        maxErrorRate: 0.01, // Much stricter
        requireManualApproval: false,
      };

      const mockComparison = {
        experimentName: "test-experiment",
        experimentId: "exp-123",
        isActive: true,
        startDate: new Date(Date.now() - 72 * 60 * 60 * 1000),
        variants: [
          {
            variantId: "control-id",
            variantName: "control",
            successRate: 0.8,
            errorRate: 0.02,
            sampleSize: 2000, // Below custom threshold
            p95LatencyMs: 200,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 150,
            p50LatencyMs: 140,
            p99LatencyMs: 250,
            errorCount: 40,
            startDate: new Date(),
            endDate: new Date(),
          },
          {
            variantId: "variant-a-id",
            variantName: "variant-a",
            successRate: 0.9,
            errorRate: 0.015,
            sampleSize: 2000, // Below custom threshold
            p95LatencyMs: 180,
            totalRequests: 2000,
            uniqueUsers: 1500,
            trafficPercentage: 50,
            avgLatencyMs: 140,
            p50LatencyMs: 130,
            p99LatencyMs: 220,
            errorCount: 30,
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
        hasStatisticalSignificance: true,
        winningVariant: "variant-a",
        confidenceLevel: 95.5, // Below custom threshold
        totalRequests: 4000,
        totalUsers: 3000,
        alerts: [],
      };

      mockCompareExperimentVariants.mockResolvedValue(mockComparison);

      const eligibility = await checkPromotionEligibility(
        "test-experiment",
        customConfig
      );

      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.reasons.length).toBeGreaterThan(0);
    });
  });
});
