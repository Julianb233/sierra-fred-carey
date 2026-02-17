/**
 * Command Center API
 *
 * GET /api/dashboard/command-center
 * Returns all data needed for the Founder Command Center dashboard home.
 * Single endpoint that aggregates founder snapshot, current step, process
 * progress, funding readiness, weekly momentum, and display rules.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCommandCenterData } from "@/lib/dashboard/command-center";

export async function GET() {
  try {
    const userId = await requireAuth();
    const data = await getCommandCenterData(userId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Command Center] Error:", error);

    // Return empty shell data so the dashboard renders instead of spinning forever
    return NextResponse.json({
      success: true,
      data: {
        founderSnapshot: {
          name: null,
          stage: null,
          primaryConstraint: null,
          ninetyDayGoal: null,
          runway: null,
          industry: null,
          productStatus: null,
          traction: null,
        },
        currentStep: {
          stepKey: "problem_validation",
          stepNumber: 1,
          name: "Problem Validation",
          objective: "Validate the core problem you are solving",
          questions: [],
          requiredOutput: "",
          status: "not_started",
          blockers: [],
        },
        processProgress: {
          currentStep: "problem_validation",
          processStatus: "active",
          steps: [],
          totalSteps: 9,
          completedSteps: 0,
        },
        fundingReadiness: {
          zone: "red",
          label: "Build",
          topBlockers: [],
          hasIntakeCompleted: false,
          investorReadinessSignal: null,
        },
        weeklyMomentum: {
          lastCheckinSummary: null,
          lastCheckinDate: null,
          streak: 0,
          totalCheckins: 0,
        },
        diagnosticTags: {},
        displayRules: {
          showFundingGauge: false,
          blurReadiness: true,
          showConstraintOverPositioning: false,
          highStressDetected: false,
        },
      },
    });
  }
}
