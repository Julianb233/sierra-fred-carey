"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FEEDBACK_CHANNELS, FEEDBACK_CATEGORIES } from "@/lib/feedback/constants";
import type { FeedbackSignal } from "@/lib/feedback/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeedbackStatsData {
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  sentimentCount: number;
  flaggedSessionCount: number;
  categoryDistribution: Record<string, number>;
  dailyVolume: Array<{ date: string; count: number }>;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  channel: string;
  rating: string;
  category: string;
  tier: string;
  userId: string;
}

interface SessionListItem {
  id: string;
  user_id: string;
  channel: string;
  started_at: string;
  message_count: number;
  sentiment_trend: string | null;
  flagged: boolean;
  flag_reason: string | null;
  signal_count: number;
}

interface TopInsight {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  severity: string;
  signal_count: number;
  status: string;
  linear_issue_id: string | null;
  created_at: string;
}

interface PatchItem {
  id: string;
  version: number;
  topic: string;
  patch_type: string;
  content: string;
  status: string;
  source_insight_id: string | null;
  source_signal_ids: string[];
  thumbs_up_before: number | null;
  thumbs_up_after: number | null;
  tracking_started_at: string | null;
  tracking_ends_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

type ActiveTab = "signals" | "sessions" | "patches";

const DEFAULT_FILTERS: Filters = {
  dateFrom: "",
  dateTo: "",
  channel: "",
  rating: "",
  category: "",
  tier: "",
  userId: "",
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminFeedbackPage() {
  const [stats, setStats] = useState<FeedbackStatsData | null>(null);
  const [signals, setSignals] = useState<FeedbackSignal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("signals");
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<TopInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [creatingLinear, setCreatingLinear] = useState<string | null>(null);
  const [patches, setPatches] = useState<PatchItem[]>([]);
  const [loadingPatches, setLoadingPatches] = useState(false);
  const [updatingPatch, setUpdatingPatch] = useState<string | null>(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const res = await fetch(`/api/admin/feedback/stats?${params.toString()}`);
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
      const data: FeedbackStatsData = await res.json();
      setStats(data);
    } catch (err) {
      console.error("[feedback] Stats error:", err);
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoadingStats(false);
    }
  }, [filters.dateFrom, filters.dateTo]);

