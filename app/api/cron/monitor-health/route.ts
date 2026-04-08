/**
 * Monitor Health Cron Job
 * AI-4109: Error alerting when monitor fails
 *
 * GET /api/cron/monitor-health
 *
 * Authorization: Bearer {CRON_SECRET}
 *
 * Vercel Cron: every 5 minutes
 *
 * Runs health checks against DB and monitoring pipeline.
 * Tracks consecutive failures and sends SMS + email alerts
 * to Julian after 3+ consecutive failures.
 */

import { NextRequest, NextResponse } from "next/server";
import { runMonitorHealthCheck } from "@/lib/monitoring/monitor-health";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

const LOG_PREFIX = "[Cron: Monitor Health]";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(`${LOG_PREFIX} CRON_SECRET not configured`);
    return false;
  }
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");

  try {
    const a = Buffer.from(token);
    const b = Buffer.from(cronSecret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  console.log(`${LOG_PREFIX} Starting health check`);

  if (!isAuthorized(request)) {
    console.warn(`${LOG_PREFIX} Unauthorized request`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMonitorHealthCheck();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Unexpected error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Monitor health check failed unexpectedly",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
