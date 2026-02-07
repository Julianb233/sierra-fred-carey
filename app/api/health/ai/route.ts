/**
 * AI Provider Health Check Endpoint
 *
 * GET /api/health/ai
 * Returns the health status of all AI providers, circuit breaker states,
 * and overall system health.
 */

import { NextResponse } from "next/server";
import { healthMonitor } from "@/lib/ai/health-monitor";
import { circuitBreaker } from "@/lib/ai/circuit-breaker";
import { getProviderAvailability } from "@/lib/ai/fallback-chain";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get health check results (uses cached data to avoid API calls on every request)
    const health = healthMonitor.getCachedHealth();

    // Get circuit breaker status
    const circuits = circuitBreaker.getMetrics();

    // Get provider configuration status
    const availability = getProviderAvailability();

    // Determine overall status
    const configuredProviders = Object.values(availability).filter(
      (p) => p.configured
    ).length;
    const healthyCircuits = circuits.filter(
      (c) => c.state === "closed"
    ).length;

    let overallStatus: "healthy" | "degraded" | "unhealthy";

    if (configuredProviders === 0) {
      overallStatus = "unhealthy";
    } else if (health.status === "unhealthy") {
      overallStatus = "unhealthy";
    } else if (healthyCircuits === 0 && configuredProviders > 0) {
      overallStatus = "unhealthy";
    } else if (health.status === "degraded" || healthyCircuits < configuredProviders) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),

      // Provider configuration
      providers: {
        configured: configuredProviders,
        available: Object.entries(availability).map(([name, status]) => ({
          name,
          configured: status.configured,
          circuitHealthy: status.circuitHealthy,
        })),
      },

      // Health check results
      health: {
        status: health.status,
        healthyCount: health.healthyCount,
        totalCount: health.totalCount,
        lastCheck: health.timestamp.toISOString(),
        providers: health.providers.map((p) => ({
          provider: p.provider,
          status: p.status,
          latency: p.latency,
          lastCheck: p.lastCheck.toISOString(),
          error: p.error,
          model: p.model,
        })),
      },

      // Circuit breaker states
      circuits: circuits.map((c) => ({
        provider: c.provider,
        state: c.state,
        failures: c.failures,
        successes: c.successes,
        failureRate: Math.round(c.failureRate * 100) / 100,
        lastFailure: c.lastFailure,
        lastSuccess: c.lastSuccess,
        openedAt: c.openedAt,
        timeSinceOpened: c.timeSinceOpened
          ? Math.round(c.timeSinceOpened / 1000)
          : null,
      })),

      // Summary metrics
      metrics: {
        totalRequests: circuits.reduce((sum, c) => sum + c.failures + c.successes, 0),
        totalFailures: circuits.reduce((sum, c) => sum + c.failures, 0),
        totalSuccesses: circuits.reduce((sum, c) => sum + c.successes, 0),
        overallFailureRate:
          circuits.length > 0
            ? Math.round(
                (circuits.reduce((sum, c) => sum + c.failureRate, 0) /
                  circuits.length) *
                  100
              ) / 100
            : 0,
      },
    });
  } catch (error) {
    console.error("[Health Check] Error:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/ai
 * Trigger a fresh health check of all providers
 */
export async function POST() {
  try {
    // Perform fresh health checks
    const health = await healthMonitor.getOverallHealth();

    // Get updated circuit status
    const circuits = circuitBreaker.getMetrics();

    return NextResponse.json({
      status: health.status,
      timestamp: new Date().toISOString(),
      message: "Health check completed",

      health: {
        status: health.status,
        healthyCount: health.healthyCount,
        totalCount: health.totalCount,
        providers: health.providers.map((p) => ({
          provider: p.provider,
          status: p.status,
          latency: p.latency,
          error: p.error,
        })),
      },

      circuits: circuits.map((c) => ({
        provider: c.provider,
        state: c.state,
        failures: c.failures,
        successes: c.successes,
      })),
    });
  } catch (error) {
    console.error("[Health Check] Error during check:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 500 }
    );
  }
}
