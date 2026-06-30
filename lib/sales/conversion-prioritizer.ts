/**
 * Conversion Prioritizer (AI-3526)
 *
 * Internal AI routine that ranks founders by how *ready they are to convert*
 * inside Sahara's gated progression model — i.e. how close a free "Discovery"
 * founder is to moving onto a paid tier (Builder / Pro / Studio).
 *
 * The conversation summarizer (lib/ai/conversation-summarizer.ts) tells us WHAT
 * a founder is doing; the upsell engine (lib/sales/upsell-engine.ts) tells us
 * WHETHER a paid feature is in play. This module fuses both into a single,
 * scannable 0-100 "conversion readiness" score plus a funnel STAGE so the
 * Sahara team can work the right founders in the right order — value-delivered
 * founders who are knocking on a paywall first, cold explorers last.
 *
 * Kept pure and dependency-light (only static tier constants + the two upstream
 * types) so it unit-tests in isolation and runs on server or client. It never
 * throws into a caller's hot path.
 *
 * Why a distinct routine from the upsell engine:
 *   - The upsell engine answers a per-conversation question ("nudge or not?").
 *   - This answers a portfolio question ("of all my free founders, who do I
 *     work first to convert?") and frames it explicitly as the Discovery -> paid
 *     gated progression, including value-without-ask founders the raw upsell
 *     recommendation would otherwise rank as "no opportunity".
 */

import {
  UserTier,
  TIER_NAMES,
  FUNNEL_URL,
  getUpgradeTier,
} from "@/lib/constants";
import type { ConversationSummary } from "@/lib/ai/conversation-summarizer";
import type { UpsellRecommendation } from "./upsell-engine";

/**
 * Where a founder sits in the gated free -> paid progression. Ordered from
 * coldest to hottest for free founders; `converted` is the terminal state for
 * anyone already on a paid tier.
 */
export type ProgressionStage =
  | "discovery" // Free + exploring; little value landed yet, no paid-feature pull.
  | "activated" // Free + the product is clearly delivering value (value moments).
  | "evaluating" // Free + actively interested in a paid-gated capability.
  | "ready" // Free + value delivered AND paid-feature pull — hot to convert now.
  | "converted"; // Already on a paid tier — expansion candidate, not a new conversion.

export interface ConversionReadiness {
  /** 0-100 weighted readiness to move to the next paid tier. */
  score: number;
  /** Funnel position in the gated free -> paid progression. */
  stage: ProgressionStage;
  /** The founder's current tier (echoed for convenience). */
  currentTier: UserTier;
  currentTierName: string;
  /** The next tier up, or null when already on the top tier. */
  targetTier: UserTier | null;
  targetTierName: string | null;
  /** True when this is a free-Discovery founder (tier === FREE). */
  isDiscovery: boolean;
  /** Whether this founder is a genuine conversion priority right now. */
  prioritize: boolean;
  /** Human-readable signal breakdown for the team queue + audit. */
  signals: string[];
  /** What the team / system should do next. */
  recommendedAction: string;
  /** Where to send the founder when prioritized, else null. */
  ctaUrl: string | null;
}

/** Readiness at/above which a free founder is worth a direct conversion push. */
export const CONVERSION_PRIORITY_THRESHOLD = 60;

/** Cap on how many of a signal type meaningfully move the score. */
const VALUE_CAP = 3;
const INTEREST_CAP = 3;

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function round(n: number): number {
  return Math.round(n);
}

/**
 * Score a single founder's readiness to convert from free Discovery onto a paid
 * tier (or, if already paid, to expand to the next tier).
 *
 * The score is a weighted blend (max 100) of the strongest conversion drivers:
 *   - value delivered      (value moments)        up to 25
 *   - paid-feature pull     (gated interest)        up to 25
 *   - upsell confidence     (engine's read)         up to 20
 *   - upsell urgency        (engine's read)         up to 10
 *   - sentiment             (receptiveness)         up to 10
 *   - engagement intensity  (priority score)        up to 10
 * with a small bonus when the founder is bumping a usage ceiling.
 *
 * @param params.currentTier The founder's resolved tier.
 * @param params.summary     The AI conversation summary.
 * @param params.upsell      Optional upsell recommendation (from evaluateUpsell).
 *                           When omitted, falls back to the AI's first-pass read
 *                           on `summary.upsell` so the routine still works with a
 *                           summary alone.
 * @param params.usageRatio  Optional 0..1 fraction of tier credits consumed.
 */
