/**
 * Admin Feedback CSV Export API
 *
 * Phase 73-04: Returns filtered feedback signals as a downloadable CSV file.
 * Requires admin authentication.
 *
 * GET /api/admin/feedback/export?dateFrom=&dateTo=&channel=&rating=&category=&tier=&userId=
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import { queryFeedbackSignalsAdmin } from "@/lib/db/feedback-admin"
import type { FeedbackSignal } from "@/lib/feedback/types"

export const dynamic = "force-dynamic"

/**
 * Escape a value for CSV output.
 * Wraps in double-quotes if the value contains commas, quotes, or newlines.
 * Internal double-quotes are escaped by doubling them.
 */
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function signalToCsvRow(signal: FeedbackSignal): string {
  const fields = [
    signal.created_at ? new Date(signal.created_at).toISOString() : "",
    signal.channel ?? "",
    signal.signal_type ?? "",
    signal.rating !== null && signal.rating !== undefined ? String(signal.rating) : "",
    signal.category ?? "",
    signal.user_tier ?? "",
    signal.sentiment_score !== null && signal.sentiment_score !== undefined
      ? String(signal.sentiment_score)
      : "",
    signal.sentiment_confidence !== null && signal.sentiment_confidence !== undefined
      ? String(signal.sentiment_confidence)
      : "",
    signal.comment ?? "",
    signal.user_id ?? "",
    signal.session_id ?? "",
  ]
  return fields.map(escapeCsvValue).join(",")
}

const CSV_HEADER =
  "Date,Channel,Signal Type,Rating,Category,Tier,Sentiment Score,Sentiment Confidence,Comment,User ID,Session ID"

export async function GET(request: NextRequest) {
  // Admin-only guard
  const denied = requireAdminRequest(request)
  if (denied) return denied

  try {
    const params = request.nextUrl.searchParams

    const filters = {
      dateFrom: params.get("dateFrom") || undefined,
      dateTo: params.get("dateTo") || undefined,
      channel: params.get("channel") || undefined,
      rating: params.has("rating")
        ? parseInt(params.get("rating")!, 10)
        : undefined,
      category: params.get("category") || undefined,
      tier: params.get("tier") || undefined,
      userId: params.get("userId") || undefined,
      page: 1,
      limit: 10000, // Export all matching, not paginated
    }

    // Validate rating if provided
    if (filters.rating !== undefined && isNaN(filters.rating)) {
      filters.rating = undefined
    }

    const result = await queryFeedbackSignalsAdmin(filters)

    // Build CSV content
    const rows = [CSV_HEADER, ...result.data.map(signalToCsvRow)]
    const csvContent = rows.join("\n")

    // Today's date for filename
    const today = new Date().toISOString().slice(0, 10)

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="feedback-export-${today}.csv"`,
      },
    })
  } catch (error) {
    console.error("[admin/feedback/export] Error:", error)
    return NextResponse.json(
      { error: "Failed to export feedback signals" },
      { status: 500 }
    )
  }
}
