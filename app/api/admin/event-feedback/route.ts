/**
 * Admin Event Feedback API
 *
 * AI-1804: Returns aggregated stats and individual responses from event attendees.
 *
 * GET /api/admin/event-feedback
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import { createServiceClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const supabase = createServiceClient()

    // Fetch all event feedback
    const { data: responses, error } = await supabase
      .from("event_feedback")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const all = responses || []
    const widgetResponses = all.filter((r) => r.source === "widget")
    const surveyResponses = all.filter((r) => r.source === "survey")

    // Average widget rating
    const widgetRatings = widgetResponses.filter((r) => r.rating != null).map((r) => r.rating!)
    const avgWidgetRating = widgetRatings.length > 0
      ? widgetRatings.reduce((a, b) => a + b, 0) / widgetRatings.length
      : null

    // Average FRED rating from surveys
    const fredRatings = surveyResponses.filter((r) => r.fred_rating != null).map((r) => r.fred_rating!)
    const avgFredRating = fredRatings.length > 0
      ? fredRatings.reduce((a, b) => a + b, 0) / fredRatings.length
      : null

    // NPS-style breakdown from recommend field
    const recommendCounts = { yes: 0, maybe: 0, no: 0 }
    for (const r of surveyResponses) {
      if (r.recommend === "yes") recommendCounts.yes++
      else if (r.recommend === "maybe") recommendCounts.maybe++
      else if (r.recommend === "no") recommendCounts.no++
    }

    const totalRecommend = recommendCounts.yes + recommendCounts.maybe + recommendCounts.no
    const npsScore = totalRecommend > 0
      ? Math.round(((recommendCounts.yes - recommendCounts.no) / totalRecommend) * 100)
      : null

    return NextResponse.json({
      stats: {
        totalResponses: all.length,
        widgetCount: widgetResponses.length,
        surveyCount: surveyResponses.length,
        avgWidgetRating,
        avgFredRating,
        npsScore,
        recommendCounts,
      },
      responses: all,
    })
  } catch (err) {
    console.error("Event feedback API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
