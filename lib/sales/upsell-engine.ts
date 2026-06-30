/**
 * Upsell Engine (AI-3522)
 *
 * Pure, dependency-light logic that turns a conversation summary + the user's
 * current tier into a concrete upsell recommendation (free -> paid progression).
 *
 * Kept free of DB / Next / AI-SDK imports so it can be unit-tested in isolation
 * and reused on both server and (read-only) client. It only depends on the
 * static tier constants.
 *
 * The conversation summarizer (lib/ai/conversation-summarizer.ts) produces the
 * `ConversationSummary`; this engine decides whether — and how hard — to nudge
 * the user toward the next tier, which feature interests justify it, and what
 * the call-to-action should say.
 */

import {
  UserTier,
  TIER_NAMES,
  TIER_FEATURES,
  FUNNEL_URL,
  getUpgradeTier,
} from "@/lib/constants";
import type { ConversationSummary } from "@/lib/ai/conversation-summarizer";

export type UpsellUrgency = "none" | "low" | "medium" | "high";

export interface UpsellRecommendation {
  /** Whether we should actually surface an upsell to this user right now. */
  recommend: boolean;
  /** The current tier (echoed for convenience). */
  currentTier: UserTier;
  currentTierName: string;
  /**
   * The tier we recommend moving to. This is the *minimum* tier that unlocks
   * the strongest detected interest, which may be more than one step up
   * (e.g. a Free user asking about pitch-deck teardowns -> Pro).
   */
  targetTier: UserTier | null;
  targetTierName: string | null;
  /** How strongly to push, derived from interest, sentiment and priority. */
  urgency: UpsellUrgency;
  /** Confidence 0..1 that this is a genuine opportunity. */
  confidence: number;
  /** Human-readable reasons (for internal prioritization + CTA copy). */
  reasons: string[];
  /** Feature interests detected that the target tier would unlock. */
  matchedInterests: string[];
  /** A short list of target-tier features to pitch. */
  pitchFeatures: string[];
  /** Suggested CTA line shown to the user. */
  suggestedCta: string | null;
  /** Where the CTA should send the user. */
  ctaUrl: string | null;
}

/**
 * Maps an intent keyword (lowercased) to the MINIMUM tier that unlocks it.
 * Drawn from TIER_FEATURES / DASHBOARD_NAV gating. Ordered loosely from
 * cheapest to most premium; the engine always picks the highest tier among
 * all matches so we recommend a plan that actually satisfies the strongest ask.
 */
const FEATURE_TIER_MAP: Array<{ tier: UserTier; keywords: string[] }> = [
  {
    tier: UserTier.BUILDER,
    keywords: [
      "memory",
      "remember",
      "save",
      "saved profile",
      "history",
      "strategy",
      "lean plan",
      "roadmap",
      "priority response",
      "faster",
    ],
  },
  {
    tier: UserTier.PRO,
    keywords: [
      "investor",
      "investor lens",
      "investor readiness",
      "fundrais",
      "pitch deck",
      "pitch",
      "deck",
      "teardown",
      "executive summary",
      "30/60/90",
      "series a",
      "pre-seed",
      "seed round",
      "valuation",
    ],
  },
  {
    tier: UserTier.STUDIO,
    keywords: [
      "weekly check",
      "accountability",
      "sms",
      "text me",
      "boardy",
      "investor matching",
      "outreach",
      "operator",
      "ops agent",
      "founder ops",
      "fundraise ops",
      "growth ops",
      "inbox ops",
      "ai team",
      "automate",
    ],
  },
];

