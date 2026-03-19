import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserOasesProgress, getDetailedProgress } from "@/lib/oases/progress"
import { getUserTier } from "@/lib/api/tier-middleware"
import { isStageTierGated } from "@/lib/oases/founder-archetype"
import { STAGE_ORDER, getStageIndex } from "@/lib/oases/stage-config"
import type { FounderArchetype } from "@/types/oases"

/**
 * GET /api/oases/progress
 * Returns the authenticated user's full Oases journey progress.
 * AI-3581: Includes founder_archetype and tierGated info.
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

    // Fetch progress, detailed progress, tier, and archetype in parallel
    const [progress, detailed, userTier, profileData] = await Promise.all([
      getUserOasesProgress(user.id),
      getDetailedProgress(user.id),
      getUserTier(user.id),
      supabase
        .from("profiles")
        .select("founder_archetype")
        .eq("id", user.id)
        .single()
        .then(r => r.data),
    ])

    // Check if the next stage is tier-gated
    const currentIndex = getStageIndex(progress.currentStage)
    const nextStage = currentIndex + 1 < STAGE_ORDER.length ? STAGE_ORDER[currentIndex + 1] : null
    const nextStageTierGated = nextStage ? isStageTierGated(nextStage, userTier) : false

    const enrichedProgress = {
      ...progress,
      journeyPercentage: detailed.journeyPercentage,
      founderArchetype: (profileData?.founder_archetype as FounderArchetype) ?? null,
      tierGated: nextStageTierGated,
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
