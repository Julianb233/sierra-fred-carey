import { NextRequest, NextResponse } from "next/server"
import { parsePDF, PDFParseError } from "@/lib/parsers/pdf-parser"
import { scoreDeck } from "@/lib/ai/deck-scoring"
import { checkTierForRequest } from "@/lib/api/tier-middleware"
import { UserTier } from "@/lib/constants"
import { sql } from "@/lib/db/supabase-sql"
import { logger } from "@/lib/logger"

/**
 * POST /api/dashboard/deck-review
 *
 * Accept a PDF pitch deck upload, extract text via pdf-parse,
 * score it on 7 dimensions via AI, save the result, and return
 * a structured DeckScorecard.
 *
 * Requires Pro+ tier.
 */
export async function GET() {
  return NextResponse.json(
    { success: false, error: "Method not allowed. Use POST with a PDF file." },
    { status: 405 }
  )
}

export async function POST(request: NextRequest) {
  try {
    // Auth + tier check
    const tierCheck = await checkTierForRequest(request, UserTier.PRO)
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Pitch Deck Scoring requires Pro tier or above" },
        { status: 403 }
      )
    }

    const userId = tierCheck.user.id

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "A PDF file is required" },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { success: false, error: "Only PDF files are supported" },
        { status: 400 }
      )
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text: string
    try {
      const parsedDeck = await parsePDF(buffer)
      text = parsedDeck.fullText
    } catch (pdfError) {
      logger.log("[Deck Scoring] PDF parse error:", String(pdfError))
      const message = pdfError instanceof PDFParseError
        ? pdfError.message
        : "Could not read the PDF file. Please ensure it is not corrupted or password-protected."
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      )
    }

    // Validate extracted text
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "The PDF appears to be empty or contains only images. Please upload a text-based pitch deck." },
        { status: 400 }
      )
    }

    if (text.length > 100_000) {
      return NextResponse.json(
        { success: false, error: "The extracted text exceeds 100,000 characters. Please upload a shorter deck." },
        { status: 400 }
      )
    }

    logger.log(`[Deck Scoring] Extracted ${text.length} chars from "${file.name}" for user ${userId}`)

    // Score the deck via AI
    const scorecard = await scoreDeck(text)

    // Save to database
    try {
      await sql`
        INSERT INTO deck_score_reviews (
          user_id,
          file_name,
          scorecard,
          created_at
        ) VALUES (
          ${userId},
          ${file.name},
          ${JSON.stringify(scorecard)},
          NOW()
        )
      `
    } catch (dbError) {
      // Log but don't fail -- the scorecard is still useful even if DB save fails
      logger.log("[Deck Scoring] Failed to save to database:", String(dbError))
    }

    return NextResponse.json(
      { success: true, scorecard },
      { status: 200 }
    )
  } catch (error) {
    logger.log("[Deck Scoring] Unexpected error:", String(error))
    console.error("[Deck Scoring] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to score the pitch deck. Please try again." },
      { status: 500 }
    )
  }
}
