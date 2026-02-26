"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
  Lightbulb,
  Map,
  GraduationCap,
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
  BookOpen,
} from "lucide-react";
import { openFredChat } from "@/components/chat/floating-chat-widget";
import { cn } from "@/lib/utils";
import { UpgradeBanner } from "@/components/dashboard/UpgradeTier";
import { UserTier } from "@/lib/constants";
import { useTier } from "@/lib/context/tier-context";
import { createClient } from "@/lib/supabase/client";
import { FloatingChatWidget } from "@/components/chat/floating-chat-widget";
import { CallFredModal } from "@/components/dashboard/call-fred-modal";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";
import { PageTransition } from "@/components/animations/PageTransition";

// ============================================================================
// Navigation Configuration
// ============================================================================

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  /** If set, item is only shown when this condition key is true */
  condition?: string;
};

/**
 * Core navigation items -- always visible to all users.
 * Kept to ~13 high-value items. Lower-priority pages (Inbox, Notifications,
 * History, Memory, Sharing, Invitations) are accessible from Settings or
 * contextual links rather than top-level nav.
 */
const coreNavItems: NavItem[] = [
  {
    name: "Home",
    href: "/dashboard",
    icon: <DashboardIcon className="h-4 w-4" />,
  },
  {
    name: "Chat with Fred",
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
    name: "AI Insights",
    href: "/dashboard/insights",
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    name: "Journey",
    href: "/dashboard/journey",
    icon: <Map className="h-4 w-4" />,
  },
  {
    name: "Coaching",
    href: "/dashboard/coaching",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    name: "Content",
    href: "/dashboard/content",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    name: "Wellbeing",
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
 * Each has a `condition` key that maps to a computed visibility flag.
 */
const conditionalNavItems: NavItem[] = [
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
    name: "Reality Lens",
    href: "/dashboard/reality-lens",
    icon: <ScanEye className="h-4 w-4" />,
    condition: "showInvestorLens",
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
const EARLY_STAGES = new Set(["idea", "mvp"]);

// ============================================================================
// Sidebar Component (defined outside layout to avoid re-creation on render)
// ============================================================================

function SidebarContent({
  user,
  visibleNavItems,
  pathname,
  tierNames,
  tierColors,
  isTierLoading,
  onNavClick,
}: {
  user: { name: string; email: string; tier: UserTier; stage: string | null };
  visibleNavItems: NavItem[];
  pathname: string;
  tierNames: string[];
  tierColors: string[];
  isTierLoading?: boolean;
  onNavClick?: () => void;
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

      {/* Ask Fred for Help */}
      <div className="px-4 pt-2 pb-1 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => openFredChat("Give me a tour of the platform and explain what each section does so I know where to go for what.")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
            "text-gray-500 dark:text-gray-400 hover:text-[#ff6a1a] hover:bg-[#ff6a1a]/5",
            "transition-all duration-200 text-sm group"
          )}
        >
          <HelpCircle className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
          <span>Ask Fred for Help</span>
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

// ============================================================================
// Layout Component
// ============================================================================

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { tier, isLoading: isTierLoading, refresh: refreshTier } = useTier();
  const handleCallFred = useCallback(() => setCallModalOpen(true), []);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    email: string;
    stage: string | null;
  } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, stage")
        .eq("id", authUser.id)
        .single();
      setUserInfo({
        name: profile?.name || authUser.email?.split("@")[0] || "Founder",
        email: authUser.email || "",
        stage: profile?.stage ?? null,
      });
      setIsAuthChecking(false);
      // Re-fetch tier now that auth session is confirmed — the initial
      // fetch may have raced with session setup and returned FREE.
      refreshTier();
    }
    fetchUser();
  }, [router, refreshTier]);

  const user = {
    name: userInfo?.name || "",
    email: userInfo?.email || "",
    tier,
    stage: userInfo?.stage ?? null,
  };

  // Compute visibility conditions for conditional nav items
  const conditions = useMemo(() => {
    const isEarlyStage = !user.stage || EARLY_STAGES.has(user.stage);

    return {
      // Positioning: show for Pro+ users
      showPositioning: tier >= UserTier.PRO,
      // Investor Lens: show when not early stage AND tier >= Pro
      showInvestorLens: !isEarlyStage && tier >= UserTier.PRO,
      // Investor tools: show when not early stage AND tier >= Pro
      showInvestorTools: !isEarlyStage && tier >= UserTier.PRO,
      // Studio-tier features: Virtual Team, Boardy
      showStudioFeatures: tier >= UserTier.STUDIO,
    };
  }, [user.stage, tier]);

  // Build final nav item list
  const visibleNavItems = useMemo(() => {
    const visible = [...coreNavItems];
    const conditional = conditionalNavItems.filter(
      (item) =>
        item.condition &&
        conditions[item.condition as keyof typeof conditions]
    );
    if (conditional.length > 0) {
      // Insert conditional items before Settings (last core item)
      const settingsIdx = visible.findIndex((i) => i.name === "Settings");
      visible.splice(settingsIdx, 0, ...conditional);
    }
    return visible;
  }, [conditions]);

  const tierNames = ["Free", "Pro", "Studio"];
  const tierColors = [
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    "bg-[#ff6a1a]/10 text-[#ff6a1a] dark:bg-[#ff6a1a]/20 dark:text-[#ff6a1a]",
  ];

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div role="status" aria-label="Loading" className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6a1a]">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        {/* Mobile Sidebar (hamburger drawer — hidden on md+, supplements bottom nav for full menu) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[280px] sm:w-72">
            <SidebarContent
              user={user}
              visibleNavItems={visibleNavItems}
              pathname={pathname}
              tierNames={tierNames}
              tierColors={tierColors}
              isTierLoading={isTierLoading}
              onNavClick={closeSidebar}
            />
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0">
          <SidebarContent
            user={user}
            visibleNavItems={visibleNavItems}
            pathname={pathname}
            tierNames={tierNames}
            tierColors={tierColors}
            isTierLoading={isTierLoading}
          />
        </aside>

        {/* Main Content — extra bottom padding on mobile for bottom nav */}
        <main id="main-content" role="main" className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-28 md:pb-8">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>

      {/* Phase 46: Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Phase 42: Floating Chat Widget — available on all dashboard pages, hidden on mobile (bottom nav has Chat tab) */}
      <div className="hidden md:block">
        <FloatingChatWidget onCallFred={tier >= UserTier.PRO ? handleCallFred : undefined} />
      </div>

      {/* Phase 42: Call Fred Modal — Pro+ only */}
      <CallFredModal open={callModalOpen} onOpenChange={setCallModalOpen} />
    </div>
  );
}
