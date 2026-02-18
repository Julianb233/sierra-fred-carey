"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, ListChecks, BarChart3, FileText, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Navigation Configuration
// ============================================================================

const NAV_ITEMS = [
  {
    name: "Home",
    href: "/dashboard",
    icon: Home,
    matchExact: true,
  },
  {
    name: "Chat",
    href: "/chat",
    icon: MessageSquare,
    matchExact: false,
  },
  {
    name: "Next",
    href: "/dashboard/next-steps",
    icon: ListChecks,
    matchExact: false,
  },
  {
    name: "Progress",
    href: "/dashboard/readiness",
    icon: BarChart3,
    matchExact: false,
  },
  {
    name: "Docs",
    href: "/dashboard/documents",
    icon: FileText,
    matchExact: false,
  },
  {
    name: "Community",
    href: "/dashboard/communities",
    icon: Users,
    matchExact: false,
  },
  {
    name: "Profile",
    href: "/dashboard/settings",
    icon: User,
    matchExact: false,
  },
] as const;

// ============================================================================
// Component
// ============================================================================

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-white dark:bg-gray-950",
        "border-t border-gray-200 dark:border-gray-800",
        "md:hidden"
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = item.matchExact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5",
                "min-w-[48px] min-h-[44px] px-3 py-1",
                "transition-colors duration-200",
                isActive
                  ? "text-[#ff6a1a]"
                  : "text-gray-400 dark:text-gray-500"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
