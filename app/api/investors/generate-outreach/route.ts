/**
 * Investor Outreach Generation API
 * Phase 20: Investor Targeting (Plan 20-02)
 *
 * POST /api/investors/generate-outreach
 *   Generates AI-personalized email sequences for investor outreach
 *   using Fred Cary's fundraising voice and communication philosophy.
 *
 * Requires Studio tier.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkTierForRequest } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";
import { generateStructured } from "@/lib/ai/fred-client";
import {
  FRED_COMMUNICATION_STYLE,
  FRED_BIO,
  getExperienceStatement,
} from "@/lib/fred-brain";

// ============================================================================
// Request validation
// ============================================================================

const RequestSchema = z.object({
  investorId: z.string().uuid(),
  sequenceType: z.enum(["cold", "warm_intro", "follow_up"]),
});

// ============================================================================
// Response schema for AI generation
// ============================================================================

const EmailSequenceSchema = z.object({
  emails: z.array(
    z.object({
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Full email body text"),
      send_day: z
        .number()
        .describe("Day offset from first email (0 = day of send)"),
      purpose: z.string().describe("Purpose of this email in the sequence"),
    })
  ),
  timing_notes: z
    .string()
    .describe(
      "Fred's strategic advice on when to send each email and general timing principles"
    ),
});

// ============================================================================
// Sequence templates (email count and day offsets per type)
// ============================================================================

const SEQUENCE_TEMPLATES = {
  cold: {
    label: "Cold Outreach",
    description:
      "Initial outreach (day 0), follow-up 1 (day 3), follow-up 2 (day 7), break-up email (day 14)",
    emailCount: 4,
    dayOffsets: [0, 3, 7, 14],
  },
  warm_intro: {
    label: "Warm Introduction",
    description:
      "Intro request to connector (day 0), thank-you to connector (day 1), direct follow-up (day 3)",
    emailCount: 3,
    dayOffsets: [0, 1, 3],
  },
  follow_up: {
    label: "Post-Meeting Follow-up",
    description:
      "Post-meeting thank-you (day 0), additional materials (day 2), next steps (day 5)",
    emailCount: 3,
    dayOffsets: [0, 2, 5],
  },
} as const;

// ============================================================================
// POST handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate and check tier
    const tierCheck = await checkTierForRequest(request, UserTier.STUDIO);
    if (!tierCheck.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Studio tier required for Outreach Generation",
        },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { investorId, sequenceType } = parsed.data;
    const template = SEQUENCE_TEMPLATES[sequenceType];

    // 3. Load investor data
    const supabase = createServiceClient();

    const { data: investor, error: investorError } = await supabase
      .from("investors")
      .select(
        "id, name, firm, email, website, stage_focus, sector_focus, check_size_min, check_size_max, location, notes"
      )
      .eq("id", investorId)
      .single();

    if (investorError || !investor) {
      return NextResponse.json(
        { success: false, error: "Investor not found" },
        { status: 404 }
      );
    }

    // 4. Load user profile for personalization
    const { data: profile } = await supabase
      .from("founder_profiles")
      .select(
        "company_name, company_description, industry, stage, challenge, revenue, team_size"
      )
      .eq("user_id", userId)
      .single();

    // 5. Build the AI prompt
    const founderContext = profile
      ? `
Founder's Company: ${profile.company_name || "Not specified"}
Description: ${profile.company_description || "Not specified"}
Industry: ${profile.industry || "Not specified"}
Stage: ${profile.stage || "Not specified"}
Primary Challenge: ${profile.challenge || "Not specified"}
Revenue: ${profile.revenue || "Not specified"}
Team Size: ${profile.team_size || "Not specified"}`
      : "Founder profile not available - write generic but professional outreach.";

    const investorContext = `
Investor Name: ${investor.name}
Firm: ${investor.firm || "Independent"}
Stage Focus: ${investor.stage_focus?.join(", ") || "Not specified"}
Sector Focus: ${investor.sector_focus?.join(", ") || "Not specified"}
Check Size: ${
      investor.check_size_min || investor.check_size_max
        ? `$${(investor.check_size_min || 0).toLocaleString()} - $${(investor.check_size_max || 0).toLocaleString()}`
        : "Not specified"
    }
Location: ${investor.location || "Not specified"}
Notes: ${investor.notes || "None"}`;

    const systemPrompt = `You are Fred Cary -- serial entrepreneur with ${FRED_BIO.yearsExperience}+ years of experience, ${FRED_BIO.companiesFounded}+ companies founded, ${FRED_BIO.ipos} IPOs, and over 10,000 founders coached.

${getExperienceStatement()}

Voice: ${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.

Your investor outreach philosophy:
- Be concise and confident. Every word earns its place.
- No desperation. You're offering an opportunity, not begging for money.
- Demonstrate founder-market fit in the first 2 sentences.
- Lead with traction and metrics, not vision alone.
- Warm intros beat cold outreach 10:1 -- but a great cold email still opens doors.
- Follow-up is where deals happen. Most founders give up too early.
- Personalize to the investor's thesis. Show you did your homework.
- Clear, low-friction call to action. Make it easy to say yes to a conversation.

What you never do:
${FRED_COMMUNICATION_STYLE.doNot.map((d) => `- ${d}`).join("\n")}`;

    const userPrompt = `Generate a ${template.label} email sequence for investor outreach.

${template.description}

TARGET INVESTOR:
${investorContext}

FOUNDER CONTEXT:
${founderContext}

Generate exactly ${template.emailCount} emails with day offsets: ${template.dayOffsets.join(", ")}.

For each email:
- Subject line: compelling, specific, under 60 characters
- Body: professional, concise (under 150 words), personalized to this investor's thesis
- Day offset from the first email
- Clear purpose for this email in the sequence

Also provide timing notes with strategic advice on:
- Best days/times to send
- How to handle non-responses
- When to move on if no engagement`;

    // 6. Generate with AI
    const result = await generateStructured(userPrompt, EmailSequenceSchema, {
      system: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    // 7. Add default status to each email
    const emailsWithStatus = result.object.emails.map((email) => ({
      ...email,
      status: "draft",
    }));

    // 8. Persist to database (upsert by unique constraint)
    const { data: saved, error: saveError } = await supabase
      .from("investor_outreach_sequences")
      .upsert(
        {
          user_id: userId,
          investor_id: investorId,
          sequence_type: sequenceType,
          emails: emailsWithStatus,
          timing_notes: result.object.timing_notes,
          generated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,investor_id,sequence_type",
        }
      )
      .select()
      .single();

    if (saveError) {
      console.error("[GenerateOutreach] Save error:", saveError);
      // Still return the generated content even if save fails
      return NextResponse.json({
        success: true,
        sequence: {
          investor_id: investorId,
          sequence_type: sequenceType,
          emails: emailsWithStatus,
          timing_notes: result.object.timing_notes,
        },
        saved: false,
        warning: "Sequence generated but could not be saved",
      });
    }

    return NextResponse.json({
      success: true,
      sequence: saved,
      saved: true,
    });
  } catch (error) {
    console.error("[GenerateOutreach] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate outreach sequence" },
      { status: 500 }
    );
  }
}
