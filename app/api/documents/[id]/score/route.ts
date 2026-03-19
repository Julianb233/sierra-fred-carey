/**
 * POST /api/documents/[id]/score
 *
 * AI-3580: Score an uploaded document and return an A-F letter grade.
 * Free tier: Can score documents (grade only, no storage)
 * Pro/Studio: Score + store grade + full feedback
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserTier } from "@/lib/api/tier-middleware"
import { UserTier } from "@/lib/constants"
import { scoreDocument, type ScoringDocType } from "@/lib/ai/document-scoring"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Fetch the document
    const { data: doc, error: docError } = await supabase
      .from("uploaded_documents")
      .select("id, user_id, file_name, document_type, text_content, storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    // Get text content — either from DB or from storage
    let textContent = doc.text_content
    if (!textContent) {
      // Try to read from storage
      if (doc.storage_path) {
        const { data: fileData } = await supabase.storage
          .from("documents")
          .download(doc.storage_path)

        if (fileData) {
          textContent = await fileData.text()
        }
      }
    }

    if (!textContent || textContent.trim().length < 50) {
      return NextResponse.json(
        { error: "Document has insufficient text content to score. Please upload a document with more content." },
        { status: 400 }
      )
    }

    // Map document_type to scoring type
    const docTypeMap: Record<string, ScoringDocType> = {
      pitch_deck: "pitch_deck",
      financial: "financial",
      strategy: "strategy",
      legal: "legal",
      business_plan: "business_plan",
    }
    const scoringType: ScoringDocType = docTypeMap[doc.document_type] || "other"

    // Score the document
    const score = await scoreDocument(textContent, scoringType, user.id)

    // Check tier for storage
    const userTier = await getUserTier(user.id)

    if (userTier >= UserTier.PRO) {
      // Pro/Studio: Store the grade in the database
      await supabase
        .from("uploaded_documents")
        .update({
          grade: score.grade,
          score: score.numericScore,
          scored_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
    }

    // Free tier: Return grade but don't store
    // Pro/Studio: Return full feedback
    const response: Record<string, unknown> = {
      grade: score.grade,
      numericScore: score.numericScore,
      summary: score.summary,
    }

    if (userTier >= UserTier.PRO) {
      response.strengths = score.strengths
      response.weaknesses = score.weaknesses
      response.suggestions = score.suggestions
      response.dimensions = score.dimensions
      response.stored = true
    } else {
      response.stored = false
      response.upgradeMessage =
        "Upgrade to Pro to save your grade, get detailed feedback, and track improvement over time."
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[POST /api/documents/[id]/score]", error)
    return NextResponse.json(
      { error: "Failed to score document" },
      { status: 500 }
    )
  }
}
