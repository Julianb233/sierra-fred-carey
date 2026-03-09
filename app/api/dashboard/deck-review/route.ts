import { NextRequest, NextResponse } from "next/server"
import { parsePDF, PDFParseError } from "@/lib/parsers/pdf-parser"
import { scoreDeck } from "@/lib/ai/deck-scoring"
import { checkTierForRequest } from "@/lib/api/tier-middleware"
import { UserTier } from "@/lib/constants"
import { sql } from "@/lib/db/supabase-sql"
import { logger } from "@/lib/logger"
import { STAGE_ORDER } from "@/lib/oases/stage-config"

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

    // Stage-gate check: require Build stage or later
    try {
      const stageResult = await sql`SELECT oases_stage FROM profiles WHERE id = ${userId}`
      const userStage = (stageResult?.[0]?.oases_stage || "clarity") as string
      const buildIndex = STAGE_ORDER.indexOf("build")
      const userIndex = STAGE_ORDER.indexOf(userStage as typeof STAGE_ORDER[number])
      if (userIndex < buildIndex) {
        return NextResponse.json(
          { success: false, error: "Pitch Deck Scoring is available once you reach the Build stage of your venture journey" },
          { status: 403 }
        )
      }
    } catch (stageError) {
      logger.log("[Deck Scoring] Stage check failed, allowing access:", String(stageError))
    }

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

    // Extract text from PDF and score with 55s timeout guard
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const scorecardPromise = (async () => {
      let text: string
      try {
        const parsedDeck = await parsePDF(buffer)
        text = parsedDeck.fullText
      } catch (pdfError) {
        logger.log("[Deck Scoring] PDF parse error:", String(pdfError))
        const message = pdfError instanceof PDFParseError
          ? pdfError.message
          : "Could not read the PDF file. Please ensure it is not corrupted or password-protected."
        throw { userError: message, status: 400 }
      }

      if (!text || text.trim().length === 0) {
        throw { userError: "The PDF appears to be empty or contains only images. Please upload a text-based pitch deck.", status: 400 }
      }

      if (text.length > 100_000) {
        throw { userError: "The extracted text exceeds 100,000 characters. Please upload a shorter deck.", status: 400 }
      }

      logger.log(`[Deck Scoring] Extracted ${text.length} chars from "${file.name}" for user ${userId}`)

      return await scoreDeck(text)
    })()

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 55000)
    )

    let scorecard
    try {
      scorecard = await Promise.race([scorecardPromise, timeoutPromise])
    } catch (raceError: unknown) {
      if (raceError instanceof Error && raceError.message === "TIMEOUT") {
        return NextResponse.json(
          { success: false, error: "Deck scoring took too long. Please try a shorter deck or try again later." },
          { status: 504 }
        )
      }
      const err = raceError as { userError?: string; status?: number }
      if (err.userError) {
        return NextResponse.json(
          { success: false, error: err.userError },
          { status: err.status || 400 }
        )
      }
      throw raceError
    }

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
