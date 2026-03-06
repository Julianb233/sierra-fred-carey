"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
import type { FeedbackSignal, FeedbackSession } from "@/lib/feedback/types";
import { INSIGHT_STATUSES } from "@/lib/feedback/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionDetailData {
  session: FeedbackSession;
  signals: FeedbackSignal[];
  messages: Array<{ role: string; content: string; created_at: string }>;
}

// ---------------------------------------------------------------------------
// Triage workflow transitions
// ---------------------------------------------------------------------------

const TRIAGE_TRANSITIONS: Record<string, string[]> = {
  new: ["reviewed"],
  reviewed: ["actioned"],
  actioned: ["resolved"],
  resolved: ["communicated"],
  communicated: [],
};

// ---------------------------------------------------------------------------
// Sentiment colors
// ---------------------------------------------------------------------------

const SENTIMENT_COLORS = {
  positive: "#22c55e",
  neutral: "#6b7280",
  negative: "#f97316",
  frustrated: "#ef4444",
} as const;

function getSentimentLabel(score: number | null): keyof typeof SENTIMENT_COLORS {
  if (score === null) return "neutral";
  if (score > 0.3) return "positive";
  if (score < -0.7) return "frustrated";
  if (score < -0.3) return "negative";
  return "neutral";
}

function getSentimentColor(score: number | null): string {
  return SENTIMENT_COLORS[getSentimentLabel(score)];
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [data, setData] = useState<SessionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("new");

  const fetchDetail = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/feedback/sessions/${sessionId}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const result: SessionDetailData = await res.json();
      setData(result);
      // Determine current triage status from the first insight or default to "new"
      // For now, use session metadata or default
      const sessionStatus =
        (result.session.metadata?.triage_status as string) || "new";
      setCurrentStatus(sessionStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleTriageUpdate = async (newStatus: string) => {
    if (!data) return;
    setTriageLoading(true);
    try {
      // Try updating on feedback_signals first if we have signals
      const targetId = data.signals.length > 0 ? data.signals[0].id : data.session.id;
      const targetTable = data.signals.length > 0 ? "feedback_signals" : "feedback_insights";

      const res = await fetch("/api/admin/feedback/triage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetId,
          table: targetTable,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error(`Triage update failed: ${res.status}`);
      setCurrentStatus(newStatus);
    } catch (err) {
      console.error("[triage] Error:", err);
    } finally {
      setTriageLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/feedback"
          className="text-[#ff6a1a] hover:underline text-sm"
        >
          &larr; Back to Feedback Dashboard
        </Link>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">
              {error || "Session not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { session, signals, messages } = data;

  // Build signal lookup by message created_at (approximate match)
  const signalsByTime: Record<string, FeedbackSignal> = {};
  for (const signal of signals) {
    signalsByTime[signal.created_at] = signal;
  }

  // Find closest signal for a message (within 5 seconds)
  function findSignalForMessage(
    msgCreatedAt: string
  ): FeedbackSignal | undefined {
    const msgTime = new Date(msgCreatedAt).getTime();
    for (const signal of signals) {
      const sigTime = new Date(signal.created_at).getTime();
      if (Math.abs(sigTime - msgTime) < 5000) return signal;
    }
    return undefined;
  }

  const nextStatuses = TRIAGE_TRANSITIONS[currentStatus] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/feedback"
            className="text-[#ff6a1a] hover:underline text-sm mb-2 block"
          >
            &larr; Back to Feedback Dashboard
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Session Detail
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-mono text-xs">{session.id.slice(0, 12)}...</span>
            <Badge variant="outline">{session.channel}</Badge>
            <span>
              {new Date(session.started_at).toLocaleString()}
            </span>
            <span>{session.message_count} messages</span>
            {session.flagged && (
              <Badge
                variant="destructive"
                title={session.flag_reason || "Flagged session"}
              >
                Flagged
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Triage Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Triage Workflow</CardTitle>
          <CardDescription>Progress through the review workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {INSIGHT_STATUSES.map((status) => {
              const isCurrent = status === currentStatus;
              const isPast =
                INSIGHT_STATUSES.indexOf(status) <
                INSIGHT_STATUSES.indexOf(currentStatus as (typeof INSIGHT_STATUSES)[number]);
              return (
                <div key={status} className="flex items-center gap-1">
                  <span
                    className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-[#ff6a1a] text-white"
                        : isPast
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                    }`}
                  >
                    {status}
                  </span>
                  {status !== INSIGHT_STATUSES[INSIGHT_STATUSES.length - 1] && (
                    <span className="text-gray-300 dark:text-gray-600 mx-1">
                      &rarr;
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {nextStatuses.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Move to:
              </span>
              {nextStatuses.map((next) => (
                <Button
                  key={next}
                  size="sm"
                  disabled={triageLoading}
                  onClick={() => handleTriageUpdate(next)}
                  className="bg-[#ff6a1a] hover:bg-[#e55e17] text-white"
                >
                  {triageLoading ? "Updating..." : next}
                </Button>
              ))}
            </div>
          )}
          {nextStatuses.length === 0 && currentStatus === "communicated" && (
            <p className="mt-3 text-sm text-green-600 dark:text-green-400">
              Triage complete -- feedback has been communicated.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sentiment Arc */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sentiment Arc</CardTitle>
          <CardDescription>
            Sentiment progression across the conversation
            {session.sentiment_trend && (
              <Badge
                variant="outline"
                className={`ml-2 ${
                  session.sentiment_trend === "improving"
                    ? "text-green-600 border-green-300"
                    : session.sentiment_trend === "degrading" ||
                        session.sentiment_trend === "spike_negative"
                      ? "text-red-600 border-red-300"
                      : "text-gray-600 border-gray-300"
                }`}
              >
                {session.sentiment_trend.replace("_", " ")}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SentimentArc signals={signals} flagged={session.flagged} />
        </CardContent>
      </Card>

      {/* Conversation Replay */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conversation</CardTitle>
          <CardDescription>
            {messages.length} messages in this session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No conversation messages found for this session.
              </p>
            ) : (
              messages.map((msg, idx) => {
                const signal = findSignalForMessage(msg.created_at);
                const isUser = msg.role === "user";
                return (
                  <div key={idx}>
                    {/* Timestamp divider */}
                    {idx === 0 ||
                    new Date(msg.created_at).getTime() -
                      new Date(messages[idx - 1].created_at).getTime() >
                      60000 ? (
                      <div className="text-center text-xs text-gray-400 dark:text-gray-600 my-2">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </div>
                    ) : null}

                    <div
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                          isUser
                            ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        <div className="text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                          {isUser ? "User" : "FRED"}
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Feedback annotation */}
                        {signal && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-300/30 dark:border-gray-600/30">
                            {signal.rating === 1 && (
                              <span className="text-green-600 text-xs">
                                &#x1F44D;
                              </span>
                            )}
                            {signal.rating === -1 && (
                              <span className="text-red-600 text-xs">
                                &#x1F44E;
                              </span>
                            )}
                            {signal.category === "coaching_discomfort" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400"
                                title="User reacted to FRED challenging their assumptions -- this is FRED working as designed."
                              >
                                Coaching Discomfort
                              </Badge>
                            ) : signal.category ? (
                              <Badge
                                variant="outline"
                                className="text-[10px]"
                              >
                                {signal.category.replace(/_/g, " ")}
                              </Badge>
                            ) : null}
                            {signal.sentiment_score !== null && (
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: getSentimentColor(
                                    signal.sentiment_score
                                  ),
                                }}
                                title={`Sentiment: ${signal.sentiment_score.toFixed(2)}`}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signals Summary Table */}
      {signals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Feedback Signals</CardTitle>
            <CardDescription>
              {signals.length} signal{signals.length !== 1 ? "s" : ""} in this
              session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((signal) => (
                    <TableRow key={signal.id}>
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        {new Date(signal.created_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {signal.signal_type}
                      </TableCell>
                      <TableCell>
                        {signal.rating === 1 && (
                          <span className="text-green-600">&#x1F44D;</span>
                        )}
                        {signal.rating === -1 && (
                          <span className="text-red-600">&#x1F44E;</span>
                        )}
                        {signal.rating === null && (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {signal.category === "coaching_discomfort" ? (
                          <Badge
                            variant="outline"
                            className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400"
                          >
                            coaching discomfort
                          </Badge>
                        ) : (
                          <span className="text-xs">
                            {signal.category?.replace(/_/g, " ") || "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {signal.sentiment_score !== null ? (
                          <span
                            className="inline-flex items-center gap-1"
                          >
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: getSentimentColor(
                                  signal.sentiment_score
                                ),
                              }}
                            />
                            <span className="text-xs font-mono">
                              {signal.sentiment_score.toFixed(2)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {signal.sentiment_confidence !== null
                          ? `${(signal.sentiment_confidence * 100).toFixed(0)}%`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {signal.comment || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sentiment Arc Component
// ---------------------------------------------------------------------------

function SentimentArc({
  signals,
  flagged,
}: {
  signals: FeedbackSignal[];
  flagged: boolean;
}) {
  // Filter to signals with sentiment scores
  const sentimentSignals = signals.filter((s) => s.sentiment_score !== null);

  if (sentimentSignals.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        No sentiment data available for this session.
      </p>
    );
  }

  // Detect degradation segments for highlighting
  const hasDegradation =
    flagged &&
    sentimentSignals.some(
      (s, i) =>
        i > 0 &&
        s.sentiment_score !== null &&
        sentimentSignals[i - 1].sentiment_score !== null &&
        s.sentiment_score! - sentimentSignals[i - 1].sentiment_score! < -0.3
    );

  return (
    <div className="space-y-3">
      {/* Arc visualization */}
      <div className="relative h-16 flex items-center">
        {/* Baseline */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-gray-300 dark:bg-gray-700" />

        {/* Degradation highlight */}
        {hasDegradation && (
          <div className="absolute inset-x-0 top-0 bottom-0 bg-red-50 dark:bg-red-900/10 rounded" />
        )}

        {/* Dots */}
        <div className="relative w-full flex items-center justify-between px-2">
          {sentimentSignals.map((signal, idx) => {
            const score = signal.sentiment_score ?? 0;
            // Map score from [-1, 1] to vertical position [100%, 0%]
            const topPct = ((1 - score) / 2) * 100;
            const color = getSentimentColor(score);
            const label = getSentimentLabel(score);

            return (
              <div
                key={signal.id}
                className="relative flex-1 flex justify-center"
              >
                <div
                  className="absolute w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm transition-all"
                  style={{
                    backgroundColor: color,
                    top: `${topPct}%`,
                    transform: "translate(-50%, -50%)",
                    left: "50%",
                  }}
                  title={`${label}: ${score.toFixed(2)} at ${new Date(signal.created_at).toLocaleTimeString()}`}
                />
                {/* Connecting line to next dot */}
                {idx < sentimentSignals.length - 1 && (
                  <div
                    className="absolute h-px bg-gray-300 dark:bg-gray-600"
                    style={{
                      top: `${topPct}%`,
                      left: "50%",
                      width: "100%",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {Object.entries(SENTIMENT_COLORS).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
