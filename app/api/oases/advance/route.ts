import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { advanceStage } from "@/lib/oases/progress"

/**
 * POST /api/oases/advance
 * Advances the authenticated user to the next Oases stage,
 * if all steps in the current stage are complete.
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

    const result = await advanceStage(user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
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
