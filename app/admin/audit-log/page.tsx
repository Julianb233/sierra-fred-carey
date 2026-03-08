"use client";

import { useEffect, useState, useCallback } from "react";
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
import type { FredAuditLogEntry } from "@/lib/audit/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditStats {
  totalInteractions: number;
  avgLatency: number;
  topicDistribution: Record<string, number>;
  tierDistribution: Record<string, number>;
  sentimentDistribution: Record<string, number>;
  thumbsUp: number;
  thumbsDown: number;
  feedbackRate: number;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  topic: string;
  tier: string;
  model: string;
  oasesStage: string;
  activeMode: string;
  sentimentLabel: string;
  feedbackRating: string;
}

interface AuditListResult {
  data: FredAuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQuery(filters: Filters, page: number): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.tier) params.set("tier", filters.tier);
  if (filters.model) params.set("model", filters.model);
  if (filters.oasesStage) params.set("oasesStage", filters.oasesStage);
  if (filters.activeMode) params.set("activeMode", filters.activeMode);
  if (filters.sentimentLabel) params.set("sentimentLabel", filters.sentimentLabel);
  if (filters.feedbackRating) params.set("feedbackRating", filters.feedbackRating);
  params.set("page", String(page));
  params.set("pageSize", "25");
  return params.toString();
}

function sentimentColor(label: string | null) {
  if (!label) return "secondary";
  if (label === "positive") return "default";
  if (label === "neutral") return "secondary";
  return "destructive";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AuditLogPage() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [result, setResult] = useState<AuditListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: "",
    dateTo: "",
    topic: "",
    tier: "",
    model: "",
    oasesStage: "",
    activeMode: "",
    sentimentLabel: "",
    feedbackRating: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = buildQuery(filters, page);
      const [statsRes, listRes] = await Promise.all([
        fetch(`/api/admin/audit-log?mode=stats&${q}`),
        fetch(`/api/admin/audit-log?${q}`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (listRes.ok) setResult(await listRes.json());
    } catch (err) {
      console.error("Failed to fetch audit data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleExport = () => {
    const q = buildQuery(filters, 1);
    window.open(`/api/admin/audit-log/export?${q}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            FRED Audit Log
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Every FRED interaction with full context
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : stats?.totalInteractions?.toLocaleString() ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Latency</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : `${stats?.avgLatency ?? 0}ms`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Feedback Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : `${stats?.feedbackRate ?? 0}%`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Thumbs Up / Down</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span>
                  <span className="text-green-600">{stats?.thumbsUp ?? 0}</span>
                  {" / "}
                  <span className="text-red-500">{stats?.thumbsDown ?? 0}</span>
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Topic & Tier Distribution */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Topic Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.topicDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([topic, count]) => (
                    <Badge key={topic} variant="secondary" className="cursor-pointer" onClick={() => handleFilterChange("topic", topic)}>
                      {topic}: {count}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tier Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.tierDistribution).map(([tier, count]) => (
                  <Badge key={tier} variant="outline" className="cursor-pointer" onClick={() => handleFilterChange("tier", tier)}>
                    {tier}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              placeholder="From"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              placeholder="To"
            />
            <select
              value={filters.topic}
              onChange={(e) => handleFilterChange("topic", e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <option value="">All topics</option>
              {["fundraising", "pitchReview", "strategy", "positioning", "mindset", "general"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={filters.tier}
              onChange={(e) => handleFilterChange("tier", e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <option value="">All tiers</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="studio">Studio</option>
            </select>
            <select
              value={filters.sentimentLabel}
              onChange={(e) => handleFilterChange("sentimentLabel", e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <option value="">All sentiments</option>
              {["positive", "neutral", "negative", "frustrated"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filters.feedbackRating}
              onChange={(e) => handleFilterChange("feedbackRating", e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <option value="">All ratings</option>
              <option value="1">Thumbs up</option>
              <option value="-1">Thumbs down</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({
                  dateFrom: "",
                  dateTo: "",
                  topic: "",
                  tier: "",
                  model: "",
                  oasesStage: "",
                  activeMode: "",
                  sentimentLabel: "",
                  feedbackRating: "",
                });
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Time</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : result?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No audit log entries found
                  </TableCell>
                </TableRow>
              ) : (
                result?.data.map((row) => (
                  <>
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <TableCell className="text-xs text-gray-500">
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.detected_topic || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.tier}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{row.oases_stage || "—"}</TableCell>
                      <TableCell className="text-xs">{row.model_used || "—"}</TableCell>
                      <TableCell className="text-right text-xs">
                        {row.latency_ms ? `${row.latency_ms}ms` : "—"}
                      </TableCell>
                      <TableCell>
                        {row.sentiment_label ? (
                          <Badge variant={sentimentColor(row.sentiment_label)}>
                            {row.sentiment_label}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {row.feedback_rating === 1 ? "👍" : row.feedback_rating === -1 ? "👎" : "—"}
                      </TableCell>
                    </TableRow>
                    {expandedId === row.id && (
                      <TableRow key={`${row.id}-detail`}>
                        <TableCell colSpan={8} className="bg-gray-50 dark:bg-gray-800/30">
                          <div className="space-y-3 p-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-1">User Message</p>
                              <p className="text-sm whitespace-pre-wrap">{row.user_message}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-1">FRED Response</p>
                              <p className="text-sm whitespace-pre-wrap">{row.fred_response || "—"}</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                              <div>Intent: {row.detected_intent || "—"}</div>
                              <div>Mode: {row.active_mode || "—"}</div>
                              <div>Page: {row.page_context || "—"}</div>
                              <div>Confidence: {row.response_confidence ?? "—"}</div>
                              <div>RL Score: {row.reality_lens_score ?? "—"}</div>
                              <div>IRS Score: {row.irs_score ?? "—"}</div>
                              <div>Step: {row.startup_process_step || "—"}</div>
                              <div>Session: {row.session_id?.slice(0, 8) || "—"}</div>
                            </div>
                            {row.feedback_comment && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Feedback Comment</p>
                                <p className="text-sm">{row.feedback_comment}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {result.page} of {result.totalPages} ({result.total} entries)
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
              disabled={page >= result.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
