/**
 * Daily free-plan throttling + upsell triggers (AI-6486).
 *
 * Built on top of the credit/usage foundation (AI-6487). Where credits.ts
 * governs the *monthly* budget, this module governs *daily* per-action-type
 * limits — the throttle that keeps the free tier valuable but bounded and
 * creates the natural upsell moments Fred outlined in the Sahara Founders
 * meeting (2026-03-31).
 *
 * Two different cost dimensions, intentionally:
 *   - credits.ts   -> "how expensive is this action" (voice burns more than chat)
 *   - throttle.ts  -> "how many of this action you may take per day on your tier"
 *
 * Both voice and chat are tracked, and voice — which "burns the tokens up
 * faster" (William Hood) — gets a much smaller daily allowance than chat.
 *
 * Pure + dependency-free (no DB / Next imports) so it can be unit-tested in
 * isolation and reused on server and client. Limits are data, not hardcoded at
 * call sites, and are env-overridable (USAGE_DAILY_LIMITS / USAGE_APPROACH_RATIO)
 * so pricing experiments don't require a deploy.
 */

import { UserTier } from "@/lib/constants";
import type { UsageActionType } from "@/lib/usage/credits";

/**
 * Per-action daily caps for a tier. A `null` value (or a missing key) means
 * "no daily cap" — the action is only bounded by the monthly credit allowance.
 * `0` means the action is not available on the tier at all on a daily basis.
 */
export type DailyLimits = Partial<Record<UsageActionType, number | null>>;

/**
 * Default daily limits per tier.
 *
 * FREE is deliberately tight — enough to feel the product's value, limited
 * enough to drive conversions. Voice is the scarcest action (10x the credit
 * cost of chat, so it "burns tokens up faster"). Paid tiers lift the daily
 * caps and lean on the monthly credit budget instead; STUDIO has no daily caps
 * at all.
 *
 * Override the whole map with USAGE_DAILY_LIMITS (JSON keyed by tier number),
 * e.g. {"0":{"chat_message":20,"voice_call_minute":5}}.
 */
export const DEFAULT_TIER_DAILY_LIMITS: Record<UserTier, DailyLimits> = {
  [UserTier.FREE]: {
    chat_message: 15,
    voice_call_minute: 3,
    report_generation: 1,
    pitch_deck_review: 1,
    investor_score: 2,
    strategy_doc: 1,
    agent_run: 2,
    document_upload: 5,
    document_search: 10,
    investor_match: 2,
  },
  [UserTier.BUILDER]: {
    voice_call_minute: 30,
    report_generation: 10,
    pitch_deck_review: 5,
  },
  [UserTier.PRO]: {
    voice_call_minute: 120,
  },
  [UserTier.STUDIO]: {},
};

/**
 * Fraction of the daily limit at which we start nudging the user toward an
 * upgrade ("approaching limit"). Overridable via USAGE_APPROACH_RATIO.
 */
export const DEFAULT_APPROACH_RATIO = 0.8;

function parseEnvJson<T>(raw: string | undefined): Partial<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Partial<T>) : null;
  } catch {
    return null;
  }
}

/** Approach ratio (0..1), merged with USAGE_APPROACH_RATIO env. */
export function getApproachRatio(): number {
  const raw = process.env.USAGE_APPROACH_RATIO;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0 && n <= 1) return n;
  }
  return DEFAULT_APPROACH_RATIO;
}

/** Daily limits for a tier, merged with any USAGE_DAILY_LIMITS env override. */
export function getTierDailyLimits(tier: UserTier): DailyLimits {
  const override = parseEnvJson<Record<string, DailyLimits>>(
    process.env.USAGE_DAILY_LIMITS
  );
  const base = DEFAULT_TIER_DAILY_LIMITS[tier] ?? {};
  if (!override) return base;
  const tierOverride = override[String(tier)];
  return tierOverride ? { ...base, ...tierOverride } : base;
}

