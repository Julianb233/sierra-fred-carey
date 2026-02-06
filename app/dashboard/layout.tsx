"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  HamburgerMenuIcon,
  DashboardIcon,
  RocketIcon,
  PersonIcon,
  FileTextIcon,
  CheckCircledIcon,
  GearIcon,
  Cross2Icon,
  OpenInNewWindowIcon,
  LockClosedIcon,
  BarChartIcon,
  ActivityLogIcon,
  TargetIcon,
  EyeOpenIcon,
  CountdownTimerIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { UpgradeBanner } from "@/components/dashboard/UpgradeTier";
import { UserTier } from "@/lib/constants";
import { useTier } from "@/lib/context/tier-context";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  tier?: number;
  badge?: string;
};

const navItems: NavItem[] = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: <DashboardIcon className="h-4 w-4" />,
  },
  {
    name: "Reality Lens",
    href: "/dashboard/reality-lens",
    icon: <OpenInNewWindowIcon className="h-4 w-4" />,
    badge: "Free",
  },
  {
    name: "Your Journey",
    href: "/dashboard/journey",
    icon: <RocketIcon className="h-4 w-4" />,
    badge: "Free",
  },
  {
    name: "Decision History",
    href: "/dashboard/history",
    icon: <CountdownTimerIcon className="h-4 w-4" />,
    badge: "Free",
  },
  {
    name: "AI Insights",
    href: "/dashboard/insights",
    icon: <BarChartIcon className="h-4 w-4" />,
    badge: "Free",
  },
  {
    name: "Monitoring",
    href: "/dashboard/monitoring",
    icon: <ActivityLogIcon className="h-4 w-4" />,
    badge: "Free",
  },
  {
    name: "Positioning",
    href: "/dashboard/positioning",
    icon: <TargetIcon className="h-4 w-4" />,
    tier: 1,
    badge: "Pro",
  },
  {
    name: "Investor Lens",
    href: "/dashboard/investor-lens",
    icon: <EyeOpenIcon className="h-4 w-4" />,
    tier: 1,
    badge: "Pro",
  },
  {
    name: "Investor Readiness",
    href: "/dashboard/investor-readiness",
    icon: <PersonIcon className="h-4 w-4" />,
    tier: 1,
    badge: "Pro",
  },
  {
    name: "Pitch Deck Review",
    href: "/dashboard/pitch-deck",
    icon: <FileTextIcon className="h-4 w-4" />,
    tier: 1,
    badge: "Pro",
  },
  {
    name: "Strategy Docs",
    href: "/dashboard/strategy",
    icon: <FileTextIcon className="h-4 w-4" />,
    tier: 1,
    badge: "Pro",
  },
  {
    name: "Weekly Check-ins",
    href: "/dashboard/sms",
    icon: <CheckCircledIcon className="h-4 w-4" />,
    tier: 1,
    badge: "Pro",
  },
  {
    name: "Virtual Team",
    href: "/dashboard/agents",
    icon: <RocketIcon className="h-4 w-4" />,
    tier: 2,
    badge: "Studio",
  },
  {
    name: "Boardy Integration",
    href: "/dashboard/boardy",
    icon: <LockClosedIcon className="h-4 w-4" />,
    tier: 2,
    badge: "Studio",
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: <GearIcon className="h-4 w-4" />,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { tier, isLoading: tierLoading } = useTier();
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, tier")
          .eq("id", authUser.id)
          .single();
        setUserInfo({
          name: profile?.name || authUser.email?.split("@")[0] || "Founder",
          email: authUser.email || "",
        });
      }
    }
    fetchUser();
  }, []);

  const user = {
    name: userInfo?.name || "",
    email: userInfo?.email || "",
    tier: tier,
  };

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
              {(user.name || "?").split(" ").map(n => n[0]).join("")}
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
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isLocked = item.tier !== undefined && user.tier < item.tier;

          return (
            <Link
              key={item.name}
              href={isLocked ? "#" : item.href}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                } else {
                  setSidebarOpen(false);
                }
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                isActive
                  ? "bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium"
                  : isLocked
                  ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <div className={cn(
                "transition-transform group-hover:scale-110",
                isLocked && "opacity-50"
              )}>
                {item.icon}
              </div>
              <span className="flex-1 text-sm">{item.name}</span>
              {item.badge && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs py-0 h-5",
                    isActive && "border-[#ff6a1a] text-[#ff6a1a]"
                  )}
                >
                  {item.badge}
                </Badge>
              )}
              {isLocked && (
                <LockClosedIcon className="h-3 w-3 text-gray-400" />
              )}
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
              style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
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
