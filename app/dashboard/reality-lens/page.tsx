"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RocketIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";

// ---------------------------------------------------------------------------
// Types matching the FRED Reality Lens API response
// ---------------------------------------------------------------------------

interface FactorAssessment {
  score: number;
  confidence: "high" | "medium" | "low";
  summary: string;
  strengths: string[];
  weaknesses: string[];
  questions: string[];
  recommendations: string[];
}

interface AssessmentMetadata {
  assessmentId: string;
  timestamp: string;
  version: string;
  processingTimeMs?: number;
  model?: string;
}

interface RealityLensData {
  overallScore: number;
  verdict: "strong" | "promising" | "needs-work" | "reconsider";
  verdictDescription: string;
  factors: {
    feasibility: FactorAssessment;
    economics: FactorAssessment;
    demand: FactorAssessment;
    distribution: FactorAssessment;
    timing: FactorAssessment;
  };
  topStrengths: string[];
  criticalRisks: string[];
  nextSteps: string[];
  executiveSummary: string;
  metadata: AssessmentMetadata;
}

interface ApiResponse {
  success: boolean;
  data?: RealityLensData;
  error?: { code: string; message: string } | string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RealityLensPage() {
  const [idea, setIdea] = useState("");
  const [stage, setStage] = useState<string>("");
  const [market, setMarket] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<RealityLensData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/fred/reality-lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          context: {
            stage: stage || undefined,
            targetMarket: market || undefined,
          },
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        // Handle nested error object shape from FRED API
        const errorMsg =
          typeof data.error === "object" && data.error !== null
            ? (data.error as { message?: string }).message
            : typeof data.error === "string"
            ? data.error
            : "Failed to analyze idea";
        throw new Error(errorMsg || "Failed to analyze idea");
      }

      setResults(data.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      console.error("Reality Lens error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreStatus = (score: number): "good" | "warning" | "poor" => {
    if (score >= 75) return "good";
    if (score >= 50) return "warning";
    return "poor";
  };

  const getConfidenceBadge = (
    confidence: "high" | "medium" | "low"
  ): { label: string; className: string } => {
    switch (confidence) {
      case "high":
        return {
          label: "High confidence",
          className: "border-green-500 text-green-500",
        };
      case "medium":
        return {
          label: "Medium confidence",
          className: "border-amber-500 text-amber-500",
        };
      case "low":
        return {
          label: "Low confidence",
          className: "border-red-500 text-red-500",
        };
    }
  };

  const getVerdictBadge = (
    verdict: RealityLensData["verdict"]
  ): { label: string; className: string } => {
    switch (verdict) {
      case "strong":
        return {
          label: "Strong",
          className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        };
      case "promising":
        return {
          label: "Promising",
          className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        };
      case "needs-work":
        return {
          label: "Needs Work",
          className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
        };
      case "reconsider":
        return {
          label: "Reconsider",
          className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        };
    }
  };

  const getDimensionName = (key: string): string => {
    const names: Record<string, string> = {
      feasibility: "Feasibility",
      economics: "Economics",
      demand: "Demand",
      distribution: "Distribution",
      timing: "Timing",
    };
    return names[key] || key;
  };

  const getDimensionDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      feasibility: "Can this be built with current technology?",
      economics: "Is there a viable path to profitability?",
      demand: "Do customers actively want this?",
      distribution: "Can you reach customers cost-effectively?",
      timing: "Is now the right time for this?",
    };
    return descriptions[key] || "";
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Startup Reality Lens
          </h1>
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Free
          </Badge>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Evaluate your startup idea across 5 critical dimensions: Feasibility,
          Economics, Demand, Distribution, and Timing.
        </p>
      </div>

