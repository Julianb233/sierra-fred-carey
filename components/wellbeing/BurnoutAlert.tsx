"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface BurnoutAlertProps {
  recommendation: string;
  suggestCheckIn: boolean;
  onDismiss: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function BurnoutAlert({
  recommendation,
  suggestCheckIn,
  onDismiss,
}: BurnoutAlertProps) {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    // Wait for transition before actually removing
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2"
      }`}
    >
      <div className="relative rounded-xl p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 shadow-md">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="shrink-0 mt-0.5">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
              {recommendation}
            </p>
            {suggestCheckIn && (
              <Link
                href="/dashboard/wellbeing"
                className="inline-block text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 underline underline-offset-2 transition-colors"
              >
                Take a Wellbeing Check-in
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
