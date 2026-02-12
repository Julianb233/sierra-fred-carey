"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  HamburgerMenuIcon,
  DashboardIcon,
  GearIcon,
  Cross2Icon,
  TargetIcon,
  EyeOpenIcon,
} from "@radix-ui/react-icons";
import {
  Users,
  MessageSquare,
  TrendingUp,
  ListChecks,
  FileText,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeBanner } from "@/components/dashboard/UpgradeTier";
import { UserTier } from "@/lib/constants";
import { useTier } from "@/lib/context/tier-context";
import { createClient } from "@/lib/supabase/client";

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
 * Core navigation items -- always visible (7 items per spec).
 * Spec: Home, Chat with Fred, Your Progress, Next Steps, Community, Settings
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
    name: "Your Progress",
    href: "/dashboard/journey",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    name: "Next Steps",
    href: "/dashboard/startup-process",
    icon: <ListChecks className="h-4 w-4" />,
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
    name: "Readiness",
    href: "/dashboard/investor-readiness",
    icon: <BarChart3 className="h-4 w-4" />,
    condition: "showReadiness",
  },
  {
    name: "Documents",
    href: "/dashboard/strategy",
    icon: <FileText className="h-4 w-4" />,
    condition: "showDocuments",
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
];

// Stages considered "early" -- hide investor/funding tools
const EARLY_STAGES = new Set(["idea", "mvp"]);

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
  const pathname = usePathname();
  const router = useRouter();
  const { tier } = useTier();
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
        stage: profile?.stage || null,
      });
      setIsAuthChecking(false);
    }
    fetchUser();
  }, [router]);

  const user = {
    name: userInfo?.name || "",
    email: userInfo?.email || "",
    tier,
    stage: userInfo?.stage,
  };

  // Compute visibility conditions for conditional nav items
  const conditions = useMemo(() => {
    const isEarlyStage = !user.stage || EARLY_STAGES.has(user.stage);

    return {
      // Readiness: visible when stage >= seed OR tier >= Pro
      showReadiness: !isEarlyStage || tier >= UserTier.PRO,
      // Documents: always show if tier >= Pro (they may have docs)
      showDocuments: tier >= UserTier.PRO,
      // Positioning: show for Pro+ users
      showPositioning: tier >= UserTier.PRO,
      // Investor Lens: show when not early stage AND tier >= Pro
      showInvestorLens: !isEarlyStage && tier >= UserTier.PRO,
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

  const SidebarContent = () => (
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
        <Badge className={cn("w-full justify-center", tierColors[user.tier])}>
          {tierNames[user.tier]} Plan
        </Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
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
          );
        })}
      </nav>

      {/* Upgrade CTA */}
      {user.tier < 2 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <UpgradeBanner currentTier={user.tier as UserTier} />
        </div>
      )}
    </div>
  );

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 lg:pt-20">
      <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)]">
        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed z-40 lg:hidden h-14 w-14 rounded-full shadow-lg bg-[#ff6a1a] hover:bg-[#ea580c] text-white border-0 right-4"
              style={{
                bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
              }}
            >
              {sidebarOpen ? (
                <Cross2Icon className="h-5 w-5" />
              ) : (
                <HamburgerMenuIcon className="h-5 w-5" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px] sm:w-72">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
