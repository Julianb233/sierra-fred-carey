/**
 * Notification Validators Test Suite
 * Comprehensive tests for type guards and validators
 */

import {
  isAlertLevel,
  isAlertType,
  isNotificationChannel,
  validateAlertLevel,
  validateAlertType,
  validateChannel,
  validateSlackWebhookUrl,
  validatePagerDutyRoutingKey,
  validateNotificationPayload,
  assertValidPayload,
  sanitizePayload,
  validateAndSanitizePayload,
} from '../validators';

describe('Type Guards', () => {
  describe('isAlertLevel', () => {
    it('should accept valid alert levels', () => {
      expect(isAlertLevel('info')).toBe(true);
      expect(isAlertLevel('warning')).toBe(true);
      expect(isAlertLevel('critical')).toBe(true);
    });

    it('should reject invalid alert levels', () => {
      expect(isAlertLevel('error')).toBe(false);
      expect(isAlertLevel('debug')).toBe(false);
      expect(isAlertLevel('')).toBe(false);
      expect(isAlertLevel(null)).toBe(false);
      expect(isAlertLevel(undefined)).toBe(false);
      expect(isAlertLevel(123)).toBe(false);
    });
  });

  describe('isAlertType', () => {
    it('should accept valid alert types', () => {
      expect(isAlertType('performance')).toBe(true);
      expect(isAlertType('errors')).toBe(true);
      expect(isAlertType('traffic')).toBe(true);
      expect(isAlertType('significance')).toBe(true);
    });

    it('should reject invalid alert types', () => {
      expect(isAlertType('unknown')).toBe(false);
      expect(isAlertType('')).toBe(false);
      expect(isAlertType(null)).toBe(false);
    });
  });

  describe('isNotificationChannel', () => {
    it('should accept valid channels', () => {
      expect(isNotificationChannel('slack')).toBe(true);
      expect(isNotificationChannel('pagerduty')).toBe(true);
      expect(isNotificationChannel('email')).toBe(true);
    });

    it('should reject invalid channels', () => {
      expect(isNotificationChannel('sms')).toBe(false);
      expect(isNotificationChannel('webhook')).toBe(false);
      expect(isNotificationChannel('')).toBe(false);
    });
  });
});

describe('Validators', () => {
  describe('validateAlertLevel', () => {
    it('should validate correct levels', () => {
      const result = validateAlertLevel('critical');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid levels', () => {
      const result = validateAlertLevel('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require level', () => {
      const result = validateAlertLevel(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Alert level is required');
    });
  });

  describe('validateSlackWebhookUrl', () => {
    it('should validate correct webhook URL', () => {
      const result = validateSlackWebhookUrl(
        'https://hooks.slack.com/services/T00/B00/XXX'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid URLs', () => {
      const result = validateSlackWebhookUrl('https://example.com/webhook');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require URL', () => {
      const result = validateSlackWebhookUrl(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Slack webhook URL is required');
    });
  });

  describe('validatePagerDutyRoutingKey', () => {
    it('should validate correct routing key', () => {
      const result = validatePagerDutyRoutingKey('R0ABC123XYZ456DEF789');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short keys', () => {
      const result = validatePagerDutyRoutingKey('R0ABC');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require key', () => {
      const result = validatePagerDutyRoutingKey(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PagerDuty routing key is required');
    });
  });

  describe('validateNotificationPayload', () => {
    const validPayload = {
      userId: 'user_123',
      level: 'critical',
      type: 'errors',
      title: 'Test Alert',
      message: 'This is a test',
    };

    it('should validate correct payload', () => {
      const result = validateNotificationPayload(validPayload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject payload without userId', () => {
      const { userId, ...payload } = validPayload;
      const result = validateNotificationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userId is required');
    });

    it('should reject payload without title', () => {
      const { title, ...payload } = validPayload;
      const result = validateNotificationPayload(payload);
      expect(result.valid).toBe(false);
    });

    it('should reject payload without message', () => {
      const { message, ...payload } = validPayload;
      const result = validateNotificationPayload(payload);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid alert level', () => {
      const result = validateNotificationPayload({
        ...validPayload,
        level: 'invalid',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid alert type', () => {
      const result = validateNotificationPayload({
        ...validPayload,
        type: 'invalid',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject non-numeric value', () => {
      const result = validateNotificationPayload({
        ...validPayload,
        value: 'not a number',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('value must be a number');
    });

    it('should accept optional fields', () => {
      const result = validateNotificationPayload({
        ...validPayload,
        experimentName: 'test-exp',
        variantName: 'variant-a',
        metric: 'error_rate',
        value: 5.5,
        threshold: 5.0,
        metadata: { foo: 'bar' },
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('assertValidPayload', () => {
    it('should not throw for valid payload', () => {
      const payload = {
        userId: 'user_123',
        level: 'critical',
        type: 'errors',
        title: 'Test',
        message: 'Message',
      };

      expect(() => assertValidPayload(payload)).not.toThrow();
    });

    it('should throw for invalid payload', () => {
      const payload = {
        level: 'invalid',
        type: 'errors',
        title: 'Test',
        message: 'Message',
      };

      expect(() => assertValidPayload(payload)).toThrow();
    });
  });

  describe('sanitizePayload', () => {
    it('should sanitize and fill defaults', () => {
      const result = sanitizePayload({
        userId: 'user_123',
        level: 'critical',
        type: 'errors',
        title: 'Test',
        message: 'Message',
      });

      expect(result.userId).toBe('user_123');
      expect(result.level).toBe('critical');
      expect(result.type).toBe('errors');
      expect(result.metadata).toEqual({});
    });

    it('should coerce invalid level to default', () => {
      const result = sanitizePayload({
        userId: 'user_123',
        level: 'invalid' as any,
        type: 'errors',
        title: 'Test',
        message: 'Message',
      });

      expect(result.level).toBe('info');
    });

    it('should coerce invalid type to default', () => {
      const result = sanitizePayload({
        userId: 'user_123',
        level: 'critical',
        type: 'invalid' as any,
        title: 'Test',
        message: 'Message',
      });

      expect(result.type).toBe('errors');
    });

    it('should preserve optional fields', () => {
      const result = sanitizePayload({
        userId: 'user_123',
        level: 'critical',
        type: 'errors',
        title: 'Test',
        message: 'Message',
        experimentName: 'exp-1',
        value: 10,
        threshold: 5,
      });

      expect(result.experimentName).toBe('exp-1');
      expect(result.value).toBe(10);
      expect(result.threshold).toBe(5);
    });
  });

  describe('validateAndSanitizePayload', () => {
    it('should validate and sanitize valid payload', () => {
      const result = validateAndSanitizePayload({
        userId: 'user_123',
        level: 'critical',
        type: 'errors',
        title: 'Test',
        message: 'Message',
      });

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user_123');
    });

    it('should return null for invalid payload', () => {
      const result = validateAndSanitizePayload({
        level: 'invalid',
      });

      expect(result).toBeNull();
    });

    it('should return null for non-object', () => {
      expect(validateAndSanitizePayload(null)).toBeNull();
      expect(validateAndSanitizePayload('string')).toBeNull();
      expect(validateAndSanitizePayload(123)).toBeNull();
    });
  });
});
