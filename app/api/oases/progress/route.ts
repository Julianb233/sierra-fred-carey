import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserOasesProgress, getDetailedProgress } from "@/lib/oases/progress"

/**
 * GET /api/oases/progress
 * Returns the authenticated user's full Oases journey progress.
 * Merges checklist-based progress (14 high-level steps) with
 * granular journey_steps-based percentage (120 detailed steps).
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

    // Fetch both progress sources in parallel
    const [progress, detailed] = await Promise.all([
      getUserOasesProgress(user.id),
      getDetailedProgress(user.id),
    ])

    // Use the detailed journey_steps-based percentage for the overall number
    // while keeping checklist data (completedStepIds, stepsCompleted/Total) for the UI
    const enrichedProgress = {
      ...progress,
      journeyPercentage: detailed.journeyPercentage,
    }

    return NextResponse.json(
      { success: true, data: enrichedProgress },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      }
    )
  } catch (error) {
    console.error("[GET /api/oases/progress]", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch Oases progress" },
      { status: 500 }
    )
  }
}
