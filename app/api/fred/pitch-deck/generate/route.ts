import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserTier } from "@/lib/api/tier-middleware";
import { UserTier, canAccessFeature } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  SLIDE_TYPES,
  SLIDE_LABELS,
  SLIDE_DESCRIPTIONS,
  type SlideType,
} from "@/lib/fred/pitch/types";

const GENERATOR_SLIDES: SlideType[] = SLIDE_TYPES.filter(
  (t) => t !== "appendix"
);

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const userTier = await getUserTier(userId);

    if (!canAccessFeature(userTier, UserTier.PRO)) {
      return NextResponse.json(
        {
          success: false,
          error: "Pro tier required to generate pitch decks",
          code: "TIER_REQUIRED",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const additionalContext = body.additionalContext || "";

    // Fetch founder profile for context
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "name, stage, industry, challenges, revenue_range, team_size, funding_history, product_positioning, company_description"
      )
      .eq("id", userId)
      .single();

    // Build context for the AI
    const profileContext = profile
      ? [
          profile.name && `Company: ${profile.name}`,
          profile.industry && `Industry: ${profile.industry}`,
          profile.stage && `Stage: ${profile.stage}`,
          profile.company_description &&
            `Description: ${profile.company_description}`,
          profile.product_positioning &&
            `Positioning: ${profile.product_positioning}`,
          profile.revenue_range &&
            `Revenue Range: ${profile.revenue_range}`,
          profile.team_size && `Team Size: ${profile.team_size}`,
          profile.funding_history &&
            `Funding History: ${profile.funding_history}`,
          Array.isArray(profile.challenges) &&
            profile.challenges.length > 0 &&
            `Key Challenges: ${profile.challenges.join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const slideDescriptions = GENERATOR_SLIDES.map(
      (type) =>
        `- ${SLIDE_LABELS[type]} (type: "${type}"): ${SLIDE_DESCRIPTIONS[type]}`
    ).join("\n");

    const prompt = `You are FRED, an expert startup advisor with 50 years of experience. Generate a complete investor-grade pitch deck for this startup.

FOUNDER PROFILE:
${profileContext || "No profile data available yet."}

${additionalContext ? `ADDITIONAL CONTEXT FROM FOUNDER:\n${additionalContext}\n` : ""}

Generate slides for each of these sections:
${slideDescriptions}

For each slide, provide:
1. A compelling title (not just the section name)
2. 3-5 bullet points with specific, data-driven content
3. Speaker notes with talking points and what to emphasize

Rules:
- Be specific, not generic. Use numbers and metrics where possible.
- Frame everything through an investor lens.
- If you don't have specific data, use realistic placeholders clearly marked with [PLACEHOLDER].
- The "Ask" slide should include a specific funding amount and use of funds breakdown.
- Keep bullet points concise (under 15 words each).
- Speaker notes should be 2-3 sentences of guidance.

Also provide an investorReadinessScore from 0-100 estimating how investment-ready this deck is.

Respond in this exact JSON format:
{
  "companyName": "string",
  "tagline": "string",
  "investorReadinessScore": number,
  "slides": [
    {
      "type": "slide_type",
      "title": "Compelling Slide Title",
      "bullets": ["bullet 1", "bullet 2", "bullet 3"],
      "speakerNotes": "Speaker notes here."
    }
  ]
}`;

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt,
      maxOutputTokens: 4000,
    });

    // Parse the JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, error: "Failed to generate deck content" },
        { status: 500 }
      );
    }

    const deck = JSON.parse(jsonMatch[0]);
    deck.generatedAt = new Date().toISOString();

    return NextResponse.json({ success: true, deck });
  } catch (error) {
    // Handle auth errors (NextResponse thrown by requireAuth)
    if (error instanceof NextResponse) return error;

    console.error("[pitch-deck/generate] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate pitch deck" },
      { status: 500 }
    );
  }
}
