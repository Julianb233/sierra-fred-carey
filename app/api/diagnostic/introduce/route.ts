import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
import { requireAuth } from "@/lib/auth";
import {
  POSITIONING_INTRODUCTION_LANGUAGE,
  needsPositioningFramework,
  type PositioningSignals,
} from "@/lib/ai/frameworks/positioning";
import {
  INVESTOR_LENS_INTRODUCTION,
  needsInvestorLens,
  type InvestorReadinessSignals,
} from "@/lib/ai/frameworks/investor-lens";

/**
 * Framework Introduction API
 * Determines when and how to introduce diagnostic frameworks
 *
 * CORE PRINCIPLE: Introduce only ONE framework at a time.
 * Uses specific language from PRD when introducing.
 */

type FrameworkType = "positioning" | "investor";

interface IntroductionResponse {
  shouldIntroduce: boolean;
  frameworkType: FrameworkType;
  introductionText: string | null;
  triggerReason: string | null;
  alreadyIntroduced: boolean;
}

/**
 * Introduction language per framework - exact PRD language
 */
const INTRODUCTION_TEXT: Record<FrameworkType, string> = {
  positioning: POSITIONING_INTRODUCTION_LANGUAGE.trim(),
  investor: INVESTOR_LENS_INTRODUCTION.trim(),
};

/**
 * Determine trigger reason from signals
 */
function getPositioningTriggerReason(signals: PositioningSignals): string {
  const reasons: string[] = [];

  if (signals.icpVagueOrUndefined) {
    reasons.push("ICP is vague or undefined");
  }
  if (signals.everyoneAsTarget) {
    reasons.push("Target market too broad (everyone)");
  }
  if (signals.genericMessaging) {
    reasons.push("Messaging sounds generic or buzzword-heavy");
  }
  if (signals.highEffortLowTraction) {
    reasons.push("High founder effort with low traction");
  }

  return reasons.length > 0
    ? reasons.join("; ")
    : "Positioning clarity signals detected";
}

function getInvestorTriggerReason(signals: InvestorReadinessSignals): string {
  const reasons: string[] = [];

  if (signals.uploadedDeck) {
    reasons.push("Pitch deck uploaded");
  }
  if (signals.asksAboutReadiness) {
    reasons.push("Asked about investor readiness");
  }
  if (signals.mentionsFundraising) {
    reasons.push("Mentioned fundraising");
  }
  if (signals.mentionsValuation) {
    reasons.push("Mentioned valuation");
  }
  if (signals.mentionsDeck) {
    reasons.push("Referenced pitch deck");
  }

  return reasons.length > 0
    ? reasons.join("; ")
    : "Investor readiness signals detected";
}

