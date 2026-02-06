"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Download, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreGauge, CategoryBreakdown, RecommendationList } from "@/components/irs";
import { cn } from "@/lib/utils";
import type { IRSResult } from "@/lib/fred/irs/types";

export default function InvestorReadinessPage() {
  const [result, setResult] = useState<IRSResult | null>(null);
  const [history, setHistory] = useState<IRSResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch latest and history
      const [latestRes, historyRes] = await Promise.all([
        fetch("/api/fred/investor-readiness?latest=true"),
        fetch("/api/fred/investor-readiness?limit=5"),
      ]);

      const latestData = await latestRes.json();
      const historyData = await historyRes.json();

      if (latestData.result) {
        setResult(latestData.result);
      }
      if (historyData.history) {
        setHistory(historyData.history);
      }
    } catch (err) {
      setError("Failed to load Investor Readiness Score");
    } finally {
      setLoading(false);
    }
  }

  async function calculateNewScore() {
    try {
      setCalculating(true);
      setError(null);

      // In a real implementation, this would open a form to collect info
      // For now, we'll use placeholder data
      const response = await fetch("/api/fred/investor-readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupInfo: {
            name: "My Startup",
            stage: "seed",
            industry: "SaaS",
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.result) {
        setResult(data.result);
        setHistory((prev) => [data.result, ...prev]);
      } else {
        throw new Error(data.error || "Failed to calculate score");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate score");
    } finally {
      setCalculating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Investor Readiness Score
              </h1>
              <p className="text-sm text-gray-500">
                Evaluate your fundraising readiness
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={calculateNewScore}
              disabled={calculating}
            >
              {calculating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              New Assessment
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

        {!result ? (
          /* No score yet */
          <Card>
            <CardContent className="py-16 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Get Your Investor Readiness Score
              </h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Understand how investor-ready your startup is across 6 key categories:
                Team, Market, Product, Traction, Financials, and Pitch.
              </p>
              <Button
                onClick={calculateNewScore}
                disabled={calculating}
                className="bg-[#ff6a1a] hover:bg-[#ea580c]"
                size="lg"
              >
                {calculating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Calculate My Score
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Score display */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Score and categories */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overall score card */}
              <Card>
                <CardContent className="py-8">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <ScoreGauge score={result.overall} size="lg" />

                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {result.overall >= 70
                          ? "Looking Good!"
                          : result.overall >= 50
                          ? "Making Progress"
                          : "Room to Grow"}
                      </h2>
                      <p className="text-gray-500 mb-4">
                        {result.overall >= 70
                          ? "Your startup shows strong investor readiness."
                          : result.overall >= 50
                          ? "You're building a solid foundation. Focus on the recommendations below."
                          : "Focus on addressing the key gaps to improve your score."}
                      </p>

                      {/* Strengths/Weaknesses quick view */}
                      <div className="flex flex-wrap gap-2">
                        {result.strengths.slice(0, 2).map((s, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <CategoryBreakdown categories={result.categories} />
                </CardContent>
              </Card>
            </div>

            {/* Right column - Recommendations */}
            <div className="space-y-6">
              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecommendationList
                    recommendations={result.recommendations}
                    maxItems={5}
                    showRationale={false}
                  />
                </CardContent>
              </Card>

              {/* History */}
              {history.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Score History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {history.slice(0, 5).map((h, i) => (
                        <div
                          key={h.id || i}
                          className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <span className="text-sm text-gray-500">
                            {h.createdAt
                              ? new Date(h.createdAt).toLocaleDateString()
                              : `Assessment ${i + 1}`}
                          </span>
                          <span
                            className={cn(
                              "font-bold",
                              h.overall >= 70
                                ? "text-green-600"
                                : h.overall >= 50
                                ? "text-yellow-600"
                                : "text-red-600"
                            )}
                          >
                            {h.overall}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
