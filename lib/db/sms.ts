/**
 * SMS Database Operations
 * Phase 04: Studio Tier Features - Plan 05
 *
 * CRUD operations for sms_checkins and user_sms_preferences tables.
 * All functions accept a SupabaseClient parameter (dependency injection)
 * so callers can pass either a user-scoped or service-role client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CheckinRecord,
  DeliveryStats,
  SMSStatus,
  UserSMSPreferences,
} from "@/lib/sms/types";

// ============================================================================
// Check-in Records
// ============================================================================

/**
 * Create a new check-in record
 */
export async function createCheckin(
  supabase: SupabaseClient,
  params: Omit<CheckinRecord, "id" | "createdAt">
): Promise<CheckinRecord> {
  const { data, error } = await supabase
    .from("sms_checkins")
    .insert({
      user_id: params.userId,
      phone_number: params.phoneNumber,
      message_sid: params.messageSid,
      direction: params.direction,
      body: params.body,
      status: params.status,
      week_number: params.weekNumber,
      year: params.year,
      parent_checkin_id: params.parentCheckinId,
      accountability_score: params.accountabilityScore,
      sent_at: params.sentAt?.toISOString(),
      received_at: params.receivedAt?.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create checkin: ${error.message}`);
  }

  return mapCheckin(data);
}

/**
 * Get check-in history for a user with optional filters
 */
export async function getCheckinHistory(
  supabase: SupabaseClient,
  userId: string,
  opts?: { limit?: number; weekNumber?: number; year?: number }
): Promise<CheckinRecord[]> {
  let query = supabase
    .from("sms_checkins")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (opts?.weekNumber !== undefined) {
    query = query.eq("week_number", opts.weekNumber);
  }
  if (opts?.year !== undefined) {
    query = query.eq("year", opts.year);
  }
  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get checkin history: ${error.message}`);
  }

  return (data || []).map(mapCheckin);
}

/**
 * Get a check-in record by Twilio message SID
 */
export async function getCheckinByMessageSid(
  supabase: SupabaseClient,
  messageSid: string
): Promise<CheckinRecord | null> {
  const { data, error } = await supabase
    .from("sms_checkins")
    .select("*")
    .eq("message_sid", messageSid)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to get checkin by message SID: ${error.message}`);
  }

  return mapCheckin(data);
}

/**
 * Find a user by phone number from the SMS preferences table
 */
export async function findUserByPhoneNumber(
  supabase: SupabaseClient,
  phoneNumber: string
): Promise<{ userId: string } | null> {
  const { data, error } = await supabase
    .from("user_sms_preferences")
    .select("user_id")
    .eq("phone_number", phoneNumber)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to find user by phone number: ${error.message}`);
  }

  return { userId: data.user_id as string };
}

/**
 * Update check-in status and optionally set message SID
 */
