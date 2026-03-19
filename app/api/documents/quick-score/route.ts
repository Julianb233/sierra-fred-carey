/**
 * Document Quick Score API (Free Tier)
 *
 * POST /api/documents/quick-score
 * Accepts a PDF upload, extracts text, scores it with AI, and returns
 * a letter grade (A-F) with a high-level summary report.
 *
 * FREE TIER: Does NOT store the document. One-time scoring only.
 * Designed as the upsell trigger — "Want us to turn this C into an A? Upgrade."
 *
 * Rate limited to 1 per day for free tier users.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getUserTier } from "@/lib/api/tier-middleware"
import { UserTier } from "@/lib/constants"
import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit"
import { isValidPdf } from "@/lib/documents/pdf-processor"
import { scoreDeck } from "@/lib/ai/deck-scoring"
import type { DeckScorecard } from "@/types/deck-review"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Free tier: 1 quick score per day. Pro/Studio: 10 per day.
const QUICK_SCORE_LIMITS: Record<number, { limit: number; windowSeconds: number }> = {
  [UserTier.FREE]: { limit: 1, windowSeconds: 86400 },
  [UserTier.PRO]: { limit: 10, windowSeconds: 86400 },
  [UserTier.STUDIO]: { limit: 50, windowSeconds: 86400 },
}

/**
 * Convert a numeric score (1-10) to a letter grade (A through F).
 */
function scoreToLetterGrade(score: number): string {
  if (score >= 9) return "A"
  if (score >= 8) return "A-"
  if (score >= 7) return "B+"
  if (score >= 6.5) return "B"
  if (score >= 6) return "B-"
  if (score >= 5.5) return "C+"
  if (score >= 5) return "C"
  if (score >= 4.5) return "C-"
  if (score >= 4) return "D+"
  if (score >= 3) return "D"
  return "F"
}

/**
 * Build a free-tier summary report from the scorecard.
 * Gives the grade + high-level feedback but not the detailed fixes (those are for paid).
 */
function buildFreeReport(scorecard: DeckScorecard) {
  const grade = scoreToLetterGrade(scorecard.overallScore)

  const dimensionGrades = scorecard.dimensions.map((d) => ({
    name: d.name,
    grade: scoreToLetterGrade(d.score),
    explanation: d.explanation,
  }))

  return {
    grade,
    overallScore: scorecard.overallScore,
    summary: scorecard.summary,
    topStrength: scorecard.topStrength,
    biggestGap: scorecard.biggestGap,
    dimensions: dimensionGrades,
    // Upsell messaging
    upgradeMessage:
      grade >= "C"
        ? `Your document scored a ${grade}. With our Builder plan ($99/mo), I can help you improve each dimension, store your documents, and monitor them as your market evolves. Want to turn this into an A?`
        : `Your document scored a ${grade} — there's significant room for improvement. With our Builder plan ($99/mo), I'll work with you to systematically strengthen every dimension and track your progress over time.`,
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const userTier = await getUserTier(userId)

    // Rate limit
    const tierConfig = QUICK_SCORE_LIMITS[userTier] ?? QUICK_SCORE_LIMITS[UserTier.FREE]
    const rateLimitResult = await checkRateLimit(`quick-score:${userId}`, tierConfig)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (!isValidPdf(buffer)) {
      return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 })
    }

    // Extract text from PDF (using dynamic import to avoid bundling issues)
    let textContent: string
    try {
      const pdfParse = (await import("pdf-parse")).default
      const pdfData = await pdfParse(buffer)
      textContent = pdfData.text
    } catch {
      return NextResponse.json(
        { error: "Failed to extract text from PDF. The file may be image-based or corrupted." },
        { status: 422 }
      )
    }

    if (!textContent || textContent.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text from the PDF. It may be image-based — try a text-based PDF." },
        { status: 422 }
      )
    }

    // Score with AI — same scoring engine, but we only return the summary to free users
    const scorecard = await scoreDeck(textContent.substring(0, 15000))

    // Build free-tier report (grade + summary, no detailed fix suggestions)
    const report = buildFreeReport(scorecard)

    // NOTE: We do NOT store the document for free tier users.
    // The scoring result is returned but not persisted.

    return NextResponse.json({
      success: true,
      report,
      // Include tier info for frontend upsell UI
      userTier: userTier === UserTier.FREE ? "free" : "paid",
      canStoreDocuments: userTier >= UserTier.PRO,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[QuickScore] Error:", error)
    return NextResponse.json(
      { error: "Failed to score document" },
      { status: 500 }
    )
  }
}
