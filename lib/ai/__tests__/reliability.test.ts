/**
 * Tests for AI Reliability Infrastructure
 *
 * Tests circuit breaker, retry logic, and fallback chain.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CircuitBreaker,
  CircuitOpenError,
  type CircuitState,
} from "../circuit-breaker";
import {
  withRetry,
  withRetryDetailed,
  makeRetryable,
  isRetryableError,
  calculateMaxRetryTime,
  RETRY_PRESETS,
} from "../retry";

// ============================================================================
// Circuit Breaker Tests
// ============================================================================

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      halfOpenRequests: 2,
      monitoringWindow: 5000,
    });
  });

  describe("Initial State", () => {
    it("should start with closed circuit", () => {
      const health = breaker.getHealth("test-provider");
      expect(health.state).toBe("closed");
      expect(health.failures).toBe(0);
      expect(health.successes).toBe(0);
    });

    it("should be available when closed", () => {
      expect(breaker.isAvailable("test-provider")).toBe(true);
    });
  });

  describe("Success Recording", () => {
    it("should record successful operations", async () => {
      await breaker.execute("test", async () => "success");
      const health = breaker.getHealth("test");
      expect(health.successes).toBe(1);
      expect(health.lastSuccess).not.toBeNull();
    });

    it("should return operation result", async () => {
      const result = await breaker.execute("test", async () => "hello");
      expect(result).toBe("hello");
    });
  });

  describe("Failure Recording", () => {
    it("should record failed operations", async () => {
      try {
        await breaker.execute("test", async () => {
          throw new Error("test error");
        });
      } catch {
        // Expected
      }

      const health = breaker.getHealth("test");
      expect(health.failures).toBe(1);
      expect(health.lastFailure).not.toBeNull();
    });

    it("should open circuit after threshold failures", async () => {
      const failingOp = async () => {
        throw new Error("test error");
      };

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute("test", failingOp);
        } catch {
          // Expected
        }
      }

      const health = breaker.getHealth("test");
      expect(health.state).toBe("open");
      expect(health.openedAt).not.toBeNull();
    });
  });

  describe("Open Circuit Behavior", () => {
    it("should throw CircuitOpenError when circuit is open", async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute("test", async () => {
            throw new Error("error");
          });
        } catch {
          // Expected
        }
      }

      // Next call should throw CircuitOpenError
      await expect(
        breaker.execute("test", async () => "should not run")
      ).rejects.toThrow(CircuitOpenError);
    });

    it("should use fallback when circuit is open", async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute("test", async () => {
            throw new Error("error");
          });
        } catch {
          // Expected
        }
      }

      // Call with fallback
      const result = await breaker.execute(
        "test",
        async () => "primary",
        async () => "fallback"
      );

      expect(result).toBe("fallback");
    });

    it("should not be available when open", async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute("test", async () => {
            throw new Error("error");
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.isAvailable("test")).toBe(false);
    });
  });

  describe("Half-Open State", () => {
    it("should transition to half-open after reset timeout", async () => {
      vi.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute("test", async () => {
            throw new Error("error");
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getHealth("test").state).toBe("open");

      // Advance time past reset timeout
      vi.advanceTimersByTime(1100);

      // Check availability (should transition to half-open)
      expect(breaker.isAvailable("test")).toBe(true);

      vi.useRealTimers();
    });

    it("should close circuit after successful half-open requests", async () => {
      vi.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute("test", async () => {
            throw new Error("error");
          });
        } catch {
          // Expected
        }
      }

      // Advance time past reset timeout
      vi.advanceTimersByTime(1100);

      // Make successful requests in half-open state
      await breaker.execute("test", async () => "success");
      await breaker.execute("test", async () => "success");

      const health = breaker.getHealth("test");
      expect(health.state).toBe("closed");
      expect(health.openedAt).toBeNull();

      vi.useRealTimers();
    });

    it("should re-open circuit if half-open request fails", async () => {
      vi.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute("test", async () => {
            throw new Error("error");
          });
        } catch {
          // Expected
        }
      }

      // Advance time past reset timeout
      vi.advanceTimersByTime(1100);

      // Fail in half-open state
      try {
        await breaker.execute("test", async () => {
          throw new Error("still failing");
        });
      } catch {
        // Expected
      }

      const health = breaker.getHealth("test");
      expect(health.state).toBe("open");

      vi.useRealTimers();
    });
  });

  describe("Metrics", () => {
    it("should provide metrics for all providers", async () => {
      await breaker.execute("provider1", async () => "success");
      await breaker.execute("provider2", async () => "success");

      const metrics = breaker.getMetrics();

      expect(metrics).toHaveLength(2);
      expect(metrics.map((m) => m.provider)).toContain("provider1");
      expect(metrics.map((m) => m.provider)).toContain("provider2");
    });

    it("should calculate failure rate correctly", async () => {
      // 1 success, 1 failure = 50% failure rate
      await breaker.execute("test", async () => "success");
      try {
        await breaker.execute("test", async () => {
          throw new Error("error");
        });
      } catch {
        // Expected
      }

      const metrics = breaker.getMetrics();
      const testMetrics = metrics.find((m) => m.provider === "test");

      expect(testMetrics?.failureRate).toBe(0.5);
    });
  });

  describe("Reset", () => {
    it("should reset a specific provider", async () => {
      // Create some state
      await breaker.execute("test", async () => "success");

      // Reset
      breaker.reset("test");

      const health = breaker.getHealth("test");
      expect(health.failures).toBe(0);
      expect(health.successes).toBe(0);
      expect(health.state).toBe("closed");
    });

    it("should reset all providers", async () => {
      await breaker.execute("p1", async () => "success");
      await breaker.execute("p2", async () => "success");

      breaker.resetAll();

      expect(breaker.getMetrics()).toHaveLength(0);
    });
  });
});

// ============================================================================
// Retry Logic Tests
// ============================================================================

describe("Retry Logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("withRetry", () => {
    it("should return result on first success", async () => {
      const result = await withRetry(async () => "success");
      expect(result).toBe("success");
    });

    it("should retry on failure", async () => {
      vi.useRealTimers();
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) throw new Error("try again");
        return "success";
      };

      const result = await withRetry(operation, { maxRetries: 3, baseDelay: 10 });
      expect(result).toBe("success");
      expect(attempts).toBe(3);
      vi.useFakeTimers();
    });

    it("should throw after max retries exceeded", async () => {
      const operation = async () => {
        throw new Error("always fails");
      };

      // Run with real timers for simpler handling
      vi.useRealTimers();
      await expect(
        withRetry(operation, { maxRetries: 2, baseDelay: 10 })
      ).rejects.toThrow("always fails");
      vi.useFakeTimers();
    });

    it("should use exponential backoff", async () => {
      vi.useRealTimers();
      const delays: number[] = [];

      try {
        await withRetry(
          async () => {
            throw new Error("fail");
          },
          {
            maxRetries: 3,
            baseDelay: 10,
            backoffFactor: 2,
            jitter: false,
            onRetry: (_, __, delay) => delays.push(delay),
          }
        );
      } catch {
        // Expected to fail
      }

      // Delays should follow exponential pattern: 10, 20, 40
      expect(delays[0]).toBe(10);
      expect(delays[1]).toBe(20);
      expect(delays[2]).toBe(40);
      vi.useFakeTimers();
    });

    it("should respect maxDelay", async () => {
      vi.useRealTimers();
      const delays: number[] = [];

      try {
        await withRetry(
          async () => {
            throw new Error("fail");
          },
          {
            maxRetries: 5,
            baseDelay: 10,
            maxDelay: 20,
            backoffFactor: 2,
            jitter: false,
            onRetry: (_, __, delay) => delays.push(delay),
          }
        );
      } catch {
        // Expected to fail
      }

      // All delays should be capped at 20
      expect(Math.max(...delays)).toBeLessThanOrEqual(20);
      vi.useFakeTimers();
    });
  });

  describe("isRetryableError", () => {
    it("should not retry authentication errors", () => {
      const error = new Error("Invalid API key");
      expect(isRetryableError(error)).toBe(false);
    });

    it("should not retry 400 errors", () => {
      const error = new Error("Request failed with status 400");
      expect(isRetryableError(error)).toBe(false);
    });

    it("should not retry 401 errors", () => {
      const error = new Error("Unauthorized - status: 401");
      expect(isRetryableError(error)).toBe(false);
    });

    it("should retry 500 errors", () => {
      const error = new Error("Internal server error - status 500");
      expect(isRetryableError(error)).toBe(true);
    });

    it("should retry timeout errors", () => {
      const error = new Error("Request timeout");
      expect(isRetryableError(error)).toBe(true);
    });

    it("should retry network errors", () => {
      const error = new Error("Network connection failed");
      expect(isRetryableError(error)).toBe(true);
    });
  });

  describe("withRetryDetailed", () => {
    it("should return detailed result on success", async () => {
      const result = await withRetryDetailed(async () => "success");

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(1);
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
    });

    it("should return detailed result on failure", async () => {
      vi.useRealTimers();
      const result = await withRetryDetailed(
        async () => {
          throw new Error("fail");
        },
        { maxRetries: 1, baseDelay: 10 }
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("fail");
      expect(result.attempts).toBe(2); // Initial + 1 retry
      vi.useFakeTimers();
    });
  });

  describe("makeRetryable", () => {
    it("should create a retryable function", async () => {
      vi.useRealTimers();
      let calls = 0;
      const fn = async (x: number) => {
        calls++;
        if (calls < 2) throw new Error("try again");
        return x * 2;
      };

      const retryableFn = makeRetryable(fn, { maxRetries: 2, baseDelay: 10 });
      const result = await retryableFn(5);

      expect(result).toBe(10);
      expect(calls).toBe(2);
      vi.useFakeTimers();
    });
  });

  describe("RETRY_PRESETS", () => {
    it("should have quick preset with low delay", () => {
      expect(RETRY_PRESETS.quick.baseDelay).toBeLessThan(
        RETRY_PRESETS.standard.baseDelay!
      );
    });

    it("should have aggressive preset with more retries", () => {
      expect(RETRY_PRESETS.aggressive.maxRetries).toBeGreaterThan(
        RETRY_PRESETS.standard.maxRetries!
      );
    });

    it("should have patient preset with longer delays", () => {
      expect(RETRY_PRESETS.patient.baseDelay).toBeGreaterThan(
        RETRY_PRESETS.standard.baseDelay!
      );
    });
  });

  describe("calculateMaxRetryTime", () => {
    it("should calculate total retry time", () => {
      const time = calculateMaxRetryTime({
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
      });

      // 1000 + 2000 + 4000 = 7000
      expect(time).toBe(7000);
    });

    it("should respect maxDelay in calculation", () => {
      const time = calculateMaxRetryTime({
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 1500,
        backoffFactor: 2,
      });

      // 1000 + 1500 + 1500 = 4000 (capped)
      expect(time).toBe(4000);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Circuit Breaker + Retry Integration", () => {
  it("should work together for reliable operations", async () => {
    vi.useRealTimers(); // Use real timers for this test

    const breaker = new CircuitBreaker({ failureThreshold: 5 });
    let attempts = 0;

    const reliableOperation = async () => {
      return breaker.execute("test", async () => {
        return withRetry(
          async () => {
            attempts++;
            if (attempts < 2) throw new Error("transient");
            return "success";
          },
          { maxRetries: 3, baseDelay: 10 }
        );
      });
    };

    const result = await reliableOperation();
    expect(result).toBe("success");
    expect(attempts).toBe(2);

    // Circuit should still be healthy
    expect(breaker.getHealth("test").state).toBe("closed");
  });
});
