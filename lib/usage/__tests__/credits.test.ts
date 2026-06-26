/**
 * Tests for the credit/usage model (AI-6487).
 */

import { afterEach, describe, it, expect } from "vitest";
import { UserTier } from "@/lib/constants";
import {
  DEFAULT_ACTION_COSTS,
  DEFAULT_TIER_CREDIT_ALLOWANCE,
  getActionCost,
  getActionCosts,
  getTierAllowance,
  computeRemainingCredits,
  canAfford,
  type UsageActionType,
} from "../credits";

const ENV_KEYS = ["USAGE_ACTION_COSTS", "USAGE_TIER_ALLOWANCE"] as const;

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("action costs", () => {
  it("each action has a distinct, non-negative default cost", () => {
    for (const [action, cost] of Object.entries(DEFAULT_ACTION_COSTS)) {
      expect(cost, action).toBeGreaterThanOrEqual(0);
      expect(getActionCost(action)).toBe(cost);
    }
  });

  it("heavier actions cost more than a chat message", () => {
    expect(getActionCost("pitch_deck_review")).toBeGreaterThan(
      getActionCost("chat_message")
    );
    expect(getActionCost("voice_call_minute")).toBeGreaterThan(
      getActionCost("chat_message")
    );
  });

  it("unknown actions fall back to 1 credit (fail-open)", () => {
    expect(getActionCost("totally_unknown_action")).toBe(1);
  });

  it("respects USAGE_ACTION_COSTS env override (merged with defaults)", () => {
    process.env.USAGE_ACTION_COSTS = JSON.stringify({ chat_message: 3 });
    expect(getActionCost("chat_message")).toBe(3);
    // Non-overridden actions keep defaults.
    expect(getActionCost("report_generation")).toBe(
      DEFAULT_ACTION_COSTS.report_generation
    );
  });

  it("ignores malformed USAGE_ACTION_COSTS env", () => {
    process.env.USAGE_ACTION_COSTS = "{not json";
    expect(getActionCosts()).toEqual(DEFAULT_ACTION_COSTS);
  });
});

describe("tier allowances", () => {
  it("increase monotonically FREE < BUILDER < PRO < STUDIO", () => {
    expect(getTierAllowance(UserTier.FREE)).toBeLessThan(
      getTierAllowance(UserTier.BUILDER)
    );
    expect(getTierAllowance(UserTier.BUILDER)).toBeLessThan(
      getTierAllowance(UserTier.PRO)
    );
    expect(getTierAllowance(UserTier.PRO)).toBeLessThan(
      getTierAllowance(UserTier.STUDIO)
    );
  });

  it("respects USAGE_TIER_ALLOWANCE env override", () => {
    process.env.USAGE_TIER_ALLOWANCE = JSON.stringify({
      [UserTier.FREE]: 500,
    });
    expect(getTierAllowance(UserTier.FREE)).toBe(500);
    expect(getTierAllowance(UserTier.PRO)).toBe(
      DEFAULT_TIER_CREDIT_ALLOWANCE[UserTier.PRO]
    );
  });
});

describe("remaining credits + affordability", () => {
  it("computes remaining = allowance - consumed, clamped at 0", () => {
    const free = getTierAllowance(UserTier.FREE);
    expect(computeRemainingCredits(UserTier.FREE, 0)).toBe(free);
    expect(computeRemainingCredits(UserTier.FREE, 10)).toBe(free - 10);
    expect(computeRemainingCredits(UserTier.FREE, free + 999)).toBe(0);
    // Negative consumed is treated as 0.
    expect(computeRemainingCredits(UserTier.FREE, -50)).toBe(free);
  });

  it("canAfford is true only when remaining >= action cost", () => {
    const action: UsageActionType = "pitch_deck_review";
    const cost = getActionCost(action);
    const free = getTierAllowance(UserTier.FREE);
    expect(canAfford(UserTier.FREE, 0, action)).toBe(true);
    expect(canAfford(UserTier.FREE, free - cost, action)).toBe(true);
    expect(canAfford(UserTier.FREE, free - cost + 1, action)).toBe(false);
    expect(canAfford(UserTier.FREE, free, action)).toBe(false);
  });
});
