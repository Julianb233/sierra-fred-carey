import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getUserConsentStatus, setUserConsent } from "@/lib/feedback/consent"
import { deleteFeedbackForUser } from "@/lib/db/feedback"

/**
 * GET /api/feedback/consent
 * Returns the current user's feedback consent status.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const serviceClient = createServiceClient()
  const hasConsent = await getUserConsentStatus(serviceClient, user.id)

  // Fetch consent timestamp from profile metadata
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("metadata")
    .eq("id", user.id)
    .single()

  return NextResponse.json({
    consent: hasConsent,
    consentedAt: profile?.metadata?.feedback_consent_at ?? null,
  })
}

/**
 * POST /api/feedback/consent
 * Set the user's feedback consent status.
 * Body: { consent: boolean }
 *
 * When consent is revoked (false), all feedback data for the user
 * is deleted as a fire-and-forget operation (right-to-deletion).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { consent?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body.consent !== "boolean") {
    return NextResponse.json(
      { error: "consent must be a boolean" },
      { status: 400 }
    )
  }

  const serviceClient = createServiceClient()

  try {
    await setUserConsent(serviceClient, user.id, body.consent)

    // Right-to-deletion: if consent is revoked, delete all feedback data
    if (!body.consent) {
      // Fire-and-forget — don't block the response on deletion
      deleteFeedbackForUser(user.id).catch((err) => {
        console.error("[feedback/consent] Failed to delete feedback for user:", err)
      })
    }

    const hasConsent = await getUserConsentStatus(serviceClient, user.id)
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("metadata")
      .eq("id", user.id)
      .single()

    return NextResponse.json({
      consent: hasConsent,
      consentedAt: profile?.metadata?.feedback_consent_at ?? null,
    })
  } catch (error) {
    console.error("[feedback/consent] Error setting consent:", error)
    return NextResponse.json(
      { error: "Failed to update consent" },
      { status: 500 }
    )
  }
}
