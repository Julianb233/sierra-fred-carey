"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DashboardIcon,
  GearIcon,
  TargetIcon,
  EyeOpenIcon,
} from "@radix-ui/react-icons";
import {
  Users,
  MessageSquare,
  ListChecks,
  FileText,
  BarChart3,
  Map,
  Heart,
  Rocket,
  Compass,
  Target,
  ShieldCheck,
  TrendingUp,
  Presentation,
  ScanEye,
  Bot,
  Network,
  HelpCircle,
  ShoppingBag,
} from "lucide-react";
import { openFredChat } from "@/components/chat/floating-chat-widget";
import { cn } from "@/lib/utils";
import { UpgradeBanner } from "@/components/dashboard/UpgradeTier";
import { UserTier } from "@/lib/constants";

// ============================================================================
// Types
// ============================================================================

export type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  /** If set, item is only shown when this condition key is true */
  condition?: string;
};

export type SidebarUser = {
  name: string;
  email: string;
  tier: UserTier;
  stage: string | null;
};

// ============================================================================
// Navigation Configuration (single source of truth — used by dashboard layout
// AND any other page that wants to expose the same nav, e.g. /chat sheet)
// ============================================================================

/**
 * Core navigation items -- always visible to all users.
 * Kept to ~13 high-value items.
 */
export const coreNavItems: NavItem[] = [
  {
    name: "Home",
    href: "/dashboard",
    icon: <DashboardIcon className="h-4 w-4" />,
  },
  {
    name: "Mentor",
    href: "/chat",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    name: "Next Steps",
    href: "/dashboard/next-steps",
    icon: <ListChecks className="h-4 w-4" />,
  },
  {
    name: "Readiness",
    href: "/dashboard/readiness",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    name: "Progress",
    href: "/dashboard/journey",
    icon: <Map className="h-4 w-4" />,
  },
  {
    name: "Marketplace",
    href: "/dashboard/marketplace",
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    name: "Well-being",
    href: "/dashboard/wellbeing",
    icon: <Heart className="h-4 w-4" />,
  },
  {
    name: "Startup Process",
    href: "/dashboard/startup-process",
    icon: <Rocket className="h-4 w-4" />,
  },
  {
    name: "Strategy",
    href: "/dashboard/strategy",
    icon: <Compass className="h-4 w-4" />,
  },
  {
    name: "Documents",
    href: "/dashboard/documents",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    name: "Community",
    href: "/dashboard/communities",
    icon: <Users className="h-4 w-4" />,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: <GearIcon className="h-4 w-4" />,
  },
];

/**
 * Conditional navigation items -- shown based on stage, tier, or feature state.
 */
export const conditionalNavItems: NavItem[] = [
  {
    name: "Reality Lens",
    href: "/dashboard/reality-lens",
    icon: <ScanEye className="h-4 w-4" />,
    condition: "showInvestorLens",
  },
  {
    name: "Positioning",
    href: "/dashboard/positioning",
    icon: <TargetIcon className="h-4 w-4" />,
    condition: "showPositioning",
  },
  {
    name: "Investor Lens",
    href: "/dashboard/investor-lens",
    icon: <EyeOpenIcon className="h-4 w-4" />,
    condition: "showInvestorLens",
  },
  {
    name: "Investor Targeting",
    href: "/dashboard/investor-targeting",
    icon: <Target className="h-4 w-4" />,
    condition: "showInvestorTools",
  },
  {
    name: "Investor Readiness",
    href: "/dashboard/investor-readiness",
    icon: <ShieldCheck className="h-4 w-4" />,
    condition: "showInvestorTools",
  },
  {
    name: "Investor Evaluation",
    href: "/dashboard/investor-evaluation",
    icon: <TrendingUp className="h-4 w-4" />,
    condition: "showInvestorTools",
  },
  {
    name: "Pitch Deck",
    href: "/dashboard/pitch-deck",
    icon: <Presentation className="h-4 w-4" />,
    condition: "showInvestorTools",
  },
  {
    name: "Virtual Team",
    href: "/dashboard/agents",
    icon: <Bot className="h-4 w-4" />,
    condition: "showStudioFeatures",
  },
  {
    name: "Boardy",
    href: "/dashboard/boardy",
    icon: <Network className="h-4 w-4" />,
    condition: "showStudioFeatures",
  },
];

