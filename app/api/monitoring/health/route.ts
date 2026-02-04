import { NextResponse } from "next/server";
import type { SystemHealthData } from "@/components/monitoring/SystemHealth";

/**
 * GET /api/monitoring/health
 * Returns system health information including service status, response times, and incidents
 */
export async function GET() {
  try {
    // In a real implementation, this would check actual service health
    // For now, we return mock data with realistic values

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Simulate service health checks
    const apiCheck = await simulateHealthCheck("API", 45, 0.95);
    const dbCheck = await simulateHealthCheck("Database", 12, 0.98);
    const queueCheck = await simulateHealthCheck("Queue", 8, 0.99);

    // Calculate overall status based on service health
    const overallStatus = calculateOverallStatus([
      apiCheck.status,
      dbCheck.status,
      queueCheck.status,
    ]);

    // Calculate average response time
    const avgResponseTime = Math.round(
      (apiCheck.responseTime! + dbCheck.responseTime! + queueCheck.responseTime!) / 3
    );

    // Mock last incident (10% chance of having a recent incident)
    const hasRecentIncident = Math.random() < 0.1;
    const lastIncident = hasRecentIncident
      ? {
          timestamp: oneHourAgo,
          severity: "warning" as const,
          message: "Database connection pool exhausted, auto-recovered",
        }
      : undefined;

    // Calculate uptime (typically 99.5% - 100%)
    const uptime = 99.5 + Math.random() * 0.5;

    const healthData: SystemHealthData = {
      overallStatus,
      services: [apiCheck, dbCheck, queueCheck],
      avgResponseTime,
      lastIncident,
      uptime,
    };

    return NextResponse.json({
      success: true,
      data: healthData,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[Health API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch health data",
      },
      { status: 500 }
    );
  }
}

/**
 * Simulates a health check for a service
 * In production, this would make actual health check requests
 */
async function simulateHealthCheck(
  serviceName: string,
  baseLatency: number,
  healthProbability: number
): Promise<{
  name: string;
  status: "operational" | "degraded" | "down";
  responseTime: number;
  lastCheck: Date;
  message?: string;
}> {
  // Add some randomness to latency
  const responseTime = Math.round(baseLatency + Math.random() * 20);

  // Determine status based on probability
  const random = Math.random();
  let status: "operational" | "degraded" | "down";
  let message: string | undefined;

  if (random > healthProbability + 0.05) {
    // 5% chance of being down (if health probability is < 0.95)
    status = "down";
    message = `${serviceName} is not responding`;
  } else if (random > healthProbability) {
    // Slightly higher chance of degraded
    status = "degraded";
    message = `${serviceName} experiencing high latency`;
  } else {
    status = "operational";
  }

  return {
    name: serviceName,
    status,
    responseTime,
    lastCheck: new Date(),
    message,
  };
}

/**
 * Calculates overall system status based on individual service statuses
 */
function calculateOverallStatus(
  serviceStatuses: Array<"operational" | "degraded" | "down">
): "healthy" | "degraded" | "critical" {
  const hasDown = serviceStatuses.some((s) => s === "down");
  const hasDegraded = serviceStatuses.some((s) => s === "degraded");

  if (hasDown) {
    return "critical";
  } else if (hasDegraded) {
    return "degraded";
  } else {
    return "healthy";
  }
}
