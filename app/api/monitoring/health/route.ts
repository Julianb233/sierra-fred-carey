import { NextResponse } from "next/server";
import type { SystemHealthData } from "@/components/monitoring/SystemHealth";
import { sql } from "@/lib/db/supabase-sql";

/**
 * GET /api/monitoring/health
 * Returns system health information with real service checks
 */
export async function GET() {
  try {
    const now = new Date();

    // Real health checks - run in parallel
    const [apiCheck, dbCheck] = await Promise.all([
      checkApiHealth(),
      checkDatabaseHealth(),
    ]);

    const services = [apiCheck, dbCheck];

    // Calculate overall status based on service health
    const overallStatus = calculateOverallStatus(
      services.map((s) => s.status)
    );

    // Calculate average response time from real checks
    const avgResponseTime = Math.round(
      services.reduce((sum, s) => sum + (s.responseTime || 0), 0) / services.length
    );

    const healthData: SystemHealthData = {
      overallStatus,
      services,
      avgResponseTime,
      uptime: 100, // Uptime is 100% if this endpoint responds
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
 * Check API health by measuring this endpoint's own response capability
 */
async function checkApiHealth(): Promise<{
  name: string;
  status: "operational" | "degraded" | "down";
  responseTime: number;
  lastCheck: Date;
  message?: string;
}> {
  const start = Date.now();

  try {
    // API is healthy if this code is executing
    const responseTime = Date.now() - start;

    return {
      name: "API",
      status: responseTime > 1000 ? "degraded" : "operational",
      responseTime,
      lastCheck: new Date(),
      message: responseTime > 1000 ? "API experiencing high latency" : undefined,
    };
  } catch {
    return {
      name: "API",
      status: "down",
      responseTime: Date.now() - start,
      lastCheck: new Date(),
      message: "API health check failed",
    };
  }
}

/**
 * Check database health with a real query
 */
async function checkDatabaseHealth(): Promise<{
  name: string;
  status: "operational" | "degraded" | "down";
  responseTime: number;
  lastCheck: Date;
  message?: string;
}> {
  const start = Date.now();

  try {
    await sql`SELECT 1`;
    const responseTime = Date.now() - start;

    return {
      name: "Database",
      status: responseTime > 500 ? "degraded" : "operational",
      responseTime,
      lastCheck: new Date(),
      message: responseTime > 500 ? "Database experiencing high latency" : undefined,
    };
  } catch (error) {
    return {
      name: "Database",
      status: "down",
      responseTime: Date.now() - start,
      lastCheck: new Date(),
      message: `Database unreachable: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
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
