/**
 * Retry Logic with Exponential Backoff
 *
 * Provides retry functionality with configurable backoff strategy
 * to handle transient failures gracefully without overwhelming services.
 */

// ============================================================================
// Types
// ============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffFactor: number;
  /** Add jitter to prevent thundering herd (default: true) */
  jitter: boolean;
  /** Function to determine if error is retryable (default: all errors) */
  isRetryable?: (error: Error) => boolean;
  /** Callback for each retry attempt */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  jitter: true,
};

// ============================================================================
// Non-Retryable Errors
// ============================================================================

/**
 * Errors that should not be retried (e.g., auth failures, bad requests)
 */
const NON_RETRYABLE_ERRORS = [
  "AuthenticationError",
  "AuthorizationError",
  "InvalidRequestError",
  "BadRequestError",
  "ValidationError",
  "RateLimitError", // Rate limits need backoff at a higher level
];

const NON_RETRYABLE_STATUS_CODES = [400, 401, 403, 404, 422];

/**
 * Default function to determine if an error should be retried
 */
export function isRetryableError(error: Error): boolean {
  // Check error name
  if (NON_RETRYABLE_ERRORS.includes(error.name)) {
    return false;
  }

  // Check for HTTP status codes in error
  const statusMatch = error.message.match(/status[:\s]+(\d{3})/i);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    if (NON_RETRYABLE_STATUS_CODES.includes(status)) {
      return false;
    }
  }

  // Check for specific error messages
  const nonRetryableMessages = [
    "invalid api key",
    "unauthorized",
    "forbidden",
    "not found",
    "validation",
    "invalid request",
  ];

  const lowerMessage = error.message.toLowerCase();
  for (const msg of nonRetryableMessages) {
    if (lowerMessage.includes(msg)) {
      return false;
    }
  }

  // Default: retry transient errors
  return true;
}

// ============================================================================
// Retry Implementation
// ============================================================================

/**
 * Execute an operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_CONFIG, ...config };
  const { maxRetries, baseDelay, maxDelay, backoffFactor, jitter, onRetry } =
    fullConfig;
  const isRetryable = fullConfig.isRetryable || isRetryableError;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (attempt >= maxRetries) {
        break;
      }

      if (!isRetryable(lastError)) {
        console.warn(
          `[Retry] Non-retryable error on attempt ${attempt + 1}: ${lastError.message}`
        );
        break;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      // Add jitter (±25%) to prevent thundering herd
      if (jitter) {
        const jitterRange = delay * 0.25;
        delay += Math.random() * jitterRange * 2 - jitterRange;
      }

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`
      );

      // Notify callback
      onRetry?.(attempt + 1, lastError, delay);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Execute an operation with retry logic and return detailed result
 */
export async function withRetryDetailed<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  const fullConfig: RetryConfig = { ...DEFAULT_CONFIG, ...config };
  const originalOnRetry = fullConfig.onRetry;

  // Track attempts via onRetry callback
  fullConfig.onRetry = (attempt, error, delay) => {
    attempts = attempt;
    originalOnRetry?.(attempt, error, delay);
  };

  try {
    const result = await withRetry(operation, fullConfig);
    return {
      success: true,
      result,
      attempts: attempts + 1, // +1 for the successful attempt
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
      attempts: attempts + 1,
      totalTime: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Retry Decorators / Wrappers
// ============================================================================

/**
 * Create a retryable version of an async function
 */
export function makeRetryable<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: Partial<RetryConfig> = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), config);
}

/**
 * Retry configuration presets
 */
export const RETRY_PRESETS = {
  /** Quick retry for fast operations */
  quick: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    jitter: true,
  } as Partial<RetryConfig>,

  /** Standard retry for normal operations */
  standard: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
  } as Partial<RetryConfig>,

  /** Aggressive retry for critical operations */
  aggressive: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
  } as Partial<RetryConfig>,

  /** Patient retry for operations that may take time to recover */
  patient: {
    maxRetries: 3,
    baseDelay: 5000,
    maxDelay: 60000,
    backoffFactor: 2,
    jitter: true,
  } as Partial<RetryConfig>,
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate the total maximum time a retry could take
 */
export function calculateMaxRetryTime(config: Partial<RetryConfig> = {}): number {
  const { maxRetries, baseDelay, maxDelay, backoffFactor } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let totalTime = 0;
  for (let i = 0; i < maxRetries; i++) {
    totalTime += Math.min(baseDelay * Math.pow(backoffFactor, i), maxDelay);
  }

  return totalTime;
}
