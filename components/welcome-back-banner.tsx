"use client";

/**
 * WelcomeBackBanner
 *
 * One-time banner shown when a visitor arrives via the redirect from the
 * legacy u.joinsahara.com subdomain. Reassures them that their account
 * migrated cleanly and points them at the password-reset flow if they
 * can't sign in.
 *
 * Trigger: ?from=funnel-migration in the URL. The flag is stamped by the
 * host-redirect rule in middleware.ts. The flag is stripped on first
 * render so a casually shared URL doesn't spread the banner.
 *
 * Dismissal: localStorage-persisted; once dismissed, it never reappears.
 */
import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";

const DISMISS_KEY = "sahara_funnel_migration_banner_dismissed";
const TRIGGER_FLAGS = new Set(["funnel-migration", "funnel"]);

export function WelcomeBackBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const from = searchParams.get("from");
    if (!from || !TRIGGER_FLAGS.has(from)) return;
    if (typeof window === "undefined") return;

    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // private tabs / storage blocked: fall through and show the banner.
    }

    setVisible(true);

    // Strip the ?from= flag so a shared link doesn't spread the banner.
    const next = new URLSearchParams(searchParams.toString());
    next.delete("from");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  if (!visible) return null;

  const onDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="relative w-full border-b border-[#ff6a1a]/20 bg-gradient-to-r from-[#ff6a1a]/10 via-amber-500/10 to-[#ff6a1a]/10 px-4 py-3 text-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <p className="text-gray-800 dark:text-gray-100">
          <span className="font-semibold text-[#ff6a1a]">Welcome back.</span>{" "}
          Sahara moved to our permanent platform, and your account came with
          you. If you can&apos;t sign in, use{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-[#ff6a1a] underline underline-offset-2 hover:text-[#ea580c]"
          >
            Forgot password
          </Link>{" "}
          to set a new one.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss welcome-back banner"
          className="flex-shrink-0 rounded p-1 text-gray-600 transition-colors hover:bg-white/40 dark:text-gray-300 dark:hover:bg-black/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
