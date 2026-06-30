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
import { TIER_NAMES, type UserTier } from "@/lib/constants";

interface PrioritizedFounder {
  userId: string;
  headline: string;
  currentFocus: string;
  sentiment: "positive" | "neutral" | "frustrated" | "at_risk";
  priorityScore: number;
  upsellRecommended: boolean;
  upsellTargetTier: number | null;
  upsellUrgency: string | null;
  upsellConfidence: number | null;
  lastSummaryAt: string;
}

interface PrioritizedQueues {
  generatedAt: string;
  totalFounders: number;
  attentionQueue: PrioritizedFounder[];
  upsellCandidates: PrioritizedFounder[];
}

const sentimentBadge: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  neutral: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  frustrated: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  at_risk: "bg-red-500/10 text-red-600 border border-red-500/20",
};

const urgencyBadge: Record<string, string> = {
  high: "bg-[#ff6a1a]/10 text-[#ff6a1a] border border-[#ff6a1a]/20",
  medium: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

function tierLabel(tier: number | null): string {
  if (tier == null) return "—";
  return TIER_NAMES[tier as UserTier] ?? `Tier ${tier}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ConversationPrioritiesPage() {
  const [data, setData] = useState<PrioritizedQueues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/conversation-priorities", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setData(json.data as PrioritizedQueues);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load priorities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Conversation Priorities
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {data
              ? `${data.totalFounders} founders summarized · ${data.attentionQueue.length} need attention · ${data.upsellCandidates.length} upsell candidates`
              : "Prioritization + upsell signals from founder conversations"}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {/* Attention Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Needs Attention</CardTitle>
          <CardDescription>
            Founders with the highest priority scores — reach out first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Score</TableHead>
                <TableHead>Founder</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead className="hidden md:table-cell">Focus</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.attentionQueue.map((f) => (
                <TableRow key={`a-${f.userId}`}>
                  <TableCell className="font-bold text-[#ff6a1a]">
                    {f.priorityScore}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <div className="font-medium truncate">{f.headline}</div>
                    <div className="text-xs text-gray-400 font-mono truncate">
                      {f.userId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        sentimentBadge[f.sentiment] ?? sentimentBadge.neutral
                      }
                    >
                      {f.sentiment.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[260px] truncate text-sm text-gray-500">
                    {f.currentFocus || "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {fmtDate(f.lastSummaryAt)}
                  </TableCell>
                </TableRow>
              ))}
              {data && data.attentionQueue.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-sm text-gray-400"
                  >
                    No founders currently flagged for attention.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upsell Candidates */}
      <Card>
        <CardHeader>
          <CardTitle>Upsell Candidates</CardTitle>
          <CardDescription>
            Founders showing interest in higher-tier capabilities, most
            confident first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Founder</TableHead>
                <TableHead>Recommend</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.upsellCandidates.map((f) => (
                <TableRow key={`u-${f.userId}`}>
                  <TableCell className="max-w-[280px]">
                    <div className="font-medium truncate">{f.headline}</div>
                    <div className="text-xs text-gray-400 font-mono truncate">
                      {f.userId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-[#ff6a1a]/10 text-[#ff6a1a] border border-[#ff6a1a]/20">
                      → {tierLabel(f.upsellTargetTier)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        urgencyBadge[f.upsellUrgency ?? "low"] ??
                        urgencyBadge.low
                      }
                    >
                      {f.upsellUrgency ?? "low"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {f.upsellConfidence == null
                      ? "—"
                      : `${Math.round(f.upsellConfidence * 100)}%`}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {fmtDate(f.lastSummaryAt)}
                  </TableCell>
                </TableRow>
              ))}
              {data && data.upsellCandidates.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-sm text-gray-400"
                  >
                    No upsell candidates right now.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
