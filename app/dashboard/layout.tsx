"use client";

import { useState } from "react";
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
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

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
    name: "Investor Score",
    href: "/dashboard/investor-score",
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
    href: "/dashboard/check-ins",
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

  // Mock user data - replace with actual auth later
  const user = {
    name: "Fred Cary",
    email: "founder@startup.com",
    tier: 0, // 0 = Free, 1 = Pro ($99/mo), 2 = Studio ($249/mo)
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
              {user.name.split(" ").map(n => n[0]).join("")}
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
          <div className="p-4 bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10 rounded-xl border border-[#ff6a1a]/20">
            <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
              Upgrade to {user.tier === 0 ? "Pro" : "Studio"}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Unlock all features and AI agents
            </p>
            <Button
              size="sm"
              className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
            >
              <RocketIcon className="mr-2 h-3 w-3" />
              Upgrade Now
            </Button>
          </div>
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
              className="fixed bottom-4 right-4 z-40 lg:hidden h-14 w-14 rounded-full shadow-lg bg-[#ff6a1a] hover:bg-[#ea580c] text-white border-0"
            >
              {sidebarOpen ? (
                <Cross2Icon className="h-5 w-5" />
              ) : (
                <HamburgerMenuIcon className="h-5 w-5" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