/**
 * The daily cap for a single (tier, action). Returns `null` when there is no
 * daily cap (action only bounded by the monthly credit allowance).
 */
export function getDailyLimit(
  tier: UserTier,
  action: string
): number | null {
  const limits = getTierDailyLimits(tier) as Record<string, number | null>;
  const value = limits[action];
  if (value === null || value === undefined) return null; // unlimited
  return typeof value === "number" && value >= 0 ? value : null;
}

/** True when the action has no daily cap on this tier. */
export function isDailyUnlimited(tier: UserTier, action: string): boolean {
  return getDailyLimit(tier, action) === null;
}

export interface ActionThrottleStatus {
  action: string;
  /** Daily cap. null = unlimited (bounded only by monthly credits). */
  limit: number | null;
  /** How many of this action the user has taken so far today. */
  used: number;
  /** Remaining today (clamped at 0). Number.POSITIVE_INFINITY when unlimited. */
  remaining: number;
  /** Whether the action has no daily cap on this tier. */
  unlimited: boolean;
  /** Whether the next action of this type is blocked (used >= limit). */
  blocked: boolean;
  /** Whether the user is at/over the approach ratio (e.g. >= 80%). */
  approaching: boolean;
  /** 0..1 share of the daily limit consumed (0 when unlimited). */
  percentUsed: number;
}

/**
 * Compute the throttle status for a single (tier, action) given how many of
 * that action have already been taken today.
 */
export function computeActionThrottle(
  tier: UserTier,
  action: string,
  usedToday: number,
  approachRatio: number = getApproachRatio()
): ActionThrottleStatus {
  const limit = getDailyLimit(tier, action);
  const used = Math.max(0, Math.floor(usedToday));

  if (limit === null) {
    return {
      action,
      limit: null,
      used,
      remaining: Number.POSITIVE_INFINITY,
      unlimited: true,
      blocked: false,
      approaching: false,
      percentUsed: 0,
    };
  }

  const remaining = Math.max(0, limit - used);
  const percentUsed = limit > 0 ? Math.min(1, used / limit) : 1;
  return {
    action,
    limit,
    used,
    remaining,
    unlimited: false,
    blocked: used >= limit,
    approaching: percentUsed >= approachRatio,
    percentUsed,
  };
}

/**
 * Whether an action of `action` is allowed RIGHT NOW (i.e. taking one more
 * would not exceed the daily cap). Unlimited actions are always allowed.
 */
export function canTakeAction(
  tier: UserTier,
  action: string,
  usedToday: number
): boolean {
  const status = computeActionThrottle(tier, action, usedToday);
  return status.unlimited || status.remaining >= 1;
}

export type UpsellReason = "limit_reached" | "approaching_limit" | null;

/**
 * Decide whether — and why — to surface an upsell, given the throttle statuses
 * for the actions a user is actively touching. "limit_reached" (a hard block)
 * always wins over a soft "approaching_limit" nudge.
 */
export function getUpsellReason(
  statuses: ActionThrottleStatus[]
): UpsellReason {
  if (statuses.some((s) => !s.unlimited && s.blocked)) return "limit_reached";
  if (statuses.some((s) => !s.unlimited && s.approaching)) {
    return "approaching_limit";
  }
  return null;
}

// ============================================================================
// Daily-reset helpers (deterministic given `now` — kept here so the reset clock
// is unit-testable alongside the limits it resets).
// ============================================================================

/** Start of the current UTC day, ISO string. The daily throttle window start. */
export function startOfUtcDay(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

/** Start of the NEXT UTC day, ISO string — when daily usage resets. */
export function nextUtcDayReset(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  ).toISOString();
}

/** Seconds until the daily usage resets (next UTC midnight). */
export function secondsUntilReset(now: Date = new Date()): number {
  return Math.max(
    0,
    Math.floor(
      (new Date(nextUtcDayReset(now)).getTime() - now.getTime()) / 1000
    )
  );
}
