/**
 * Journey Events - Resilient Score & Event Persistence
 *
 * Centralizes all journey_events writes with:
 * - Service-role client (bypasses RLS, no user-session dependency)
 * - Automatic retry with exponential backoff (up to 3 attempts)
 * - Structured error logging
 * - Score validation (0 is valid, use nullish coalescing)
 *
 * Linear: PERS-52
 */

import { createServiceClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface JourneyEventInput {
  userId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  scoreBefore?: number | null;
  scoreAfter?: number | null;
}

export interface JourneyEventResult {
  success: boolean;
  id?: string;
  error?: string;
  attempts: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;
const LOG_PREFIX = "[journey-events]";

// Known event types for validation (not enforced, just logged if unknown)
const KNOWN_EVENT_TYPES = new Set([
  "analysis_completed",
  "score_improved",
  "milestone_created",
  "milestone_achieved",
  "insight_discovered",
  "document_created",
  "pitch_review_completed",
  "investor_lens_evaluation",
  "deck_review_completed",
  "positioning_assessment",
  "message_sent",
  "step_completed",
  "decision_made",
]);

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Log a journey event with retry logic.
 * Uses service-role client so it bypasses RLS and doesn't depend on user session.
 *
 * @param input - The journey event to log
 * @returns Result with success status and event ID
 */
export async function logJourneyEvent(
  input: JourneyEventInput
): Promise<JourneyEventResult> {
  const { userId, eventType, eventData = {}, scoreBefore, scoreAfter } = input;

  // Validate required fields
  if (!userId || !eventType) {
    console.error(
      `${LOG_PREFIX} Missing required fields: userId=${!!userId}, eventType=${!!eventType}`
    );
    return { success: false, error: "Missing userId or eventType", attempts: 0 };
  }

  // Warn on unknown event types (don't block)
  if (!KNOWN_EVENT_TYPES.has(eventType)) {
    console.warn(`${LOG_PREFIX} Unknown event type: "${eventType}" (will still persist)`);
  }

  // Validate scores are in range when provided
  if (scoreAfter !== null && scoreAfter !== undefined) {
    if (scoreAfter < 0 || scoreAfter > 100) {
      console.warn(
        `${LOG_PREFIX} scoreAfter out of range [0,100]: ${scoreAfter}`
      );
    }
  }

  const insertData = {
    user_id: userId,
    event_type: eventType,
    event_data: eventData,
    // Use nullish coalescing to preserve 0 as a valid score
    score_before: scoreBefore ?? null,
    score_after: scoreAfter ?? null,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("journey_events")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        throw new Error(`Supabase insert error: ${error.message} (code: ${error.code})`);
      }

      return {
        success: true,
        id: data?.id,
        attempts: attempt,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `${LOG_PREFIX} Attempt ${attempt}/${MAX_RETRIES} failed for ${eventType}: ${lastError.message}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  console.error(
    `${LOG_PREFIX} All ${MAX_RETRIES} attempts failed for ${eventType} (userId=${userId}): ${lastError?.message}`
  );

  return {
    success: false,
    error: lastError?.message ?? "Unknown error",
    attempts: MAX_RETRIES,
  };
}

/**
 * Fire-and-forget version of logJourneyEvent.
 * Logs errors but doesn't block the caller.
 * Use this in API routes where the journey event is non-critical.
 */
export function logJourneyEventAsync(input: JourneyEventInput): void {
  logJourneyEvent(input).catch((err) => {
    console.error(
      `${LOG_PREFIX} Unhandled error in async journey event logging:`,
      err
    );
  });
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get the most recent score_after for a given event type.
 * Used to populate score_before when recording a new score.
 *
 * @param userId - User ID
 * @param eventType - Event type to look up (e.g., "analysis_completed")
 * @returns The most recent score_after value, or null if none exists
 */
export async function getPreviousScore(
  userId: string,
  eventType: string
): Promise<number | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("journey_events")
      .select("score_after")
      .eq("user_id", userId)
      .eq("event_type", eventType)
      .not("score_after", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.score_after;
  } catch {
    return null;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