/**
 * POST /api/diagnostic/introduce
 * Check if a framework should be introduced and get introduction text
 *
 * Input: { frameworkType: 'positioning' | 'investor' }
 * Output: { shouldIntroduce, introductionText, triggerReason }
 *
 * SECURITY: Requires authentication - framework introduction is tracked per user
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { frameworkType } = body;

    if (!frameworkType || !["positioning", "investor"].includes(frameworkType)) {
      return NextResponse.json(
        {
          success: false,
          error: "frameworkType must be 'positioning' or 'investor'",
        },
        { status: 400 }
      );
    }

    // Get current diagnostic state
    let state = await sql`
      SELECT
        positioning_framework_introduced,
        positioning_framework_trigger,
        investor_lens_introduced,
        investor_lens_trigger,
        positioning_signals,
        investor_signals,
        positioning_clarity,
        investor_readiness
      FROM diagnostic_states
      WHERE user_id = ${userId}
    `;

    // Create state if doesn't exist
    if (!state || state.length === 0) {
      state = await sql`
        INSERT INTO diagnostic_states (user_id)
        VALUES (${userId})
        RETURNING
          positioning_framework_introduced,
          positioning_framework_trigger,
          investor_lens_introduced,
          investor_lens_trigger,
          positioning_signals,
          investor_signals,
          positioning_clarity,
          investor_readiness
      `;
    }

    const currentState = state[0];
    const response: IntroductionResponse = {
      shouldIntroduce: false,
      frameworkType: frameworkType as FrameworkType,
      introductionText: null,
      triggerReason: null,
      alreadyIntroduced: false,
    };

    if (frameworkType === "positioning") {
      // Check if positioning already introduced
      if (currentState.positioning_framework_introduced) {
        response.alreadyIntroduced = true;
        response.triggerReason = currentState.positioning_framework_trigger;
        return NextResponse.json({ success: true, data: response });
      }

      // Check if investor lens is already introduced (can't introduce both)
      if (currentState.investor_lens_introduced) {
        response.triggerReason =
          "Investor lens already active - cannot introduce positioning simultaneously";
        return NextResponse.json({ success: true, data: response });
      }

      // Check signals to determine if introduction is needed
      const signals = currentState.positioning_signals || [];
      const positioningSignals: PositioningSignals = {
        icpVagueOrUndefined: signals.some(
          (s: { signal: string }) => s.signal === "icp_vague"
        ),
        everyoneAsTarget: signals.some(
          (s: { signal: string }) => s.signal === "everyone_target"
        ),
        genericMessaging: signals.some(
          (s: { signal: string }) => s.signal === "generic_messaging"
        ),
        highEffortLowTraction: signals.some(
          (s: { signal: string }) => s.signal === "high_effort_low_traction"
        ),
      };

      if (needsPositioningFramework(positioningSignals)) {
        response.shouldIntroduce = true;
        response.introductionText = INTRODUCTION_TEXT.positioning;
        response.triggerReason = getPositioningTriggerReason(positioningSignals);
      }
    } else if (frameworkType === "investor") {
      // Check if investor lens already introduced
      if (currentState.investor_lens_introduced) {
        response.alreadyIntroduced = true;
        response.triggerReason = currentState.investor_lens_trigger;
        return NextResponse.json({ success: true, data: response });
      }

      // Investor lens takes precedence over positioning
      // So we don't check if positioning is active

      // Check signals to determine if introduction is needed
      const signals = currentState.investor_signals || [];
      const investorSignals: InvestorReadinessSignals = {
        mentionsFundraising: signals.some(
          (s: { signal: string }) => s.signal === "mentions_fundraising"
        ),
        mentionsValuation: signals.some(
          (s: { signal: string }) => s.signal === "mentions_valuation"
        ),
        mentionsDeck: signals.some(
          (s: { signal: string }) => s.signal === "mentions_deck"
        ),
        asksAboutReadiness: signals.some(
          (s: { signal: string }) => s.signal === "asks_readiness"
        ),
        uploadedDeck: signals.some(
          (s: { signal: string }) => s.signal === "uploaded_deck"
        ),
      };

      if (needsInvestorLens(investorSignals)) {
        response.shouldIntroduce = true;
        response.introductionText = INTRODUCTION_TEXT.investor;
        response.triggerReason = getInvestorTriggerReason(investorSignals);
      }
    }

    // If should introduce, mark as introduced and log event
    if (response.shouldIntroduce) {
      const stateBefore = {
        positioningIntroduced: currentState.positioning_framework_introduced,
        investorIntroduced: currentState.investor_lens_introduced,
      };

      if (frameworkType === "positioning") {
        await sql`
          UPDATE diagnostic_states
          SET
            positioning_framework_introduced = true,
            positioning_framework_introduced_at = NOW(),
            positioning_framework_trigger = ${response.triggerReason},
            updated_at = NOW()
          WHERE user_id = ${userId}
        `;
      } else {
        await sql`
          UPDATE diagnostic_states
          SET
            investor_lens_introduced = true,
            investor_lens_introduced_at = NOW(),
            investor_lens_trigger = ${response.triggerReason},
            updated_at = NOW()
          WHERE user_id = ${userId}
        `;
      }

      // Log framework introduction event
      await sql`
        INSERT INTO diagnostic_events (
          user_id,
          event_type,
          framework,
          signal_context,
          state_before,
          state_after
        )
        VALUES (
          ${userId},
          'framework_introduced',
          ${frameworkType},
          ${response.triggerReason},
          ${JSON.stringify(stateBefore)}::jsonb,
          ${JSON.stringify({
            positioningIntroduced:
              frameworkType === "positioning" || currentState.positioning_framework_introduced,
            investorIntroduced:
              frameworkType === "investor" || currentState.investor_lens_introduced,
          })}::jsonb
        )
      `;
    }

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[POST /api/diagnostic/introduce]", error);
    return NextResponse.json(
      { success: false, error: "Failed to check framework introduction" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/diagnostic/introduce
 * Get current introduction state for both frameworks
 *
 * SECURITY: Requires authentication
 */
export async function GET() {
  try {
    const userId = await requireAuth();

    const state = await sql`
      SELECT
        positioning_framework_introduced as "positioningIntroduced",
        positioning_framework_introduced_at as "positioningIntroducedAt",
        positioning_framework_trigger as "positioningTrigger",
        investor_lens_introduced as "investorIntroduced",
        investor_lens_introduced_at as "investorIntroducedAt",
        investor_lens_trigger as "investorTrigger"
      FROM diagnostic_states
      WHERE user_id = ${userId}
    `;

    if (!state || state.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          positioning: {
            introduced: false,
            introducedAt: null,
            trigger: null,
          },
          investor: {
            introduced: false,
            introducedAt: null,
            trigger: null,
          },
          activeFramework: null,
        },
      });
    }

    const currentState = state[0];

    // Determine active framework (investor takes precedence)
    let activeFramework: FrameworkType | null = null;
    if (currentState.investorIntroduced) {
      activeFramework = "investor";
    } else if (currentState.positioningIntroduced) {
      activeFramework = "positioning";
    }

    return NextResponse.json({
      success: true,
      data: {
        positioning: {
          introduced: currentState.positioningIntroduced || false,
          introducedAt: currentState.positioningIntroducedAt || null,
          trigger: currentState.positioningTrigger || null,
        },
        investor: {
          introduced: currentState.investorIntroduced || false,
          introducedAt: currentState.investorIntroducedAt || null,
          trigger: currentState.investorTrigger || null,
        },
        activeFramework,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[GET /api/diagnostic/introduce]", error);
    return NextResponse.json(
      { success: false, error: "Failed to get introduction state" },
      { status: 500 }
    );
  }
}
