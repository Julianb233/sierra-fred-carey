import { NextResponse } from "next/server";
import { UserTier, TIER_NAMES, canAccessFeature } from "@/lib/constants";

export interface TierGateResult {
  allowed: boolean;
  response?: NextResponse;
}

/**
 * Check tier access and return 403 response if insufficient
 * @param userTier - The user's current tier
 * @param requiredTier - The minimum tier required for the feature
 * @returns TierGateResult with allowed status and optional error response
 */
export function checkTierAccess(
  userTier: UserTier,
  requiredTier: UserTier
): TierGateResult {
  if (canAccessFeature(userTier, requiredTier)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    response: NextResponse.json(
      {
        success: false,
        error: "Insufficient tier access",
        message: `This feature requires ${TIER_NAMES[requiredTier]} tier. Please upgrade your account.`,
        requiredTier: TIER_NAMES[requiredTier],
        currentTier: TIER_NAMES[userTier],
        upgradeUrl: "/pricing",
      },
      { status: 403 }
    ),
  };
}

/**
 * Helper to check tier access and return boolean
 */
export function hasTierAccess(
  userTier: UserTier,
  requiredTier: UserTier
): boolean {
  return canAccessFeature(userTier, requiredTier);
}

/**
 * Get required tier for a feature from TIER_FEATURES
 * Useful for displaying upgrade prompts in the UI
 */
export function getRequiredTierMessage(requiredTier: UserTier): string {
  return `Upgrade to ${TIER_NAMES[requiredTier]} to unlock this feature`;
}
