/**
 * Notification Payload Validators
 * Runtime validation with TypeScript type guards
 */

import type {
  NotificationPayload,
  AlertLevel,
  AlertType,
  NotificationChannel,
} from './types';

/**
 * Valid alert levels
 */
const VALID_ALERT_LEVELS: readonly AlertLevel[] = [
  'info',
  'warning',
  'critical',
] as const;

/**
 * Valid alert types
 */
const VALID_ALERT_TYPES: readonly AlertType[] = [
  'performance',
  'errors',
  'traffic',
  'significance',
] as const;

/**
 * Valid notification channels
 */
const VALID_CHANNELS: readonly NotificationChannel[] = [
  'slack',
  'pagerduty',
  'email',
] as const;

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Type guard for AlertLevel
 */
export function isAlertLevel(value: unknown): value is AlertLevel {
  return (
    typeof value === 'string' &&
    VALID_ALERT_LEVELS.includes(value as AlertLevel)
  );
}

/**
 * Type guard for AlertType
 */
export function isAlertType(value: unknown): value is AlertType {
  return (
    typeof value === 'string' && VALID_ALERT_TYPES.includes(value as AlertType)
  );
}

/**
 * Type guard for NotificationChannel
 */
export function isNotificationChannel(
  value: unknown
): value is NotificationChannel {
  return (
    typeof value === 'string' &&
    VALID_CHANNELS.includes(value as NotificationChannel)
  );
}

/**
 * Validate alert level
 */
export function validateAlertLevel(level: unknown): ValidationResult {
  if (!level) {
    return { valid: false, errors: ['Alert level is required'] };
  }

  if (!isAlertLevel(level)) {
    return {
      valid: false,
      errors: [
        `Invalid alert level: ${level}. Must be one of: ${VALID_ALERT_LEVELS.join(', ')}`,
      ],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate alert type
 */
export function validateAlertType(type: unknown): ValidationResult {
  if (!type) {
    return { valid: false, errors: ['Alert type is required'] };
  }

  if (!isAlertType(type)) {
    return {
      valid: false,
      errors: [
        `Invalid alert type: ${type}. Must be one of: ${VALID_ALERT_TYPES.join(', ')}`,
      ],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate notification channel
 */
export function validateChannel(channel: unknown): ValidationResult {
  if (!channel) {
    return { valid: false, errors: ['Channel is required'] };
  }

  if (!isNotificationChannel(channel)) {
    return {
      valid: false,
      errors: [
        `Invalid channel: ${channel}. Must be one of: ${VALID_CHANNELS.join(', ')}`,
      ],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate Slack webhook URL
 */
export function validateSlackWebhookUrl(url: unknown): ValidationResult {
  if (!url) {
    return { valid: false, errors: ['Slack webhook URL is required'] };
  }

  if (typeof url !== 'string') {
    return { valid: false, errors: ['Slack webhook URL must be a string'] };
  }

  if (!url.startsWith('https://hooks.slack.com/services/')) {
    return {
      valid: false,
      errors: [
        'Invalid Slack webhook URL format. Must start with https://hooks.slack.com/services/',
      ],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate PagerDuty routing key
 */
export function validatePagerDutyRoutingKey(key: unknown): ValidationResult {
  if (!key) {
    return { valid: false, errors: ['PagerDuty routing key is required'] };
  }

  if (typeof key !== 'string') {
    return { valid: false, errors: ['PagerDuty routing key must be a string'] };
  }

  // PagerDuty routing keys are typically 32 characters
  if (key.length < 10) {
    return {
      valid: false,
      errors: ['PagerDuty routing key appears to be invalid (too short)'],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate notification payload
 */
export function validateNotificationPayload(
  payload: unknown
): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const p = payload as Partial<NotificationPayload>;

  // Required fields
  if (!p.userId) {
    errors.push('userId is required');
  }

  if (!p.title || typeof p.title !== 'string') {
    errors.push('title is required and must be a string');
  }

  if (!p.message || typeof p.message !== 'string') {
    errors.push('message is required and must be a string');
  }

  // Validate level
  const levelResult = validateAlertLevel(p.level);
  if (!levelResult.valid) {
    errors.push(...levelResult.errors);
  }

  // Validate type
  const typeResult = validateAlertType(p.type);
  if (!typeResult.valid) {
    errors.push(...typeResult.errors);
  }

  // Optional numeric fields
  if (p.value !== undefined && typeof p.value !== 'number') {
    errors.push('value must be a number');
  }

  if (p.threshold !== undefined && typeof p.threshold !== 'number') {
    errors.push('threshold must be a number');
  }

  // Optional metadata
  if (p.metadata !== undefined && typeof p.metadata !== 'object') {
    errors.push('metadata must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Assert that payload is valid, throw if not
 */
export function assertValidPayload(
  payload: unknown
): asserts payload is NotificationPayload {
  const result = validateNotificationPayload(payload);
  if (!result.valid) {
    throw new Error(
      `Invalid notification payload: ${result.errors.join(', ')}`
    );
  }
}

/**
 * Sanitize payload by removing invalid/dangerous fields
 */
export function sanitizePayload(
  payload: Partial<NotificationPayload>
): NotificationPayload {
  return {
    userId: String(payload.userId || 'unknown'),
    level: isAlertLevel(payload.level) ? payload.level : 'info',
    type: isAlertType(payload.type) ? payload.type : 'errors',
    title: String(payload.title || 'Notification'),
    message: String(payload.message || ''),
    experimentName: payload.experimentName
      ? String(payload.experimentName)
      : undefined,
    variantName: payload.variantName ? String(payload.variantName) : undefined,
    metric: payload.metric ? String(payload.metric) : undefined,
    value:
      typeof payload.value === 'number' ? payload.value : undefined,
    threshold:
      typeof payload.threshold === 'number' ? payload.threshold : undefined,
    metadata: payload.metadata || {},
  };
}

/**
 * Validate and sanitize payload in one step
 */
export function validateAndSanitizePayload(
  payload: unknown
): NotificationPayload | null {
  try {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const sanitized = sanitizePayload(payload as Partial<NotificationPayload>);
    assertValidPayload(sanitized);
    return sanitized;
  } catch {
    return null;
  }
}
