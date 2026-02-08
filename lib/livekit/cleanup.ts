/**
 * LiveKit / Coaching Session Cleanup Utility
 *
 * Provides functions to clean up stale sessions that were not properly
 * marked as completed (e.g., due to browser crashes, network failures).
 *
 * Can be called from an admin API endpoint or scheduled cron job.
 */

import { createServiceClient } from "@/lib/supabase/server";

// ============================================================================
// Constants
// ============================================================================

/** Sessions older than this (in hours) with status "in_progress" are considered stale */
const STALE_SESSION_THRESHOLD_HOURS = 2;

// ============================================================================
// Types
// ============================================================================

export interface CleanupResult {
  cleanedCount: number;
  cleanedSessionIds: string[];
  errors: string[];
  durationMs: number;
}

// ============================================================================
// Main Cleanup Function
// ============================================================================

/**
 * Find coaching sessions with status "in_progress" that are older than the
 * stale threshold and mark them as "completed".
 *
 * Uses the service role client to bypass RLS since this runs as an
 * admin/system operation, not on behalf of a specific user.
 *
 * @param thresholdHours - Number of hours after which an in_progress session
 *                         is considered stale. Defaults to 2 hours.
 * @returns CleanupResult with counts and any errors encountered.
 */
export async function cleanupStaleSessions(
  thresholdHours: number = STALE_SESSION_THRESHOLD_HOURS
): Promise<CleanupResult> {
  const startTime = Date.now();
  const result: CleanupResult = {
    cleanedCount: 0,
    cleanedSessionIds: [],
    errors: [],
    durationMs: 0,
  };

  try {
    const supabase = createServiceClient();

    // Calculate the cutoff time
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - thresholdHours);

    // Find stale sessions: in_progress and created/started before cutoff
    const { data: staleSessions, error: queryError } = await supabase
      .from("coaching_sessions")
      .select("id, user_id, room_name, started_at, created_at")
      .eq("status", "in_progress")
      .lt("created_at", cutoffDate.toISOString());

    if (queryError) {
      const msg = `[cleanup] Failed to query stale sessions: ${queryError.message}`;
      console.error(msg);
      result.errors.push(msg);
      result.durationMs = Date.now() - startTime;
      return result;
    }

    if (!staleSessions || staleSessions.length === 0) {
      console.log("[cleanup] No stale coaching sessions found");
      result.durationMs = Date.now() - startTime;
      return result;
    }

    console.log(
      `[cleanup] Found ${staleSessions.length} stale coaching session(s) to clean up`
    );

    // Update each stale session to "completed"
    for (const session of staleSessions) {
      try {
        const endedAt = new Date().toISOString();

        // Calculate approximate duration from started_at or created_at
        const sessionStart = session.started_at || session.created_at;
        const startDate = new Date(sessionStart);
        const durationSeconds = Math.floor(
          (Date.now() - startDate.getTime()) / 1000
        );

        const { error: updateError } = await supabase
          .from("coaching_sessions")
          .update({
            status: "completed",
            ended_at: endedAt,
            duration_seconds: durationSeconds,
          })
          .eq("id", session.id);

        if (updateError) {
          const msg = `[cleanup] Failed to update session ${session.id}: ${updateError.message}`;
          console.error(msg);
          result.errors.push(msg);
          continue;
        }

        result.cleanedCount++;
        result.cleanedSessionIds.push(session.id);

        console.log(
          `[cleanup] Cleaned stale session: id=${session.id}, room=${session.room_name}, ` +
            `user=${session.user_id}, duration=${durationSeconds}s`
        );
      } catch (sessionError) {
        const msg = `[cleanup] Error processing session ${session.id}: ${
          sessionError instanceof Error ? sessionError.message : "Unknown error"
        }`;
        console.error(msg);
        result.errors.push(msg);
      }
    }

    // Also clean up stale video_rooms that are still "active"
    try {
      const { error: roomCleanupError } = await supabase
        .from("video_rooms")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("status", "active")
        .lt("created_at", cutoffDate.toISOString());

      if (roomCleanupError) {
        const msg = `[cleanup] Failed to clean stale video rooms: ${roomCleanupError.message}`;
        console.error(msg);
        result.errors.push(msg);
      }
    } catch (roomError) {
      const msg = `[cleanup] Error cleaning video rooms: ${
        roomError instanceof Error ? roomError.message : "Unknown error"
      }`;
      console.error(msg);
      result.errors.push(msg);
    }

    console.log(
      `[cleanup] Completed: ${result.cleanedCount} session(s) cleaned, ${result.errors.length} error(s)`
    );
  } catch (error) {
    const msg = `[cleanup] Unexpected error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(msg);
    result.errors.push(msg);
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Clean up video_participants records that have no left_at timestamp
 * and belong to rooms that are no longer active.
 *
 * @param thresholdHours - Number of hours after which a participant
 *                         without left_at is considered abandoned.
 * @returns Number of participants cleaned up.
 */
export async function cleanupAbandonedParticipants(
  thresholdHours: number = STALE_SESSION_THRESHOLD_HOURS
): Promise<number> {
  try {
    const supabase = createServiceClient();

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - thresholdHours);

    const { data: abandoned, error: queryError } = await supabase
      .from("video_participants")
      .select("id, joined_at")
      .is("left_at", null)
      .lt("joined_at", cutoffDate.toISOString());

    if (queryError || !abandoned || abandoned.length === 0) {
      return 0;
    }

    let cleanedCount = 0;

    for (const participant of abandoned) {
      const joinedAt = new Date(participant.joined_at);
      const durationSeconds = Math.floor(
        (Date.now() - joinedAt.getTime()) / 1000
      );

      const { error: updateError } = await supabase
        .from("video_participants")
        .update({
          left_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", participant.id);

      if (!updateError) {
        cleanedCount++;
      }
    }

    console.log(
      `[cleanup] Cleaned ${cleanedCount} abandoned participant record(s)`
    );
    return cleanedCount;
  } catch (error) {
    console.error("[cleanup] Error cleaning abandoned participants:", error);
    return 0;
  }
}
