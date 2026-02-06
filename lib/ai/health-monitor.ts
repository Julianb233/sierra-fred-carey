/**
 * AI Provider Health Monitor
 *
 * Monitors the health of AI providers through periodic checks
 * and provides status reporting for observability.
 */

import { generateText } from "ai";
import type { LanguageModel } from "ai";
import {
  getPrimaryModel,
  getFallback1Model,
  getFallback2Model,
  PROVIDER_METADATA,
} from "./providers";
import { circuitBreaker } from "./circuit-breaker";
import type { ProviderName } from "./fallback-chain";

// ============================================================================
// Types
// ============================================================================

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface HealthCheck {
  provider: ProviderName;
  status: HealthStatus;
  latency: number;
  lastCheck: Date;
  error?: string;
  model?: string;
}

export interface OverallHealth {
  status: HealthStatus;
  providers: HealthCheck[];
  healthyCount: number;
  totalCount: number;
  timestamp: Date;
}

export interface HealthMonitorConfig {
  /** Interval between health checks in ms (default: 60000) */
  checkInterval: number;
  /** Timeout for health check requests in ms (default: 10000) */
  checkTimeout: number;
  /** Latency threshold for "degraded" status in ms (default: 5000) */
  degradedThreshold: number;
  /** Callback when health status changes */
  onHealthChange?: (health: OverallHealth) => void;
  /** Callback when all providers are unhealthy */
  onAllUnhealthy?: () => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: HealthMonitorConfig = {
  checkInterval: 60000, // 1 minute
  checkTimeout: 10000, // 10 seconds
  degradedThreshold: 5000, // 5 seconds
};

// ============================================================================
// Health Check Test Prompt
// ============================================================================

const HEALTH_CHECK_PROMPT = "Reply with exactly: OK";

// ============================================================================
// Health Monitor Implementation
// ============================================================================

export class HealthMonitor {
  private checks: Map<ProviderName, HealthCheck> = new Map();
  private config: HealthMonitorConfig;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private lastOverallStatus: HealthStatus = "healthy";

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check health of a specific provider
   */
  async checkProvider(provider: ProviderName): Promise<HealthCheck> {
    const startTime = Date.now();
    const model = this.getModelForProvider(provider);

    if (!model) {
      const check: HealthCheck = {
        provider,
        status: "unhealthy",
        latency: 0,
        lastCheck: new Date(),
        error: "Provider not configured",
      };
      this.checks.set(provider, check);
      return check;
    }

    try {
      // Use a simple prompt with timeout
      const result = await Promise.race([
        generateText({
          model,
          prompt: HEALTH_CHECK_PROMPT,
          maxOutputTokens: 10,
        }),
        this.timeout(this.config.checkTimeout),
      ]);

      const latency = Date.now() - startTime;

      // Determine status based on latency
      const status: HealthStatus =
        latency > this.config.degradedThreshold ? "degraded" : "healthy";

      const check: HealthCheck = {
        provider,
        status,
        latency,
        lastCheck: new Date(),
        model: PROVIDER_METADATA[this.providerToKey(provider)].name,
      };

      this.checks.set(provider, check);
      return check;
    } catch (error) {
      const latency = Date.now() - startTime;

      const check: HealthCheck = {
        provider,
        status: "unhealthy",
        latency,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
        model: PROVIDER_METADATA[this.providerToKey(provider)].name,
      };

      this.checks.set(provider, check);
      return check;
    }
  }

  /**
   * Check all providers
   */
  async checkAll(): Promise<HealthCheck[]> {
    const providers: ProviderName[] = ["openai", "anthropic", "google"];
    const results = await Promise.all(
      providers.map((p) => this.checkProvider(p))
    );
    return results;
  }

  /**
   * Get overall health status
   */
  async getOverallHealth(): Promise<OverallHealth> {
    const checks = await this.checkAll();

    const healthyCount = checks.filter((c) => c.status === "healthy").length;
    const degradedCount = checks.filter((c) => c.status === "degraded").length;
    const totalCount = checks.length;

    let status: HealthStatus;
    if (healthyCount === 0) {
      status = "unhealthy";
    } else if (healthyCount < totalCount || degradedCount > 0) {
      status = "degraded";
    } else {
      status = "healthy";
    }

    const health: OverallHealth = {
      status,
      providers: checks,
      healthyCount,
      totalCount,
      timestamp: new Date(),
    };

    // Check for status change
    if (status !== this.lastOverallStatus) {
      this.config.onHealthChange?.(health);

      if (status === "unhealthy") {
        this.config.onAllUnhealthy?.();
      }

      this.lastOverallStatus = status;
    }

    return health;
  }

  /**
   * Get cached health status (without making new requests)
   */
  getCachedHealth(): OverallHealth {
    const checks = Array.from(this.checks.values());

    const healthyCount = checks.filter((c) => c.status === "healthy").length;
    const totalCount = checks.length || 3; // Default to 3 providers

    let status: HealthStatus;
    if (checks.length === 0) {
      status = "healthy"; // No checks yet
    } else if (healthyCount === 0) {
      status = "unhealthy";
    } else if (healthyCount < totalCount) {
      status = "degraded";
    } else {
      status = "healthy";
    }

    return {
      status,
      providers: checks,
      healthyCount,
      totalCount,
      timestamp: new Date(),
    };
  }

  /**
   * Start periodic health monitoring
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      console.warn("[HealthMonitor] Already monitoring");
      return;
    }

    console.log(
      `[HealthMonitor] Starting health monitoring (interval: ${this.config.checkInterval}ms)`
    );

    // Initial check
    this.getOverallHealth().catch((err) =>
      console.error("[HealthMonitor] Initial check failed:", err)
    );

    // Periodic checks
    this.checkInterval = setInterval(async () => {
      try {
        const health = await this.getOverallHealth();

        // Log status
        const statusEmoji =
          health.status === "healthy"
            ? "✓"
            : health.status === "degraded"
              ? "⚠"
              : "✗";
        console.log(
          `[HealthMonitor] ${statusEmoji} ${health.healthyCount}/${health.totalCount} providers healthy`
        );
      } catch (error) {
        console.error("[HealthMonitor] Health check failed:", error);
      }
    }, this.config.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log("[HealthMonitor] Stopped health monitoring");
    }
  }

  /**
   * Get combined status with circuit breaker information
   */
  getCombinedStatus(): {
    health: OverallHealth;
    circuits: ReturnType<typeof circuitBreaker.getMetrics>;
  } {
    return {
      health: this.getCachedHealth(),
      circuits: circuitBreaker.getMetrics(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getModelForProvider(provider: ProviderName): LanguageModel | null {
    switch (provider) {
      case "openai":
        return getPrimaryModel();
      case "anthropic":
        return getFallback1Model();
      case "google":
        return getFallback2Model();
      default:
        return null;
    }
  }

  private providerToKey(
    provider: ProviderName
  ): "primary" | "fallback1" | "fallback2" {
    switch (provider) {
      case "openai":
        return "primary";
      case "anthropic":
        return "fallback1";
      case "google":
        return "fallback2";
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Health check timeout")), ms)
    );
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const healthMonitor = new HealthMonitor();
