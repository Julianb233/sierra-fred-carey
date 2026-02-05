import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth, getOptionalUserId } from "@/lib/auth";
import {
  detectPositioningSignals,
  type PositioningSignals,
} from "@/lib/ai/frameworks/positioning";
import {
  detectInvestorSignals,
  type InvestorReadinessSignals,
} from "@/lib/ai/frameworks/investor-lens";

/**
 * Diagnostic Analysis API
 * Silently analyzes conversation for positioning and investor signals
 *
 * CORE PRINCIPLE: Founders do NOT choose diagnostics.
 * The system diagnoses silently, then introduces the right lens at the right moment.
 */

interface SignalDetection {
  signal: string;
  detected_at: string;
  context: string;
}

interface AnalysisResult {
  positioningSignals: {
    detected: PositioningSignals;
    signalStrength: "low" | "medium" | "high";
    newSignals: SignalDetection[];
  };
  investorSignals: {
    detected: InvestorReadinessSignals;
    signalStrength: "low" | "medium" | "high";
    newSignals: SignalDetection[];
  };
  positioningClarity: "unknown" | "low" | "medium" | "high";
  investorReadiness: "unknown" | "low" | "medium" | "high";
  dominantSignalType: "none" | "positioning" | "investor";
}

/**
 * Calculate signal strength based on count
 */
function calculateSignalStrength(
  count: number,
  total: number
): "low" | "medium" | "high" {
  const ratio = count / total;
  if (ratio >= 0.6) return "high";
  if (ratio >= 0.3) return "medium";
  return "low";
}

/**
 * Map signal strength to clarity level
 */
function strengthToClarity(
  strength: "low" | "medium" | "high"
): "low" | "medium" | "high" {
  // Inverse relationship: high positioning signals = low clarity
  switch (strength) {
    case "high":
      return "low";
    case "medium":
      return "medium";
    case "low":
      return "high";
  }
}

/**
 * Convert positioning signals to signal detections
 */
function positioningSignalsToDetections(
  signals: PositioningSignals,
  context: string
): SignalDetection[] {
  const detections: SignalDetection[] = [];
  const now = new Date().toISOString();

  if (signals.icpVagueOrUndefined) {
    detections.push({
      signal: "icp_vague",
      detected_at: now,
      context: context.slice(0, 200),
    });
  }
  if (signals.everyoneAsTarget) {
    detections.push({
      signal: "everyone_target",
      detected_at: now,
      context: context.slice(0, 200),
    });
  }
  if (signals.genericMessaging) {
    detections.push({
      signal: "generic_messaging",
      detected_at: now,
      context: context.slice(0, 200),
    });
  }
  if (signals.highEffortLowTraction) {
    detections.push({
      signal: "high_effort_low_traction",
      detected_at: now,
      context: context.slice(0, 200),
    });
  }

  return detections;
}

/**
 * Convert investor signals to signal detections
 */
function investorSignalsToDetections(
  signals: InvestorReadinessSignals,
  context: string
): SignalDetection[] {
  const detections: SignalDetection[] = [];
  const now = new Date().toISOString();

  if (signals.mentionsFundraising) {
    detections.push({
      signal: "mentions_fundraising",
      detected_at: now,
      context: context.slice(0, 200),
    });
  }
  if (signals.mentionsValuation) {
    detections.push({
      signal: "mentions_valuation",
      detected_at: now,
      context: context.slice(0, 200),
    });
  }
  if (signals.mentionsDeck) {
    detections.push({
      signal: "mentions_deck",
      detected_at: now,
      context: context.slice(0, 200),
    });
  }
  if (signals.asksAboutReadiness) {
    detections.push({
      signal: "asks_readiness",
      detected_at: now,
      context: context.slice(0, 200),
    });
  }
  if (signals.uploadedDeck) {
    detections.push({
      signal: "uploaded_deck",
      detected_at: now,
      context: "Deck uploaded by user",
    });
  }

  return detections;
}

