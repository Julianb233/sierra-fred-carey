/**
 * Strategy Reframing API
 * Phase 18-02: Fred's 9-Step Framework Reframing Endpoint
 *
 * POST /api/dashboard/strategy/reframe
 * Accepts a strategic challenge and returns a structured 6-section reframing
 * using Fred's voice and startup philosophy.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { generate } from "@/lib/ai/fred-client";
import {
  FRED_BIO,
  FRED_COMMUNICATION_STYLE,
  FRED_PHILOSOPHY,
} from "@/lib/fred-brain";

// ============================================================================
// Request Validation
// ============================================================================

const reframeRequestSchema = z.object({
  challenge: z
    .string()
    .min(20, "Challenge must be at least 20 characters")
    .max(5000),
  currentApproach: z.string().max(3000).optional(),
  constraints: z.string().max(3000).optional(),
});

// ============================================================================
// System Prompt
// ============================================================================

function buildSystemPrompt(): string {
  const principles = FRED_PHILOSOPHY.corePrinciples
    .map((p) => `- ${p.name}: ${p.teachings[0]}`)
    .join("\n");

  return `You are Fred Cary, serial entrepreneur with ${FRED_BIO.yearsExperience}+ years of experience, ${FRED_BIO.companiesFounded}+ companies founded, ${FRED_BIO.ipos} IPOs, and ${FRED_BIO.acquisitions} acquisitions. ${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.

Your approach to strategy follows your 9-step startup process:
1. Mindset & Vision - Get your head right first
2. Market Validation - Prove the market exists
3. Positioning & Differentiation - Own your space
4. Business Model & Unit Economics - Make the math work
5. Team & Execution - Build the right team
6. Capital Strategy - Fund it smartly
7. Go-to-Market - Launch with purpose
8. Scaling & Growth - Grow without breaking
9. Exit & Legacy - Build something that lasts

Your core principles:
${principles}

You are reframing a founder's strategic challenge. Be direct, specific, and actionable. Draw from your 50+ years of real experience. Do NOT sugarcoat, but DO encourage.

IMPORTANT: Respond ONLY with valid JSON matching this exact structure (no markdown, no code fences):
{
  "reframed_problem": "string - how you see the real underlying problem (2-4 sentences)",
  "root_causes": ["string - cause 1", "string - cause 2", "string - cause 3"],
  "alternative_approaches": [
    {"title": "string", "description": "string (2-3 sentences)", "risk_level": "low|medium|high"},
    {"title": "string", "description": "string (2-3 sentences)", "risk_level": "low|medium|high"},
    {"title": "string", "description": "string (2-3 sentences)", "risk_level": "low|medium|high"}
  ],
  "recommended_action": "string - your specific recommendation with concrete next steps (3-5 sentences)",
  "metrics_to_track": ["string - metric 1", "string - metric 2", "string - metric 3"],
  "timeline": "string - realistic timeline with milestones (2-3 sentences)"
}`;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    await requireAuth();

    // Parse and validate
    const body = await req.json();
    const parsed = reframeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { challenge, currentApproach, constraints } = parsed.data;

    // Build user prompt
    let userPrompt = `A founder is facing this strategic challenge:\n\n"${challenge}"`;

    if (currentApproach) {
      userPrompt += `\n\nTheir current approach:\n"${currentApproach}"`;
    }

    if (constraints) {
      userPrompt += `\n\nConstraints they face:\n"${constraints}"`;
    }

    userPrompt +=
      "\n\nReframe this challenge through your 9-step framework. Provide the structured JSON response.";

    // Generate reframing using Fred's voice
    const result = await generate(userPrompt, {
      system: buildSystemPrompt(),
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    // Parse AI response as JSON
    let reframing: Record<string, unknown>;
    try {
      // Strip potential markdown code fences
      const cleaned = result.text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      reframing = JSON.parse(cleaned);
    } catch {
      console.error(
        "[Reframe API] Failed to parse AI response as JSON:",
        result.text.substring(0, 200)
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Fred had trouble structuring his response. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      reframing,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Reframe API] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
