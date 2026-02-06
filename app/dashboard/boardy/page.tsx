"use client";

/**
 * Boardy Dashboard Page
 * Phase 04: Studio Tier Features - Plan 06
 *
 * Investor & Advisor Matching powered by Boardy AI.
 * Studio tier gated. Shows match cards with filter tabs and action buttons.
 */

import { useState, useEffect, useCallback } from "react";
import { Network, RefreshCw, Users, Briefcase, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { MatchList } from "@/components/boardy/match-list";
import { BoardyConnect } from "@/components/boardy/boardy-connect";
import type { BoardyMatch, BoardyMatchStatus } from "@/lib/boardy/types";

// ============================================================================
// Filter Types
// ============================================================================

type FilterTab = "all" | "investors" | "advisors" | "active" | "declined";

// ============================================================================
// Page Component
// ============================================================================

export default function BoardyPage() {
  // Tier check
  const { tier: userTier, isLoading: isTierLoading } = useUserTier();

  // State
  const [matches, setMatches] = useState<BoardyMatch[]>([]);
  const [deepLink, setDeepLink] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchMatches = useCallback(async () => {
    try {
      const response = await fetch("/api/boardy/match");
      if (!response.ok) {
        if (response.status === 401) {
          setError("Please sign in to view matches.");
          return;
        }
        if (response.status === 403) {
          // Tier gating handled by UI, but just in case
          return;
        }
        throw new Error("Failed to fetch matches");
      }

      const data = await response.json();
      if (data.success) {
        // Map date strings back to Date objects
        const mappedMatches: BoardyMatch[] = (data.matches || []).map(
          (m: Record<string, unknown>) => ({
            ...m,
            createdAt: new Date(m.createdAt as string),
            updatedAt: new Date(m.updatedAt as string),
          })
        );
        setMatches(mappedMatches);
        if (data.deepLink) {
          setDeepLink(data.deepLink);
        }
      }
    } catch (err) {
      console.error("[BoardyPage] Error fetching matches:", err);
      setError("Failed to load matches.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // ============================================================================
  // Actions
  // ============================================================================

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/boardy/match", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to refresh matches");
      }
      const data = await response.json();
      if (data.success) {
        const mappedMatches: BoardyMatch[] = (data.matches || []).map(
          (m: Record<string, unknown>) => ({
            ...m,
            createdAt: new Date(m.createdAt as string),
            updatedAt: new Date(m.updatedAt as string),
          })
        );
        setMatches(mappedMatches);
        if (data.deepLink) {
          setDeepLink(data.deepLink);
        }
      }
    } catch (err) {
      console.error("[BoardyPage] Refresh error:", err);
      setError("Failed to refresh matches. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusUpdate = async (
    matchId: string,
    newStatus: BoardyMatchStatus
  ) => {
    try {
      const response = await fetch("/api/boardy/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update match status");
      }

      const data = await response.json();
      if (data.success && data.match) {
        // Update match in local state
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  status: data.match.status,
                  updatedAt: new Date(data.match.updatedAt),
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error("[BoardyPage] Status update error:", err);
      setError("Failed to update match status.");
    }
  };

  // ============================================================================
  // Filtering
  // ============================================================================

  const filteredMatches = matches.filter((match) => {
    switch (activeTab) {
      case "investors":
        return match.matchType === "investor";
      case "advisors":
        return (
          match.matchType === "advisor" ||
          match.matchType === "mentor" ||
          match.matchType === "partner"
        );
      case "active":
        return match.status !== "declined" && match.status !== "suggested";
      case "declined":
        return match.status === "declined";
      default:
        return true;
    }
  });

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isTierLoading) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-96" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Network className="w-8 h-8 text-[#ff6a1a]" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Investor & Advisor Matching
            </h1>
            <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
              Studio
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered connections to the right people
          </p>
        </div>

        {/* Refresh Button */}
        {userTier >= UserTier.STUDIO && (
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="shrink-0"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Generating..." : "Refresh Matches"}
          </Button>
        )}
      </div>

      {/* Feature Lock */}
      <FeatureLock
        requiredTier={UserTier.STUDIO}
        currentTier={userTier}
        featureName="Investor & Advisor Matching"
        description="Get AI-powered investor and advisor matches with a Studio tier subscription."
      >
        {/* Boardy Connect Card */}
        {deepLink && <BoardyConnect deepLink={deepLink} />}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Filter Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All
              <CountBadge count={matches.length} />
            </TabsTrigger>
            <TabsTrigger value="investors" className="text-xs sm:text-sm">
              <Briefcase className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Investors
              <CountBadge
                count={
                  matches.filter((m) => m.matchType === "investor").length
                }
              />
            </TabsTrigger>
            <TabsTrigger value="advisors" className="text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Advisors
              <CountBadge
                count={
                  matches.filter(
                    (m) =>
                      m.matchType === "advisor" ||
                      m.matchType === "mentor" ||
                      m.matchType === "partner"
                  ).length
                }
              />
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              <CheckCircle className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Active
              <CountBadge
                count={
                  matches.filter(
                    (m) =>
                      m.status !== "declined" && m.status !== "suggested"
                  ).length
                }
              />
            </TabsTrigger>
            <TabsTrigger value="declined" className="text-xs sm:text-sm">
              <XCircle className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Declined
              <CountBadge
                count={
                  matches.filter((m) => m.status === "declined").length
                }
              />
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Match List */}
        {isLoading ? (
          <MatchListSkeleton />
        ) : (
          <MatchList
            matches={filteredMatches}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </FeatureLock>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-medium text-gray-600 dark:text-gray-400">
      {count}
    </span>
  );
}

function MatchListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