/** Highest tier whose keyword list matches any of the given interest strings. */
function highestInterestTier(interests: string[]): {
  tier: UserTier | null;
  matched: string[];
} {
  const haystack = interests.map((s) => s.toLowerCase());
  let best: UserTier | null = null;
  const matched: string[] = [];

  for (const { tier, keywords } of FEATURE_TIER_MAP) {
    for (const kw of keywords) {
      const hit = haystack.find((h) => h.includes(kw));
      if (hit) {
        matched.push(hit);
        if (best === null || tier > best) best = tier;
      }
    }
  }
  // De-dupe matched interests while preserving order.
  return { tier: best, matched: Array.from(new Set(matched)) };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Decide whether to upsell this user and how.
 *
 * @param params.currentTier  The user's resolved tier.
 * @param params.summary      The AI conversation summary.
 * @param params.usageRatio   Optional 0..1 fraction of tier credit allowance
 *                             already consumed this period. High usage on a
 *                             paid-gated feature is itself a strong upsell
 *                             signal (they're hitting the ceiling).
 */
export function evaluateUpsell(params: {
  currentTier: UserTier;
  summary: ConversationSummary;
  usageRatio?: number;
}): UpsellRecommendation {
  const { currentTier, summary } = params;
  const usageRatio = clamp01(params.usageRatio ?? 0);

  const currentTierName = TIER_NAMES[currentTier];
  const noOp: UpsellRecommendation = {
    recommend: false,
    currentTier,
    currentTierName,
    targetTier: null,
    targetTierName: null,
    urgency: "none",
    confidence: 0,
    reasons: [],
    matchedInterests: [],
    pitchFeatures: [],
    suggestedCta: null,
    ctaUrl: null,
  };

  // Already on the top tier — nothing to upsell.
  if (getUpgradeTier(currentTier) === null) {
    return { ...noOp, reasons: ["User is already on the top tier (Studio)."] };
  }

  const interests = summary.engagementSignals?.featureInterest ?? [];
  const { tier: interestTier, matched } = highestInterestTier([
    ...interests,
    ...(summary.upsell?.triggers ?? []),
    summary.currentFocus ?? "",
    ...(summary.keyThemes ?? []),
  ]);

  // The target is the strongest gated interest above the user's tier, falling
  // back to the immediate next tier when the AI flagged an opportunity but no
  // specific gated feature surfaced.
  let targetTier: UserTier | null = null;
  if (interestTier !== null && interestTier > currentTier) {
    targetTier = interestTier;
  } else if (summary.upsell?.opportunity) {
    targetTier = getUpgradeTier(currentTier);
  }

  if (targetTier === null) {
    return {
      ...noOp,
      reasons: ["No paid-tier feature interest detected in recent conversations."],
    };
  }

  const reasons: string[] = [];
  if (matched.length > 0) {
    reasons.push(
      `Asked about ${TIER_NAMES[targetTier]}-tier capabilities: ${matched
        .slice(0, 3)
        .join(", ")}.`
    );
  }
  if (summary.upsell?.opportunity && summary.upsell?.rationale) {
    reasons.push(summary.upsell.rationale);
  }
  if (usageRatio >= 0.8) {
    reasons.push(
      `Consumed ${Math.round(usageRatio * 100)}% of ${currentTierName} credits — hitting the ceiling.`
    );
  }
  if (summary.sentiment === "at_risk" || summary.sentiment === "frustrated") {
    reasons.push(
      `Sentiment is ${summary.sentiment} — pair the upgrade nudge with support, not a hard sell.`
    );
  }

  // ---- Confidence ----------------------------------------------------------
  // Blend: AI's own upsell confidence, strength of feature-interest match,
  // and credit-ceiling pressure.
  const aiConfidence = clamp01(summary.upsell?.confidence ?? 0);
  const interestStrength = clamp01(matched.length / 3); // 3+ matches = full
  let confidence = clamp01(
    0.5 * aiConfidence + 0.35 * interestStrength + 0.15 * usageRatio
  );
  // A concrete gated ask is meaningful even if the AI was unsure.
  if (matched.length > 0) confidence = Math.max(confidence, 0.55);
  // When the AI flags an opportunity but no specific gated feature surfaced,
  // let its own confidence carry the recommendation rather than burying it.
  if (summary.upsell?.opportunity) {
    confidence = Math.max(confidence, clamp01(aiConfidence * 0.75));
  }

  // ---- Urgency -------------------------------------------------------------
  let urgency: UpsellUrgency = "low";
  const priority = summary.priorityScore ?? 5;
  if (confidence >= 0.75 && (usageRatio >= 0.8 || priority >= 8)) {
    urgency = "high";
  } else if (confidence >= 0.55 || usageRatio >= 0.6 || priority >= 7) {
    urgency = "medium";
  }
  // Never hard-push a frustrated/at-risk user; cap urgency at medium.
  if (
    (summary.sentiment === "frustrated" || summary.sentiment === "at_risk") &&
    urgency === "high"
  ) {
    urgency = "medium";
  }

  // Only recommend when confidence clears a floor.
  const recommend = confidence >= 0.5;

  const targetTierName = TIER_NAMES[targetTier];
  const pitchFeatures = (TIER_FEATURES[targetTier] as readonly string[])
    .filter((f) => !f.startsWith("Everything in"))
    .slice(0, 3);

  const suggestedCta = recommend
    ? `Unlock ${targetTierName}: ${pitchFeatures[0] ?? "more founder firepower"}. Upgrade to keep momentum.`
    : null;

  return {
    recommend,
    currentTier,
    currentTierName,
    targetTier,
    targetTierName,
    urgency,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
    matchedInterests: matched,
    pitchFeatures,
    suggestedCta,
    ctaUrl: recommend ? FUNNEL_URL : null,
  };
}
