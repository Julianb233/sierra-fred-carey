"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  Search,
  Compass,
  Target,
  BarChart3,
  Clock,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// ============================================================================
// Types
// ============================================================================

interface AlternativeApproach {
  title: string;
  description: string;
  risk_level: "low" | "medium" | "high";
}

interface ReframingResult {
  reframed_problem: string;
  root_causes: string[];
  alternative_approaches: AlternativeApproach[];
  recommended_action: string;
  metrics_to_track: string[];
  timeline: string;
}

// ============================================================================
// Section Config
// ============================================================================

const SECTION_CONFIG = [
  {
    key: "reframed_problem" as const,
    title: "Reframed Problem",
    description: "How Fred sees the real problem",
    icon: Lightbulb,
    accent: false,
  },
  {
    key: "root_causes" as const,
    title: "Root Causes",
    description: "Underlying issues Fred identifies",
    icon: Search,
    accent: false,
  },
  {
    key: "alternative_approaches" as const,
    title: "Alternative Approaches",
    description: "3 different strategies to consider",
    icon: Compass,
    accent: false,
  },
  {
    key: "recommended_action" as const,
    title: "Recommended Action",
    description: "Fred's specific recommendation",
    icon: Target,
    accent: true,
  },
  {
    key: "metrics_to_track" as const,
    title: "Metrics to Track",
    description: "How to measure progress",
    icon: BarChart3,
    accent: false,
  },
  {
    key: "timeline" as const,
    title: "Timeline",
    description: "Realistic timeline for execution",
    icon: Clock,
    accent: false,
  },
];

// ============================================================================
// Skeleton Cards
// ============================================================================

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Risk Badge
// ============================================================================

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[level] || colors.medium}`}
    >
      {level} risk
    </span>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ReframingPage() {
  // Form state
  const [challenge, setChallenge] = useState("");
  const [currentApproach, setCurrentApproach] = useState("");
  const [constraints, setConstraints] = useState("");

  // API state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReframingResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (challenge.length < 20) {
      setError("Please describe your challenge in at least 20 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/dashboard/strategy/reframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge,
          currentApproach: currentApproach || undefined,
          constraints: constraints || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            data.details?.map((d: { message: string }) => d.message).join(", ") ||
            "Something went wrong. Please try again."
        );
        return;
      }

      setResult(data.reframing as ReframingResult);
    } catch {
      setError("Failed to connect. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    setError(null);
    handleSubmit(new Event("submit") as unknown as React.FormEvent);
  }

  function handleReset() {
    setResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Strategy Reframing
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Fred&apos;s 9-step framework for rethinking strategic challenges
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Input Section */}
        {!result && (
          <Card>
            <CardHeader>
              <CardTitle>What strategic challenge are you facing?</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Challenge (required) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strategic Challenge *
                  </label>
                  <Textarea
                    value={challenge}
                    onChange={(e) => setChallenge(e.target.value)}
                    placeholder="Describe the strategic challenge you're wrestling with. For example: 'We're struggling to find product-market fit in the enterprise space after 6 months of trying different approaches...'"
                    rows={4}
                    required
                    minLength={20}
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Minimum 20 characters. The more detail you provide, the
                    better Fred can help.
                  </p>
                </div>

                {/* Current Approach (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Approach{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <Textarea
                    value={currentApproach}
                    onChange={(e) => setCurrentApproach(e.target.value)}
                    placeholder="What have you tried so far? What's your current strategy?"
                    rows={3}
                    disabled={loading}
                  />
                </div>

                {/* Constraints (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Constraints{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <Textarea
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="Budget limits, timeline pressures, team size, market conditions, or other constraints..."
                    rows={3}
                    disabled={loading}
                  />
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-700 dark:text-red-400">{error}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRetry}
                        className="mt-2 text-red-600 hover:text-red-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Try again
                      </Button>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading || challenge.length < 20}
                  className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Fred is reframing...
                    </>
                  ) : (
                    "Reframe with Fred"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-4">
            {SECTION_CONFIG.map((section) => (
              <SkeletonCard key={section.key} />
            ))}
          </div>
        )}

        {/* Results Section */}
        {result && !loading && (
          <>
            {/* Back to input */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Fred&apos;s Reframing
              </h2>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-1" />
                New Challenge
              </Button>
            </div>

            {/* Result Cards */}
            <div className="space-y-4">
              {SECTION_CONFIG.map((section) => {
                const Icon = section.icon;
                const isAccent = section.accent;

                return (
                  <Card
                    key={section.key}
                    className={
                      isAccent
                        ? "border-[#ff6a1a] border-2 shadow-md"
                        : ""
                    }
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isAccent
                              ? "bg-[#ff6a1a]/10 text-[#ff6a1a]"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle
                            className={
                              isAccent ? "text-[#ff6a1a]" : ""
                            }
                          >
                            {section.title}
                          </CardTitle>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Reframed Problem */}
                      {section.key === "reframed_problem" && (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {result.reframed_problem}
                        </p>
                      )}

                      {/* Root Causes */}
                      {section.key === "root_causes" && (
                        <ul className="space-y-2">
                          {result.root_causes?.map((cause, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
                            >
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span>{cause}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Alternative Approaches */}
                      {section.key === "alternative_approaches" && (
                        <div className="space-y-4">
                          {result.alternative_approaches?.map((approach, i) => (
                            <div
                              key={i}
                              className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {approach.title}
                                </h4>
                                <RiskBadge level={approach.risk_level} />
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {approach.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recommended Action */}
                      {section.key === "recommended_action" && (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                          {result.recommended_action}
                        </p>
                      )}

                      {/* Metrics to Track */}
                      {section.key === "metrics_to_track" && (
                        <ul className="space-y-2">
                          {result.metrics_to_track?.map((metric, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                              <BarChart3 className="h-4 w-4 text-gray-400 shrink-0" />
                              <span>{metric}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Timeline */}
                      {section.key === "timeline" && (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {result.timeline}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Footer */}
            <div className="text-center pt-4 pb-8">
              <Link href="/chat">
                <Button
                  variant="outline"
                  className="gap-2 text-[#ff6a1a] border-[#ff6a1a] hover:bg-[#ff6a1a]/10"
                >
                  <MessageCircle className="h-4 w-4" />
                  Continue this conversation with Fred
                </Button>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
