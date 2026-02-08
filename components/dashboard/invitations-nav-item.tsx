"use client";

/**
 * Invitations Nav Item
 * Phase 33-01: Collaboration & Sharing
 *
 * Navigation item for the Team Invitations page with a pending count badge.
 * Designed to be imported into the dashboard sidebar.
 *
 * NOTE: dashboard/layout.tsx has pre-commit hooks that revert modifications,
 * so this component is provided as a standalone import rather than being
 * added directly to the layout file.
 *
 * Usage:
 *   import { InvitationsNavItem } from "@/components/dashboard/invitations-nav-item";
 *   // Then render <InvitationsNavItem /> in the sidebar nav list
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function InvitationsNavItem({ className }: { className?: string }) {
  const pathname = usePathname();
  const isActive = pathname?.startsWith("/dashboard/invitations");
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/team/invitations?count=true");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setCount(data.count || 0);
          }
        }
      } catch {
        // Silently fail -- non-critical
      }
    }

    fetchCount();

    // Refresh count on navigation (poll every 60s as a fallback)
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <Link
      href="/dashboard/invitations"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
        className
      )}
    >
      <Mail className="h-4 w-4 shrink-0" />
      <span className="flex-1">Invitations</span>
      {count > 0 && (
        <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-[#ff6a1a] text-white leading-none">
          {count}
        </span>
      )}
    </Link>
  );
}

export default InvitationsNavItem;
