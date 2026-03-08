"use client";

/**
 * Boardy Dashboard Page
 * Phase 04: Studio Tier Features - Plan 06
 * Phase 85: Journey-Gated Fund Matching
 *
 * Investor & Advisor Matching powered by Boardy AI.
 * Dual gated: Studio tier + journey completion (100%).
 * Shows celebration milestone on first unlock.
 */

import { useState, useEffect, useCallback } from "react";
import { Network, RefreshCw, Users, Briefcase, CheckCircle, XCircle, Sparkles, FileText, Mail, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureLock } from "@/components/tier/feature-lock";
import { JourneyGate } from "@/components/journey/journey-gate";
import { CelebrationMilestone } from "@/components/journey/celebration-milestone";
import { JourneyCelebration } from "@/components/boardy/journey-celebration";
import { IntroPrepCard } from "@/components/boardy/intro-prep-card";
import { useUserTier } from "@/lib/context/tier-context";
import { useOasesProgress } from "@/hooks/use-oases-progress";
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
  const { progress } = useOasesProgress();

  // State
  const [matches, setMatches] = useState<BoardyMatch[]>([]);
  const [deepLink, setDeepLink] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showCelebration, setShowCelebration] = useState(false);

  // Check if journey is 100% complete and celebration hasn't been dismissed
  useEffect(() => {
    if (
      progress?.journeyPercentage != null &&
      progress.journeyPercentage >= 100 &&
      typeof window !== "undefined" &&
      !localStorage.getItem("sahara_journey_celebration_dismissed")
    ) {
      setShowCelebration(true);
    }
  }, [progress?.journeyPercentage]);

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
          <div className="flex items-center gap-1.5 mt-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              AI-Generated Suggestions
            </span>
          </div>
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

      {/* Dual Gate: Tier (Studio+) AND Journey (100%) */}
      <FeatureLock
        requiredTier={UserTier.STUDIO}
        currentTier={userTier}
        requiredStage="grow"
        currentStage={progress?.currentStage}
        journeyPercentage={progress?.journeyPercentage}
        featureName="Investor & Advisor Matching"
        description="Complete your venture journey AND upgrade to Studio tier to unlock investor matching."
      >
        <JourneyGate featureName="Investor & Advisor Matching" requiredPercent={100}>
          {/* Celebration milestone -- shows once on first unlock */}
          <CelebrationMilestone />

          {/* Phase 89: Journey celebration banner */}
          {showCelebration && (
            <JourneyCelebration onDismiss={() => setShowCelebration(false)} />
          )}

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
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:w-full sm:grid-cols-5 lg:w-auto lg:inline-grid">
                <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap">
                  All
                  <CountBadge count={matches.length} />
                </TabsTrigger>
                <TabsTrigger value="investors" className="text-xs sm:text-sm whitespace-nowrap">
                  <Briefcase className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                  Investors
                  <CountBadge
                    count={
                      matches.filter((m) => m.matchType === "investor").length
                    }
                  />
                </TabsTrigger>
                <TabsTrigger value="advisors" className="text-xs sm:text-sm whitespace-nowrap">
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
                <TabsTrigger value="active" className="text-xs sm:text-sm whitespace-nowrap">
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
                <TabsTrigger value="declined" className="text-xs sm:text-sm whitespace-nowrap">
                  <XCircle className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                  Declined
                  <CountBadge
                    count={
                      matches.filter((m) => m.status === "declined").length
                    }
                  />
                </TabsTrigger>
              </TabsList>
            </div>
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

          {/* Phase 89: Per-match intro prep cards for connected matches */}
          {!isLoading && filteredMatches.some(
            (m) => m.status === "connected" || m.status === "intro_sent"
          ) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Prepare for Your Introductions
              </h3>
              {filteredMatches
                .filter((m) => m.status === "connected" || m.status === "intro_sent")
                .map((match) => (
                  <IntroPrepCard key={match.id} match={match} />
                ))}
            </div>
          )}

          {/* Preparation for Introductions */}
          <IntroductionPreparation />
        </JourneyGate>
      </FeatureLock>
    </div>
  );
}

// ============================================================================
// Introduction Preparation Section
// ============================================================================

function IntroductionPreparation() {
  return (
    <div className="mt-10 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-[#ff6a1a]" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Preparation for Introductions
        </h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Get ready for your investor and advisor conversations. FRED will personalize these for each match.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Call Script Template */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3 hover:border-[#ff6a1a]/30 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MessageSquare className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
              Call Script Template
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            A structured script for your first call with an investor or advisor.
            Covers your elevator pitch, key metrics, and questions to ask.
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#ff6a1a]" />
              30-second elevator pitch
            </li>
            <li className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#ff6a1a]" />
              Key traction metrics to highlight
            </li>
            <li className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#ff6a1a]" />
              Questions to ask your match
            </li>
          </ul>
        </div>

        {/* Email Template */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3 hover:border-[#ff6a1a]/30 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Mail className="w-4.5 h-4.5 text-green-500" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
              Email Template
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            A concise, professional email template for following up after an introduction
            or reaching out cold.
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#ff6a1a]" />
              Subject line best practices
            </li>
            <li className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#ff6a1a]" />
              3-paragraph structure
            </li>
            <li className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#ff6a1a]" />
              Clear call-to-action
            </li>
          </ul>
        </div>

        {/* Key Talking Points */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3 hover:border-[#ff6a1a]/30 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-purple-500" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
              Key Talking Points
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Based on your Reality Lens strengths, these are the key points to emphasize
            in every investor conversation.
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#ff6a1a]" />
              Your strongest value propositions
            </li>
            <li className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#ff6a1a]" />
              Market opportunity framing
            </li>
            <li className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#ff6a1a]" />
              Competitive advantage narrative
            </li>
          </ul>
        </div>
      </div>
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
