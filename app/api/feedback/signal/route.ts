import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getUserConsentStatus, applyConsent, calculateExpiryDate } from "@/lib/feedback/consent"
import { SIGNAL_TYPES, FEEDBACK_CATEGORIES, TIER_WEIGHTS } from "@/lib/feedback/constants"
import { insertFeedbackSignal } from "@/lib/db/feedback"
import { checkDetailedFeedbackThrottle } from "@/lib/feedback/throttle"
import { getUserTier } from "@/lib/api/tier-middleware"
import { UserTier } from "@/lib/constants"
import type { FeedbackSignalInsert } from "@/lib/feedback/types"

/**
 * Map UserTier enum to string tier for feedback_signals table.
 * BUILDER ($39) is bucketed with "pro" in this table -- the column only
 * distinguishes free / pro / studio for now.
 */
const TIER_MAP: Record<UserTier, "free" | "pro" | "studio"> = {
  [UserTier.FREE]: "free",
  [UserTier.BUILDER]: "pro",
  [UserTier.PRO]: "pro",
  [UserTier.STUDIO]: "studio",
}

/**
 * POST /api/feedback/signal
 *
 * Accepts a feedback signal (thumbs up/down with optional category/comment).
 * Enforces auth, consent, and detailed-feedback throttle.
 *
 * Body: {
 *   message_id: string,
 *   signal_type: 'thumbs_up' | 'thumbs_down',
 *   rating: 1 | -1,
 *   category?: string | null,
 *   comment?: string | null,
 *   session_id?: string | null,
 * }
 */
export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Parse and validate body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    message_id, signal_type, rating, category, comment, session_id,
    detected_topic, oases_stage, model_used, response_latency_ms, page_context,
  } = body as {
    message_id?: string
    signal_type?: string
    rating?: number
    category?: string | null
    comment?: string | null
    session_id?: string | null
    detected_topic?: string | null
    oases_stage?: string | null
    model_used?: string | null
    response_latency_ms?: number | null
    page_context?: string | null
  }

  // Validate required fields
  if (!message_id || typeof message_id !== "string" || message_id.trim() === "") {
    return NextResponse.json(
      { error: "message_id is required and must be a non-empty string" },
      { status: 400 }
    )
  }

  if (!signal_type || !(SIGNAL_TYPES as readonly string[]).includes(signal_type)) {
    return NextResponse.json(
      { error: `signal_type must be one of: ${SIGNAL_TYPES.join(", ")}` },
      { status: 400 }
    )
  }

  if (rating !== 1 && rating !== -1) {
    return NextResponse.json(
      { error: "rating must be 1 or -1" },
      { status: 400 }
    )
  }

  // Validate optional category
  if (
    category !== undefined &&
    category !== null &&
    !(FEEDBACK_CATEGORIES as readonly string[]).includes(category)
  ) {
    return NextResponse.json(
      { error: `category must be one of: ${FEEDBACK_CATEGORIES.join(", ")}` },
      { status: 400 }
    )
  }

  // Truncate comment to 500 chars
  const sanitizedComment = comment ? comment.slice(0, 500) : null

  // 3. Consent check
  const serviceClient = createServiceClient()
  const hasConsent = await getUserConsentStatus(serviceClient, user.id)
  if (!hasConsent) {
    return NextResponse.json(
      { error: "Feedback consent required", code: "CONSENT_REQUIRED" },
      { status: 403 }
    )
  }

  // 4. Throttle check (only for detailed signals — category or comment present)
  const isDetailed = (category !== undefined && category !== null) ||
    (sanitizedComment !== null && sanitizedComment !== "")
  if (isDetailed) {
    const throttleResult = await checkDetailedFeedbackThrottle(user.id)
    if (!throttleResult.allowed) {
      return NextResponse.json(
        {
          error: "Feedback limit reached",
          nextAllowedAt: throttleResult.nextAllowedAt,
          code: "THROTTLED",
        },
        { status: 429 }
      )
    }
  }

  // 5. Determine tier and weight
  const userTierEnum = await getUserTier(user.id)
  const tier = TIER_MAP[userTierEnum]
  const weight = TIER_WEIGHTS[tier]

  // 6. Build signal insert
  const signal: FeedbackSignalInsert = {
    user_id: user.id,
    session_id: (session_id as string) ?? null,
    message_id: message_id,
    channel: "chat" as const,
    signal_type: signal_type as "thumbs_up" | "thumbs_down",
    rating: rating as 1 | -1,
    category: (category as FeedbackSignalInsert["category"]) ?? null,
    comment: sanitizedComment,
    sentiment_score: null,
    sentiment_confidence: null,
    user_tier: tier,
    weight: weight,
    consent_given: true,
    expires_at: calculateExpiryDate(),
    metadata: {
      ...(detected_topic ? { detected_topic } : {}),
      ...(oases_stage ? { oases_stage } : {}),
      ...(model_used ? { model_used } : {}),
      ...(response_latency_ms ? { response_latency_ms } : {}),
      ...(page_context ? { page_context } : {}),
    },
  }

  // 7. Apply consent (defensive — stamps consent_given and expires_at)
  const consentedSignal = applyConsent(signal, true)

  // 8. Insert and respond
  try {
    const data = await insertFeedbackSignal(consentedSignal)
    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (error) {
    console.error("[feedback/signal] Error inserting signal:", error)
    return NextResponse.json(
      { error: "Failed to save feedback signal" },
      { status: 500 }
    )
  }
}
