import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DEFAULT_PROMOTION_RULES,
  AGGRESSIVE_PROMOTION_RULES,
  getPromotionRulesForEnvironment,
  isExcludedFromAutoPromotion,
  performSafetyChecks,
  evaluatePromotionEligibility,
  AUTO_PROMOTION_EXCLUDE_LIST,
} from '../promotion-rules'

describe('Promotion Rules', () => {
  describe('DEFAULT_PROMOTION_RULES', () => {
    it('has conservative production settings', () => {
      expect(DEFAULT_PROMOTION_RULES.minSampleSize).toBe(1000)
      expect(DEFAULT_PROMOTION_RULES.minConfidenceLevel).toBe(95)
      expect(DEFAULT_PROMOTION_RULES.minImprovement).toBe(0.02)
      expect(DEFAULT_PROMOTION_RULES.maxErrorRate).toBe(0.05)
      expect(DEFAULT_PROMOTION_RULES.requireManualApproval).toBe(true)
    })
  })

  describe('AGGRESSIVE_PROMOTION_RULES', () => {
    it('has faster iteration settings', () => {
      expect(AGGRESSIVE_PROMOTION_RULES.minSampleSize).toBe(100)
      expect(AGGRESSIVE_PROMOTION_RULES.minConfidenceLevel).toBe(90)
      expect(AGGRESSIVE_PROMOTION_RULES.requireManualApproval).toBe(false)
    })
  })

  describe('getPromotionRulesForEnvironment', () => {
    const originalEnv = process.env.NODE_ENV
    const originalRules = process.env.AB_PROMOTION_RULES

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
      if (originalRules) {
        process.env.AB_PROMOTION_RULES = originalRules
      } else {
        delete process.env.AB_PROMOTION_RULES
      }
    })

    it('returns aggressive rules in development', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.AB_PROMOTION_RULES
      const rules = getPromotionRulesForEnvironment()
      expect(rules.minSampleSize).toBe(AGGRESSIVE_PROMOTION_RULES.minSampleSize)
    })

    it('returns default rules in production', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.AB_PROMOTION_RULES
      const rules = getPromotionRulesForEnvironment()
      expect(rules.minSampleSize).toBe(DEFAULT_PROMOTION_RULES.minSampleSize)
    })

    it('parses custom rules from environment', () => {
      process.env.AB_PROMOTION_RULES = JSON.stringify({
        minSampleSize: 500,
        minConfidenceLevel: 92,
      })
      const rules = getPromotionRulesForEnvironment()
      expect(rules.minSampleSize).toBe(500)
      expect(rules.minConfidenceLevel).toBe(92)
    })

    it('falls back to defaults on invalid JSON', () => {
      process.env.AB_PROMOTION_RULES = 'invalid json'
      const rules = getPromotionRulesForEnvironment()
      expect(rules).toBeDefined()
      expect(rules.minSampleSize).toBeDefined()
    })
  })

  describe('isExcludedFromAutoPromotion', () => {
    it('returns false for non-excluded experiments', () => {
      expect(isExcludedFromAutoPromotion('some-experiment')).toBe(false)
    })

    it('returns true for excluded experiments', () => {
      AUTO_PROMOTION_EXCLUDE_LIST.add('test-excluded')
      expect(isExcludedFromAutoPromotion('test-excluded')).toBe(true)
      AUTO_PROMOTION_EXCLUDE_LIST.delete('test-excluded')
    })
  })

  describe('performSafetyChecks', () => {
    const baseExperimentData = {
      experimentName: 'test-experiment',
      winningVariant: {
        variantName: 'variant-a',
        sampleSize: 1500,
        errorRate: 0.02,
        p95LatencyMs: 500,
        successRate: 0.85,
      },
      controlVariant: {
        variantName: 'control',
        sampleSize: 1500,
        errorRate: 0.02,
        p95LatencyMs: 500,
        successRate: 0.80,
      },
      confidenceLevel: 96,
      testDurationHours: 48,
    }

    it('returns array of safety checks', () => {
      const checks = performSafetyChecks(baseExperimentData, DEFAULT_PROMOTION_RULES)
      expect(Array.isArray(checks)).toBe(true)
      expect(checks.length).toBeGreaterThan(0)
    })

    it('each check has required properties', () => {
      const checks = performSafetyChecks(baseExperimentData, DEFAULT_PROMOTION_RULES)
      for (const check of checks) {
        expect(check).toHaveProperty('passed')
        expect(check).toHaveProperty('checkName')
        expect(check).toHaveProperty('message')
        expect(check).toHaveProperty('severity')
      }
    })

    it('passes sample size check with sufficient samples', () => {
      const checks = performSafetyChecks(baseExperimentData, DEFAULT_PROMOTION_RULES)
      const sampleCheck = checks.find(c => c.checkName === 'winner_sample_size')
      expect(sampleCheck?.passed).toBe(true)
    })

    it('fails sample size check with insufficient samples', () => {
      const data = {
        ...baseExperimentData,
        winningVariant: { ...baseExperimentData.winningVariant, sampleSize: 100 },
      }
      const checks = performSafetyChecks(data, DEFAULT_PROMOTION_RULES)
      const sampleCheck = checks.find(c => c.checkName === 'winner_sample_size')
      expect(sampleCheck?.passed).toBe(false)
      expect(sampleCheck?.severity).toBe('critical')
    })

    it('passes confidence check with sufficient confidence', () => {
      const checks = performSafetyChecks(baseExperimentData, DEFAULT_PROMOTION_RULES)
      const confidenceCheck = checks.find(c => c.checkName === 'statistical_confidence')
      expect(confidenceCheck?.passed).toBe(true)
    })

    it('fails confidence check with low confidence', () => {
      const data = { ...baseExperimentData, confidenceLevel: 80 }
      const checks = performSafetyChecks(data, DEFAULT_PROMOTION_RULES)
      const confidenceCheck = checks.find(c => c.checkName === 'statistical_confidence')
      expect(confidenceCheck?.passed).toBe(false)
    })

    it('checks error rate thresholds', () => {
      const data = {
        ...baseExperimentData,
        winningVariant: { ...baseExperimentData.winningVariant, errorRate: 0.15 },
      }
      const checks = performSafetyChecks(data, DEFAULT_PROMOTION_RULES)
      const errorCheck = checks.find(c => c.checkName === 'winner_error_rate')
      expect(errorCheck?.passed).toBe(false)
    })

    it('checks latency thresholds', () => {
      const data = {
        ...baseExperimentData,
        winningVariant: { ...baseExperimentData.winningVariant, p95LatencyMs: 5000 },
      }
      const checks = performSafetyChecks(data, DEFAULT_PROMOTION_RULES)
      const latencyCheck = checks.find(c => c.checkName === 'winner_latency')
      expect(latencyCheck?.passed).toBe(false)
    })

    it('checks test duration minimum', () => {
      const data = { ...baseExperimentData, testDurationHours: 2 }
      const checks = performSafetyChecks(data, DEFAULT_PROMOTION_RULES)
      const durationCheck = checks.find(c => c.checkName === 'min_test_duration')
      expect(durationCheck?.passed).toBe(false)
    })
  })

  describe('evaluatePromotionEligibility', () => {
    const baseExperimentData = {
      experimentId: 'exp-123',
      experimentName: 'test-experiment',
      winningVariant: {
        variantName: 'variant-a',
        sampleSize: 1500,
        errorRate: 0.02,
        p95LatencyMs: 500,
        successRate: 0.85,
      },
      controlVariant: {
        variantName: 'control',
        sampleSize: 1500,
        errorRate: 0.02,
        p95LatencyMs: 500,
        successRate: 0.80,
      },
      confidenceLevel: 96,
      testDurationHours: 48,
    }

    it('returns not_ready when no winning variant', () => {
      const result = evaluatePromotionEligibility({
        ...baseExperimentData,
        winningVariant: null,
        controlVariant: null,
      })
      expect(result.eligible).toBe(false)
      expect(result.recommendation).toBe('not_ready')
      expect(result.reason).toContain('No winning variant')
    })

    it('returns eligibility result with all properties', () => {
      const result = evaluatePromotionEligibility(baseExperimentData)
      expect(result).toHaveProperty('eligible')
      expect(result).toHaveProperty('experimentId')
      expect(result).toHaveProperty('experimentName')
      expect(result).toHaveProperty('winningVariant')
      expect(result).toHaveProperty('confidenceLevel')
      expect(result).toHaveProperty('improvement')
      expect(result).toHaveProperty('safetyChecks')
      expect(result).toHaveProperty('recommendation')
      expect(result).toHaveProperty('reason')
    })

    it('calculates improvement correctly', () => {
      const result = evaluatePromotionEligibility(baseExperimentData)
      // (0.85 - 0.80) / 0.80 = 0.0625 = 6.25%
      expect(result.improvement).toBeCloseTo(0.0625, 4)
    })

    it('requires manual review when rules require it', () => {
      const result = evaluatePromotionEligibility(baseExperimentData, {
        requireManualApproval: true,
      })
      expect(result.recommendation).toBe('manual_review')
    })

    it('marks eligible when all checks pass and no manual approval required', () => {
      const result = evaluatePromotionEligibility(baseExperimentData, {
        requireManualApproval: false,
        minSampleSize: 100,
        minConfidenceLevel: 90,
        minImprovement: 0.01,
        minTestDurationHours: 1,
      })
      expect(result.eligible).toBe(true)
      expect(result.recommendation).toBe('promote')
    })

    it('marks not_ready when critical checks fail', () => {
      const result = evaluatePromotionEligibility({
        ...baseExperimentData,
        winningVariant: {
          ...baseExperimentData.winningVariant!,
          sampleSize: 10,
        },
      })
      expect(result.eligible).toBe(false)
      expect(result.recommendation).toBe('not_ready')
    })
  })
})
