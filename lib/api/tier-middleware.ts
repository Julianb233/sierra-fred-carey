/**
 * Tier Middleware for API Routes
 *
 * Enforces tier-based access control on API endpoints.
 * Usage: wrap your route handler with requireTier(UserTier.PRO)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { UserTier, TIER_NAMES, canAccessFeature, getTierFromString } from "@/lib/constants";
import { getUserSubscription } from "@/lib/db/subscriptions";
import { getPlanByPriceId } from "@/lib/stripe/config";

// ============================================================================
// Types
// ============================================================================

export interface TierCheckResult {
  allowed: boolean;
  userTier: UserTier;
  requiredTier: UserTier;
  userId?: string;
}

export interface TierError {
  success: false;
  error: string;
  code: "TIER_REQUIRED" | "AUTH_REQUIRED" | "TIER_ERROR";
  requiredTier: UserTier;
  currentTier: UserTier;
  upgradeUrl: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user's current tier from Stripe subscription
 * Queries user_subscriptions table via lib/db/subscriptions.ts
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription || !["active", "trialing"].includes(subscription.status)) {
      return UserTier.FREE;
    }

    // Primary lookup: match price ID to plan
    const plan = getPlanByPriceId(subscription.stripePriceId);
    if (plan) return getTierFromString(plan.id);

    // Fallback: if price ID not found in PLANS (e.g. archived price),
    // infer tier from the price ID env vars directly
    const fundraisingPriceId = process.env.NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID;
    const studioPriceId = process.env.NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID;

    if (subscription.stripePriceId === studioPriceId) return UserTier.STUDIO;
    if (subscription.stripePriceId === fundraisingPriceId) return UserTier.PRO;

    // Last resort: user has an active subscription but we can't resolve the tier.
    // Log a warning and grant PRO as a safe minimum (they are paying).
    console.warn(
      `[TierMiddleware] Active subscription for user ${userId} has unrecognized price ID: ${subscription.stripePriceId}. Defaulting to PRO.`
    );
    return UserTier.PRO;
  } catch (error) {
    console.error("[TierMiddleware] Error fetching user tier:", error);
    return UserTier.FREE;
  }
}

/**
 * Check if user has required tier
 */
export async function checkUserTier(
  userId: string,
  requiredTier: UserTier
): Promise<TierCheckResult> {
  const userTier = await getUserTier(userId);

  return {
    allowed: canAccessFeature(userTier, requiredTier),
    userTier,
    requiredTier,
    userId,
  };
}

/**
 * Create tier error response
 */
export function createTierErrorResponse(
  result: TierCheckResult
): NextResponse<TierError> {
  return NextResponse.json(
    {
      success: false,
      error: `This feature requires ${TIER_NAMES[result.requiredTier]} tier. You are on ${TIER_NAMES[result.userTier]}.`,
      code: "TIER_REQUIRED",
      requiredTier: result.requiredTier,
      currentTier: result.userTier,
      upgradeUrl: "/pricing",
    },
    { status: 403 }
  );
}

// ============================================================================
// Middleware Wrapper
// ============================================================================

type ApiHandler = (
  req: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wrap a route handler to require a minimum tier
 *
 * @example
 * export const POST = requireTier(UserTier.PRO)(async (req) => {
 *   // This only runs if user is Pro or higher
 *   return NextResponse.json({ success: true });
 * });
 */
export function requireTier(minimumTier: UserTier) {
  return function (handler: ApiHandler): ApiHandler {
    return async (
      req: NextRequest,
      context?: { params?: Record<string, string> }
    ): Promise<NextResponse> => {
      try {
        // Get user from auth header or session
        const supabase = createServiceClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return NextResponse.json(
            {
              success: false,
              error: "Authentication required",
              code: "AUTH_REQUIRED",
              requiredTier: minimumTier,
              currentTier: UserTier.FREE,
              upgradeUrl: "/login",
            },
            { status: 401 }
          );
        }

        // Check tier
        const result = await checkUserTier(user.id, minimumTier);

        if (!result.allowed) {
          return createTierErrorResponse(result);
        }

        // Call the actual handler
        return handler(req, context);
      } catch (error) {
        console.error("[TierMiddleware] Error:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to verify tier access",
            code: "TIER_ERROR",
            requiredTier: minimumTier,
            currentTier: UserTier.FREE,
            upgradeUrl: "/pricing",
          },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Check tier inline (for handlers that need to do their own error handling)
 *
 * @example
 * export async function POST(req: NextRequest) {
 *   const tierCheck = await checkTierForRequest(req, UserTier.PRO);
 *   if (!tierCheck.allowed) {
 *     // Handle custom error response
 *     return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
 *   }
 *   // Proceed with handler
 * }
 */
export async function checkTierForRequest(
  _req: NextRequest,
  requiredTier: UserTier
): Promise<TierCheckResult & { user?: { id: string } }> {
  const supabase = createServiceClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      allowed: false,
      userTier: UserTier.FREE,
      requiredTier,
    };
  }

  const result = await checkUserTier(user.id, requiredTier);

  return {
    ...result,
    user: { id: user.id },
  };
}

/**
 * Get tier for request (useful for conditional responses based on tier)
 */
export async function getTierForRequest(_req: NextRequest): Promise<{
  tier: UserTier;
  userId?: string;
  isAuthenticated: boolean;
}> {
  const supabase = createServiceClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      tier: UserTier.FREE,
      isAuthenticated: false,
    };
  }

  const tier = await getUserTier(user.id);

  return {
    tier,
    userId: user.id,
    isAuthenticated: true,
  };
}
