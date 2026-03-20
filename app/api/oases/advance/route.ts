import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { advanceStage } from "@/lib/oases/progress"
import { getUserTier } from "@/lib/api/tier-middleware"

/**
 * POST /api/oases/advance
 * Advances the authenticated user to the next Oases stage,
 * if all steps in the current stage are complete.
 *
 * AI-3581: Now enforces tier-based stage ceiling via getUserTier().
 * Free users cannot progress past Validation.
 * Pro users cannot progress past Launch.
 */
export async function POST() {
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

    // AI-3581: Resolve user's actual tier for stage ceiling enforcement
    const userTier = await getUserTier(user.id)
    const result = await advanceStage(user.id, userTier)

    if (!result.success) {
      const status = result.tierGated ? 403 : 400
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          tierGated: result.tierGated ?? false,
          upgradeUrl: result.tierGated ? "/pricing" : undefined,
        },
        { status }
      )
    }

    return NextResponse.json({
      success: true,
      data: { newStage: result.newStage },
    })
  } catch (error) {
    console.error("[POST /api/oases/advance]", error)
    return NextResponse.json(
      { success: false, error: "Failed to advance stage" },
      { status: 500 }
    )
  }
}
