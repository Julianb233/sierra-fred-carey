import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserOasesProgress } from "@/lib/oases/progress"

/**
 * GET /api/oases/progress
 * Returns the authenticated user's full Oases journey progress.
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

    const progress = await getUserOasesProgress(user.id)

    return NextResponse.json({ success: true, data: progress })
  } catch (error) {
    console.error("[GET /api/oases/progress]", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch Oases progress" },
      { status: 500 }
    )
  }
}
