/**
 * Event Registration API
 * Phase 88: Event Launch Kit
 *
 * POST /api/event/register
 * Creates a new user via Supabase admin, activates a 14-day Pro trial,
 * and tracks PostHog events. Used by event landing pages.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getEventConfig } from "@/lib/event/config"
import { EVENT_ANALYTICS } from "@/lib/event/analytics"

// ============================================================================
// Validation
// ============================================================================

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // Parse body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 }
      )
    }

    const { email, password, eventSlug, fullName } = body as {
      email?: string
      password?: string
      eventSlug?: string
      fullName?: string
    }

    // Validate event
    if (!eventSlug || typeof eventSlug !== "string") {
      return NextResponse.json(
        { success: false, error: "eventSlug is required" },
        { status: 400 }
      )
    }

    const config = getEventConfig(eventSlug)
    if (!config) {
      return NextResponse.json(
        { success: false, error: "Event not found or inactive" },
        { status: 404 }
      )
    }

    // Validate email
    if (!email || typeof email !== "string" || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      )
    }

    // Validate password
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Create user with admin API (auto-confirms email)
    const { data: userData, error: signupError } =
      await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || undefined,
          event_slug: eventSlug,
          trial_source: "event",
        },
      })

    if (signupError) {
      // Handle duplicate email
      if (
        signupError.message?.includes("already") ||
        signupError.message?.includes("duplicate") ||
        signupError.status === 422
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Account already exists. Please sign in.",
            code: "DUPLICATE_EMAIL",
          },
          { status: 409 }
        )
      }

      console.error("[Event Register] Signup error:", signupError)
      return NextResponse.json(
        { success: false, error: "Registration failed. Please try again." },
        { status: 500 }
      )
    }

    const userId = userData.user?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Registration failed" },
        { status: 500 }
      )
    }

    // Activate Pro trial -- update profile with tier and trial end date
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + config.trialDays)

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          name: fullName || null,
          email: email.toLowerCase().trim(),
          tier: config.trialTier,
          trial_ends_at: trialEndsAt.toISOString(),
          trial_eligible: true,
          trial_source: `${eventSlug}-event`,
          event_source: eventSlug,
          onboarding_completed: true,
        },
        { onConflict: "id" }
      )

    if (profileError) {
      console.error("[Event Register] Profile update error:", profileError)
      // Don't fail the registration -- user was created, they just might not have the trial
    }

    // Track analytics (fire-and-forget)
    try {
      const { serverTrack } = await import("@/lib/analytics/server")
      serverTrack(userId, EVENT_ANALYTICS.SIGNUP_COMPLETE, {
        event_name: eventSlug,
        eventSlug,
        email: email.toLowerCase().trim(),
      })
      serverTrack(userId, EVENT_ANALYTICS.TRIAL_ACTIVATED, {
        event_name: eventSlug,
        eventSlug,
        trialDays: config.trialDays,
        trialTier: config.trialTier,
      })
    } catch {
      // Analytics failure is non-blocking
    }

    return NextResponse.json({
      success: true,
      redirectTo: config.redirectAfterSignup,
      userId,
    })
  } catch (error) {
    console.error("[Event Register] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
