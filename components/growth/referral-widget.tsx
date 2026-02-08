"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReferralState {
  referralLink: string;
  referralCount: number;
  copied: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferralWidget() {
  const [state, setState] = useState<ReferralState>({
    referralLink: "",
    referralCount: 0,
    copied: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Build referral link from user ID
        const baseUrl =
          typeof window !== "undefined"
            ? window.location.origin
            : "https://sahara.app";
        const referralLink = `${baseUrl}/get-started?ref=${user.id}`;

        // Count referrals from contact_submissions with this user's ref
        const { count } = await supabase
          .from("contact_submissions")
          .select("id", { count: "exact", head: true })
          .eq("referrer_id", user.id);

        setState((prev) => ({
          ...prev,
          referralLink,
          referralCount: count ?? 0,
        }));
      } catch (err) {
        console.error("Failed to load referral data:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!state.referralLink) return;

    try {
      await navigator.clipboard.writeText(state.referralLink);
      setState((prev) => ({ ...prev, copied: true }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, copied: false }));
      }, 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = state.referralLink;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setState((prev) => ({ ...prev, copied: true }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, copied: false }));
      }, 2000);
    }
  }, [state.referralLink]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!state.referralLink) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Invite Friends to Sahara
        </CardTitle>
        <CardDescription>
          Share your referral link and grow with the community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Referral link + copy button */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={state.referralLink}
            className="flex-1 text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 truncate"
          />
          <button
            onClick={copyToClipboard}
            className="shrink-0 px-3 py-2 text-sm font-medium rounded-md bg-[#ff6a1a] text-white hover:bg-[#e55e15] transition-colors"
          >
            {state.copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Referral count */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-[#ff6a1a]">
            {state.referralCount}
          </span>
          <span>
            {state.referralCount === 1
              ? "friend has joined"
              : "friends have joined"}{" "}
            through your link
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
