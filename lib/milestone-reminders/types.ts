/**
 * Milestone Reminder Types
 * AI-7368: Twilio SMS + in-app notifications for milestone reminders
 */

export type MilestoneStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

/** A milestone row that qualifies for a reminder. */
export interface ReminderMilestone {
  id: string;
  userId: string;
  title: string;
  category: string;
  status: MilestoneStatus;
  targetDate: string | null; // ISO date (YYYY-MM-DD)
  /** 'overdue' when past target_date, 'due_soon' when within the window. */
  urgency: "overdue" | "due_soon";
}

/** Everything needed to notify a single founder. */
export interface FounderReminder {
  userId: string;
  name: string;
  phoneNumber?: string;
  phoneVerified: boolean;
  smsEnabled: boolean;
  /** True when the founder is on a paid plan (Builder / Pro / Studio). */
  isPaid: boolean;
  milestones: ReminderMilestone[];
}

export interface MilestoneReminderResult {
  /** Founders processed (had at least one qualifying milestone). */
  founders: number;
  /** In-app notifications newly created (deduped re-runs excluded). */
  inAppCreated: number;
  /** SMS messages successfully sent (paid + verified phone only). */
  smsSent: number;
  /** Founders skipped because they were already notified this week. */
  skipped: number;
  /** Founders not texted because they are free-plan or have no verified phone. */
  smsSkippedNotPaidOrNoPhone: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}
