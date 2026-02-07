import { logger } from "@/lib/logger";
/**
 * Circuit Breaker Pattern for AI Provider Reliability
 *
 * Implements the circuit breaker pattern to prevent cascade failures
 * and enable graceful degradation when AI providers are unhealthy.
 *
 * States:
 * - closed: Normal operation, requests pass through
 * - open: Provider is unhealthy, requests are blocked/redirected
 * - half-open: Testing if provider has recovered
 */

// ============================================================================
// Types
// ============================================================================

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Milliseconds before attempting reset (default: 30000) */
  resetTimeout: number;
  /** Number of test requests in half-open state (default: 3) */
  halfOpenRequests: number;
  /** Milliseconds window for counting failures (default: 60000) */
  monitoringWindow: number;
  /** Callback when circuit state changes */
  onStateChange?: (provider: string, from: CircuitState, to: CircuitState) => void;
}

export interface ProviderHealth {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveSuccesses: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  openedAt: Date | null;
  failureTimestamps: number[];
}

export interface CircuitBreakerMetrics {
  provider: string;
  state: CircuitState;
  failures: number;
  successes: number;
  failureRate: number;
  lastFailure: string | null;
  lastSuccess: string | null;
  openedAt: string | null;
  timeSinceOpened: number | null;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenRequests: 3,
  monitoringWindow: 60000, // 1 minute
};

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

export class CircuitBreaker {
  private health: Map<string, ProviderHealth> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(
    provider: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const health = this.getHealth(provider);

    // Clean up old failure timestamps
    this.cleanupFailures(provider);

    // Check if circuit is open
    if (health.state === "open") {
      if (this.shouldAttemptReset(health)) {
        this.transitionState(provider, "half-open");
      } else if (fallback) {
        console.warn(
          `[CircuitBreaker] Circuit open for ${provider}, using fallback`
        );
        return fallback();
      } else {
        throw new CircuitOpenError(provider, this.getTimeUntilReset(health));
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(provider);
      return result;
    } catch (error) {
      this.recordFailure(provider, error as Error);

      // Open circuit if threshold exceeded or half-open test failed
      if (
        health.state === "half-open" ||
        this.shouldOpenCircuit(provider)
      ) {
        this.transitionState(provider, "open");
      }

      // Try fallback if available
      if (fallback) {
        console.warn(
          `[CircuitBreaker] ${provider} failed, trying fallback: ${(error as Error).message}`
        );
        return fallback();
      }

      throw error;
    }
  }

  /**
   * Check if a provider is available (circuit not open)
   */
  isAvailable(provider: string): boolean {
    const health = this.getHealth(provider);

    if (health.state === "closed") {
      return true;
    }

    if (health.state === "open") {
      return this.shouldAttemptReset(health);
    }

    // half-open - limited availability
    return true;
  }

  /**
   * Get health status for a provider
   */
  getHealth(provider: string): ProviderHealth {
    if (!this.health.has(provider)) {
      this.health.set(provider, this.createInitialHealth());
    }
    return this.health.get(provider)!;
  }

  /**
   * Get all provider statuses
   */
  getStatus(): Record<string, ProviderHealth> {
    return Object.fromEntries(this.health);
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics(): CircuitBreakerMetrics[] {
    const metrics: CircuitBreakerMetrics[] = [];

    for (const [provider, health] of this.health.entries()) {
      const total = health.failures + health.successes;
      const failureRate = total > 0 ? health.failures / total : 0;

      metrics.push({
        provider,
        state: health.state,
        failures: health.failures,
        successes: health.successes,
        failureRate,
        lastFailure: health.lastFailure?.toISOString() || null,
        lastSuccess: health.lastSuccess?.toISOString() || null,
        openedAt: health.openedAt?.toISOString() || null,
        timeSinceOpened: health.openedAt
          ? Date.now() - health.openedAt.getTime()
          : null,
      });
    }

    return metrics;
  }

  /**
   * Manually reset a circuit (for testing/admin purposes)
   */
  reset(provider: string): void {
    this.health.set(provider, this.createInitialHealth());
    logger.log(`[CircuitBreaker] Manually reset circuit for ${provider}`);
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    this.health.clear();
    logger.log("[CircuitBreaker] All circuits reset");
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createInitialHealth(): ProviderHealth {
    return {
      state: "closed",
      failures: 0,
      successes: 0,
      consecutiveSuccesses: 0,
      lastFailure: null,
      lastSuccess: null,
      openedAt: null,
      failureTimestamps: [],
    };
  }

  private recordSuccess(provider: string): void {
    const health = this.getHealth(provider);
    health.successes++;
    health.consecutiveSuccesses++;
    health.lastSuccess = new Date();

    // In half-open state, check if we can close the circuit
    if (health.state === "half-open") {
      if (health.consecutiveSuccesses >= this.config.halfOpenRequests) {
        this.transitionState(provider, "closed");
        // Reset counters on full recovery
        health.failures = 0;
        health.failureTimestamps = [];
      }
    }
  }

  private recordFailure(provider: string, error: Error): void {
    const health = this.getHealth(provider);
    health.failures++;
    health.consecutiveSuccesses = 0;
    health.lastFailure = new Date();
    health.failureTimestamps.push(Date.now());

    console.warn(
      `[CircuitBreaker] ${provider} failure #${health.failures}: ${error.message}`
    );
  }

  private shouldOpenCircuit(provider: string): boolean {
    const health = this.getHealth(provider);

    // Count failures within the monitoring window
    const windowStart = Date.now() - this.config.monitoringWindow;
    const recentFailures = health.failureTimestamps.filter(
      (t) => t > windowStart
    ).length;

    return recentFailures >= this.config.failureThreshold;
  }

  private shouldAttemptReset(health: ProviderHealth): boolean {
    if (!health.openedAt) return false;
    const elapsed = Date.now() - health.openedAt.getTime();
    return elapsed >= this.config.resetTimeout;
  }

  private getTimeUntilReset(health: ProviderHealth): number {
    if (!health.openedAt) return 0;
    const elapsed = Date.now() - health.openedAt.getTime();
    return Math.max(0, this.config.resetTimeout - elapsed);
  }

  private transitionState(provider: string, newState: CircuitState): void {
    const health = this.getHealth(provider);
    const oldState = health.state;

    if (oldState === newState) return;

    health.state = newState;

    if (newState === "open") {
      health.openedAt = new Date();
      health.consecutiveSuccesses = 0;
      console.warn(
        `[CircuitBreaker] OPENED circuit for ${provider} after ${health.failures} failures`
      );
    } else if (newState === "half-open") {
      health.consecutiveSuccesses = 0;
      logger.log(`[CircuitBreaker] Testing ${provider} (half-open)`);
    } else if (newState === "closed") {
      health.openedAt = null;
      logger.log(`[CircuitBreaker] CLOSED circuit for ${provider} - recovered`);
    }

    // Notify callback if configured
    this.config.onStateChange?.(provider, oldState, newState);
  }

  private cleanupFailures(provider: string): void {
    const health = this.getHealth(provider);
    const windowStart = Date.now() - this.config.monitoringWindow;
    health.failureTimestamps = health.failureTimestamps.filter(
      (t) => t > windowStart
    );
  }
}

// ============================================================================
// Custom Error
// ============================================================================

export class CircuitOpenError extends Error {
  constructor(
    public provider: string,
    public retryAfter: number
  ) {
    super(
      `Circuit breaker open for ${provider}. Retry after ${Math.ceil(retryAfter / 1000)}s`
    );
    this.name = "CircuitOpenError";
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const circuitBreaker = new CircuitBreaker();
