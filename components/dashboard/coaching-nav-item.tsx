"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Coaching Nav Item
// ============================================================================

/**
 * Navigation item for the Video Coaching feature.
 * Designed to be imported into the dashboard sidebar.
 *
 * NOTE: dashboard/layout.tsx has pre-commit hooks that revert modifications,
 * so this component is provided as a standalone import rather than being
 * added directly to the layout file.
 *
 * Usage:
 *   import { CoachingNavItem } from "@/components/dashboard/coaching-nav-item";
 *   // Then render <CoachingNavItem /> in the sidebar nav list
 */
export function CoachingNavItem({ className }: { className?: string }) {
  const pathname = usePathname();
  const isActive = pathname?.startsWith("/dashboard/coaching");

  return (
    <Link
      href="/dashboard/coaching"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
        className
      )}
    >
      <Video className="h-4 w-4 shrink-0" />
      <span className="flex-1">Video Coaching</span>
      <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#ff6a1a] to-orange-400 text-white leading-none">
        Studio
      </span>
    </Link>
  );
}

export default CoachingNavItem;
