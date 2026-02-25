/**
 * Red Flag CRUD Operations
 *
 * Database access layer for fred_red_flags table.
 * Uses Supabase service client for server-side operations.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { RedFlag, FlagStatus } from "@/lib/fred/types";

// ============================================================================
// Column mapping helpers
// ============================================================================

interface RedFlagRow {
  id: string;
  user_id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  source_message_id: string | null;
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRedFlag(row: RedFlagRow): RedFlag {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category as RedFlag["category"],
    severity: row.severity as RedFlag["severity"],
    title: row.title,
    description: row.description,
    status: row.status as RedFlag["status"],
    sourceMessageId: row.source_message_id ?? undefined,
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * List red flags for a user, optionally filtered by status.
 * Ordered by severity (critical first) then detected_at descending.
 */
export async function getRedFlags(
  userId: string,
  status?: FlagStatus
): Promise<RedFlag[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("fred_red_flags")
    .select("*")
    .eq("user_id", userId)
    .order("detected_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[RedFlags] Failed to fetch red flags:", error);
    throw new Error(`Failed to fetch red flags: ${error.message}`);
  }

  // Sort by severity priority in-memory (critical > high > medium > low)
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const flags = (data as RedFlagRow[]).map(rowToRedFlag);
  flags.sort((a, b) => {
    const sevDiff = (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });

  return flags;
}

/**
 * Create a new red flag record.
 * Uses ON CONFLICT DO NOTHING on (user_id, category, title) to silently skip duplicates.
 * Returns null if the flag already exists (duplicate skipped).
 */
export async function createRedFlag(
  flag: Omit<RedFlag, "id" | "detectedAt">
): Promise<RedFlag | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_red_flags")
    .upsert(
      {
        user_id: flag.userId,
        category: flag.category,
        severity: flag.severity,
        title: flag.title,
        description: flag.description,
        status: flag.status,
        source_message_id: flag.sourceMessageId ?? null,
        resolved_at: flag.resolvedAt ?? null,
      },
      { onConflict: "user_id,category,title", ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) {
    // PGRST116 = no rows returned (duplicate was skipped)
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[RedFlags] Failed to create red flag:", error);
    throw new Error(`Failed to create red flag: ${error.message}`);
  }

  return rowToRedFlag(data as RedFlagRow);
}

/**
 * Update a red flag's status (and optionally resolvedAt).
 */
export async function updateRedFlag(
  id: string,
  userId: string,
  updates: Partial<Pick<RedFlag, "status" | "resolvedAt">>
): Promise<RedFlag> {
  const supabase = createServiceClient();

  const updatePayload: Record<string, unknown> = {};
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.resolvedAt !== undefined) updatePayload.resolved_at = updates.resolvedAt;

  const { data, error } = await supabase
    .from("fred_red_flags")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[RedFlags] Failed to update red flag:", error);
    throw new Error(`Failed to update red flag: ${error.message}`);
  }

  return rowToRedFlag(data as RedFlagRow);
}

/**
 * Delete a red flag record.
 */
export async function deleteRedFlag(
  id: string,
  userId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("fred_red_flags")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[RedFlags] Failed to delete red flag:", error);
    throw new Error(`Failed to delete red flag: ${error.message}`);
  }
}
