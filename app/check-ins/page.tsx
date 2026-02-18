"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, TrendingUp, MessageSquare, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckInCard } from "@/components/check-ins/CheckInCard";
import { StreakCounter } from "@/components/check-ins/StreakCounter";

interface CheckInRecord {
  id: string;
  userId: string;
  responses: Record<string, string> | null;
  score: number | null;
  analysis: string | null;
  createdAt: string;
  updatedAt: string | null;
}

function formatCheckInForCard(checkIn: CheckInRecord) {
  const date = new Date(checkIn.createdAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Determine type from responses keys or default to "progress"
  const responseKeys = checkIn.responses ? Object.keys(checkIn.responses) : [];
  const type = responseKeys[0] || "progress";

  // Determine status based on whether responses exist
  const hasResponses =
    checkIn.responses && Object.values(checkIn.responses).some((v) => v);
  const status: "completed" | "pending" = hasResponses ? "completed" : "pending";

  // Build response summary from responses object
  const responseSummary = hasResponses
    ? Object.values(checkIn.responses!).filter(Boolean).join(" ")
    : undefined;

  return {
    id: checkIn.id,
    date: dateStr,
    time: timeStr,
    type,
    status,
    response: responseSummary,
  };
}

function calculateStreak(checkIns: CheckInRecord[]): {
  current: number;
  best: number;
} {
  if (checkIns.length === 0) return { current: 0, best: 0 };

  // Sort by date descending
  const sorted = [...checkIns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Calculate weekly streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;
  let lastWeek = -1;

  for (const ci of sorted) {
    const date = new Date(ci.createdAt);
    // Get ISO week number approximation
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const week = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    if (lastWeek === -1) {
      streak = 1;
      lastWeek = week;
    } else if (lastWeek - week === 1) {
      streak++;
      lastWeek = week;
    } else if (lastWeek !== week) {
      bestStreak = Math.max(bestStreak, streak);
      if (currentStreak === 0) currentStreak = streak;
      streak = 1;
      lastWeek = week;
    }
  }

  bestStreak = Math.max(bestStreak, streak);
  if (currentStreak === 0) currentStreak = streak;

  return { current: currentStreak, best: bestStreak };
}

export default function CheckInsPage() {
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCheckIns() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch("/api/check-ins", {
          signal: controller.signal,
        });

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        const json = await res.json();
        if (json.success) {
          setCheckIns(json.data || []);
        } else {
          setError(json.error || "Failed to load check-ins");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("Request timed out. Please try again.");
        } else {
          setError("Failed to load check-ins");
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }
    fetchCheckIns();
  }, []);

  const streak = calculateStreak(checkIns);
  const formattedCheckIns = checkIns.map(formatCheckInForCard);

  // Stats derived from real data
  const totalCheckIns = checkIns.length;
  const completedCheckIns = checkIns.filter(
    (ci) => ci.responses && Object.values(ci.responses).some((v) => v)
  ).length;
  const responseRate =
    totalCheckIns > 0
      ? Math.round((completedCheckIns / totalCheckIns) * 100)
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  // Empty state
  if (!error && checkIns.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-gray-900 dark:text-white">
              Weekly <span className="text-[#ff6a1a]">Check-Ins</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Stay accountable with automated SMS check-ins
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center mb-6">
              <Calendar className="w-8 h-8 text-[#ff6a1a]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No check-ins yet
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Start your weekly check-in with FRED to track momentum and stay
              accountable on your founder journey.
            </p>
            <Link href="/chat">
              <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25">
                <MessageSquare className="w-4 h-4 mr-2" />
                Talk to FRED
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3 text-gray-900 dark:text-white">
                Weekly <span className="text-[#ff6a1a]">Check-Ins</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Stay accountable with automated SMS check-ins
              </p>
            </div>
            <Link href="/check-ins/configure">
              <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40">
                <Plus className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </Link>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <StreakCounter currentStreak={streak.current} bestStreak={streak.best} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          {[
            {
              label: "Total Check-Ins",
              value: String(totalCheckIns),
              icon: Calendar,
              color: "bg-[#ff6a1a]",
            },
            {
              label: "Response Rate",
              value: `${responseRate}%`,
              icon: TrendingUp,
              color: "bg-orange-500",
            },
            {
              label: "Current Streak",
              value: `${streak.current} week${streak.current !== 1 ? "s" : ""}`,
              icon: Calendar,
              color: "bg-amber-500",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-lg"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Recent Check-Ins
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formattedCheckIns.map((checkIn, index) => (
              <motion.div
                key={checkIn.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <CheckInCard checkIn={checkIn} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