  // Fetch signals
  const fetchSignals = useCallback(async () => {
    setLoadingSignals(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.channel) params.set("channel", filters.channel);
      if (filters.rating) params.set("rating", filters.rating);
      if (filters.category) params.set("category", filters.category);
      if (filters.tier) params.set("tier", filters.tier);
      if (filters.userId) params.set("userId", filters.userId);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/admin/feedback?${params.toString()}`);
      if (!res.ok) throw new Error(`Signals fetch failed: ${res.status}`);
      const data = await res.json();
      setSignals(data.signals);
      setTotal(data.total);
    } catch (err) {
      console.error("[feedback] Signals error:", err);
      setError(err instanceof Error ? err.message : "Failed to load signals");
    } finally {
      setLoadingSignals(false);
    }
  }, [filters, page, limit]);

  // Fetch insights (Top Issues This Week)
  const fetchInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch("/api/admin/feedback/insights?limit=10");
      if (!res.ok) throw new Error(`Insights fetch failed: ${res.status}`);
      const data = await res.json();
      setInsights(data.insights ?? []);
    } catch (err) {
      console.error("[feedback] Insights error:", err);
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  // Create Linear issue from insight
  const handleCreateLinear = async (insightId: string) => {
    setCreatingLinear(insightId);
    try {
      const res = await fetch(`/api/admin/feedback/insights/${insightId}/linear`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInsights((prev) =>
          prev.map((i) =>
            i.id === insightId
              ? { ...i, linear_issue_id: data.identifier, status: "actioned" }
              : i
          )
        );
      } else {
        console.error("Linear creation failed:", data.error);
      }
    } catch (err) {
      console.error("[feedback] Linear creation error:", err);
    } finally {
      setCreatingLinear(null);
    }
  };

  // Fetch patches (Phase 76)
  const fetchPatches = useCallback(async () => {
    setLoadingPatches(true);
    try {
      const res = await fetch("/api/admin/feedback/patches?status=all&limit=100");
      if (!res.ok) throw new Error(`Patches fetch failed: ${res.status}`);
      const data = await res.json();
      setPatches(data.patches ?? []);
    } catch (err) {
      console.error("[feedback] Patches error:", err);
    } finally {
      setLoadingPatches(false);
    }
  }, []);

  // Update patch status
  const handlePatchAction = async (patchId: string, action: string, extra?: Record<string, unknown>) => {
    setUpdatingPatch(patchId);
    try {
      const res = await fetch(`/api/admin/feedback/patches/${patchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, ...extra }),
      });
      if (res.ok) {
        fetchPatches();
      } else {
        const data = await res.json();
        console.error("Patch update failed:", data.error);
      }
    } catch (err) {
      console.error("[feedback] Patch update error:", err);
    } finally {
      setUpdatingPatch(null);
    }
  };

  // Create experiment from patch
  const handleCreateExperiment = async (patchId: string) => {
    setUpdatingPatch(patchId);
    try {
      const res = await fetch(`/api/admin/feedback/patches/${patchId}/experiment`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchPatches();
      } else {
        console.error("Experiment creation failed:", data.error);
      }
    } catch (err) {
      console.error("[feedback] Experiment creation error:", err);
    } finally {
      setUpdatingPatch(null);
    }
  };

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/admin/feedback/sessions");
      if (!res.ok) throw new Error(`Sessions fetch failed: ${res.status}`);
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (err) {
      console.error("[feedback] Sessions error:", err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  useEffect(() => {
    if (activeTab === "sessions" && sessions.length === 0) {
      fetchSessions();
    }
  }, [activeTab, sessions.length, fetchSessions]);

  useEffect(() => {
    if (activeTab === "patches" && patches.length === 0) {
      fetchPatches();
    }
  }, [activeTab, patches.length, fetchPatches]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchStats();
    fetchSignals();
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const totalPages = Math.ceil(total / limit);
  const posNegRatio =
    stats && stats.negativeCount > 0
      ? (stats.positiveCount / stats.negativeCount).toFixed(1)
      : stats?.positiveCount
        ? "all positive"
        : "N/A";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Feedback Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Feedback signals, sentiment trends, and session analysis
        </p>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Signals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#ff6a1a]">
                {stats.totalSignals}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Positive / Negative Ratio</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold ${
                  typeof posNegRatio === "string" && posNegRatio === "all positive"
                    ? "text-green-600"
                    : typeof posNegRatio === "string" &&
                        posNegRatio !== "N/A" &&
                        parseFloat(posNegRatio) >= 2
                      ? "text-green-600"
                      : typeof posNegRatio === "string" &&
                          posNegRatio !== "N/A" &&
                          parseFloat(posNegRatio) < 1
                        ? "text-red-600"
                        : "text-[#ff6a1a]"
                }`}
              >
                {typeof posNegRatio === "string" && posNegRatio !== "N/A" && posNegRatio !== "all positive"
                  ? `${posNegRatio}:1`
                  : posNegRatio}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sentiment Signals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#ff6a1a]">
                {stats.sentimentCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Flagged Sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.flaggedSessionCount > 0 ? (
                  <span className="text-red-600">
                    {stats.flaggedSessionCount}
                    <Badge
                      variant="destructive"
                      className="ml-2 text-xs align-middle"
                    >
                      Alert
                    </Badge>
                  </span>
                ) : (
                  <span className="text-[#ff6a1a]">0</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Top Issues This Week */}
      <Card>
        <CardHeader>
          <CardTitle>Top Issues This Week</CardTitle>
          <CardDescription>
            AI-detected feedback patterns ranked by frequency
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInsights ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : insights.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              No feedback patterns detected this week.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Signals</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linear</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insights.map((insight) => (
                    <TableRow key={insight.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {insight.title}
                          </div>
                          {insight.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-[300px] truncate">
                              {insight.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={insight.severity} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-[#ff6a1a]">
                          {insight.signal_count}
                        </span>
                      </TableCell>
                      <TableCell>
                        <CategoryCell category={insight.category} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {insight.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {insight.linear_issue_id ? (
                          <a
                            href={`https://linear.app/ai-acrobatics/issue/${insight.linear_issue_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#ff6a1a] hover:underline font-mono"
                          >
                            {insight.linear_issue_id}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!insight.linear_issue_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            disabled={creatingLinear === insight.id}
                            onClick={() => handleCreateLinear(insight.id)}
                          >
                            {creatingLinear === insight.id ? "Creating..." : "Create Linear Issue"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter("dateFrom", e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter("dateTo", e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]"
              />
            </div>

            {/* Channel */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Channel
              </label>
              <select
                value={filters.channel}
                onChange={(e) => updateFilter("channel", e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]"
              >
                <option value="">All Channels</option>
                {FEEDBACK_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Rating
              </label>
              <select
                value={filters.rating}
                onChange={(e) => updateFilter("rating", e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]"
              >
                <option value="">All Ratings</option>
                <option value="1">Positive</option>
                <option value="-1">Negative</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter("category", e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]"
              >
                <option value="">All Categories</option>
                {FEEDBACK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Tier */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Tier
              </label>
              <select
                value={filters.tier}
                onChange={(e) => updateFilter("tier", e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]"
              >
                <option value="">All Tiers</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="studio">Studio</option>
              </select>
            </div>

            {/* User ID */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => updateFilter("userId", e.target.value)}
                placeholder="Search by user ID..."
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-end gap-2">
              <Button
                onClick={handleApplyFilters}
                className="bg-[#ff6a1a] hover:bg-[#e55e17] text-white"
              >
                Apply
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
                  if (filters.dateTo) params.set("dateTo", filters.dateTo);
                  if (filters.channel) params.set("channel", filters.channel);
                  if (filters.rating) params.set("rating", filters.rating);
                  if (filters.category) params.set("category", filters.category);
                  if (filters.tier) params.set("tier", filters.tier);
                  if (filters.userId) params.set("userId", filters.userId);
                  window.open(`/api/admin/feedback/export?${params.toString()}`, "_blank");
                }}
              >
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "signals" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("signals")}
          className={activeTab === "signals" ? "bg-[#ff6a1a] hover:bg-[#e55e17] text-white" : ""}
        >
          Signals
        </Button>
        <Button
          variant={activeTab === "sessions" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("sessions")}
          className={activeTab === "sessions" ? "bg-[#ff6a1a] hover:bg-[#e55e17] text-white" : ""}
        >
          Sessions
        </Button>
        <Button
          variant={activeTab === "patches" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("patches")}
          className={activeTab === "patches" ? "bg-[#ff6a1a] hover:bg-[#e55e17] text-white" : ""}
        >
          Prompt Patches
        </Button>
      </div>

      {/* Feedback Signals Table */}
      {activeTab === "signals" && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback Signals</CardTitle>
            <CardDescription>
              {total} signal{total !== 1 ? "s" : ""} found
              {total > 0 && ` (page ${page} of ${totalPages})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSignals ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : signals.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No feedback signals found. Adjust filters or wait for data to arrive.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Sentiment</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signals.map((signal) => {
                        const hasSession = !!signal.session_id;
                        const row = (
                          <TableRow
                            key={signal.id}
                            className={hasSession ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""}
                          >
                            <TableCell className="text-xs font-mono whitespace-nowrap">
                              {new Date(signal.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs">{signal.channel}</TableCell>
                            <TableCell className="text-xs">{signal.signal_type}</TableCell>
                            <TableCell>
                              <RatingCell rating={signal.rating} />
                            </TableCell>
                            <TableCell>
                              <CategoryCell category={signal.category} />
                            </TableCell>
                            <TableCell>
                              <TierBadge tier={signal.user_tier} />
                            </TableCell>
                            <TableCell>
                              <SentimentCell
                                score={signal.sentiment_score}
                                metadata={signal.metadata}
                              />
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">
                              {signal.comment || "-"}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {signal.user_id?.slice(0, 8) || "-"}
                            </TableCell>
                          </TableRow>
                        );

                        if (hasSession) {
                          return (
                            <Link
                              key={signal.id}
                              href={`/admin/feedback/${signal.session_id}`}
                              className="contents"
                            >
                              {row}
                            </Link>
                          );
                        }
                        return row;
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {(page - 1) * limit + 1}-
                      {Math.min(page * limit, total)} of {total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      {activeTab === "sessions" && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback Sessions</CardTitle>
            <CardDescription>
              Sessions with feedback signals -- click to drill down
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No feedback sessions found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Signals</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/admin/feedback/${session.id}`}
                        className="contents"
                      >
                        <TableRow className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${session.flagged ? "border-l-4 border-l-red-500" : ""}`}>
                          <TableCell className="text-xs font-mono">
                            {session.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {session.user_id?.slice(0, 8) || "-"}
                          </TableCell>
                          <TableCell className="text-xs">{session.channel}</TableCell>
                          <TableCell className="text-xs">{session.message_count}</TableCell>
                          <TableCell className="text-xs">{session.signal_count}</TableCell>
                          <TableCell>
                            <TrendBadge trend={session.sentiment_trend} />
                          </TableCell>
                          <TableCell>
                            {session.flagged ? (
                              <Badge
                                variant="destructive"
                                title={session.flag_reason || "Flagged"}
                              >
                                Flagged
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-400">OK</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {new Date(session.started_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      </Link>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prompt Patches (Phase 76) */}
      {activeTab === "patches" && (
        <Card>
          <CardHeader>
            <CardTitle>Prompt Patches</CardTitle>
            <CardDescription>
              RLHF-lite patches generated from feedback patterns. Review, approve, and deploy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPatches ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : patches.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No prompt patches found. Patches are auto-generated when feedback patterns are detected.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Signals</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patches.map((patch) => {
                      const meta = patch.metadata as Record<string, unknown>;
                      const confidence = String(meta?.generation_confidence || meta?.confidence || "");
                      const trackingActive = patch.tracking_started_at && patch.tracking_ends_at;
                      const improvement =
                        patch.thumbs_up_before !== null && patch.thumbs_up_after !== null
                          ? ((patch.thumbs_up_after - patch.thumbs_up_before) * 100).toFixed(1)
                          : null;

                      return (
                        <TableRow key={patch.id}>
                          <TableCell className="text-sm font-medium text-gray-900 dark:text-white">
                            {patch.topic.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {patch.patch_type.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            v{patch.version}
                          </TableCell>
                          <TableCell>
                            <PatchStatusBadge status={patch.status} />
                          </TableCell>
                          <TableCell className="text-xs max-w-[250px]">
                            <div className="truncate" title={patch.content}>
                              {patch.content.slice(0, 120)}
                              {patch.content.length > 120 ? "..." : ""}
                            </div>
                            {confidence && confidence !== "undefined" ? (
                              <span className="text-xs text-gray-400 mt-0.5 block">
                                Confidence: {confidence}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-[#ff6a1a]">
                            {patch.source_signal_ids?.length ?? 0}
                          </TableCell>
                          <TableCell className="text-xs">
                            {trackingActive ? (
                              <div>
                                {improvement !== null ? (
                                  <span
                                    className={`font-semibold ${
                                      parseFloat(improvement) > 0
                                        ? "text-green-600"
                                        : parseFloat(improvement) < 0
                                          ? "text-red-600"
                                          : "text-gray-500"
                                    }`}
                                  >
                                    {parseFloat(improvement) > 0 ? "+" : ""}
                                    {improvement}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">
                                    Tracking...
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {new Date(patch.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {patch.status === "draft" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  disabled={updatingPatch === patch.id}
                                  onClick={() => handlePatchAction(patch.id, "pending_review")}
                                >
                                  Submit
                                </Button>
                              )}
                              {patch.status === "pending_review" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs text-green-700 border-green-300"
                                    disabled={updatingPatch === patch.id}
                                    onClick={() => handlePatchAction(patch.id, "approved")}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs text-red-700 border-red-300"
                                    disabled={updatingPatch === patch.id}
                                    onClick={() => handlePatchAction(patch.id, "rejected")}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {patch.status === "approved" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs bg-[#ff6a1a] text-white hover:bg-[#e55e17]"
                                    disabled={updatingPatch === patch.id}
                                    onClick={() => handlePatchAction(patch.id, "active")}
                                  >
                                    Deploy
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    disabled={updatingPatch === patch.id}
                                    onClick={() => handleCreateExperiment(patch.id)}
                                  >
                                    A/B Test
                                  </Button>
                                </>
                              )}
                              {patch.status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  disabled={updatingPatch === patch.id}
                                  onClick={() => handlePatchAction(patch.id, "retired")}
                                >
                                  Retire
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Distribution */}
      {stats &&
        Object.keys(stats.categoryDistribution).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>
                Feedback breakdown by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.categoryDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => {
                    const maxCount = Math.max(
                      ...Object.values(stats.categoryDistribution)
                    );
                    const widthPct =
                      maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {category.replace(/_/g, " ")}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {count}
                          </span>
                        </div>
                        <div className="h-6 w-full bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                          <div
                            className="h-full bg-[#ff6a1a] rounded-md transition-all duration-500"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function RatingCell({ rating }: { rating: number | null }) {
  if (rating === 1) {
    return (
      <span className="text-green-600 text-lg" title="Positive">
        &#x1F44D;
      </span>
    );
  }
  if (rating === -1) {
    return (
      <span className="text-red-600 text-lg" title="Negative">
        &#x1F44E;
      </span>
    );
  }
  return <span className="text-gray-400">-</span>;
}

function CategoryCell({ category }: { category: string | null }) {
  if (!category) return <span className="text-gray-400">-</span>;

  if (category === "coaching_discomfort") {
    return (
      <Badge
        variant="outline"
        className="border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400 text-xs"
      >
        coaching discomfort
      </Badge>
    );
  }

  return (
    <span className="text-xs text-gray-700 dark:text-gray-300">
      {category.replace(/_/g, " ")}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    free: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    pro: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    studio:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[tier] || colors.free}`}
    >
      {tier}
    </span>
  );
}

function TrendBadge({ trend }: { trend: string | null }) {
  if (!trend) return <span className="text-gray-400 text-xs">-</span>;

  const trendColors: Record<string, string> = {
    improving:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    stable:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    degrading:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    spike_negative:
      "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <Badge
      variant="outline"
      className={`text-xs ${trendColors[trend] || trendColors.stable}`}
    >
      {trend.replace(/_/g, " ")}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || colors.low}`}
    >
      {severity}
    </span>
  );
}

function PatchStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    pending_review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    approved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    retired: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.draft}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SentimentCell({
  score,
  metadata,
}: {
  score: number | null;
  metadata: Record<string, unknown> | null;
}) {
  if (score === null && !metadata) {
    return <span className="text-gray-400">-</span>;
  }

  const label =
    (metadata?.label as string) ||
    (score !== null
      ? score > 0.3
        ? "positive"
        : score < -0.3
          ? score < -0.7
            ? "frustrated"
            : "negative"
          : "neutral"
      : "neutral");

  const colors: Record<string, string> = {
    positive:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    neutral:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    negative:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    frustrated:
      "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <Badge
      variant="outline"
      className={`text-xs ${colors[label] || colors.neutral}`}
    >
      {label}
    </Badge>
  );
}
