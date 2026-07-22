/**
 * Milestone Reminder Scheduler
 * AI-7368: Twilio SMS + in-app notifications for milestone reminders
 *
 * Dispatched weekly (Friday morning) by /api/cron/milestone-reminders.
 *
 * For each founder with active milestones that are overdue or due within the
 * next 7 days:
 *   1. Create ONE in-app notification for the week (idempotent via dedup_key).
 *      This is the cheap fallback channel — every founder gets it.
 *   2. If — and only if — that in-app row was newly created AND the founder is
 *      on a PAID plan AND has a verified phone with SMS enabled, also send ONE
 *      Twilio SMS. Text has far higher open rates than push (Ira's note), but
 *      SMS costs money, so it's paid-only (Fred's requirement).
 *
 * Gating the SMS on the in-app "created" flag gives both channels the same
 * once-per-week idempotency for free — cron re-runs never double-notify.
 */

import { getISOWeek, getISOWeekYear, addDays, formatISO } from "date-fns";
import { createServiceClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/sms/client";
import { getUserTier } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";
import { createInAppNotification } from "@/lib/db/in-app-notifications";
import { logger } from "@/lib/logger";
import { buildMilestoneSMS, buildMilestoneInApp, MILESTONE_LINK } from "./templates";
import type {
  FounderReminder,
  MilestoneReminderResult,
  ReminderMilestone,
} from "./types";

/** Milestones with a target date this many days out (or already past) qualify. */
const DUE_SOON_WINDOW_DAYS = 7;

/**
 * Fetch milestones that need a reminder: still open (pending / in_progress) and
 * either overdue or due within the window.
 */
async function getMilestonesNeedingReminder(
  supabase: ReturnType<typeof createServiceClient>,
  now: Date
): Promise<ReminderMilestone[]> {
  const today = formatISO(now, { representation: "date" });
  const windowEnd = formatISO(addDays(now, DUE_SOON_WINDOW_DAYS), {
    representation: "date",
  });

  const { data, error } = await supabase
    .from("milestones")
    .select("id, user_id, title, category, status, target_date")
    .in("status", ["pending", "in_progress"])
    .not("target_date", "is", null)
    .lte("target_date", windowEnd)
    .order("target_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch milestones: ${error.message}`);
  }

  return (data || []).map((row) => {
    const targetDate = (row.target_date as string) ?? null;
    const urgency: ReminderMilestone["urgency"] =
      targetDate && targetDate < today ? "overdue" : "due_soon";
    return {
      id: row.id as string,
      userId: row.user_id as string,
      title: (row.title as string) || "Untitled milestone",
      category: (row.category as string) || "product",
      status: row.status as ReminderMilestone["status"],
      targetDate,
      urgency,
    };
  });
}

/**
 * Build per-founder reminder objects: group milestones by user, then enrich
 * each founder with name, SMS preferences, and paid-plan status.
 */
async function buildFounderReminders(
  supabase: ReturnType<typeof createServiceClient>,
  milestones: ReminderMilestone[]
): Promise<FounderReminder[]> {
  const byUser = new Map<string, ReminderMilestone[]>();
  for (const m of milestones) {
    const list = byUser.get(m.userId) ?? [];
    list.push(m);
    byUser.set(m.userId, list);
  }

  const userIds = [...byUser.keys()];
  if (userIds.length === 0) return [];

  // Batch-fetch SMS preferences and names for all affected founders.
  const [{ data: prefsRows }, { data: profileRows }] = await Promise.all([
    supabase
      .from("user_sms_preferences")
      .select("user_id, phone_number, phone_verified, checkin_enabled, name")
      .in("user_id", userIds),
    // profiles has `name` (no full_name) — verified against prod schema.
    supabase.from("profiles").select("id, name").in("id", userIds),
  ]);

  const prefsByUser = new Map<string, Record<string, unknown>>();
  for (const row of prefsRows || []) {
    prefsByUser.set(row.user_id as string, row);
  }
  const nameByUser = new Map<string, string>();
  for (const row of profileRows || []) {
    nameByUser.set(row.id as string, (row.name as string) || "");
  }

  const founders: FounderReminder[] = [];
  for (const userId of userIds) {
    const prefs = prefsByUser.get(userId);
    const tier = await getUserTier(userId);
    founders.push({
      userId,
      name:
        (prefs?.name as string) || nameByUser.get(userId) || "Founder",
      phoneNumber: (prefs?.phone_number as string) || undefined,
      phoneVerified: Boolean(prefs?.phone_verified),
      // Default true — matches user_sms_preferences default. Only an explicit
      // false opts out.
      smsEnabled: prefs?.checkin_enabled !== false,
      isPaid: tier > UserTier.FREE,
      milestones: byUser.get(userId) ?? [],
    });
  }

  return founders;
}

/**
 * Send weekly milestone reminders.
 *
 * @param opts.twilioConfigured  When false, the SMS step is skipped entirely
 *        and only in-app notifications are created (graceful degradation).
 */
export async function sendMilestoneReminders(opts?: {
  twilioConfigured?: boolean;
  now?: Date;
}): Promise<MilestoneReminderResult> {
  const now = opts?.now ?? new Date();
  const twilioConfigured = opts?.twilioConfigured ?? true;

  const result: MilestoneReminderResult = {
    founders: 0,
    inAppCreated: 0,
    smsSent: 0,
    skipped: 0,
    smsSkippedNotPaidOrNoPhone: 0,
    failed: 0,
    errors: [],
  };

  const supabase = createServiceClient();

  const milestones = await getMilestonesNeedingReminder(supabase, now);
  if (milestones.length === 0) {
    logger.log("[Milestone Reminders] No milestones need a reminder this week");
    return result;
  }

  const founders = await buildFounderReminders(supabase, milestones);
  result.founders = founders.length;

  const weekNumber = getISOWeek(now);
  const year = getISOWeekYear(now);

  logger.log(
    `[Milestone Reminders] ${founders.length} founder(s) with active milestones (week ${weekNumber}/${year})`
  );

  for (const founder of founders) {
    try {
      const { title, body } = buildMilestoneInApp(
        founder.name,
        founder.milestones
      );

      // One in-app notification per founder per ISO week (idempotent).
      const dedupKey = `milestone-weekly:${founder.userId}:${year}-W${weekNumber}`;
      const { created } = await createInAppNotification(supabase, {
        userId: founder.userId,
        type: "milestone_reminder",
        title,
        body,
        link: MILESTONE_LINK,
        metadata: {
          week: weekNumber,
          year,
          milestoneIds: founder.milestones.map((m) => m.id),
          overdue: founder.milestones.filter((m) => m.urgency === "overdue")
            .length,
        },
        dedupKey,
      });

      if (!created) {
        // Already notified this week — skip SMS too (idempotent).
        result.skipped++;
        continue;
      }

      result.inAppCreated++;

      // SMS: paid founders with a verified phone only (cost control).
      const canText =
        twilioConfigured &&
        founder.isPaid &&
        founder.phoneVerified &&
        founder.smsEnabled &&
        !!founder.phoneNumber;

      if (!canText) {
        result.smsSkippedNotPaidOrNoPhone++;
        continue;
      }

      try {
        const smsBody = buildMilestoneSMS(founder.name, founder.milestones);
        const sid = await sendSMS(founder.phoneNumber!, smsBody);
        result.smsSent++;
        logger.log(
          `[Milestone Reminders] SMS sent to ${founder.userId} (SID: ${sid})`
        );
      } catch (smsErr) {
        // In-app already delivered — SMS failure is non-fatal (fallback stands).
        const msg = smsErr instanceof Error ? smsErr.message : String(smsErr);
        result.failed++;
        result.errors.push({ userId: founder.userId, error: `sms: ${msg}` });
        console.error(
          `[Milestone Reminders] SMS failed for ${founder.userId}: ${msg}`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.failed++;
      result.errors.push({ userId: founder.userId, error: msg });
      console.error(
        `[Milestone Reminders] Error processing ${founder.userId}: ${msg}`
      );
    }
  }

  logger.log(
    `[Milestone Reminders] Done: ${result.inAppCreated} in-app, ${result.smsSent} SMS, ` +
      `${result.skipped} skipped, ${result.smsSkippedNotPaidOrNoPhone} sms-skipped, ${result.failed} failed`
  );

  return result;
}
