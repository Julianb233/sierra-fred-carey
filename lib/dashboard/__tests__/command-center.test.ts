/**
 * Command Center Logic Tests — Phase 40
 *
 * Tests for zone computation, display rules, current step info,
 * and data merging logic in the Command Center module.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StartupStep, StepStatus } from "@/lib/ai/frameworks/startup-process";
import type {
  ConversationState,
  DiagnosticTags,
  FounderSnapshot,
} from "@/lib/db/conversation-state";

// ============================================================================
// Mocks
// ============================================================================

// Mock Supabase server client
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}));

// Mock conversation-state
const mockGetOrCreateConversationState = vi.fn();
const mockGetConversationState = vi.fn();

vi.mock("@/lib/db/conversation-state", () => ({
  getOrCreateConversationState: (...args: unknown[]) => mockGetOrCreateConversationState(...args),
  getConversationState: (...args: unknown[]) => mockGetConversationState(...args),
}));

// Import after mocks
const {
  computeReadinessZone,
  computeDisplayRules,
  getCurrentStepInfo,
} = await import("@/lib/dashboard/command-center");

// ============================================================================
// Helpers
// ============================================================================

function makeStepStatuses(
  overrides: Partial<Record<StartupStep, StepStatus>> = {}
): Record<StartupStep, StepStatus> {
  return {
    problem: "not_started",
    buyer: "not_started",
    "founder-edge": "not_started",
    solution: "not_started",
    validation: "not_started",
    gtm: "not_started",
    execution: "not_started",
    pilot: "not_started",
    "scale-decision": "not_started",
    ...overrides,
  };
}

function makeConversationState(
  overrides: Partial<ConversationState> = {}
): ConversationState {
  return {
    id: "test-id",
    userId: "test-user",
    currentStep: "problem",
    stepStatuses: makeStepStatuses(),
    processStatus: "active",
    currentBlockers: [],
    diagnosticTags: {},
    founderSnapshot: {},
    realityLensGate: {
      feasibility: { status: "not_assessed", blockers: [], lastAssessedAt: null },
      economics: { status: "not_assessed", blockers: [], lastAssessedAt: null },
      demand: { status: "not_assessed", blockers: [], lastAssessedAt: null },
      distribution: { status: "not_assessed", blockers: [], lastAssessedAt: null },
      timing: { status: "not_assessed", blockers: [], lastAssessedAt: null },
    },
    activeMode: "founder-os",
    modeContext: {
      activatedAt: null,
      activatedBy: null,
      introductionState: {
        positioning: { introduced: false, introducedAt: null, trigger: null },
        investor: { introduced: false, introducedAt: null, trigger: null },
      },
      signalHistory: [],
      formalAssessments: {
        offered: false,
        accepted: false,
        verdictIssued: false,
        verdictValue: null,
        deckRequested: false,
      },
      quietCount: 0,
    },
    lastTransitionAt: null,
    lastTransitionFrom: null,
    lastTransitionTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Tests: computeReadinessZone
// ============================================================================

describe("computeReadinessZone", () => {
  describe("Red zone (Build)", () => {
    it("returns red for idea stage", () => {
      const tags: DiagnosticTags = { stage: "idea" };
      const statuses = makeStepStatuses();
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).toBe("red");
      expect(result.label).toBe("Build");
    });

    it("returns red for pre-seed with low positioning", () => {
      const tags: DiagnosticTags = { stage: "pre-seed", positioningClarity: "low" };
      const statuses = makeStepStatuses();
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).toBe("red");
      expect(result.label).toBe("Build");
    });

    it("returns red for idea stage even with some validation done", () => {
      const tags: DiagnosticTags = { stage: "idea", investorReadinessSignal: "high" };
      const statuses = makeStepStatuses({ validation: "validated", gtm: "validated" });
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).toBe("red");
    });
  });

  describe("Green zone (Raise)", () => {
    it("returns green for seed stage with validation+gtm validated and med investor signal", () => {
      const tags: DiagnosticTags = {
        stage: "seed",
        investorReadinessSignal: "med",
      };
      const statuses = makeStepStatuses({
        validation: "validated",
        gtm: "validated",
      });
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).toBe("green");
      expect(result.label).toBe("Raise");
    });

    it("returns green for growth stage with validation+gtm validated and high investor signal", () => {
      const tags: DiagnosticTags = {
        stage: "growth",
        investorReadinessSignal: "high",
      };
      const statuses = makeStepStatuses({
        validation: "validated",
        gtm: "validated",
      });
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).toBe("green");
      expect(result.label).toBe("Raise");
    });

    it("does NOT return green if validation is not validated", () => {
      const tags: DiagnosticTags = {
        stage: "seed",
        investorReadinessSignal: "high",
      };
      const statuses = makeStepStatuses({
        validation: "in_progress",
        gtm: "validated",
      });
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).not.toBe("green");
    });

    it("does NOT return green if gtm is not validated", () => {
      const tags: DiagnosticTags = {
        stage: "seed",
        investorReadinessSignal: "med",
      };
      const statuses = makeStepStatuses({
        validation: "validated",
        gtm: "in_progress",
      });
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).not.toBe("green");
    });

    it("does NOT return green if investor signal is low", () => {
      const tags: DiagnosticTags = {
        stage: "seed",
        investorReadinessSignal: "low",
      };
      const statuses = makeStepStatuses({
        validation: "validated",
        gtm: "validated",
      });
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).not.toBe("green");
    });
  });

  describe("Yellow zone (Prove)", () => {
    it("returns yellow for pre-seed without low positioning", () => {
      const tags: DiagnosticTags = { stage: "pre-seed", positioningClarity: "med" };
      const statuses = makeStepStatuses();
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).toBe("yellow");
      expect(result.label).toBe("Prove");
    });

    it("returns yellow for seed stage without full validation", () => {
      const tags: DiagnosticTags = { stage: "seed" };
      const statuses = makeStepStatuses({ validation: "in_progress" });
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).toBe("yellow");
    });

    it("returns yellow for seed with validation done but low investor signal", () => {
      const tags: DiagnosticTags = {
        stage: "seed",
        investorReadinessSignal: "low",
      };
      const statuses = makeStepStatuses({
        validation: "validated",
        gtm: "validated",
      });
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).toBe("yellow");
    });

    it("returns yellow when no stage tag set (default)", () => {
      const tags: DiagnosticTags = {};
      const statuses = makeStepStatuses();
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).toBe("yellow");
    });

    it("returns yellow for growth stage without full validation+gtm", () => {
      const tags: DiagnosticTags = {
        stage: "growth",
        investorReadinessSignal: "high",
      };
      const statuses = makeStepStatuses({
        validation: "validated",
        gtm: "in_progress",
      });
      const result = computeReadinessZone(tags, statuses);
      expect(result.zone).toBe("yellow");
    });
  });

  describe("Edge cases", () => {
    it("handles missing investorReadinessSignal", () => {
      const tags: DiagnosticTags = { stage: "seed" };
      const statuses = makeStepStatuses({
        validation: "validated",
        gtm: "validated",
      });
      const result = computeReadinessZone(tags, statuses);
      // Without investor signal, cannot be green
      expect(result.zone).toBe("yellow");
    });

    it("handles empty diagnostic tags", () => {
      const result = computeReadinessZone({}, makeStepStatuses());
      // No stage = not idea, not pre-seed with low, so yellow
      expect(result.zone).toBe("yellow");
    });
  });
});

// ============================================================================
// Tests: computeDisplayRules
// ============================================================================

describe("computeDisplayRules", () => {
  it("hides funding gauge for idea stage", () => {
    const tags: DiagnosticTags = { stage: "idea" };
    const readiness = {
      zone: "red" as const,
      label: "Build",
      topBlockers: [],
      hasIntakeCompleted: false,
      investorReadinessSignal: null,
    };
    const rules = computeDisplayRules(tags, readiness);
    expect(rules.showFundingGauge).toBe(false);
  });

  it("hides funding gauge when stage is undefined", () => {
    const tags: DiagnosticTags = {};
    const readiness = {
      zone: "yellow" as const,
      label: "Prove",
      topBlockers: [],
      hasIntakeCompleted: true,
      investorReadinessSignal: null,
    };
    const rules = computeDisplayRules(tags, readiness);
    expect(rules.showFundingGauge).toBe(false);
  });

  it("shows funding gauge for pre-seed stage", () => {
    const tags: DiagnosticTags = { stage: "pre-seed" };
    const readiness = {
      zone: "yellow" as const,
      label: "Prove",
      topBlockers: [],
      hasIntakeCompleted: true,
      investorReadinessSignal: null,
    };
    const rules = computeDisplayRules(tags, readiness);
    expect(rules.showFundingGauge).toBe(true);
  });

  it("shows funding gauge for seed stage", () => {
    const tags: DiagnosticTags = { stage: "seed" };
    const readiness = {
      zone: "yellow" as const,
      label: "Prove",
      topBlockers: [],
      hasIntakeCompleted: true,
      investorReadinessSignal: null,
    };
    const rules = computeDisplayRules(tags, readiness);
    expect(rules.showFundingGauge).toBe(true);
  });

  it("shows funding gauge for growth stage", () => {
    const tags: DiagnosticTags = { stage: "growth" };
    const readiness = {
      zone: "green" as const,
      label: "Raise",
      topBlockers: [],
      hasIntakeCompleted: true,
      investorReadinessSignal: "high",
    };
    const rules = computeDisplayRules(tags, readiness);
    expect(rules.showFundingGauge).toBe(true);
  });

  it("blurs readiness when intake not completed", () => {
    const tags: DiagnosticTags = { stage: "seed" };
    const readiness = {
      zone: "yellow" as const,
      label: "Prove",
      topBlockers: [],
      hasIntakeCompleted: false,
      investorReadinessSignal: null,
    };
    const rules = computeDisplayRules(tags, readiness);
    expect(rules.blurReadiness).toBe(true);
  });

  it("does not blur readiness when intake completed", () => {
    const tags: DiagnosticTags = { stage: "seed" };
    const readiness = {
      zone: "yellow" as const,
      label: "Prove",
      topBlockers: [],
      hasIntakeCompleted: true,
      investorReadinessSignal: null,
    };
    const rules = computeDisplayRules(tags, readiness);
    expect(rules.blurReadiness).toBe(false);
  });

  it("shows constraint over positioning for growth stage", () => {
    const tags: DiagnosticTags = { stage: "growth" };
    const readiness = {
      zone: "green" as const,
      label: "Raise",
      topBlockers: [],
      hasIntakeCompleted: true,
      investorReadinessSignal: "high",
    };
    const rules = computeDisplayRules(tags, readiness);
    expect(rules.showConstraintOverPositioning).toBe(true);
  });

  it("does not show constraint over positioning for non-growth stages", () => {
    for (const stage of ["idea", "pre-seed", "seed"] as const) {
      const tags: DiagnosticTags = { stage };
      const readiness = {
        zone: "yellow" as const,
        label: "Prove",
        topBlockers: [],
        hasIntakeCompleted: true,
        investorReadinessSignal: null,
      };
      const rules = computeDisplayRules(tags, readiness);
      expect(rules.showConstraintOverPositioning).toBe(false);
    }
  });

  it("highStressDetected defaults to false (placeholder)", () => {
    const tags: DiagnosticTags = { stage: "seed" };
    const readiness = {
      zone: "yellow" as const,
      label: "Prove",
      topBlockers: [],
      hasIntakeCompleted: true,
      investorReadinessSignal: null,
    };
    const rules = computeDisplayRules(tags, readiness);
    expect(rules.highStressDetected).toBe(false);
  });
});

// ============================================================================
// Tests: getCurrentStepInfo
// ============================================================================

describe("getCurrentStepInfo", () => {
  it("returns correct step info for problem step", () => {
    const state = makeConversationState({ currentStep: "problem" });
    const info = getCurrentStepInfo(state);
    expect(info.stepKey).toBe("problem");
    expect(info.stepNumber).toBe(1);
    expect(info.name).toBe("Define the Real Problem");
    expect(info.objective).toContain("problem being solved");
    expect(info.questions).toHaveLength(3);
    expect(info.status).toBe("not_started");
    expect(info.blockers).toEqual([]);
  });

  it("returns correct step info for buyer step", () => {
    const state = makeConversationState({
      currentStep: "buyer",
      stepStatuses: makeStepStatuses({ buyer: "in_progress", problem: "validated" }),
    });
    const info = getCurrentStepInfo(state);
    expect(info.stepKey).toBe("buyer");
    expect(info.stepNumber).toBe(2);
    expect(info.name).toBe("Identify the Buyer and Environment");
    expect(info.status).toBe("in_progress");
  });

  it("includes blockers from conversation state", () => {
    const state = makeConversationState({
      currentStep: "validation",
      currentBlockers: ["No customer interviews", "Need market data"],
    });
    const info = getCurrentStepInfo(state);
    expect(info.blockers).toEqual(["No customer interviews", "Need market data"]);
  });

  it("returns correct step info for the last step", () => {
    const state = makeConversationState({ currentStep: "scale-decision" });
    const info = getCurrentStepInfo(state);
    expect(info.stepKey).toBe("scale-decision");
    expect(info.stepNumber).toBe(9);
    expect(info.name).toBe("Decide What Earns the Right to Scale");
  });

  it("maps all 9 steps correctly", () => {
    const steps: StartupStep[] = [
      "problem", "buyer", "founder-edge", "solution",
      "validation", "gtm", "execution", "pilot", "scale-decision",
    ];
    for (let i = 0; i < steps.length; i++) {
      const state = makeConversationState({ currentStep: steps[i] });
      const info = getCurrentStepInfo(state);
      expect(info.stepNumber).toBe(i + 1);
      expect(info.stepKey).toBe(steps[i]);
      expect(info.name.length).toBeGreaterThan(0);
      expect(info.objective.length).toBeGreaterThan(0);
      expect(info.questions.length).toBeGreaterThan(0);
      expect(info.requiredOutput.length).toBeGreaterThan(0);
    }
  });
});
