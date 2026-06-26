/**
 * Credit / token usage model (AI-6487).
 *
 * Pure, dependency-free logic for:
 *   - how many credits each user action costs (ACTION_COSTS)
 *   - how many credits each tier gets per billing period (TIER_CREDIT_ALLOWANCE)
 *
 * This underpins the throttling mechanism and the tiered pricing model. Costs
 * and allowances are intentionally data (not hardcoded at call sites) so they
 * can be tuned without touching business logic. Both are overridable via env
 * (USAGE_ACTION_COSTS / USAGE_TIER_ALLOWANCE as JSON) so pricing experiments
 * don't require a deploy.
 *
 * Kept free of DB/Next imports so it can be unit-tested in isolation and reused
 * on both server and (read-only) client.
 */

import { UserTier } from "@/lib/constants";

/**
 * Every credit-consuming action in the product. Add new actions here as
 * features ship — the DB column `action_type` is free-form text, but routing
 * everything through this union keeps cost accounting honest.
 */
export type UsageActionType =
  | "chat_message"
  | "voice_call_minute"
  | "report_generation"
  | "pitch_deck_review"
  | "investor_score"
  | "strategy_doc"
  | "agent_run"
  | "document_upload"
  | "document_search"
  | "investor_match";

/**
 * Default credit cost per action. "Each user action consumes a different
 * number of credits" (acceptance criteria). Heavier / more expensive
 * operations (voice minutes, deck teardowns, agent runs) cost more.
 */
export const DEFAULT_ACTION_COSTS: Record<UsageActionType, number> = {
  chat_message: 1,
  voice_call_minute: 10,
  report_generation: 25,
  pitch_deck_review: 50,
  investor_score: 20,
  strategy_doc: 15,
  agent_run: 30,
  document_upload: 5,
  document_search: 2,
  investor_match: 20,
};

/**
 * Default per-period (monthly) credit allowance by tier. FREE is intentionally
 * small to drive the paywall; STUDIO is effectively "high-but-bounded" so we
 * still have abuse protection. Tune via USAGE_TIER_ALLOWANCE env.
 */
export const DEFAULT_TIER_CREDIT_ALLOWANCE: Record<UserTier, number> = {
  [UserTier.FREE]: 100,
  [UserTier.BUILDER]: 1_000,
  [UserTier.PRO]: 5_000,
  [UserTier.STUDIO]: 25_000,
};

function parseEnvJson<T>(raw: string | undefined): Partial<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Partial<T>) : null;
  } catch {
    return null;
  }
}

/** Action costs merged with any USAGE_ACTION_COSTS env override. */
export function getActionCosts(): Record<UsageActionType, number> {
  const override = parseEnvJson<Record<UsageActionType, number>>(
    process.env.USAGE_ACTION_COSTS
  );
  return override
    ? { ...DEFAULT_ACTION_COSTS, ...override }
    : DEFAULT_ACTION_COSTS;
}

/**
 * Credit cost for a single action. Unknown action types fall back to 1 credit
 * (cheapest, fail-open) rather than throwing — we never want usage accounting
 * to break a user-facing request.
 */
export function getActionCost(action: string): number {
  const costs = getActionCosts() as Record<string, number>;
  const cost = costs[action];
  return typeof cost === "number" && cost >= 0 ? cost : 1;
}

/** Per-period allowance for a tier, merged with USAGE_TIER_ALLOWANCE env. */
export function getTierAllowance(tier: UserTier): number {
  const override = parseEnvJson<Record<UserTier, number>>(
    process.env.USAGE_TIER_ALLOWANCE
  );
  const merged = override
    ? { ...DEFAULT_TIER_CREDIT_ALLOWANCE, ...override }
    : DEFAULT_TIER_CREDIT_ALLOWANCE;
  const value = merged[tier];
  return typeof value === "number" && value >= 0
    ? value
    : DEFAULT_TIER_CREDIT_ALLOWANCE[UserTier.FREE];
}

/** Remaining credits, clamped at 0. */
export function computeRemainingCredits(
  tier: UserTier,
  consumed: number
): number {
  return Math.max(0, getTierAllowance(tier) - Math.max(0, consumed));
}

/** Whether an action of `action` would fit within the user's remaining budget. */
export function canAfford(
  tier: UserTier,
  consumed: number,
  action: string
): boolean {
  return computeRemainingCredits(tier, consumed) >= getActionCost(action);
}
