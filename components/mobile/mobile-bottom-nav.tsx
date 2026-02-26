"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, ListChecks, BarChart3, Mic, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Navigation Configuration
// ============================================================================

const NAV_ITEMS_LEFT = [
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
] as const;

const NAV_ITEMS_RIGHT = [
  {
    name: "Progress",
    href: "/dashboard/readiness",
    icon: BarChart3,
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

  const renderNavItem = (item: { name: string; href: string; icon: typeof Home; matchExact: boolean }) => {
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
          "min-w-[44px] min-h-[44px] px-2 py-1",
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
  };

  // Dispatch custom event to open voice overlay (listened to in dashboard layout)
  const handleVoiceClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fred:voice"));
    }
  };

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
      <div className="flex items-center justify-around h-16 relative">
        {/* Left nav items */}
        {NAV_ITEMS_LEFT.map(renderNavItem)}

        {/* Center: Prominent Voice Button */}
        <button
          onClick={handleVoiceClick}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5",
            "relative -mt-4"
          )}
          aria-label="Voice chat with Fred"
        >
          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              "bg-[#ff6a1a] text-white",
              "shadow-lg shadow-[#ff6a1a]/30",
              "transition-all duration-300",
              "active:scale-95"
            )}
          >
            <Mic className="h-5 w-5" />
          </div>
          <span className="text-[10px] leading-tight font-semibold text-[#ff6a1a] mt-0.5">
            Voice
          </span>
        </button>

        {/* Right nav items */}
        {NAV_ITEMS_RIGHT.map(renderNavItem)}
      </div>
    </nav>
  );
}
