/**
 * Notification Error Classes
 * Strongly-typed error handling for notification delivery
 */

export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly channel: 'slack' | 'pagerduty' | 'email',
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NotificationError';
    Object.setPrototypeOf(this, NotificationError.prototype);
  }
}

export class SlackWebhookError extends NotificationError {
  constructor(message: string, public readonly statusCode?: number) {
    super(message, 'slack', 'SLACK_WEBHOOK_ERROR', { statusCode });
    this.name = 'SlackWebhookError';
    Object.setPrototypeOf(this, SlackWebhookError.prototype);
  }
}

export class PagerDutyAPIError extends NotificationError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly pdErrorCode?: string
  ) {
    super(message, 'pagerduty', 'PAGERDUTY_API_ERROR', {
      statusCode,
      pdErrorCode,
    });
    this.name = 'PagerDutyAPIError';
    Object.setPrototypeOf(this, PagerDutyAPIError.prototype);
  }
}

export class ConfigurationError extends NotificationError {
  constructor(message: string, channel: 'slack' | 'pagerduty' | 'email') {
    super(message, channel, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export class ValidationError extends NotificationError {
  constructor(
    message: string,
    public readonly field: string,
    channel: 'slack' | 'pagerduty' | 'email'
  ) {
    super(message, channel, 'VALIDATION_ERROR', { field });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Type guard to check if error is a NotificationError
 */
export function isNotificationError(error: unknown): error is NotificationError {
  return error instanceof NotificationError;
}

/**
 * Type guard to check if error is a SlackWebhookError
 */
export function isSlackWebhookError(
  error: unknown
): error is SlackWebhookError {
  return error instanceof SlackWebhookError;
}

/**
 * Type guard to check if error is a PagerDutyAPIError
 */
export function isPagerDutyAPIError(
  error: unknown
): error is PagerDutyAPIError {
  return error instanceof PagerDutyAPIError;
}

/**
 * Type guard to check if error is a ConfigurationError
 */
export function isConfigurationError(
  error: unknown
): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Extract error message safely from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Format error for logging with full context
 */
export function formatErrorForLogging(error: unknown): Record<string, unknown> {
  if (isNotificationError(error)) {
    return {
      name: error.name,
      message: error.message,
      channel: error.channel,
      code: error.code,
      details: error.details,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    error: String(error),
  };
}