      {/* Input Form */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="idea" className="text-base font-semibold">
              Describe Your Startup Idea
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">
              Include what problem you&apos;re solving, who your customers are, and
              your basic business model.
            </p>
            <Textarea
              id="idea"
              placeholder="Example: We're building an AI-powered CRM for real estate agents that automatically nurtures leads, schedules showings, and generates personalized follow-ups. Real estate agents are our target market, with monthly subscription pricing starting at $99/month..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          {/* Optional Context Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stage" className="text-sm font-medium mb-2">
                Current Stage (Optional)
              </Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger id="stage">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea Stage</SelectItem>
                  <SelectItem value="mvp">MVP</SelectItem>
                  <SelectItem value="launched">Launched</SelectItem>
                  <SelectItem value="scaling">Scaling</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="market" className="text-sm font-medium mb-2">
                Target Market (Optional)
              </Label>
              <Input
                id="market"
                placeholder="e.g., Real estate, SaaS, E-commerce"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Analysis Error
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={!idea || analyzing}
            className="w-full sm:w-auto bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
          >
            {analyzing ? (
              <>
                <span className="inline-block animate-spin mr-2">&#x2699;</span>
                Analyzing...
              </>
            ) : (
              <>
                <RocketIcon className="mr-2 h-4 w-4" />
                Analyze Idea
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {analyzing && (
        <div className="space-y-6 animate-pulse">
          <Card className="p-6">
            <div className="text-center">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto mb-4"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-24 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto"></div>
            </div>
          </Card>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded"></div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results && !analyzing && (
        <div className="space-y-6">
          {/* Overall Score + Verdict */}
          <Card className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Overall Reality Score
              </p>
              <div className="flex items-center justify-center gap-3 mb-2">
                <p
                  className={`text-6xl font-bold ${getScoreColor(
                    results.overallScore
                  )}`}
                >
                  {results.overallScore}
                </p>
                <Badge className={getVerdictBadge(results.verdict).className}>
                  {getVerdictBadge(results.verdict).label}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {results.verdictDescription}
              </p>
            </div>
          </Card>

          {/* Executive Summary */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <InfoCircledIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Executive Summary
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {results.executiveSummary}
                </p>
              </div>
            </div>
          </Card>

          {/* Dimension Breakdown */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Factor Analysis
            </h2>
            <div className="space-y-4">
              {Object.entries(results.factors).map(([key, factor]) => {
                const status = getScoreStatus(factor.score);
                const confidence = getConfidenceBadge(factor.confidence);
                return (
                  <Card key={key} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {getDimensionName(key)}
                          </h3>
                          <Badge
                            variant="outline"
                            className={
                              status === "good"
                                ? "border-green-500 text-green-500"
                                : status === "warning"
                                ? "border-amber-500 text-amber-500"
                                : "border-red-500 text-red-500"
                            }
                          >
                            {factor.score}/100
                          </Badge>
                          <Badge variant="outline" className={confidence.className}>
                            {confidence.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getDimensionDescription(key)}
                        </p>
                      </div>
                    </div>
                    <Progress value={factor.score} className="h-2 mb-3" />
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {factor.summary}
                      </p>
                    </div>

                    {/* Per-factor strengths and weaknesses */}
                    {(factor.strengths.length > 0 ||
                      factor.weaknesses.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {factor.strengths.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                              Strengths
                            </p>
                            <ul className="space-y-1">
                              {factor.strengths.map(
                                (s: string, i: number) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400"
                                  >
                                    <span className="text-green-500 mt-0.5">
                                      &#x2022;
                                    </span>
                                    <span>{s}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                        {factor.weaknesses.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                              Weaknesses
                            </p>
                            <ul className="space-y-1">
                              {factor.weaknesses.map(
                                (w: string, i: number) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400"
                                  >
                                    <span className="text-red-500 mt-0.5">
                                      &#x2022;
                                    </span>
                                    <span>{w}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Top Strengths & Critical Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Strengths */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircledIcon className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Top Strengths
                </h3>
              </div>
              <ul className="space-y-2">
                {results.topStrengths.map((strength: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-green-500 mt-0.5">&#x2022;</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Critical Risks */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CrossCircledIcon className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Critical Risks
                </h3>
              </div>
              <ul className="space-y-2">
                {results.criticalRisks.map((risk: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-red-500 mt-0.5">&#x2022;</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Next Steps */}
          <Card className="p-6 bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10 border-[#ff6a1a]/20">
            <div className="flex items-start gap-3">
              <InfoCircledIcon className="h-5 w-5 text-[#ff6a1a] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Recommended Next Steps
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  {results.nextSteps.map(
                    (step: string, index: number) => (
                      <li key={index}>
                        {index + 1}. {step}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
