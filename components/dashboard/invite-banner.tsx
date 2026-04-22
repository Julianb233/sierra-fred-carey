"use client";

/**
 * Invite Notification Banner
 * AI-8502: Co-founder invite + join flow
 *
 * Shows on the dashboard when the user has pending team invitations.
 * Fetches invite count on mount, dismissible per session.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteBanner() {
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed this session
    if (sessionStorage.getItem("sahara_invite_banner_dismissed")) {
      setDismissed(true);
      return;
    }

    async function fetchCount() {
      try {
        const res = await fetch("/api/team/invitations?count=true");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && typeof data.count === "number") {
          setCount(data.count);
        }
      } catch {
        // Silently fail — banner is non-critical
      }
    }

    fetchCount();
  }, []);

  if (dismissed || count === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("sahara_invite_banner_dismissed", "true");
  };

  return (
    <div className="relative bg-gradient-to-r from-[#ff6a1a]/10 to-orange-100/50 dark:from-[#ff6a1a]/10 dark:to-orange-900/10 border border-[#ff6a1a]/20 rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-full bg-[#ff6a1a]/15 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#ff6a1a]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              You have {count} pending team invitation{count > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              A founder has invited you to collaborate on their startup journey.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/invitations">
            <Button
              size="sm"
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
            >
              View
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
