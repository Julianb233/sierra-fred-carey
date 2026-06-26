/**
 * Tests for the daily free-plan throttling + upsell logic (AI-6486).
 */

import { afterEach, describe, it, expect } from "vitest";
import { UserTier } from "@/lib/constants";
import {
  DEFAULT_TIER_DAILY_LIMITS,
  DEFAULT_APPROACH_RATIO,
  getApproachRatio,
  getTierDailyLimits,
  getDailyLimit,
  isDailyUnlimited,
  computeActionThrottle,
  canTakeAction,
  getUpsellReason,
  startOfUtcDay,
  nextUtcDayReset,
  secondsUntilReset,
} from "../throttle";

const ENV_KEYS = ["USAGE_DAILY_LIMITS", "USAGE_APPROACH_RATIO"] as const;

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("daily limits config", () => {
  it("FREE has a tight, defined daily cap for chat and voice", () => {
    expect(getDailyLimit(UserTier.FREE, "chat_message")).toBeGreaterThan(0);
    expect(getDailyLimit(UserTier.FREE, "voice_call_minute")).toBeGreaterThan(0);
  });

  it("voice is scarcer than chat on the free tier (burns tokens faster)", () => {
    const chat = getDailyLimit(UserTier.FREE, "chat_message")!;
    const voice = getDailyLimit(UserTier.FREE, "voice_call_minute")!;
    expect(voice).toBeLessThan(chat);
  });

  it("STUDIO has no daily caps (unlimited, bounded only by monthly credits)", () => {
    expect(getDailyLimit(UserTier.STUDIO, "chat_message")).toBeNull();
    expect(isDailyUnlimited(UserTier.STUDIO, "voice_call_minute")).toBe(true);
  });

  it("paid tiers lift the daily cap above FREE where a cap exists", () => {
    const freeVoice = getDailyLimit(UserTier.FREE, "voice_call_minute")!;
    const builderVoice = getDailyLimit(UserTier.BUILDER, "voice_call_minute")!;
    expect(builderVoice).toBeGreaterThan(freeVoice);
  });

  it("unknown / uncapped actions are unlimited (null)", () => {
    expect(getDailyLimit(UserTier.FREE, "totally_unknown_action")).toBeNull();
  });

  it("respects USAGE_DAILY_LIMITS env override (merged with defaults)", () => {
    process.env.USAGE_DAILY_LIMITS = JSON.stringify({
      [UserTier.FREE]: { chat_message: 50 },
    });
    expect(getDailyLimit(UserTier.FREE, "chat_message")).toBe(50);
    // Non-overridden actions keep defaults.
    expect(getDailyLimit(UserTier.FREE, "voice_call_minute")).toBe(
      DEFAULT_TIER_DAILY_LIMITS[UserTier.FREE].voice_call_minute
    );
  });

  it("ignores malformed USAGE_DAILY_LIMITS env", () => {
    process.env.USAGE_DAILY_LIMITS = "{not json";
    expect(getTierDailyLimits(UserTier.FREE)).toEqual(
      DEFAULT_TIER_DAILY_LIMITS[UserTier.FREE]
    );
  });
});

describe("approach ratio", () => {
  it("defaults to DEFAULT_APPROACH_RATIO", () => {
    expect(getApproachRatio()).toBe(DEFAULT_APPROACH_RATIO);
  });

  it("respects a valid USAGE_APPROACH_RATIO override", () => {
    process.env.USAGE_APPROACH_RATIO = "0.5";
    expect(getApproachRatio()).toBe(0.5);
  });

  it("ignores out-of-range or non-numeric overrides", () => {
    process.env.USAGE_APPROACH_RATIO = "1.5";
    expect(getApproachRatio()).toBe(DEFAULT_APPROACH_RATIO);
    process.env.USAGE_APPROACH_RATIO = "nope";
    expect(getApproachRatio()).toBe(DEFAULT_APPROACH_RATIO);
  });
});