// Stages considered "early" -- hide investor/funding tools
export const EARLY_STAGES = new Set(["idea", "mvp"]);

export const tierNames = ["Free", "Pro", "Studio"];
export const tierColors = [
  "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "bg-[#ff6a1a]/10 text-[#ff6a1a] dark:bg-[#ff6a1a]/20 dark:text-[#ff6a1a]",
];

/**
 * Compute the visible nav list given user stage/tier.
 * Pure helper — safe to call from any component or server context.
 */
export function computeVisibleNavItems(
  stage: string | null,
  tier: UserTier
): NavItem[] {
  const isEarlyStage = !stage || EARLY_STAGES.has(stage);

  const conditions = {
    showPositioning: tier >= UserTier.PRO,
    showInvestorLens: !isEarlyStage && tier >= UserTier.PRO,
    showInvestorTools: !isEarlyStage && tier >= UserTier.PRO,
    showStudioFeatures: tier >= UserTier.STUDIO,
  } as const;

  const visible = [...coreNavItems];
  const conditional = conditionalNavItems.filter(
    (item) =>
      item.condition &&
      conditions[item.condition as keyof typeof conditions]
  );
  if (conditional.length > 0) {
    const settingsIdx = visible.findIndex((i) => i.name === "Settings");
    visible.splice(settingsIdx, 0, ...conditional);
  }
  return visible;
}

// ============================================================================
// SidebarContent Component
// ============================================================================

export function SidebarContent({
  user,
  visibleNavItems,
  pathname,
  isTierLoading,
  onNavClick,
  onHowToUse,
}: {
  user: SidebarUser;
  visibleNavItems: NavItem[];
  pathname: string;
  isTierLoading?: boolean;
  onNavClick?: () => void;
  onHowToUse?: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
      {/* User Profile */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-12 w-12 border-2 border-[#ff6a1a]/30">
            <AvatarFallback className="bg-gradient-to-br from-[#ff6a1a] to-orange-400 text-white font-bold">
              {(user.name || "?")
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
        </div>
        {isTierLoading ? (
          <div className="h-[22px] w-full rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ) : (
          <Badge className={cn("w-full justify-center", tierColors[user.tier])}>
            {tierNames[user.tier]} Plan
          </Badge>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-4 space-y-1">
        {visibleNavItems.map((item, idx) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          // Show section label before first item in a conditional group
          const prevItem = visibleNavItems[idx - 1];
          const showInvestorLabel =
            item.condition?.startsWith("showInvestor") &&
            (!prevItem || !prevItem.condition?.startsWith("showInvestor"));
          const showStudioLabel =
            item.condition === "showStudioFeatures" &&
            (!prevItem || prevItem.condition !== "showStudioFeatures");

          return (
            <div key={item.name}>
              {showInvestorLabel && (
                <h3 aria-hidden="true" className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Investor Tools
                </h3>
              )}
              {showStudioLabel && (
                <h3 aria-hidden="true" className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Studio
                </h3>
              )}
              <Link
                href={item.href}
                onClick={onNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group relative min-h-[44px]",
                  isActive
                    ? "bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <div className="transition-transform group-hover:scale-110">
                  {item.icon}
                </div>
                <span className="flex-1 text-sm">{item.name}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Chat with Mentor -- prominent orange CTA */}
      <div className="px-4 pt-2 pb-1 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <button
          onClick={() => openFredChat("Give me a tour of the platform and explain what each section does so I know where to go for what.")}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg",
            "bg-[#ff6a1a] hover:bg-[#ea580c] text-white font-medium",
            "transition-all duration-200 text-sm"
          )}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span>Chat with Mentor</span>
        </button>
        <button
          onClick={() => { onNavClick?.(); onHowToUse?.(); }}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg",
            "border border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/10",
            "font-medium transition-all duration-200 text-sm"
          )}
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span>How To Use Sahara</span>
        </button>
      </div>

      {/* Upgrade CTA */}
      {user.tier < 2 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <UpgradeBanner currentTier={user.tier as UserTier} />
        </div>
      )}
    </div>
  );
}
