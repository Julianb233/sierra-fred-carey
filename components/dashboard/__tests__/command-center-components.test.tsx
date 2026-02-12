/**
 * Command Center Component Tests — Phase 40
 *
 * Render tests for FounderSnapshotCard, DecisionBox,
 * FundingReadinessGauge, and WeeklyMomentum.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { FounderSnapshotCard } from "../founder-snapshot-card";
import { DecisionBox } from "../decision-box";
import { FundingReadinessGauge } from "../funding-readiness-gauge";
import { WeeklyMomentum } from "../weekly-momentum";

import type {
  FounderSnapshotData,
  CurrentStepInfo,
  ProcessProgressData,
  FundingReadinessData,
  DisplayRules,
  WeeklyMomentumData,
} from "@/lib/dashboard/command-center";

// ============================================================================
// FounderSnapshotCard
// ============================================================================

describe("FounderSnapshotCard", () => {
  const fullSnapshot: FounderSnapshotData = {
    name: "Jane Doe",
    stage: "seed",
    primaryConstraint: "Distribution",
    ninetyDayGoal: "Close first 10 paying customers",
    runway: { time: "8 months", money: "$120k" },
    industry: "SaaS",
    productStatus: "MVP live",
    traction: "5 beta users",
  };

  it("renders the card title", () => {
    render(<FounderSnapshotCard snapshot={fullSnapshot} />);
    expect(screen.getByText("Founder Snapshot")).toBeInTheDocument();
  });

  it("renders stage badge", () => {
    render(<FounderSnapshotCard snapshot={fullSnapshot} />);
    // "Seed" appears both as badge and in the stage field
    const seedElements = screen.getAllByText("Seed");
    expect(seedElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders primary constraint", () => {
    render(<FounderSnapshotCard snapshot={fullSnapshot} />);
    expect(screen.getByText("Distribution")).toBeInTheDocument();
  });

  it("renders 90-day goal", () => {
    render(<FounderSnapshotCard snapshot={fullSnapshot} />);
    expect(
      screen.getByText("Close first 10 paying customers")
    ).toBeInTheDocument();
  });

  it("renders runway as formatted string", () => {
    render(<FounderSnapshotCard snapshot={fullSnapshot} />);
    expect(screen.getByText("8 months / $120k")).toBeInTheDocument();
  });

  it("shows 'Ask FRED' link for missing primary constraint", () => {
    const snapshot: FounderSnapshotData = {
      ...fullSnapshot,
      primaryConstraint: null,
    };
    render(<FounderSnapshotCard snapshot={snapshot} />);
    expect(
      screen.getByText(/Ask FRED about your constraint/i)
    ).toBeInTheDocument();
  });

  it("shows 'Ask FRED' link for missing 90-day goal", () => {
    const snapshot: FounderSnapshotData = {
      ...fullSnapshot,
      ninetyDayGoal: null,
    };
    render(<FounderSnapshotCard snapshot={snapshot} />);
    expect(
      screen.getByText(/Ask FRED about your 90-day goal/i)
    ).toBeInTheDocument();
  });

  it("shows 'Ask FRED' link for missing runway", () => {
    const snapshot: FounderSnapshotData = {
      ...fullSnapshot,
      runway: null,
    };
    render(<FounderSnapshotCard snapshot={snapshot} />);
    expect(
      screen.getByText(/Ask FRED about your runway/i)
    ).toBeInTheDocument();
  });

  it("shows 'Ask FRED' link for missing stage", () => {
    const snapshot: FounderSnapshotData = {
      ...fullSnapshot,
      stage: null,
    };
    render(<FounderSnapshotCard snapshot={snapshot} />);
    expect(
      screen.getByText(/Ask FRED about your stage/i)
    ).toBeInTheDocument();
  });
});

// ============================================================================
// DecisionBox
// ============================================================================

describe("DecisionBox", () => {
  const currentStep: CurrentStepInfo = {
    stepKey: "buyer",
    stepNumber: 2,
    name: "Identify the Buyer and Environment",
    objective:
      "Clarify who buys, who uses, and the context in which the problem exists.",
    questions: [
      "Who is the economic buyer?",
      "Who is the user (if different)?",
      "What environment or workflow does this live in?",
    ],
    requiredOutput:
      "A clear definition of buyer vs user. The environment where the solution must fit.",
    status: "in_progress",
    blockers: [],
  };

  const processProgress: ProcessProgressData = {
    currentStep: "buyer",
    processStatus: "active",
    steps: [],
    totalSteps: 9,
    completedSteps: 1,
  };

  it("renders the 'Right Now' title", () => {
    render(
      <DecisionBox
        currentStep={currentStep}
        processProgress={processProgress}
      />
    );
    expect(screen.getByText("Right Now")).toBeInTheDocument();
  });

  it("renders step number and total", () => {
    render(
      <DecisionBox
        currentStep={currentStep}
        processProgress={processProgress}
      />
    );
    expect(screen.getByText("Step 2 of 9")).toBeInTheDocument();
  });

  it("renders step name", () => {
    render(
      <DecisionBox
        currentStep={currentStep}
        processProgress={processProgress}
      />
    );
    expect(
      screen.getByText("Identify the Buyer and Environment")
    ).toBeInTheDocument();
  });

  it("renders step objective", () => {
    render(
      <DecisionBox
        currentStep={currentStep}
        processProgress={processProgress}
      />
    );
    expect(
      screen.getByText(/Clarify who buys/)
    ).toBeInTheDocument();
  });

  it("renders 'Work on this with Fred' button", () => {
    render(
      <DecisionBox
        currentStep={currentStep}
        processProgress={processProgress}
      />
    );
    expect(
      screen.getByText("Work on this with Fred")
    ).toBeInTheDocument();
  });

  it("renders progress percentage", () => {
    render(
      <DecisionBox
        currentStep={currentStep}
        processProgress={processProgress}
      />
    );
    // 1/9 = 11%
    expect(screen.getByText("11%")).toBeInTheDocument();
  });

  it("renders blockers when present", () => {
    const stepWithBlockers: CurrentStepInfo = {
      ...currentStep,
      blockers: ["No customer interviews completed", "Market data insufficient"],
    };
    render(
      <DecisionBox
        currentStep={stepWithBlockers}
        processProgress={processProgress}
      />
    );
    expect(
      screen.getByText("No customer interviews completed")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Market data insufficient")
    ).toBeInTheDocument();
    expect(screen.getByText("Blockers")).toBeInTheDocument();
  });

  it("does not render blockers section when no blockers", () => {
    render(
      <DecisionBox
        currentStep={currentStep}
        processProgress={processProgress}
      />
    );
    expect(screen.queryByText("Blockers")).not.toBeInTheDocument();
  });
});

// ============================================================================
// FundingReadinessGauge
// ============================================================================

describe("FundingReadinessGauge", () => {
  const baseReadiness: FundingReadinessData = {
    zone: "yellow",
    label: "Prove",
    topBlockers: [],
    hasIntakeCompleted: true,
    investorReadinessSignal: "low",
  };

  const showRules: DisplayRules = {
    showFundingGauge: true,
    blurReadiness: false,
    showConstraintOverPositioning: false,
    highStressDetected: false,
  };

  it("renders when display rules allow", () => {
    render(
      <FundingReadinessGauge
        readiness={baseReadiness}
        displayRules={showRules}
      />
    );
    expect(screen.getByText("Funding Readiness")).toBeInTheDocument();
  });

  it("returns null when display rules hide the gauge", () => {
    const hideRules: DisplayRules = { ...showRules, showFundingGauge: false };
    const { container } = render(
      <FundingReadinessGauge
        readiness={baseReadiness}
        displayRules={hideRules}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows blurred state when intake not completed", () => {
    const blurRules: DisplayRules = { ...showRules, blurReadiness: true };
    render(
      <FundingReadinessGauge
        readiness={{ ...baseReadiness, hasIntakeCompleted: false }}
        displayRules={blurRules}
      />
    );
    expect(
      screen.getByText("Funding Readiness Locked")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Complete an investor readiness review/)
    ).toBeInTheDocument();
  });

  it("shows zone label for yellow", () => {
    render(
      <FundingReadinessGauge
        readiness={baseReadiness}
        displayRules={showRules}
      />
    );
    // "Prove" appears both as zone badge and in the gauge legend
    const proveElements = screen.getAllByText("Prove");
    expect(proveElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows zone label for red", () => {
    const redReadiness = { ...baseReadiness, zone: "red" as const, label: "Build" };
    render(
      <FundingReadinessGauge
        readiness={redReadiness}
        displayRules={showRules}
      />
    );
    // "Build" appears both as zone label and in the gauge legend
    const buildElements = screen.getAllByText("Build");
    expect(buildElements.length).toBeGreaterThan(0);
  });

  it("shows zone label for green", () => {
    const greenReadiness = { ...baseReadiness, zone: "green" as const, label: "Raise" };
    render(
      <FundingReadinessGauge
        readiness={greenReadiness}
        displayRules={showRules}
      />
    );
    const raiseElements = screen.getAllByText("Raise");
    expect(raiseElements.length).toBeGreaterThan(0);
  });

  it("renders top blockers", () => {
    const readinessWithBlockers = {
      ...baseReadiness,
      topBlockers: ["Need validation data", "GTM unclear"],
    };
    render(
      <FundingReadinessGauge
        readiness={readinessWithBlockers}
        displayRules={showRules}
      />
    );
    expect(screen.getByText("Need validation data")).toBeInTheDocument();
    expect(screen.getByText("GTM unclear")).toBeInTheDocument();
    expect(screen.getByText("Top Blockers")).toBeInTheDocument();
  });

  it("renders 'Run Readiness Review' button", () => {
    render(
      <FundingReadinessGauge
        readiness={baseReadiness}
        displayRules={showRules}
      />
    );
    expect(
      screen.getByText("Run Readiness Review")
    ).toBeInTheDocument();
  });
});

// ============================================================================
// WeeklyMomentum
// ============================================================================

describe("WeeklyMomentum", () => {
  it("renders the card title", () => {
    const momentum: WeeklyMomentumData = {
      lastCheckinSummary: null,
      lastCheckinDate: null,
      streak: 0,
      totalCheckins: 0,
    };
    render(<WeeklyMomentum momentum={momentum} />);
    expect(screen.getByText("Weekly Momentum")).toBeInTheDocument();
  });

  it("shows empty state when no check-ins", () => {
    const momentum: WeeklyMomentumData = {
      lastCheckinSummary: null,
      lastCheckinDate: null,
      streak: 0,
      totalCheckins: 0,
    };
    render(<WeeklyMomentum momentum={momentum} />);
    expect(screen.getByText("No check-ins yet")).toBeInTheDocument();
  });

  it("shows last check-in summary", () => {
    const momentum: WeeklyMomentumData = {
      lastCheckinSummary:
        "Made progress on customer interviews. Spoke to 3 potential buyers.",
      lastCheckinDate: new Date().toISOString(),
      streak: 3,
      totalCheckins: 10,
    };
    render(<WeeklyMomentum momentum={momentum} />);
    expect(
      screen.getByText(/Made progress on customer interviews/)
    ).toBeInTheDocument();
  });

  it("shows streak badge when streak > 0", () => {
    const momentum: WeeklyMomentumData = {
      lastCheckinSummary: "Good week",
      lastCheckinDate: new Date().toISOString(),
      streak: 5,
      totalCheckins: 10,
    };
    render(<WeeklyMomentum momentum={momentum} />);
    expect(screen.getByText("5 weeks")).toBeInTheDocument();
  });

  it("shows singular 'week' for streak of 1", () => {
    const momentum: WeeklyMomentumData = {
      lastCheckinSummary: "First week",
      lastCheckinDate: new Date().toISOString(),
      streak: 1,
      totalCheckins: 1,
    };
    render(<WeeklyMomentum momentum={momentum} />);
    expect(screen.getByText("1 week")).toBeInTheDocument();
  });

  it("does not show streak badge when streak is 0", () => {
    const momentum: WeeklyMomentumData = {
      lastCheckinSummary: "No streak",
      lastCheckinDate: new Date().toISOString(),
      streak: 0,
      totalCheckins: 1,
    };
    render(<WeeklyMomentum momentum={momentum} />);
    expect(screen.queryByText(/week/)).not.toBeInTheDocument();
  });

  it("shows total check-ins count", () => {
    const momentum: WeeklyMomentumData = {
      lastCheckinSummary: "Check-in data",
      lastCheckinDate: new Date().toISOString(),
      streak: 2,
      totalCheckins: 15,
    };
    render(<WeeklyMomentum momentum={momentum} />);
    expect(screen.getByText("15 total check-ins")).toBeInTheDocument();
  });

  it("renders 'Start Weekly Check-In' button", () => {
    const momentum: WeeklyMomentumData = {
      lastCheckinSummary: null,
      lastCheckinDate: null,
      streak: 0,
      totalCheckins: 0,
    };
    render(<WeeklyMomentum momentum={momentum} />);
    expect(
      screen.getByText("Start Weekly Check-In")
    ).toBeInTheDocument();
  });
});
