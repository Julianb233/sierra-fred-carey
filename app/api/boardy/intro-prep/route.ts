/**
 * Boardy Intro Prep API
 * Phase 89: Boardy Polish
 *
 * GET /api/boardy/intro-prep?matchId=xxx
 * Generates AI-personalized intro preparation content (call script,
 * email template, talking points) for a specific match.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { getModel } from "@/lib/ai/providers"
import { getModelForTier } from "@/lib/ai/tier-routing"

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("matchId")
  if (!matchId) {
    return NextResponse.json(
      { success: false, error: "matchId is required" },
      { status: 400 }
    )
  }

  // Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  // Fetch match (must belong to this user)
  const { data: match, error: matchError } = await supabase
    .from("boardy_matches")
    .select("*")
    .eq("id", matchId)
    .eq("user_id", user.id)
    .single()

  if (matchError || !match) {
    return NextResponse.json(
      { success: false, error: "Match not found" },
      { status: 404 }
    )
  }

  // Fetch user profile for personalization
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, startup_stage, sector")
    .eq("id", user.id)
    .single()

  const companyName = profile?.company_name || "your company"
  const stage = profile?.startup_stage || "early stage"
  const sector = profile?.sector || "technology"

  const matchName = match.match_name || "the match"
  const matchType = match.match_type || "investor"
  const matchDescription = match.match_description || ""
  const matchFocus = (match.metadata as Record<string, unknown>)?.focus as string || ""

  // Use the cheapest model (free tier = fast provider)
  const providerKey = getModelForTier("free", "structured")
  const model = getModel(providerKey)

  try {
    const { text } = await generateText({
      model,
      maxOutputTokens: 1024,
      temperature: 0.6,
      system: `You are a startup mentor helping a founder prepare for an introduction with an ${matchType}. Generate personalized, practical preparation content. Output valid JSON only with this exact structure: {"callScript": "string", "emailTemplate": "string", "talkingPoints": ["string", "string", "string"]}`,
      prompt: `Founder's company: ${companyName}
Stage: ${stage}
Sector: ${sector}

Match name: ${matchName}
Match type: ${matchType}
Match description: ${matchDescription}
${matchFocus ? `Focus area: ${matchFocus}` : ""}

Generate a personalized preparation guide with:
1. callScript: A brief, personalized call script (opening, key points to cover based on their sector/stage, questions to ask this specific ${matchType})
2. emailTemplate: A concise follow-up email template personalized to this match and the founder's company
3. talkingPoints: 4-5 specific talking points tailored to the founder's stage, sector, and this match's focus area`,
    })

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, error: "Failed to generate content" },
        { status: 500 }
      )
    }

    const prep = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      prep: {
        callScript: prep.callScript || "",
        emailTemplate: prep.emailTemplate || "",
        talkingPoints: Array.isArray(prep.talkingPoints) ? prep.talkingPoints : [],
      },
    })
  } catch (err) {
    console.error("[intro-prep] Generation error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to generate personalized content" },
      { status: 500 }
    )
  }
}
