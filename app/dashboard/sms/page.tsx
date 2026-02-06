"use client";

/**
 * SMS Check-ins Dashboard Page
 * Phase 04: Studio Tier Features - Plan 07
 *
 * Displays SMS preference settings and check-in message history.
 * Studio tier gated - non-Studio users see a locked overlay.
 */

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckinSettings } from "@/components/sms/checkin-settings";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import type { UserSMSPreferences, CheckinRecord } from "@/lib/sms/types";

// ============================================================================
// Types
// ============================================================================

interface APIPreferences extends Omit<UserSMSPreferences, "createdAt" | "updatedAt"> {
  createdAt: string | null;
  updatedAt: string | null;
}

interface APICheckin {
  id: string;
  userId: string;
  phoneNumber: string;
  messageSid?: string;
  direction: "outbound" | "inbound";
  body: string;
  status: string;
  weekNumber: number;
  year: number;
  parentCheckinId?: string;
  accountabilityScore?: Record<string, unknown>;
  sentAt?: string;
  receivedAt?: string;
  createdAt: string;
}

// ============================================================================
// Page Component
// ============================================================================

export default function SMSCheckinsPage() {
  const { tier: userTier, isLoading: isTierLoading } = useUserTier();

  const [preferences, setPreferences] = useState<UserSMSPreferences | undefined>(
    undefined
  );
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoadingPrefs(true);
      const response = await fetch("/api/sms/preferences");
      if (!response.ok) {
        if (response.status === 401) {
          setError("Please sign in to manage SMS preferences.");
          return;
        }
        throw new Error("Failed to fetch preferences");
      }
      const data = await response.json();
      if (data.preferences) {
        const p = data.preferences as APIPreferences;
        setPreferences({
          userId: p.userId,
          phoneNumber: p.phoneNumber || undefined,
          phoneVerified: p.phoneVerified,
          checkinEnabled: p.checkinEnabled,
          checkinDay: p.checkinDay,
          checkinHour: p.checkinHour,
          timezone: p.timezone,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        });
      }
    } catch (err) {
      console.error("[SMSPage] Error fetching preferences:", err);
      setError("Failed to load SMS preferences.");
    } finally {
      setIsLoadingPrefs(false);
    }
  }, []);

  // Fetch check-in history
  const fetchHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch("/api/sms/preferences?include=history");
      if (!response.ok) return;

      const data = await response.json();
      if (data.checkins) {
        const mapped: CheckinRecord[] = (data.checkins as APICheckin[]).map(
          (c) => ({
            id: c.id,
            userId: c.userId,
            phoneNumber: c.phoneNumber,
            messageSid: c.messageSid,
            direction: c.direction,
            body: c.body,
            status: c.status as CheckinRecord["status"],
            weekNumber: c.weekNumber,
            year: c.year,
            parentCheckinId: c.parentCheckinId,
            accountabilityScore: c.accountabilityScore,
            sentAt: c.sentAt ? new Date(c.sentAt) : undefined,
            receivedAt: c.receivedAt ? new Date(c.receivedAt) : undefined,
            createdAt: new Date(c.createdAt),
          })
        );
        setCheckins(mapped);
      }
    } catch (err) {
      console.error("[SMSPage] Error fetching history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
    fetchHistory();
  }, [fetchPreferences, fetchHistory]);

  // Save handler
  const handleSavePreferences = useCallback(
    async (updates: Partial<UserSMSPreferences>) => {
      const response = await fetch("/api/sms/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save preferences");
      }

      // Refetch preferences
      await fetchPreferences();
    },
    [fetchPreferences]
  );

  // Loading skeleton
  if (isTierLoading) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="w-8 h-8 text-[#ff6a1a]" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            SMS Check-ins
          </h1>
          <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
            Studio
          </Badge>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Weekly accountability to keep you on track
        </p>
      </div>

      {/* Feature Lock */}
      <FeatureLock
        requiredTier={UserTier.STUDIO}
        currentTier={userTier}
        featureName="SMS Check-ins"
        description="Weekly SMS accountability check-ins are available with the Studio tier."
      >
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Settings Card */}
        {isLoadingPrefs ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : (
          <CheckinSettings
            preferences={preferences}
            onSave={handleSavePreferences}
          />
        )}

        {/* Check-in History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              Check-in History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : checkins.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No check-ins yet. Enable weekly check-ins above to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {checkins.map((checkin) => (
                  <CheckinEntry key={checkin.id} checkin={checkin} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FeatureLock>
    </div>
  );
}

// ============================================================================
// Check-in Entry Component
// ============================================================================

function CheckinEntry({ checkin }: { checkin: CheckinRecord }) {
  const isOutbound = checkin.direction === "outbound";
  const statusColor = {
    queued: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    received: "bg-purple-100 text-purple-700",
  }[checkin.status] || "bg-gray-100 text-gray-700";

  const timestamp = checkin.sentAt || checkin.receivedAt || checkin.createdAt;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
      {/* Direction Icon */}
      <div
        className={`p-2 rounded-lg flex-shrink-0 ${
          isOutbound
            ? "bg-blue-50 dark:bg-blue-950/30"
            : "bg-purple-50 dark:bg-purple-950/30"
        }`}
      >
        {isOutbound ? (
          <ArrowUpRight className="h-4 w-4 text-blue-500" />
        ) : (
          <ArrowDownLeft className="h-4 w-4 text-purple-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isOutbound ? "Sahara" : "You"} &middot; Week {checkin.weekNumber}
          </span>
          <Badge
            variant="secondary"
            className={`text-xs px-1.5 py-0 ${statusColor}`}
          >
            {checkin.status}
          </Badge>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          {checkin.body}
        </p>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
        {formatCheckinTime(timestamp)}
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatCheckinTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