/**
 * POST /api/diagnostic/analyze
 * Analyze text/conversation for positioning and investor signals
 *
 * Input: { message, conversationHistory?, hasUploadedDeck? }
 * Output: { detected signals, clarity levels, dominant signal type }
 *
 * SECURITY: Works with optional auth - analysis can be done for anonymous users
 *           but state is only persisted for authenticated users
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getOptionalUserId();
    const body = await request.json();

    const {
      message,
      conversationHistory = [],
      hasUploadedDeck = false,
    } = body;

    if (!message && conversationHistory.length === 0) {
      return NextResponse.json(
        { success: false, error: "Message or conversation history required" },
        { status: 400 }
      );
    }

    // Combine all text for analysis
    const allText = [
      message || "",
      ...conversationHistory
        .filter((m: { role: string }) => m.role === "user")
        .map((m: { content: string }) => m.content),
    ].join(" ");

    // Detect signals
    const positioningSignals = detectPositioningSignals(allText);
    const investorSignals = detectInvestorSignals(allText, hasUploadedDeck);

    // Count signals
    const positioningCount = Object.values(positioningSignals).filter(Boolean).length;
    const investorCount = Object.values(investorSignals).filter(Boolean).length;

    // Calculate strengths
    const positioningStrength = calculateSignalStrength(positioningCount, 4);
    const investorStrength = calculateSignalStrength(investorCount, 5);

    // Convert to detections
    const positioningDetections = positioningSignalsToDetections(
      positioningSignals,
      message || allText.slice(0, 200)
    );
    const investorDetections = investorSignalsToDetections(
      investorSignals,
      message || allText.slice(0, 200)
    );

    // Determine clarity levels
    // Positioning signals indicate unclear positioning (inverse relationship)
    const positioningClarity =
      positioningCount > 0 ? strengthToClarity(positioningStrength) : "unknown";

    // Investor signals indicate investor interest level (direct relationship)
    const investorReadiness =
      investorCount > 0 ? investorStrength : "unknown";

    // Determine dominant signal type
    // Investor signals take precedence per PRD
    let dominantSignalType: "none" | "positioning" | "investor" = "none";
    if (investorCount > 0) {
      dominantSignalType = "investor";
    } else if (positioningCount > 0) {
      dominantSignalType = "positioning";
    }

    const analysisResult: AnalysisResult = {
      positioningSignals: {
        detected: positioningSignals,
        signalStrength: positioningStrength,
        newSignals: positioningDetections,
      },
      investorSignals: {
        detected: investorSignals,
        signalStrength: investorStrength,
        newSignals: investorDetections,
      },
      positioningClarity,
      investorReadiness,
      dominantSignalType,
    };

    // If user is authenticated, persist state changes
    if (userId) {
      // Get existing state
      const existingState = await sql`
        SELECT
          positioning_signals as "positioningSignals",
          investor_signals as "investorSignals"
        FROM diagnostic_states
        WHERE user_id = ${userId}
      `;

      // Merge new signals with existing ones (avoiding duplicates)
      let existingPositioningSignals: SignalDetection[] = [];
      let existingInvestorSignals: SignalDetection[] = [];

      if (existingState && existingState.length > 0) {
        existingPositioningSignals = existingState[0].positioningSignals || [];
        existingInvestorSignals = existingState[0].investorSignals || [];
      }

      // Add only new unique signals
      const mergedPositioningSignals = [
        ...existingPositioningSignals,
        ...positioningDetections.filter(
          (newSig) =>
            !existingPositioningSignals.some(
              (existing) => existing.signal === newSig.signal
            )
        ),
      ];

      const mergedInvestorSignals = [
        ...existingInvestorSignals,
        ...investorDetections.filter(
          (newSig) =>
            !existingInvestorSignals.some(
              (existing) => existing.signal === newSig.signal
            )
        ),
      ];

      // Upsert diagnostic state
      await sql`
        INSERT INTO diagnostic_states (
          user_id,
          positioning_clarity,
          investor_readiness,
          positioning_signals,
          investor_signals
        )
        VALUES (
          ${userId},
          ${positioningClarity},
          ${investorReadiness},
          ${JSON.stringify(mergedPositioningSignals)}::jsonb,
          ${JSON.stringify(mergedInvestorSignals)}::jsonb
        )
        ON CONFLICT (user_id) DO UPDATE SET
          positioning_clarity = ${positioningClarity},
          investor_readiness = ${investorReadiness},
          positioning_signals = ${JSON.stringify(mergedPositioningSignals)}::jsonb,
          investor_signals = ${JSON.stringify(mergedInvestorSignals)}::jsonb,
          updated_at = NOW()
      `;

      // Log signal detection events
      if (positioningDetections.length > 0) {
        await sql`
          INSERT INTO diagnostic_events (
            user_id,
            event_type,
            framework,
            signal_type,
            signal_context,
            state_after
          )
          VALUES (
            ${userId},
            'signal_detected',
            'positioning',
            ${positioningDetections.map((s) => s.signal).join(",")},
            ${message?.slice(0, 200) || null},
            ${JSON.stringify({
              positioningClarity,
              signals: positioningDetections,
            })}::jsonb
          )
        `;
      }

      if (investorDetections.length > 0) {
        await sql`
          INSERT INTO diagnostic_events (
            user_id,
            event_type,
            framework,
            signal_type,
            signal_context,
            state_after
          )
          VALUES (
            ${userId},
            'signal_detected',
            'investor',
            ${investorDetections.map((s) => s.signal).join(",")},
            ${message?.slice(0, 200) || null},
            ${JSON.stringify({
              investorReadiness,
              signals: investorDetections,
            })}::jsonb
          )
        `;
      }
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
      userId: userId || null,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[POST /api/diagnostic/analyze]", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze for signals" },
      { status: 500 }
    );
  }
}
