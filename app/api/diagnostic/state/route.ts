import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

/**
 * Diagnostic State API
 * Manages user diagnostic state for silent diagnosis flow
 *
 * INTERNAL: These scores and signals are never shown to users directly.
 * They drive framework introduction decisions.
 */

export interface DiagnosticStateResponse {
  userId: string;
  positioningClarity: "unknown" | "low" | "medium" | "high";
  investorReadiness: "unknown" | "low" | "medium" | "high";
  positioningFrameworkIntroduced: boolean;
  positioningFrameworkIntroducedAt: string | null;
  positioningFrameworkTrigger: string | null;
  investorLensIntroduced: boolean;
  investorLensIntroducedAt: string | null;
  investorLensTrigger: string | null;
  positioningSignals: Array<{
    signal: string;
    detected_at: string;
    context: string;
  }>;
  investorSignals: Array<{
    signal: string;
    detected_at: string;
    context: string;
  }>;
  formalAssessmentsOffered: boolean;
  formalAssessmentsAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapRowToResponse(row: any): DiagnosticStateResponse {
  return {
    userId: row.user_id,
    positioningClarity: row.positioning_clarity,
    investorReadiness: row.investor_readiness,
    positioningFrameworkIntroduced: row.positioning_framework_introduced,
    positioningFrameworkIntroducedAt: row.positioning_framework_introduced_at,
    positioningFrameworkTrigger: row.positioning_framework_trigger,
    investorLensIntroduced: row.investor_lens_introduced,
    investorLensIntroducedAt: row.investor_lens_introduced_at,
    investorLensTrigger: row.investor_lens_trigger,
    positioningSignals: row.positioning_signals,
    investorSignals: row.investor_signals,
    formalAssessmentsOffered: row.formal_assessments_offered,
    formalAssessmentsAccepted: row.formal_assessments_accepted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/diagnostic/state
 * Get current diagnostic state for authenticated user
 *
 * SECURITY: Requires authentication - state is user-specific
 */
export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    // Get diagnostic state for user
    const { data: existing, error: selectError } = await supabase
      .from("diagnostic_states")
      .select("*")
      .eq("user_id", userId)
      .limit(1);

    if (selectError) {
      console.error("[GET /api/diagnostic/state] Select error:", selectError);
      throw selectError;
    }

    // If state exists, return it
    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        data: mapRowToResponse(existing[0]),
      });
    }

    // If no state exists, create one
    const { data: inserted, error: insertError } = await supabase
      .from("diagnostic_states")
      .insert({ user_id: userId })
      .select();

    if (insertError) {
      console.error("[GET /api/diagnostic/state] Insert error:", insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      data: mapRowToResponse(inserted[0]),
    });
  } catch (error) {
    // Handle auth errors (thrown as Response)
    if (error instanceof Response) {
      return error;
    }

    console.error("[GET /api/diagnostic/state]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch diagnostic state" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/diagnostic/state
 * Update diagnostic state (internal use - called by analyze and introduce endpoints)
 *
 * SECURITY: Requires authentication
 * NOTE: This endpoint updates internal diagnostic state.
 *       Users should not call this directly - it's updated by the system.
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();
    const body = await request.json();

    const {
      positioningClarity,
      investorReadiness,
      positioningFrameworkIntroduced,
      positioningFrameworkTrigger,
      investorLensIntroduced,
      investorLensTrigger,
      positioningSignals,
      investorSignals,
      formalAssessmentsOffered,
      formalAssessmentsAccepted,
    } = body;

    // Build update data object with only defined fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (positioningClarity !== undefined) {
      updateData.positioning_clarity = positioningClarity;
    }
    if (investorReadiness !== undefined) {
      updateData.investor_readiness = investorReadiness;
    }
    if (formalAssessmentsOffered !== undefined) {
      updateData.formal_assessments_offered = formalAssessmentsOffered;
    }
    if (formalAssessmentsAccepted !== undefined) {
      updateData.formal_assessments_accepted = formalAssessmentsAccepted;
    }

    // Handle framework introduction with timestamps
    if (positioningFrameworkIntroduced !== undefined) {
      updateData.positioning_framework_introduced = positioningFrameworkIntroduced;
      if (positioningFrameworkIntroduced) {
        updateData.positioning_framework_introduced_at = new Date().toISOString();
        updateData.positioning_framework_trigger = positioningFrameworkTrigger || null;
      }
    }

    if (investorLensIntroduced !== undefined) {
      updateData.investor_lens_introduced = investorLensIntroduced;
      if (investorLensIntroduced) {
        updateData.investor_lens_introduced_at = new Date().toISOString();
        updateData.investor_lens_trigger = investorLensTrigger || null;
      }
    }

    // Handle signals arrays
    if (positioningSignals !== undefined) {
      updateData.positioning_signals = positioningSignals;
    }
    if (investorSignals !== undefined) {
      updateData.investor_signals = investorSignals;
    }

    // Only updated_at means nothing meaningful to update
    if (Object.keys(updateData).length <= 1) {
      return NextResponse.json({
        success: true,
        message: "No fields to update",
      });
    }

    const { data: result, error: updateError } = await supabase
      .from("diagnostic_states")
      .update(updateData)
      .eq("user_id", userId)
      .select();

    if (updateError) {
      console.error("[PUT /api/diagnostic/state] Update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: mapRowToResponse(result[0]),
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[PUT /api/diagnostic/state]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update diagnostic state" },
      { status: 500 }
    );
  }
}
