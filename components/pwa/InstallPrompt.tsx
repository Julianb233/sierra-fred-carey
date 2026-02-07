"use client";

import { useState, useEffect } from "react";
import { useInstallPrompt } from "./useInstallPrompt";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import Link from "next/link";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function InstallPrompt() {
  const { canPrompt, isIOS, isStandalone, isInstalled, promptInstall } =
    useInstallPrompt();
  const [dismissed, setDismissed] = useState(true); // start true to prevent flash
  const [showPrompt, setShowPrompt] = useState(false);

  // Check localStorage for dismiss state
  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored) {
      const elapsed = Date.now() - parseInt(stored, 10);
      if (elapsed < DISMISS_DURATION) {
        return; // still dismissed
      }
    }
    setDismissed(false);
  }, []);

  // 5-second delay before showing
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  // Don't render if: standalone, installed, dismissed, not ready, or no platform support
  if (isStandalone || isInstalled || dismissed || !showPrompt || (!canPrompt && !isIOS)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-4">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Dismiss install prompt"
      >
        <Cross2Icon className="size-4" />
      </button>

      <div className="flex items-start gap-3">
        <img
          src="/icon-192.png"
          alt="Sahara"
          width={48}
          height={48}
          className="rounded-xl flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            Install Sahara
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Get the full app experience with offline access
          </p>
        </div>
      </div>

      <div className="mt-3">
        {canPrompt && (
          <Button
            variant="orange"
            size="sm"
            className="w-full"
            onClick={() => promptInstall()}
          >
            Install Now
          </Button>
        )}
        {!canPrompt && isIOS && (
          <Button variant="orange-outline" size="sm" className="w-full" asChild>
            <Link href="/install">See How to Install</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
