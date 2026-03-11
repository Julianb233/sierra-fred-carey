/**
 * Admin Event Analytics API
 * Phase 88: Event Launch Kit
 *
 * GET /api/admin/event-analytics?slug=palo-alto-2026
 * Returns funnel metrics for event signups: signups -> onboarded -> reality lens -> first chat
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
    const slug = request.nextUrl.searchParams.get("slug") || undefined

    // Build base filter: profiles with an event_source
    const baseFilter = (query: ReturnType<typeof supabase.from>) => {
      const q = query.select("*").not("event_source", "is", null)
      return slug ? q.eq("event_source", `${slug}-event`) : q
    }

    // Get all event profiles for detailed metrics
    const { data: profiles, error } = await baseFilter(supabase.from("profiles"))
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const all = profiles || []

    // Compute funnel counts
    const totalSignups = all.length
    const onboardingComplete = all.filter((p) => p.journey_welcomed === true).length
    const realityLensComplete = all.filter((p) => p.reality_lens_complete === true).length

    // For first chat: check if fred_episodic_memory has entries for these users
    // (was fred_memories -- that table does not exist; actual table is fred_episodic_memory)
    let firstChatCount = 0
    if (all.length > 0) {
      const userIds = all.map((p) => p.id)
      const { count } = await supabase
        .from("fred_episodic_memory")
        .select("user_id", { count: "exact", head: true })
        .in("user_id", userIds)

      firstChatCount = count || 0
    }

    // Recent signups (last 20)
    const recentSignups = all.slice(0, 20).map((p) => ({
      id: p.id,
      name: p.name || "Unknown",
      email: p.email || "",
      createdAt: p.created_at,
      onboarded: p.journey_welcomed === true,
      realityLens: p.reality_lens_complete === true,
      tier: p.tier,
      trialEndsAt: p.trial_ends_at,
      eventSource: p.event_source,
    }))

    return NextResponse.json({
      funnel: {
        totalSignups,
        onboardingComplete,
        realityLensComplete,
        firstChat: firstChatCount,
      },
      recentSignups,
      slug: slug || "all",
    })
  } catch (err) {
    console.error("[Event Analytics] API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
