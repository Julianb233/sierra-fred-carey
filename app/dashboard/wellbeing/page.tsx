"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WellnessAssessment } from "@/components/wellbeing/WellnessAssessment";
import Link from "next/link";

// ============================================================================
// Types
// ============================================================================

interface CheckInHistory {
  score: number | null;
  lastCheckIn: string | null;
}

interface Recommendation {
  text: string;
  priority: "high" | "medium" | "low";
}

// ============================================================================
// Component
// ============================================================================

export default function WellbeingPage() {
  const [history, setHistory] = useState<CheckInHistory | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Fetch previous check-in on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/wellbeing/check-in");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setHistory(data.data);
          }
        }
      } catch {
        // Silently fail -- not critical
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const handleComplete = useCallback(
    async (score: number, answers: Record<string, number>) => {
      setSubmitting(true);
      try {
        const res = await fetch("/api/wellbeing/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score, answers }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.recommendations) {
            setRecommendations(data.data.recommendations);
          }
        }
      } catch {
        // Assessment still shows results even if API fails
      } finally {
        setSubmitting(false);
        setCompleted(true);
      }
    },
    []
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Wellbeing Check-in
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Your health matters more than your startup. After 50+ years of working
          with founders, Fred knows that sustainable success starts with how you
          take care of yourself.
        </p>
      </div>

      {/* Previous check-in */}
      {!loading && history?.score !== null && history?.lastCheckIn && !completed && (
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last check-in
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {new Date(history.lastCheckIn).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  history.score >= 70
                    ? "border-green-500 text-green-600"
                    : history.score >= 40
                      ? "border-yellow-500 text-yellow-600"
                      : "border-red-500 text-red-600"
                }
              >
                Score: {history.score}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment */}
      <WellnessAssessment onComplete={handleComplete} />

      {/* Recommendations from API */}
      {completed && recommendations.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="text-lg">
              Fred&apos;s Recommendations for You
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <Badge
                  variant="outline"
                  className={
                    rec.priority === "high"
                      ? "border-red-500 text-red-600 shrink-0"
                      : rec.priority === "medium"
                        ? "border-yellow-500 text-yellow-600 shrink-0"
                        : "border-green-500 text-green-600 shrink-0"
                  }
                >
                  {rec.priority}
                </Badge>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {rec.text}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Talk to Fred CTA */}
      {completed && (
        <div className="text-center pt-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Want to talk through what you&apos;re feeling?
          </p>
          <Link href="/chat">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            >
              Talk to Fred
            </Button>
          </Link>
        </div>
      )}

      {submitting && (
        <p className="text-center text-sm text-gray-400 animate-pulse">
          Saving your results...
        </p>
      )}
    </div>
  );
}