describe("computeActionThrottle", () => {
  it("reports remaining = limit - used, clamped at 0", () => {
    const s = computeActionThrottle(UserTier.FREE, "chat_message", 5);
    const limit = getDailyLimit(UserTier.FREE, "chat_message")!;
    expect(s.limit).toBe(limit);
    expect(s.used).toBe(5);
    expect(s.remaining).toBe(limit - 5);
    expect(s.blocked).toBe(false);
  });

  it("blocks once used reaches the limit", () => {
    const limit = getDailyLimit(UserTier.FREE, "voice_call_minute")!;
    const s = computeActionThrottle(UserTier.FREE, "voice_call_minute", limit);
    expect(s.remaining).toBe(0);
    expect(s.blocked).toBe(true);
    expect(s.percentUsed).toBe(1);
  });

  it("flags approaching at >= the approach ratio", () => {
    const limit = getDailyLimit(UserTier.FREE, "chat_message")!; // 15
    const approachAt = Math.ceil(limit * DEFAULT_APPROACH_RATIO);
    const below = computeActionThrottle(UserTier.FREE, "chat_message", approachAt - 1);
    const at = computeActionThrottle(UserTier.FREE, "chat_message", approachAt);
    expect(at.approaching).toBe(true);
    // The point just below should not yet be approaching (for limit=15, 0.8 -> 12).
    expect(below.percentUsed).toBeLessThan(DEFAULT_APPROACH_RATIO);
  });

  it("treats unlimited actions as never blocked / approaching", () => {
    const s = computeActionThrottle(UserTier.STUDIO, "chat_message", 9999);
    expect(s.unlimited).toBe(true);
    expect(s.blocked).toBe(false);
    expect(s.approaching).toBe(false);
    expect(s.remaining).toBe(Number.POSITIVE_INFINITY);
    expect(s.percentUsed).toBe(0);
  });

  it("negative used is treated as 0", () => {
    const s = computeActionThrottle(UserTier.FREE, "chat_message", -5);
    expect(s.used).toBe(0);
  });
});

describe("canTakeAction", () => {
  it("allows when remaining >= 1, blocks at the cap", () => {
    const limit = getDailyLimit(UserTier.FREE, "report_generation")!; // 1
    expect(canTakeAction(UserTier.FREE, "report_generation", 0)).toBe(true);
    expect(canTakeAction(UserTier.FREE, "report_generation", limit)).toBe(false);
  });

  it("always allows unlimited actions", () => {
    expect(canTakeAction(UserTier.STUDIO, "agent_run", 1_000_000)).toBe(true);
  });
});

describe("getUpsellReason", () => {
  it("returns limit_reached when any capped action is blocked (wins over approaching)", () => {
    const blocked = computeActionThrottle(UserTier.FREE, "report_generation", 1);
    const approaching = computeActionThrottle(UserTier.FREE, "chat_message", 13);
    expect(getUpsellReason([blocked, approaching])).toBe("limit_reached");
  });

  it("returns approaching_limit when near but not at a cap", () => {
    const approaching = computeActionThrottle(UserTier.FREE, "chat_message", 13);
    expect(getUpsellReason([approaching])).toBe("approaching_limit");
  });

  it("returns null when comfortably under all caps", () => {
    const ok = computeActionThrottle(UserTier.FREE, "chat_message", 1);
    expect(getUpsellReason([ok])).toBeNull();
  });

  it("never upsells purely on unlimited actions", () => {
    const unlimited = computeActionThrottle(UserTier.STUDIO, "chat_message", 99999);
    expect(getUpsellReason([unlimited])).toBeNull();
  });
});

describe("daily reset clock", () => {
  const noon = new Date("2026-03-31T12:00:00.000Z");

  it("startOfUtcDay is midnight UTC of the same day", () => {
    expect(startOfUtcDay(noon)).toBe("2026-03-31T00:00:00.000Z");
  });

  it("nextUtcDayReset is the following midnight UTC", () => {
    expect(nextUtcDayReset(noon)).toBe("2026-04-01T00:00:00.000Z");
  });

  it("secondsUntilReset counts down to next UTC midnight", () => {
    // From noon UTC there are exactly 12 hours left.
    expect(secondsUntilReset(noon)).toBe(12 * 60 * 60);
  });
});
