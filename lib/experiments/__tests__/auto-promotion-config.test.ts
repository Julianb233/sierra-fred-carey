/**
 * Tests for Auto-Promotion Configuration
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateAutoPromotionConfig,
  loadAutoPromotionConfig,
  DEFAULT_AUTO_PROMOTION_CONFIG,
  AUTO_PROMOTION_PRESETS,
  AutoPromotionConfig,
} from "../auto-promotion-config";

describe("Auto-Promotion Configuration", () => {
  describe("validateAutoPromotionConfig", () => {
    it("should validate a valid configuration", () => {
      const result = validateAutoPromotionConfig(DEFAULT_AUTO_PROMOTION_CONFIG);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid minConfidence", () => {
      const config: AutoPromotionConfig = {
        ...DEFAULT_AUTO_PROMOTION_CONFIG,
        thresholds: {
          ...DEFAULT_AUTO_PROMOTION_CONFIG.thresholds,
          minConfidence: 150, // Invalid: > 100
        },
      };

      const result = validateAutoPromotionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("minConfidence must be between 0 and 100");
    });

    it("should reject negative minConfidence", () => {
      const config: AutoPromotionConfig = {
        ...DEFAULT_AUTO_PROMOTION_CONFIG,
        thresholds: {
          ...DEFAULT_AUTO_PROMOTION_CONFIG.thresholds,
          minConfidence: -5,
        },
      };

      const result = validateAutoPromotionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("minConfidence must be between 0 and 100");
    });

    it("should reject zero minSampleSize", () => {
      const config: AutoPromotionConfig = {
        ...DEFAULT_AUTO_PROMOTION_CONFIG,
        thresholds: {
          ...DEFAULT_AUTO_PROMOTION_CONFIG.thresholds,
          minSampleSize: 0,
        },
      };

      const result = validateAutoPromotionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("minSampleSize must be at least 1");
    });

    it("should reject negative minImprovement", () => {
      const config: AutoPromotionConfig = {
        ...DEFAULT_AUTO_PROMOTION_CONFIG,
        thresholds: {
          ...DEFAULT_AUTO_PROMOTION_CONFIG.thresholds,
          minImprovement: -10,
        },
      };

      const result = validateAutoPromotionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("minImprovement must be non-negative");
    });

    it("should reject invalid maxErrorRate", () => {
      const config: AutoPromotionConfig = {
        ...DEFAULT_AUTO_PROMOTION_CONFIG,
        thresholds: {
          ...DEFAULT_AUTO_PROMOTION_CONFIG.thresholds,
          maxErrorRate: 1.5, // Invalid: > 1
        },
      };

      const result = validateAutoPromotionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("maxErrorRate must be between 0 and 1");
    });

    it("should reject negative alertLookbackHours", () => {
      const config: AutoPromotionConfig = {
        ...DEFAULT_AUTO_PROMOTION_CONFIG,
        safetyChecks: {
          ...DEFAULT_AUTO_PROMOTION_CONFIG.safetyChecks,
          alertLookbackHours: -24,
        },
      };

      const result = validateAutoPromotionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("alertLookbackHours must be non-negative");
    });

    it("should reject zero maxConcurrentPromotions", () => {
      const config: AutoPromotionConfig = {
        ...DEFAULT_AUTO_PROMOTION_CONFIG,
        maxConcurrentPromotions: 0,
      };

      const result = validateAutoPromotionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("maxConcurrentPromotions must be at least 1");
    });

    it("should accumulate multiple errors", () => {
      const config: AutoPromotionConfig = {
        ...DEFAULT_AUTO_PROMOTION_CONFIG,
        thresholds: {
          ...DEFAULT_AUTO_PROMOTION_CONFIG.thresholds,
          minConfidence: 150,
          minSampleSize: 0,
          maxErrorRate: 2,
        },
        maxConcurrentPromotions: 0,
      };

      const result = validateAutoPromotionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("loadAutoPromotionConfig", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should load default configuration", () => {
      const config = loadAutoPromotionConfig();
      expect(config.thresholds.minConfidence).toBe(95.0);
      expect(config.thresholds.minSampleSize).toBe(1000);
    });

    it("should apply aggressive preset", () => {
      const config = loadAutoPromotionConfig("aggressive");
      expect(config.thresholds.minConfidence).toBe(90.0);
      expect(config.thresholds.minSampleSize).toBe(500);
      expect(config.thresholds.minRuntimeHours).toBe(12);
    });

    it("should apply conservative preset", () => {
      const config = loadAutoPromotionConfig("conservative");
      expect(config.thresholds.minConfidence).toBe(99.0);
      expect(config.thresholds.minSampleSize).toBe(5000);
      expect(config.thresholds.minRuntimeHours).toBe(72);
    });

    it("should apply balanced preset", () => {
      const config = loadAutoPromotionConfig("balanced");
      expect(config.thresholds.minConfidence).toBe(95.0);
      expect(config.thresholds.minSampleSize).toBe(2000);
      expect(config.thresholds.minRuntimeHours).toBe(24);
    });

    it("should override with environment variables", () => {
      process.env.AUTO_PROMOTION_MIN_CONFIDENCE = "92.5";
      process.env.AUTO_PROMOTION_MIN_SAMPLE_SIZE = "1500";
      process.env.AUTO_PROMOTION_MIN_IMPROVEMENT = "7.5";
      process.env.AUTO_PROMOTION_MIN_RUNTIME_HOURS = "36";

      const config = loadAutoPromotionConfig();

      expect(config.thresholds.minConfidence).toBe(92.5);
      expect(config.thresholds.minSampleSize).toBe(1500);
      expect(config.thresholds.minImprovement).toBe(7.5);
      expect(config.thresholds.minRuntimeHours).toBe(36);
    });

    it("should parse excluded experiments from environment", () => {
      process.env.AUTO_PROMOTION_EXCLUDED = "exp1,exp2,exp3";

      const config = loadAutoPromotionConfig();

      expect(config.excludedExperiments).toEqual(["exp1", "exp2", "exp3"]);
    });

    it("should handle empty excluded experiments", () => {
      process.env.AUTO_PROMOTION_EXCLUDED = "";

      const config = loadAutoPromotionConfig();

      expect(config.excludedExperiments).toEqual([]);
    });
  });

  describe("Preset Configurations", () => {
    it("should have all required presets", () => {
      expect(AUTO_PROMOTION_PRESETS).toHaveProperty("aggressive");
      expect(AUTO_PROMOTION_PRESETS).toHaveProperty("conservative");
      expect(AUTO_PROMOTION_PRESETS).toHaveProperty("balanced");
    });

    it("should have valid aggressive preset", () => {
      const preset = AUTO_PROMOTION_PRESETS.aggressive;
      expect(preset.thresholds).toBeDefined();
      expect(preset.thresholds!.minConfidence).toBeLessThan(
        DEFAULT_AUTO_PROMOTION_CONFIG.thresholds.minConfidence
      );
    });

    it("should have valid conservative preset", () => {
      const preset = AUTO_PROMOTION_PRESETS.conservative;
      expect(preset.thresholds).toBeDefined();
      expect(preset.thresholds!.minConfidence).toBeGreaterThan(
        DEFAULT_AUTO_PROMOTION_CONFIG.thresholds.minConfidence
      );
    });
  });

  describe("Default Configuration", () => {
    it("should have enabled flag based on environment", () => {
      const config = DEFAULT_AUTO_PROMOTION_CONFIG;
      expect(typeof config.enabled).toBe("boolean");
    });

    it("should have valid threshold values", () => {
      const { thresholds } = DEFAULT_AUTO_PROMOTION_CONFIG;
      expect(thresholds.minConfidence).toBeGreaterThanOrEqual(0);
      expect(thresholds.minConfidence).toBeLessThanOrEqual(100);
      expect(thresholds.minSampleSize).toBeGreaterThan(0);
      expect(thresholds.minImprovement).toBeGreaterThanOrEqual(0);
      expect(thresholds.minRuntimeHours).toBeGreaterThanOrEqual(0);
      expect(thresholds.maxErrorRate).toBeGreaterThanOrEqual(0);
      expect(thresholds.maxErrorRate).toBeLessThanOrEqual(1);
    });

    it("should have all safety checks enabled by default", () => {
      const { safetyChecks } = DEFAULT_AUTO_PROMOTION_CONFIG;
      expect(safetyChecks.checkErrorRates).toBe(true);
      expect(safetyChecks.checkLatency).toBe(true);
      expect(safetyChecks.checkTrafficBalance).toBe(true);
      expect(safetyChecks.checkRecentAlerts).toBe(true);
    });

    it("should have notifications enabled by default", () => {
      const { notifications } = DEFAULT_AUTO_PROMOTION_CONFIG;
      expect(notifications.enabled).toBe(true);
      expect(notifications.channels).toContain("slack");
      expect(notifications.channels).toContain("email");
    });

    it("should have reasonable concurrency limit", () => {
      expect(DEFAULT_AUTO_PROMOTION_CONFIG.maxConcurrentPromotions).toBeGreaterThan(0);
      expect(DEFAULT_AUTO_PROMOTION_CONFIG.maxConcurrentPromotions).toBeLessThanOrEqual(10);
    });
  });
});
