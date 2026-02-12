/**
 * Dashboard Navigation API
 *
 * GET /api/dashboard/nav
 * Returns the sidebar navigation items with conditional visibility
 * based on the founder's diagnostic tags, stage, and tier.
 *
 * Reduces the sidebar from 27 items to 7 core + conditionally visible items.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getConversationState, type DiagnosticTags } from "@/lib/db/conversation-state";

// ============================================================================
// Types
// ============================================================================

export interface NavItem {
  key: string;
  name: string;
  href: string;
  icon: string;
  /** Minimum tier required: 0=Free, 1=Pro, 2=Studio */
  minTier: number;
  /** Whether this item is always visible or conditionally shown */
  alwaysVisible: boolean;
  /** Badge text like "Pro", "Studio", "New" */
  badge?: string;
}

export interface NavResponse {
  items: NavItem[];
  founderStage: string | null;
  tier: number;
}

// ============================================================================
// Core 7 Navigation Items (always visible)
// ============================================================================

const CORE_NAV: NavItem[] = [
  {
    key: "home",
    name: "Home",
    href: "/dashboard",
    icon: "home",
    minTier: 0,
    alwaysVisible: true,
  },
  {
    key: "chat",
    name: "Chat with Fred",
    href: "/chat",
    icon: "message-circle",
    minTier: 0,
    alwaysVisible: true,
  },
  {
    key: "progress",
    name: "Your Progress",
    href: "/dashboard/journey",
    icon: "trending-up",
    minTier: 0,
    alwaysVisible: true,
  },
  {
    key: "next-steps",
    name: "Next Steps",
    href: "/dashboard/next-steps",
    icon: "list-checks",
    minTier: 0,
    alwaysVisible: true,
  },
  {
    key: "community",
    name: "Community",
    href: "/dashboard/communities",
    icon: "users",
    minTier: 0,
    alwaysVisible: true,
  },
  {
    key: "settings",
    name: "Settings",
    href: "/dashboard/settings",
    icon: "settings",
    minTier: 0,
    alwaysVisible: true,
  },
];

// ============================================================================
// Conditional Navigation Items (shown based on stage/tags/tier)
// ============================================================================

interface ConditionalNavItem extends NavItem {
  /** Function key describing the visibility condition */
  showWhen: string;
}

const CONDITIONAL_NAV: ConditionalNavItem[] = [
  {
    key: "readiness",
    name: "Readiness",
    href: "/dashboard/readiness",
    icon: "gauge",
    minTier: 1,
    alwaysVisible: false,
    badge: "Pro",
    showWhen: "stage_seed_plus_or_investor_signal",
  },
  {
    key: "documents",
    name: "Documents",
    href: "/dashboard/documents",
    icon: "file-text",
    minTier: 1,
    alwaysVisible: false,
    badge: "Pro",
    showWhen: "has_documents",
  },
  {
    key: "positioning",
    name: "Positioning",
    href: "/dashboard/positioning",
    icon: "target",
    minTier: 1,
    alwaysVisible: false,
    badge: "Pro",
    showWhen: "positioning_activated",
  },
  {
    key: "investor-lens",
    name: "Investor Lens",
    href: "/dashboard/investor-lens",
    icon: "eye",
    minTier: 1,
    alwaysVisible: false,
    badge: "Pro",
    showWhen: "investor_mode_activated",
  },
];

// ============================================================================
// Visibility Logic
// ============================================================================

function shouldShowConditionalItem(
  item: ConditionalNavItem,
  diagnosticTags: DiagnosticTags,
  hasDocuments: boolean,
  positioningActivated: boolean,
  investorModeActivated: boolean
): boolean {
  switch (item.showWhen) {
    case "stage_seed_plus_or_investor_signal":
      return (
        diagnosticTags.stage === "seed" ||
        diagnosticTags.stage === "growth" ||
        diagnosticTags.investorReadinessSignal === "med" ||
        diagnosticTags.investorReadinessSignal === "high"
      );

    case "has_documents":
      return hasDocuments;

    case "positioning_activated":
      return (
        positioningActivated ||
        diagnosticTags.positioningClarity === "med" ||
        diagnosticTags.positioningClarity === "high"
      );

    case "investor_mode_activated":
      return (
        investorModeActivated ||
        diagnosticTags.investorReadinessSignal === "med" ||
        diagnosticTags.investorReadinessSignal === "high"
      );

    default:
      return false;
  }
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    // Run queries in parallel
    const [profileResult, convState, docsCountResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("stage, tier")
        .eq("id", userId)
        .single(),

      getConversationState(userId),

      // Check if user has any documents
      supabase
        .from("strategy_documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    const tier: number = profileResult.data?.tier ?? 0;
    const founderStage = profileResult.data?.stage || null;
    const diagnosticTags: DiagnosticTags = convState?.diagnosticTags || {};
    const hasDocuments = (docsCountResult.count ?? 0) > 0;

    // Check mode activations from conversation state
    const positioningActivated =
      convState?.modeContext?.introductionState?.positioning?.introduced ?? false;
    const investorModeActivated =
      convState?.modeContext?.introductionState?.investor?.introduced ?? false;

    // Build the final nav items list
    const items: NavItem[] = [...CORE_NAV];

    for (const condItem of CONDITIONAL_NAV) {
      if (
        shouldShowConditionalItem(
          condItem,
          diagnosticTags,
          hasDocuments,
          positioningActivated,
          investorModeActivated
        )
      ) {
        // Strip the showWhen field from the response
        const { showWhen: _, ...navItem } = condItem;
        items.push(navItem);
      }
    }

    const response: NavResponse = {
      items,
      founderStage,
      tier,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Dashboard Nav] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch navigation data" },
      { status: 500 }
    );
  }
}
