/**
 * Tier-Based Model Routing
 * Phase 21: Memory & Compute Tiers
 *
 * Maps user subscription tiers (Free / Pro / Studio) to different
 * AI model configurations. Higher tiers get more capable models
 * and larger token budgets.
 *
 * Integrates with the existing provider system in lib/ai/providers.ts.
 */

import type { ProviderKey } from "@/lib/ai/providers";

// ============================================================================
// Types
// ============================================================================

export type ModelTier = "free" | "pro" | "studio";

export interface TierModelConfig {
  /** Provider key for chat interactions */
  chatProvider: ProviderKey;
  /** Provider key for agent tasks */
  agentProvider: ProviderKey;
  /** Provider key for structured output / analysis */
  structuredProvider: ProviderKey;
  /** Maximum output tokens for this tier */
  maxTokens: number;
  /** Temperature for generation */
  temperature: number;
}

// ============================================================================
// Tier → Model Mapping
// ============================================================================

/**
 * Maps each subscription tier to AI model configurations.
 *
 * - Free: uses "fast" provider (GPT-4o-mini) — cost-efficient, quick
 * - Pro: uses "primary" provider (GPT-4o) — balanced capability
 * - Studio: uses "primary" provider (GPT-4o) — highest token budget
 *
 * Studio uses the same model as Pro but with higher token limits.
 * When a reasoning model becomes cost-effective, Studio can be
 * upgraded to "reasoning" (o1).
 */
export const TIER_MODEL_MAP: Record<ModelTier, TierModelConfig> = {
  free: {
    chatProvider: "fast",
    agentProvider: "fast",
    structuredProvider: "fast",
    maxTokens: 1024,
    temperature: 0.7,
  },
  pro: {
    chatProvider: "primary",
    agentProvider: "primary",
    structuredProvider: "primary",
    maxTokens: 2048,
    temperature: 0.7,
  },
  studio: {
    chatProvider: "primary",
    agentProvider: "primary",
    structuredProvider: "primary",
    maxTokens: 4096,
    temperature: 0.7,
  },
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the provider key for a given user tier and purpose.
 *
 * @param tier - User subscription tier string (e.g. "free", "pro", "studio")
 * @param purpose - What the model will be used for
 * @returns ProviderKey to pass to getModel()
 */
export function getModelForTier(
  tier: string,
  purpose: "chat" | "agent" | "structured" = "chat"
): ProviderKey {
  const normalizedTier = normalizeTier(tier);
  const config = TIER_MODEL_MAP[normalizedTier];

  switch (purpose) {
    case "chat":
      return config.chatProvider;
    case "agent":
      return config.agentProvider;
    case "structured":
      return config.structuredProvider;
    default:
      return config.chatProvider;
  }
}

/**
 * Get the full model configuration for a given user tier.
 *
 * @param tier - User subscription tier string
 * @returns TierModelConfig with all provider keys and limits
 */
export function getModelConfigForTier(tier: string): TierModelConfig {
  const normalizedTier = normalizeTier(tier);
  return TIER_MODEL_MAP[normalizedTier];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Normalize a tier string to a valid ModelTier.
 * Handles numeric UserTier enum values, mixed case, and unknown values.
 */
function normalizeTier(tier: string | number | undefined | null): ModelTier {
  if (tier == null) return "free";

  // Handle numeric enum values (UserTier.FREE=0, PRO=1, STUDIO=2)
  if (typeof tier === "number") {
    if (tier >= 2) return "studio";
    if (tier >= 1) return "pro";
    return "free";
  }

  const lower = String(tier).toLowerCase();

  if (lower === "studio" || lower === "venture_studio" || lower === "2") {
    return "studio";
  }
  if (lower === "pro" || lower === "fundraising" || lower === "1") {
    return "pro";
  }

  return "free";
}
