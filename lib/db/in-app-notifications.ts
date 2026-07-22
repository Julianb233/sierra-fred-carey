/**
 * In-App Notifications — Database Operations
 * AI-7368: Milestone reminders (in-app fallback channel)
 *
 * CRUD for the `in_app_notifications` table. Every function accepts a
 * SupabaseClient (dependency injection) so callers can pass a service-role
 * client (cron/server) or a user-scoped client (RLS-enforced route handlers).
 *
 * Idempotency: pass a `dedupKey` to createInAppNotification. Backed by a
 * UNIQUE index (WHERE dedup_key IS NOT NULL), an upsert with ignoreDuplicates
 * means cron re-runs in the same window never create a second row — and the
 * `created` flag lets callers gate side effects (like sending an SMS) on the
 * first insert only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface InAppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  metadata: Record<string, unknown>;
  dedupKey?: string;
  readAt?: Date;
  createdAt: Date;
}

export interface CreateInAppNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  /** Optional idempotency key. If a row with this key exists, no new row is created. */
  dedupKey?: string;
}

export interface CreateInAppNotificationResult {
  /** True only when a brand-new row was inserted (false when deduped). */
  created: boolean;
  notification: InAppNotification | null;
}

function mapNotification(row: Record<string, unknown>): InAppNotification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: (row.type as string) || "system",
    title: (row.title as string) || "",
    body: (row.body as string) || "",
    link: (row.link as string) || undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
    dedupKey: (row.dedup_key as string) || undefined,
    readAt: row.read_at ? new Date(row.read_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
  };
}

/**
 * Create an in-app notification.
 *
 * When `dedupKey` is provided, uses an upsert that ignores duplicates so the
 * call is idempotent. The returned `created` flag is true only if a new row was
 * actually inserted.
 */
export async function createInAppNotification(
  supabase: SupabaseClient,
  input: CreateInAppNotificationInput
): Promise<CreateInAppNotificationResult> {
  const insertRow = {
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    link: input.link ?? null,
    metadata: input.metadata ?? {},
    dedup_key: input.dedupKey ?? null,
  };

  if (input.dedupKey) {
    // Idempotent path: upsert ignoring duplicates on the unique dedup_key.
    const { data, error } = await supabase
      .from("in_app_notifications")
      .upsert(insertRow, { onConflict: "dedup_key", ignoreDuplicates: true })
      .select();

    if (error) {
      throw new Error(`Failed to create in-app notification: ${error.message}`);
    }

    // With ignoreDuplicates, `data` is empty when the row already existed.
    if (data && data.length > 0) {
      return { created: true, notification: mapNotification(data[0]) };
    }
    return { created: false, notification: null };
  }

  const { data, error } = await supabase
    .from("in_app_notifications")
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create in-app notification: ${error.message}`);
  }

  return { created: true, notification: mapNotification(data) };
}

/**
 * Get a user's notifications (newest first). Set `unreadOnly` to filter to
 * unread only.
 */
export async function getInAppNotifications(
  supabase: SupabaseClient,
  userId: string,
  opts?: { unreadOnly?: boolean; limit?: number }
): Promise<InAppNotification[]> {
  let query = supabase
    .from("in_app_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (opts?.unreadOnly) {
    query = query.is("read_at", null);
  }
  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get in-app notifications: ${error.message}`);
  }

  return (data || []).map(mapNotification);
}

/** Count a user's unread notifications. */
export async function getUnreadInAppCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("in_app_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(`Failed to count unread notifications: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Mark one notification read. Scoped to the owning user so a user can't mark
 * someone else's notification.
 */
export async function markInAppNotificationRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from("in_app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(`Failed to mark notification read: ${error.message}`);
  }
}

/** Mark all of a user's unread notifications read. Returns the count updated. */
export async function markAllInAppNotificationsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("in_app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id");

  if (error) {
    throw new Error(`Failed to mark all notifications read: ${error.message}`);
  }

  return data?.length ?? 0;
}
