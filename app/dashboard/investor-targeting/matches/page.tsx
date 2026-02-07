"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Target,
  Loader2,
  AlertCircle,
  Mail,
  Globe,
  ArrowUpDown,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface MatchResult {
  id: string;
  userId: string;
  investorId: string;
  investorName: string;
  investorFirm: string | null;
  investorEmail: string | null;
  investorWebsite: string | null;
  investorStageFocus: string[] | null;
  investorSectorFocus: string[] | null;
  investorCheckSizeMin: number | null;
  investorCheckSizeMax: number | null;
  investorLocation: string | null;
  overallScore: number;
  stageScore: number;
  sectorScore: number;
  sizeScore: number;
  reasoning: string;
  status: string;
  createdAt: string;
}

type SortField = "score" | "name";

// ============================================================================
// Score Helpers
// ============================================================================

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "contacted":
      return {
        label: "Contacted",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      };
    case "interested":
      return {
        label: "Interested",
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      };
    case "passed":
      return {
        label: "Passed",
        className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      };
    default:
      return {
        label: "New",
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      };
  }
}

function formatCheckSize(min: number | null, max: number | null): string {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return "N/A";
}

// ============================================================================
// Score Bar Component
// ============================================================================

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-12 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("h-full rounded-full", getScoreBg(score))}
        />
      </div>
      <span className={cn("text-xs font-medium w-8 text-right", getScoreColor(score))}>
        {score}
      </span>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function InvestorMatchesPage() {
  const { tier, isLoading: isTierLoading } = useUserTier();

  if (isTierLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <FeatureLock
      requiredTier={UserTier.STUDIO}
      currentTier={tier}
      featureName="Investor Matches"
      description="View AI-scored investor recommendations for your startup."
    >
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
          </div>
        }
      >
        <InvestorMatchesContent />
      </Suspense>
    </FeatureLock>
  );
}

// ============================================================================
// Content Component
// ============================================================================

function InvestorMatchesContent() {
  const searchParams = useSearchParams();
  const listId = searchParams.get("listId");

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("score");

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (listId) params.set("listId", listId);

      const res = await fetch(`/api/investors/match?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load matches");
        return;
      }

      setMatches(data.matches || []);
    } catch {
      setError("Failed to load match results");
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const sortedMatches = [...matches].sort((a, b) => {
    if (sortBy === "name") return a.investorName.localeCompare(b.investorName);
    return b.overallScore - a.overallScore;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/investor-targeting">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Investor Matches
              </h1>
              <p className="text-sm text-gray-500">
                AI-scored recommendations ranked by fit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortBy(sortBy === "score" ? "name" : "score")}
              className="gap-1.5"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort by {sortBy === "score" ? "Name" : "Score"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          /* Loading Skeleton */
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : matches.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="py-16 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#ff6a1a]/20 to-orange-400/20 flex items-center justify-center"
              >
                <Target className="h-8 w-8 text-[#ff6a1a]" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Matches Yet
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Upload an investor list and run AI matching to see scored
                recommendations here.
              </p>
              <Link href="/dashboard/investor-targeting">
                <Button className="bg-[#ff6a1a] hover:bg-[#ea580c]">
                  Go to Investor Targeting
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          /* Match Results */
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm text-gray-500">
                {matches.length} investor{matches.length !== 1 ? "s" : ""} matched
              </span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-500">
                Average score:{" "}
                <span className="font-medium">
                  {Math.round(
                    matches.reduce((sum, m) => sum + m.overallScore, 0) /
                      matches.length
                  )}
                  /100
                </span>
              </span>
            </div>

            {sortedMatches.map((match, index) => {
              const statusBadge = getStatusBadge(match.status);

              return (
                <motion.div
                  key={match.id || match.investorId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Score circle */}
                        <div className="flex items-start lg:items-center">
                          <div
                            className={cn(
                              "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0",
                              match.overallScore >= 70
                                ? "bg-green-500"
                                : match.overallScore >= 40
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            )}
                          >
                            {match.overallScore}
                          </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {match.investorName}
                              </h3>
                              {match.investorFirm && (
                                <p className="text-sm text-gray-500">
                                  {match.investorFirm}
                                </p>
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full shrink-0",
                                statusBadge.className
                              )}
                            >
                              {statusBadge.label}
                            </span>
                          </div>

                          {/* Score breakdown */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                            <ScoreBar label="Stage" score={match.stageScore} />
                            <ScoreBar label="Sector" score={match.sectorScore} />
                            <ScoreBar label="Size" score={match.sizeScore} />
                          </div>

                          {/* AI Reasoning */}
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-[#ff6a1a] mt-0.5 shrink-0" />
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {match.reasoning}
                              </p>
                            </div>
                          </div>

                          {/* Investor details */}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            {match.investorStageFocus &&
                              match.investorStageFocus.length > 0 && (
                                <span>
                                  Stages:{" "}
                                  {match.investorStageFocus.join(", ")}
                                </span>
                              )}
                            {match.investorSectorFocus &&
                              match.investorSectorFocus.length > 0 && (
                                <span>
                                  Sectors:{" "}
                                  {match.investorSectorFocus.join(", ")}
                                </span>
                              )}
                            {(match.investorCheckSizeMin ||
                              match.investorCheckSizeMax) && (
                              <span>
                                Check:{" "}
                                {formatCheckSize(
                                  match.investorCheckSizeMin,
                                  match.investorCheckSizeMax
                                )}
                              </span>
                            )}
                            {match.investorLocation && (
                              <span>{match.investorLocation}</span>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 mt-3">
                            {match.investorEmail && (
                              <a
                                href={`mailto:${match.investorEmail}`}
                                className="inline-flex"
                              >
                                <Button size="sm" variant="outline" className="gap-1.5">
                                  <Mail className="h-3.5 w-3.5" />
                                  Email
                                </Button>
                              </a>
                            )}
                            {match.investorWebsite && (
                              <a
                                href={
                                  match.investorWebsite.startsWith("http")
                                    ? match.investorWebsite
                                    : `https://${match.investorWebsite}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex"
                              >
                                <Button size="sm" variant="outline" className="gap-1.5">
                                  <Globe className="h-3.5 w-3.5" />
                                  Website
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
