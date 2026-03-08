import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getJourneyCompletion } from "@/lib/journey/completion"

/**
 * GET /api/journey/completion
 * Returns the authenticated user's journey completion data.
 * Phase 85: Journey-Gated Fund Matching
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    const completion = await getJourneyCompletion(user.id)

    return NextResponse.json({ success: true, data: completion })
  } catch (error) {
    console.error("[GET /api/journey/completion]", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch journey completion" },
      { status: 500 }
    )
  }
}