export async function updateCheckinStatus(
  supabase: SupabaseClient,
  checkinId: string,
  status: SMSStatus,
  messageSid?: string
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (messageSid) {
    updates.message_sid = messageSid;
  }
  if (status === "sent") {
    updates.sent_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("sms_checkins")
    .update(updates)
    .eq("id", checkinId);

  if (error) {
    throw new Error(`Failed to update checkin status: ${error.message}`);
  }
}

/**
 * Update delivery status for a check-in record matched by Twilio message SID.
 * Called by the /api/sms/status webhook when Twilio sends delivery callbacks.
 */
export async function updateDeliveryStatus(
  supabase: SupabaseClient,
  messageSid: string,
  status: string,
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    delivery_status: status,
    status_updated_at: new Date().toISOString(),
  };

  if (errorCode) {
    updates.delivery_error_code = errorCode;
  }
  if (errorMessage) {
    updates.delivery_error_message = errorMessage;
  }
  if (status === "delivered") {
    updates.delivered_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("sms_checkins")
    .update(updates)
    .eq("message_sid", messageSid);

  if (error) {
    throw new Error(`Failed to update delivery status: ${error.message}`);
  }
}

/**
 * Get aggregated delivery statistics for outbound SMS messages.
 * Returns total, delivered, failed, pending counts and delivery rate.
 */
export async function getDeliveryStats(
  supabase: SupabaseClient,
  opts?: { userId?: string; startDate?: Date; endDate?: Date }
): Promise<DeliveryStats> {
  let query = supabase
    .from("sms_checkins")
    .select("status, delivery_status")
    .eq("direction", "outbound");

  if (opts?.userId) {
    query = query.eq("user_id", opts.userId);
  }
  if (opts?.startDate) {
    query = query.gte("created_at", opts.startDate.toISOString());
  }
  if (opts?.endDate) {
    query = query.lte("created_at", opts.endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get delivery stats: ${error.message}`);
  }

  const records = data || [];
  const total = records.length;
  const delivered = records.filter(
    (r) => r.delivery_status === "delivered" || r.status === "delivered"
  ).length;
  const failed = records.filter(
    (r) =>
      r.delivery_status === "failed" ||
      r.delivery_status === "undelivered" ||
      r.status === "failed"
  ).length;
  const pending = total - delivered - failed;
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  return { total, delivered, failed, pending, deliveryRate };
}

// ============================================================================
// User SMS Preferences
// ============================================================================

/**
 * Get SMS preferences for a user
 */
export async function getUserSMSPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSMSPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("user_sms_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      // PGRST205 = table doesn't exist (migrations not applied)
      if (
        error.code === "PGRST205" ||
        error.message?.includes("relation") ||
        error.code === "42P01"
      ) {
        console.warn(
          "[getUserSMSPreferences] Table does not exist, returning null"
        );
        return null;
      }
      throw new Error(`Failed to get SMS preferences: ${error.message}`);
    }

    return mapPreferences(data);
  } catch (err) {
    // Gracefully handle missing table or connection issues
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("relation") ||
      msg.includes("does not exist") ||
      msg.includes("PGRST205")
    ) {
      console.warn(
        "[getUserSMSPreferences] Table does not exist, returning null"
      );
      return null;
    }
    throw err;
  }
}

/**
 * Upsert SMS preferences for a user
 */
export async function updateSMSPreferences(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<UserSMSPreferences>
): Promise<UserSMSPreferences> {
  const dbUpdates: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (updates.phoneNumber !== undefined)
    dbUpdates.phone_number = updates.phoneNumber;
  if (updates.phoneVerified !== undefined)
    dbUpdates.phone_verified = updates.phoneVerified;
  if (updates.checkinEnabled !== undefined)
    dbUpdates.checkin_enabled = updates.checkinEnabled;
  if (updates.checkinDay !== undefined)
    dbUpdates.checkin_day = updates.checkinDay;
  if (updates.checkinHour !== undefined)
    dbUpdates.checkin_hour = updates.checkinHour;
  if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
  if (updates.consentedAt !== undefined)
    dbUpdates.consent_at = updates.consentedAt.toISOString();

  const { data, error } = await supabase
    .from("user_sms_preferences")
    .upsert(dbUpdates, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update SMS preferences: ${error.message}`);
  }

  return mapPreferences(data);
}

/**
 * Get all opted-in users with verified phone numbers.
 * Joins with auth metadata to get user name.
 */
export async function getOptedInUsers(
  supabase: SupabaseClient
): Promise<Array<UserSMSPreferences & { name?: string }>> {
  const { data, error } = await supabase
    .from("user_sms_preferences")
    .select("*")
    .eq("checkin_enabled", true)
    .not("phone_number", "is", null)
    .eq("phone_verified", true);

  if (error) {
    throw new Error(`Failed to get opted-in users: ${error.message}`);
  }

  return (data || []).map((row) => ({
    ...mapPreferences(row),
    name: (row.name as string) || undefined,
  }));
}

// ============================================================================
// Mappers
// ============================================================================

function mapCheckin(row: Record<string, unknown>): CheckinRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    phoneNumber: row.phone_number as string,
    messageSid: (row.message_sid as string) || undefined,
    direction: row.direction as CheckinRecord["direction"],
    body: row.body as string,
    status: row.status as CheckinRecord["status"],
    weekNumber: row.week_number as number,
    year: row.year as number,
    parentCheckinId: (row.parent_checkin_id as string) || undefined,
    accountabilityScore:
      (row.accountability_score as Record<string, unknown>) || undefined,
    sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
    receivedAt: row.received_at
      ? new Date(row.received_at as string)
      : undefined,
    createdAt: new Date(row.created_at as string),
    deliveryStatus: (row.delivery_status as string) || undefined,
    deliveryErrorCode: (row.delivery_error_code as string) || undefined,
    deliveryErrorMessage: (row.delivery_error_message as string) || undefined,
    deliveredAt: row.delivered_at
      ? new Date(row.delivered_at as string)
      : undefined,
    statusUpdatedAt: row.status_updated_at
      ? new Date(row.status_updated_at as string)
      : undefined,
  };
}

function mapPreferences(row: Record<string, unknown>): UserSMSPreferences {
  return {
    userId: row.user_id as string,
    phoneNumber: (row.phone_number as string) || undefined,
    phoneVerified: (row.phone_verified as boolean) || false,
    checkinEnabled: (row.checkin_enabled as boolean) ?? true,
    checkinDay: (row.checkin_day as number) ?? 1,
    checkinHour: (row.checkin_hour as number) ?? 9,
    timezone: (row.timezone as string) || "America/New_York",
    consentedAt: row.consent_at
      ? new Date(row.consent_at as string)
      : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