export function scoreConversionReadiness(params: {
  currentTier: UserTier;
  summary: ConversationSummary;
  upsell?: UpsellRecommendation;
  usageRatio?: number;
}): ConversionReadiness {
  const { currentTier, summary } = params;
  const usageRatio = clamp(params.usageRatio ?? 0, 0, 1);
  const currentTierName = TIER_NAMES[currentTier];
  // Convert toward the tier that actually unlocks what the founder wants (the
  // upsell engine's read), falling back to the next gated step. Nudging a
  // founder to Builder when they're asking for Pro-gated pitch tooling wouldn't
  // satisfy the ask, so we surface the tier that does.
  const targetTier = params.upsell?.targetTier ?? getUpgradeTier(currentTier);
  const targetTierName = targetTier === null ? null : TIER_NAMES[targetTier];
  const isDiscovery = currentTier === UserTier.FREE;
  const onTopTier = targetTier === null;

  const signals: string[] = [];
  const engagement = summary.engagementSignals ?? {
    featureInterest: [],
    painPoints: [],
    valueMoments: [],
  };

  // ---- Value delivered -----------------------------------------------------
  const valueMoments = engagement.valueMoments ?? [];
  const valuePoints = (Math.min(valueMoments.length, VALUE_CAP) / VALUE_CAP) * 25;
  if (valueMoments.length > 0) {
    signals.push(
      `Product delivered value ${valueMoments.length}x (${valueMoments
        .slice(0, 2)
        .join("; ")}).`
    );
  }

  // ---- Paid-feature pull ---------------------------------------------------
  // Prefer the upsell engine's matched gated interests; fall back to raw
  // feature-interest count + the AI's own upsell triggers.
  const matched =
    params.upsell?.matchedInterests ??
    [
      ...(engagement.featureInterest ?? []),
      ...(summary.upsell?.triggers ?? []),
    ];
  const interestPoints =
    (Math.min(matched.length, INTEREST_CAP) / INTEREST_CAP) * 25;
  if (matched.length > 0) {
    signals.push(
      `Pulled toward paid features: ${matched.slice(0, 3).join(", ")}.`
    );
  }

  // ---- Upsell engine read --------------------------------------------------
  const upsellConfidence = clamp(
    params.upsell?.confidence ?? summary.upsell?.confidence ?? 0,
    0,
    1
  );
  const confidencePoints = upsellConfidence * 20;

  const urgency = params.upsell?.urgency ?? "none";
  const urgencyPoints =
    urgency === "high" ? 10 : urgency === "medium" ? 6 : urgency === "low" ? 3 : 0;
  if (params.upsell?.recommend) {
    signals.push(
      `Upsell engine: ${urgency} urgency, ${Math.round(
        upsellConfidence * 100
      )}% confidence.`
    );
  }

  // ---- Sentiment (receptiveness) ------------------------------------------
  const sentiment = summary.sentiment ?? "neutral";
  const sentimentPoints =
    sentiment === "positive"
      ? 10
      : sentiment === "neutral"
      ? 5
      : sentiment === "frustrated"
      ? 2
      : 0; // at_risk
  if (sentiment === "frustrated" || sentiment === "at_risk") {
    signals.push(
      `Sentiment is ${sentiment} — lead with support, not a hard sell.`
    );
  }

  // ---- Engagement intensity ------------------------------------------------
  const priority = clamp(summary.priorityScore ?? 1, 1, 10);
  const priorityPoints = (priority / 10) * 10;

  // ---- Usage ceiling bonus -------------------------------------------------
  let usageBonus = 0;
  if (usageRatio >= 0.8) {
    usageBonus = 8;
    signals.push(
      `Consumed ${Math.round(usageRatio * 100)}% of ${currentTierName} credits — hitting the ceiling.`
    );
  } else if (usageRatio >= 0.6) {
    usageBonus = 4;
  }

  let score = clamp(
    valuePoints +
      interestPoints +
      confidencePoints +
      urgencyPoints +
      sentimentPoints +
      priorityPoints +
      usageBonus,
    0,
    100
  );

  // Already on the top tier: there is nothing to convert/expand to. Keep the
  // engagement signal but zero out the conversion framing.
  if (onTopTier) {
    score = round(score);
    return {
      score,
      stage: "converted",
      currentTier,
      currentTierName,
      targetTier: null,
      targetTierName: null,
      isDiscovery: false,
      prioritize: false,
      signals,
      recommendedAction:
        "Top tier (Studio) — no upsell. Focus on retention + expansion within the plan.",
      ctaUrl: null,
    };
  }

  score = round(score);

  // ---- Stage classification ------------------------------------------------
  // Paid founders that aren't on the top tier are "converted" already; this
  // routine still scores their expansion readiness but frames it as such.
  let stage: ProgressionStage;
  let recommendedAction: string;
  const hasPaidPull = matched.length > 0 || Boolean(params.upsell?.recommend);
  const hasValue = valueMoments.length > 0;

  if (!isDiscovery) {
    stage = "converted";
    recommendedAction =
      score >= CONVERSION_PRIORITY_THRESHOLD
        ? `Expansion candidate — strong pull toward ${targetTierName}. Surface the upgrade.`
        : `Paid founder — nurture; watch for ${targetTierName} feature pull.`;
  } else if (score >= CONVERSION_PRIORITY_THRESHOLD && hasValue && hasPaidPull) {
    stage = "ready";
    recommendedAction = `Reach out now — value landed AND ${targetTierName} pull. Send the upgrade CTA.`;
  } else if (hasPaidPull) {
    stage = "evaluating";
    recommendedAction = `Nurture — surface ${targetTierName} value in-product; not yet ready for a hard ask.`;
  } else if (hasValue) {
    stage = "activated";
    recommendedAction =
      "Keep delivering value; watch for the first paid-feature ask before nudging.";
  } else {
    stage = "discovery";
    recommendedAction =
      "Too early — focus on activation (land a value moment), not upsell.";
  }

  // A founder is a conversion priority only when there's a tier to move them to
  // AND they clear the readiness floor with a genuine paid-feature pull.
  const prioritize =
    isDiscovery &&
    !onTopTier &&
    score >= CONVERSION_PRIORITY_THRESHOLD &&
    hasPaidPull;

  return {
    score,
    stage,
    currentTier,
    currentTierName,
    targetTier,
    targetTierName,
    isDiscovery,
    prioritize,
    signals,
    recommendedAction,
    ctaUrl: prioritize ? FUNNEL_URL : null,
  };
}

/** A founder's conversion readiness condensed for the team queue. */
export interface ConversionCandidate {
  userId: string;
  score: number;
  stage: ProgressionStage;
  recommendedAction: string;
}

/**
 * Rank a set of scored founders into a conversion queue — hottest free->paid
 * candidates first. Founders already on a paid tier (`converted`) are excluded
 * so the queue stays focused on net-new conversions. Pure + side-effect free.
 */
export function buildConversionQueue(
  founders: Array<{ userId: string; readiness: ConversionReadiness }>,
  limit = 50
): ConversionCandidate[] {
  const cap = clamp(limit, 1, 200);
  return founders
    .filter((f) => f.readiness.isDiscovery && f.readiness.stage !== "converted")
    .map((f) => ({
      userId: f.userId,
      score: f.readiness.score,
      stage: f.readiness.stage,
      recommendedAction: f.readiness.recommendedAction,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, cap);
}
