/**
 * Weekly Check-in Scheduler
 * Phase 04: Studio Tier Features - Plan 05
 *
 * Dispatches personalized weekly check-in SMS messages to all opted-in Studio users.
 * References agent task history for personalized highlights.
 */

import { getISOWeek, getISOWeekYear } from 'date-fns';
import { sendSMS } from '@/lib/sms/client';
import { getCheckinTemplate } from '@/lib/sms/templates';
import type { WeeklyCheckinResult } from '@/lib/sms/types';
import {
  getOptedInUsers,
  getCheckinHistory,
  createCheckin,
  updateCheckinStatus,
} from '@/lib/db/sms';
import { getAgentTasks } from '@/lib/db/agent-tasks';
import { logger } from "@/lib/logger";

/**
 * Send weekly check-in SMS to all opted-in users.
 *
 * Features:
 * - Idempotency: skips users who already received a check-in this week
 * - Personalization: includes recent agent task highlights
 * - Error isolation: one user's failure doesn't block others
 *
 * @returns Summary of sent/failed/skipped counts
 */
export async function sendWeeklyCheckins(): Promise<WeeklyCheckinResult> {
  const result: WeeklyCheckinResult = {
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Get all opted-in users with verified phone numbers
  const users = await getOptedInUsers();
  logger.log(
    `[Weekly Check-in] Starting dispatch for ${users.length} opted-in users`
  );

  if (users.length === 0) {
    logger.log('[Weekly Check-in] No opted-in users found, skipping');
    return result;
  }

  // Get current ISO week number and year
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const year = getISOWeekYear(now);

  for (const user of users) {
    try {
      // Idempotency check: skip if check-in already sent this week
      const existingCheckins = await getCheckinHistory(user.userId, {
        weekNumber,
        year,
      });
      const alreadySent = existingCheckins.some(
        (c) => c.direction === 'outbound'
      );

      if (alreadySent) {
        logger.log(
          `[Weekly Check-in] Skipping user ${user.userId} - already sent this week (${weekNumber}/${year})`
        );
        result.skipped++;
        continue;
      }

      // Get recent completed agent tasks for highlights
      let highlights: string[] = [];
      try {
        const recentTasks = await getAgentTasks(user.userId, {
          status: 'complete' as import('@/lib/agents/types').AgentStatus,
          limit: 5,
        });
        highlights = recentTasks
          .map((t) => t.description)
          .filter((d): d is string => !!d)
          .slice(0, 3); // Limit to 3 for SMS brevity
      } catch (err) {
        // Non-critical: proceed without highlights if agent tasks query fails
        console.warn(
          `[Weekly Check-in] Failed to get agent tasks for user ${user.userId}:`,
          err
        );
      }

      // Generate personalized message
      const founderName = user.name || 'Founder';
      const message = getCheckinTemplate(founderName, highlights);

      // Create outbound check-in record with 'queued' status
      const checkin = await createCheckin({
        userId: user.userId,
        phoneNumber: user.phoneNumber!,
        direction: 'outbound',
        body: message,
        status: 'queued',
        weekNumber,
        year,
      });

      // Send SMS via Twilio
      try {
        const messageSid = await sendSMS(user.phoneNumber!, message);
        await updateCheckinStatus(checkin.id, 'sent', messageSid);
        result.sent++;
        logger.log(
          `[Weekly Check-in] Sent to user ${user.userId} (SID: ${messageSid})`
        );
      } catch (sendErr) {
        await updateCheckinStatus(checkin.id, 'failed');
        result.failed++;
        const errorMsg =
          sendErr instanceof Error ? sendErr.message : String(sendErr);
        result.errors.push({ userId: user.userId, error: errorMsg });
        console.error(
          `[Weekly Check-in] Failed to send to user ${user.userId}:`,
          errorMsg
        );
      }
    } catch (err) {
      result.failed++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      result.errors.push({ userId: user.userId, error: errorMsg });
      console.error(
        `[Weekly Check-in] Error processing user ${user.userId}:`,
        errorMsg
      );
    }
  }

  logger.log(
    `[Weekly Check-in] Dispatch complete: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`
  );

  return result;
}
