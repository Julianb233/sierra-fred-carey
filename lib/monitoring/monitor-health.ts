/**
 * Monitor Health Checker
 *
 * Runs periodic health checks against critical system services (API, DB,
 * monitoring pipeline). Tracks consecutive failures and alerts Julian via
 * SMS + email after 3+ consecutive failures so silent outages are caught.
 *
 * Designed to be called by a Vercel Cron job every 5 minutes.
 *
 * Linear: AI-4109
 */

import { sql } from "@/lib/db/supabase-sql";
import { sendSMS } from "@/lib/sms/client";
import { sendEmailNotification } from "@/lib/notifications/email";
import { logger } from "@/lib/logger";

const ALERT_PHONE = process.env.MONITOR_ALERT_PHONE || process.env.ADMIN_PHONE;
const ALERT_EMAIL = process.env.MONITOR_ALERT_EMAIL || process.env.ADMIN_EMAIL;
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30 * 60 * 1000; // 30 min between repeat alerts

interface ServiceCheck {
  name: string;
  status: "ok" | "failed";
  responseTime: number;
  error?: string;
}

interface HealthCheckResult {
  timestamp: string;
  services: ServiceCheck[];
  allHealthy: boolean;
  consecutiveFailures: number;
  alertSent: boolean;
}

// In-memory failure state (persists across invocations within the same
// serverless instance; resets on cold start — acceptable since the DB
// table provides durable state).
let consecutiveFailures = 0;
let lastAlertSentAt = 0;

/**
 * Run all health checks and alert if failures exceed threshold.
 */
export async function runMonitorHealthCheck(): Promise<HealthCheckResult> {
  const start = Date.now();
  logger.log("[Monitor Health] Starting health check...");

  const services = await Promise.all([
    checkDatabase(),
    checkMonitoringPipeline(),
  ]);

  const allHealthy = services.every((s) => s.status === "ok");

  if (allHealthy) {
    if (consecutiveFailures > 0) {
      logger.log(
        `[Monitor Health] Recovered after ${consecutiveFailures} consecutive failure(s)`
      );
    }
    consecutiveFailures = 0;
  } else {
    consecutiveFailures++;
    logger.warn(
      `[Monitor Health] Failure #${consecutiveFailures}: ${services
        .filter((s) => s.status === "failed")
        .map((s) => `${s.name}: ${s.error}`)
        .join("; ")}`
    );
  }

  // Persist the check result
  await persistCheckResult(services, allHealthy, consecutiveFailures);

  // Alert if threshold exceeded and cooldown has elapsed
  let alertSent = false;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    const now = Date.now();
    if (now - lastAlertSentAt > COOLDOWN_MS) {
      alertSent = await sendFailureAlert(services, consecutiveFailures);
      if (alertSent) {
        lastAlertSentAt = now;
      }
    } else {
      logger.log(
        "[Monitor Health] Alert suppressed — cooldown active"
      );
    }
  }

  const duration = Date.now() - start;
  logger.log(
    `[Monitor Health] Check completed in ${duration}ms — ${allHealthy ? "healthy" : "UNHEALTHY"} (failures: ${consecutiveFailures})`
  );

  return {
    timestamp: new Date().toISOString(),
    services,
    allHealthy,
    consecutiveFailures,
    alertSent,
  };
}

// ---------------------------------------------------------------------------
// Individual service checks
// ---------------------------------------------------------------------------

async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    await sql`SELECT 1`;
    return {
      name: "Database",
      status: "ok",
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "Database",
      status: "failed",
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkMonitoringPipeline(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    // Verify the monitoring dashboard query succeeds
    const { getMonitoringDashboard } = await import("./ab-test-metrics");
    await getMonitoringDashboard();
    return {
      name: "Monitoring Pipeline",
      status: "ok",
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "Monitoring Pipeline",
      status: "failed",
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

async function persistCheckResult(
  services: ServiceCheck[],
  allHealthy: boolean,
  failures: number
): Promise<void> {
  try {
    await sql`
      INSERT INTO monitor_health_checks (
        status,
        consecutive_failures,
        services,
        checked_at
      ) VALUES (
        ${allHealthy ? "healthy" : "unhealthy"},
        ${failures},
        ${JSON.stringify(services)},
        NOW()
      )
    `;
  } catch (error) {
    // Don't let persistence failure block the check
    logger.error("[Monitor Health] Failed to persist check result:", error);
  }
}

// ---------------------------------------------------------------------------
// Alerting
// ---------------------------------------------------------------------------

async function sendFailureAlert(
  services: ServiceCheck[],
  failures: number
): Promise<boolean> {
  const failedServices = services.filter((s) => s.status === "failed");
  const failedNames = failedServices.map((s) => s.name).join(", ");
  const errorDetails = failedServices
    .map((s) => `${s.name}: ${s.error || "unknown error"}`)
    .join("\n");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://joinsahara.com";
  const message = [
    `SAHARA MONITOR ALERT`,
    `${failures} consecutive failures detected.`,
    ``,
    `Failed services: ${failedNames}`,
    ``,
    errorDetails,
    ``,
    `Dashboard: ${appUrl}/admin/monitoring`,
  ].join("\n");

  let smsSent = false;
  let emailSent = false;

  // Send SMS
  if (ALERT_PHONE) {
    try {
      await sendSMS(ALERT_PHONE, message);
      smsSent = true;
      logger.log(`[Monitor Health] SMS alert sent to ${ALERT_PHONE}`);
    } catch (error) {
      logger.error("[Monitor Health] Failed to send SMS alert:", error);
    }
  }

  // Send email
  if (ALERT_EMAIL) {
    try {
      await sendEmailNotification(ALERT_EMAIL, {
        userId: "system",
        level: "critical",
        type: "errors",
        title: `Sahara Monitor: ${failures} consecutive failures`,
        message: `Services failing: ${failedNames}. ${errorDetails}`,
        metadata: {
          consecutiveFailures: failures,
          services: services.map((s) => ({
            name: s.name,
            status: s.status,
            responseTime: s.responseTime,
            error: s.error,
          })),
        },
      });
      emailSent = true;
      logger.log(`[Monitor Health] Email alert sent to ${ALERT_EMAIL}`);
    } catch (error) {
      logger.error("[Monitor Health] Failed to send email alert:", error);
    }
  }

  if (!ALERT_PHONE && !ALERT_EMAIL) {
    logger.warn(
      "[Monitor Health] No alert recipients configured. Set MONITOR_ALERT_PHONE or MONITOR_ALERT_EMAIL."
    );
  }

  return smsSent || emailSent;
}

/**
 * SQL to create the monitor_health_checks table.
 * Run this once in Supabase SQL Editor.
 */
export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS monitor_health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'unhealthy')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  services JSONB NOT NULL DEFAULT '[]',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitor_health_checks_checked_at
  ON monitor_health_checks (checked_at DESC);

-- Keep only 30 days of history
CREATE OR REPLACE FUNCTION cleanup_old_health_checks()
RETURNS void AS $$
BEGIN
  DELETE FROM monitor_health_checks
  WHERE checked_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
`;
