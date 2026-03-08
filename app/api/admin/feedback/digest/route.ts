/**
 * Admin Feedback Improvements Digest API
 * Phase 76: Close-the-Loop (REQ-L2)
 *
 * POST /api/admin/feedback/digest — Trigger monthly improvements digest
 * GET /api/admin/feedback/digest — Preview digest content
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import {
  sendImprovementsDigest,
  getRecentImprovements,
  getDigestRecipients,
} from "@/lib/feedback/improvements-digest"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const denied = requireAdminRequest(request)
  if (denied) return denied

  try {
    const improvements = await getRecentImprovements()
    const recipients = await getDigestRecipients()

    return NextResponse.json({
      improvements,
      recipientCount: recipients.length,
      preview: true,
    })
  } catch (error) {
    console.error("[admin/digest] GET error:", error)
    return NextResponse.json(
      { error: "Failed to preview digest" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const denied = requireAdminRequest(request)
  if (denied) return denied

  try {
    const result = await sendImprovementsDigest()

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("[admin/digest] POST error:", error)
    return NextResponse.json(
      { error: "Failed to send digest" },
      { status: 500 }
    )
  }
}
