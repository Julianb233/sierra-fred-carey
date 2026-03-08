/**
 * Throttle utility for detailed feedback signals.
 *
 * "Detailed" means a signal with category or comment (not just thumbs up/down).
 * Basic thumbs-only signals are unlimited and bypass this check entirely.
 *
 * Limit: MAX_DETAILED_FEEDBACK_PER_WEEK (1) per user per rolling 7-day window.
 */
import { createServiceClient } from "@/lib/supabase/server"
import { MAX_DETAILED_FEEDBACK_PER_WEEK } from "@/lib/feedback/constants"

export async function checkDetailedFeedbackThrottle(
  userId: string
): Promise<{ allowed: boolean; nextAllowedAt: string | null }> {
  const supabase = createServiceClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Query detailed signals (category IS NOT NULL OR comment IS NOT NULL) in past 7 days.
  // We fetch the earliest created_at to compute nextAllowedAt, and use count:'exact' for the total.
  const { data, count, error } = await supabase
    .from("feedback_signals")
    .select("created_at", { count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", sevenDaysAgo)
    .or("category.not.is.null,comment.not.is.null")
    .order("created_at", { ascending: true })
    .limit(1)

  if (error) {
    console.error("[feedback/throttle] Error checking throttle:", error)
    // Fail open — allow the signal if we can't check
    return { allowed: true, nextAllowedAt: null }
  }

  const detailedCount = count ?? 0

  if (detailedCount >= MAX_DETAILED_FEEDBACK_PER_WEEK) {
    // Compute when they can submit again: earliest signal + 7 days
    const earliestCreatedAt = data?.[0]?.created_at
    const nextAllowedAt = earliestCreatedAt
      ? new Date(new Date(earliestCreatedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null

    return { allowed: false, nextAllowedAt }
  }

  return { allowed: true, nextAllowedAt: null }
}
