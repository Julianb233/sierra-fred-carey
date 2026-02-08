"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Users,
} from "lucide-react";
import { FeatureLock } from "@/components/tier/feature-lock";
import { SessionDetail } from "@/components/coaching/session-detail";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CoachingSession {
  id: string;
  user_id: string;
  room_name: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  participant_count?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function statusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "in_progress":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "scheduled":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  }
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ============================================================================
// Session Row
// ============================================================================

function SessionRow({
  session,
  onClick,
  isSelected,
}: {
  session: CoachingSession;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 rounded-lg border transition-colors",
        "hover:border-[#ff6a1a]/40 hover:bg-orange-50/50 dark:hover:bg-orange-900/10",
        isSelected
          ? "border-[#ff6a1a] bg-orange-50/80 dark:bg-orange-900/20"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#ff6a1a]/20 to-orange-400/20 flex items-center justify-center">
            <Video className="h-4 w-4 text-[#ff6a1a]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {session.room_name}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{formatDate(session.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {session.participant_count != null && session.participant_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Users className="h-3 w-3" />
              <span>{session.participant_count}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(session.duration_seconds)}</span>
          </div>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              statusColor(session.status)
            )}
          >
            {statusLabel(session.status)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Inbox className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No coaching sessions yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
        Start your first session! Head to the{" "}
        <a
          href="/dashboard/coaching"
          className="text-[#ff6a1a] hover:underline font-medium"
        >
          coaching page
        </a>{" "}
        to begin a live video coaching session with FRED AI.
      </p>
    </motion.div>
  );
}

// ============================================================================
// History Content
// ============================================================================

function HistoryContent() {
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] =
    useState<CoachingSession | null>(null);

  const fetchSessions = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/coaching/sessions?page=${page}&limit=10`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch sessions");
      }
      const data = await res.json();
      setSessions(data.sessions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchSessions(1);
  }, [fetchSessions]);

  // Auto-refresh every 30 seconds if any session is in_progress
  useEffect(() => {
    const hasActiveSessions = sessions.some(
      (s) => s.status === "in_progress"
    );

    if (hasActiveSessions) {
      refreshIntervalRef.current = setInterval(() => {
        fetchSessions(pagination.page);
      }, 30_000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [sessions, pagination.page, fetchSessions]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      fetchSessions(newPage);
      setSelectedSession(null);
    },
    [fetchSessions]
  );

  const handleSessionUpdate = useCallback(
    (updated: CoachingSession) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setSelectedSession(updated);
    },
    []
  );

  const handleSessionDelete = useCallback(
    (deletedId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== deletedId));
      setSelectedSession(null);
      // If we deleted the last session on this page, go back a page
      if (sessions.length === 1 && pagination.page > 1) {
        fetchSessions(pagination.page - 1);
      }
    },
    [sessions.length, pagination.page, fetchSessions]
  );

  // If a session is selected, show the detail view
  if (selectedSession) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedSession(null)}
          className="gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to History
        </Button>
        <SessionDetail
          session={selectedSession}
          onUpdate={handleSessionUpdate}
          onDelete={handleSessionDelete}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-[#ff6a1a]" />
          Session History
        </CardTitle>
        <CardDescription>
          Review your past coaching sessions, add notes, and track your
          progress.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff6a1a]" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSessions(pagination.page)}
            >
              Try Again
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Session List */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onClick={() => setSelectedSession(session)}
                    isSelected={false}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing{" "}
                  {(pagination.page - 1) * pagination.limit + 1}-
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} sessions
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      handlePageChange(pagination.page - 1)
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[4rem] text-center">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      pagination.page >= pagination.totalPages
                    }
                    onClick={() =>
                      handlePageChange(pagination.page + 1)
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Page Wrapper
// ============================================================================

function CoachingHistoryPageContent() {
  const { tier, isLoading } = useUserTier();

  if (isLoading) {
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
      featureName="Coaching History"
      description="View and manage your coaching session history. Available on Studio tier."
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        <HistoryContent />
      </div>
    </FeatureLock>
  );
}

// ============================================================================
// Export
// ============================================================================

export default function CoachingHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
        </div>
      }
    >
      <CoachingHistoryPageContent />
    </Suspense>
  );
}
