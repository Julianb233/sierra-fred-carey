/**
 * Alert Notification Scheduler
 * Provides utilities for scheduling periodic alert checks
 * Can be used with Vercel Cron, external schedulers, or manual triggers
 */

import { scheduleAlertNotifications } from "./alert-notifier";

/**
 * Run alert notification check
 * This is the main entry point for scheduled jobs
 */
export async function runAlertNotificationCheck(): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  const startTime = Date.now();
  console.log("[Alert Scheduler] Starting alert notification check...");

  try {
    await scheduleAlertNotifications();

    const duration = Date.now() - startTime;
    const message = `Alert notification check completed in ${duration}ms`;

    console.log(`[Alert Scheduler] ${message}`);

    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("[Alert Scheduler] Error during alert check:", error);

    return {
      success: false,
      message: `Alert check failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Interval-based scheduler (for use in development or self-hosted)
 * In production, use Vercel Cron or external scheduler instead
 */
export class AlertScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the scheduler with specified interval
   * @param intervalMinutes - How often to check for alerts (default: 15 minutes)
   */
  start(intervalMinutes: number = 15): void {
    if (this.isRunning) {
      console.log("[Alert Scheduler] Scheduler already running");
      return;
    }

    console.log(
      `[Alert Scheduler] Starting scheduler with ${intervalMinutes}min interval`
    );

    this.isRunning = true;

    // Run immediately on start
    this.runCheck();

    // Schedule periodic checks
    this.intervalId = setInterval(
      () => {
        this.runCheck();
      },
      intervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("[Alert Scheduler] Scheduler not running");
      return;
    }

    console.log("[Alert Scheduler] Stopping scheduler");

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Check if scheduler is currently running
   */
  getStatus(): { running: boolean; intervalMinutes?: number } {
    return {
      running: this.isRunning,
    };
  }

  /**
   * Internal method to run alert check
   */
  private async runCheck(): Promise<void> {
    try {
      await runAlertNotificationCheck();
    } catch (error) {
      console.error("[Alert Scheduler] Error in scheduled check:", error);
    }
  }
}

/**
 * Singleton instance for the alert scheduler
 * Use this if you want a global scheduler instance
 */
let schedulerInstance: AlertScheduler | null = null;

export function getAlertScheduler(): AlertScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new AlertScheduler();
  }
  return schedulerInstance;
}

/**
 * Helper to start the global scheduler
 */
export function startGlobalAlertScheduler(intervalMinutes: number = 15): void {
  const scheduler = getAlertScheduler();
  scheduler.start(intervalMinutes);
}

/**
 * Helper to stop the global scheduler
 */
export function stopGlobalAlertScheduler(): void {
  const scheduler = getAlertScheduler();
  scheduler.stop();
}
