import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
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

/**
 * GET /api/diagnostic/state
 * Get current diagnostic state for authenticated user
 *
 * SECURITY: Requires authentication - state is user-specific
 */
export async function GET() {
  try {
    const userId = await requireAuth();

    // Get or create diagnostic state for user
    let state = await sql`
      SELECT
        user_id as "userId",
        positioning_clarity as "positioningClarity",
        investor_readiness as "investorReadiness",
        positioning_framework_introduced as "positioningFrameworkIntroduced",
        positioning_framework_introduced_at as "positioningFrameworkIntroducedAt",
        positioning_framework_trigger as "positioningFrameworkTrigger",
        investor_lens_introduced as "investorLensIntroduced",
        investor_lens_introduced_at as "investorLensIntroducedAt",
        investor_lens_trigger as "investorLensTrigger",
        positioning_signals as "positioningSignals",
        investor_signals as "investorSignals",
        formal_assessments_offered as "formalAssessmentsOffered",
        formal_assessments_accepted as "formalAssessmentsAccepted",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM diagnostic_states
      WHERE user_id = ${userId}
    `;

    // If no state exists, create one
    if (!state || state.length === 0) {
      state = await sql`
        INSERT INTO diagnostic_states (user_id)
        VALUES (${userId})
        RETURNING
          user_id as "userId",
          positioning_clarity as "positioningClarity",
          investor_readiness as "investorReadiness",
          positioning_framework_introduced as "positioningFrameworkIntroduced",
          positioning_framework_introduced_at as "positioningFrameworkIntroducedAt",
          positioning_framework_trigger as "positioningFrameworkTrigger",
          investor_lens_introduced as "investorLensIntroduced",
          investor_lens_introduced_at as "investorLensIntroducedAt",
          investor_lens_trigger as "investorLensTrigger",
          positioning_signals as "positioningSignals",
          investor_signals as "investorSignals",
          formal_assessments_offered as "formalAssessmentsOffered",
          formal_assessments_accepted as "formalAssessmentsAccepted",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
    }

    return NextResponse.json({
      success: true,
      data: state[0] as DiagnosticStateResponse,
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

    // Build update fields dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Helper to add update field
    const addUpdate = (field: string, value: any) => {
      if (value !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    };

    addUpdate("positioning_clarity", positioningClarity);
    addUpdate("investor_readiness", investorReadiness);
    addUpdate("formal_assessments_offered", formalAssessmentsOffered);
    addUpdate("formal_assessments_accepted", formalAssessmentsAccepted);

    // Handle framework introduction with timestamps
    if (positioningFrameworkIntroduced !== undefined) {
      addUpdate("positioning_framework_introduced", positioningFrameworkIntroduced);
      if (positioningFrameworkIntroduced) {
        addUpdate("positioning_framework_introduced_at", new Date().toISOString());
        addUpdate("positioning_framework_trigger", positioningFrameworkTrigger || null);
      }
    }

    if (investorLensIntroduced !== undefined) {
      addUpdate("investor_lens_introduced", investorLensIntroduced);
      if (investorLensIntroduced) {
        addUpdate("investor_lens_introduced_at", new Date().toISOString());
        addUpdate("investor_lens_trigger", investorLensTrigger || null);
      }
    }

    // Handle signals arrays
    if (positioningSignals !== undefined) {
      addUpdate("positioning_signals", JSON.stringify(positioningSignals));
    }

    if (investorSignals !== undefined) {
      addUpdate("investor_signals", JSON.stringify(investorSignals));
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at, nothing to update
      return NextResponse.json({
        success: true,
        message: "No fields to update",
      });
    }

    // Use raw query for dynamic update
    values.push(userId);
    const updateQuery = `
      UPDATE diagnostic_states
      SET ${updates.join(", ")}
      WHERE user_id = $${paramIndex}
      RETURNING
        user_id as "userId",
        positioning_clarity as "positioningClarity",
        investor_readiness as "investorReadiness",
        positioning_framework_introduced as "positioningFrameworkIntroduced",
        positioning_framework_introduced_at as "positioningFrameworkIntroducedAt",
        positioning_framework_trigger as "positioningFrameworkTrigger",
        investor_lens_introduced as "investorLensIntroduced",
        investor_lens_introduced_at as "investorLensIntroducedAt",
        investor_lens_trigger as "investorLensTrigger",
        positioning_signals as "positioningSignals",
        investor_signals as "investorSignals",
        formal_assessments_offered as "formalAssessmentsOffered",
        formal_assessments_accepted as "formalAssessmentsAccepted",
        updated_at as "updatedAt"
    `;

    // Execute with template literal for Supabase compatibility
    const result = await sql`
      UPDATE diagnostic_states
      SET
        positioning_clarity = COALESCE(${positioningClarity}, positioning_clarity),
        investor_readiness = COALESCE(${investorReadiness}, investor_readiness),
        positioning_framework_introduced = COALESCE(${positioningFrameworkIntroduced}, positioning_framework_introduced),
        positioning_framework_introduced_at = CASE
          WHEN ${positioningFrameworkIntroduced} = true THEN NOW()
          ELSE positioning_framework_introduced_at
        END,
        positioning_framework_trigger = COALESCE(${positioningFrameworkTrigger}, positioning_framework_trigger),
        investor_lens_introduced = COALESCE(${investorLensIntroduced}, investor_lens_introduced),
        investor_lens_introduced_at = CASE
          WHEN ${investorLensIntroduced} = true THEN NOW()
          ELSE investor_lens_introduced_at
        END,
        investor_lens_trigger = COALESCE(${investorLensTrigger}, investor_lens_trigger),
        positioning_signals = COALESCE(${positioningSignals ? JSON.stringify(positioningSignals) : null}::jsonb, positioning_signals),
        investor_signals = COALESCE(${investorSignals ? JSON.stringify(investorSignals) : null}::jsonb, investor_signals),
        formal_assessments_offered = COALESCE(${formalAssessmentsOffered}, formal_assessments_offered),
        formal_assessments_accepted = COALESCE(${formalAssessmentsAccepted}, formal_assessments_accepted),
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING
        user_id as "userId",
        positioning_clarity as "positioningClarity",
        investor_readiness as "investorReadiness",
        positioning_framework_introduced as "positioningFrameworkIntroduced",
        positioning_framework_introduced_at as "positioningFrameworkIntroducedAt",
        positioning_framework_trigger as "positioningFrameworkTrigger",
        investor_lens_introduced as "investorLensIntroduced",
        investor_lens_introduced_at as "investorLensIntroducedAt",
        investor_lens_trigger as "investorLensTrigger",
        positioning_signals as "positioningSignals",
        investor_signals as "investorSignals",
        formal_assessments_offered as "formalAssessmentsOffered",
        formal_assessments_accepted as "formalAssessmentsAccepted",
        updated_at as "updatedAt"
    `;

    return NextResponse.json({
      success: true,
      data: result[0] as DiagnosticStateResponse,
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
