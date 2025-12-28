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

interface DimensionScore {
  score: number;
  analysis: string;
}

interface ApiResponse {
  success: boolean;
  data?: {
    id: number;
    overallScore: number;
    dimensions: {
      feasibility: DimensionScore;
      economics: DimensionScore;
      demand: DimensionScore;
      distribution: DimensionScore;
      timing: DimensionScore;
    };
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  error?: string;
}

export default function RealityLensPage() {
  const [idea, setIdea] = useState("");
  const [stage, setStage] = useState<string>("");
  const [market, setMarket] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<ApiResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/reality-lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          stage: stage || undefined,
          market: market || undefined,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze idea");
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
              Include what problem you're solving, who your customers are, and
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
                  <SelectItem value="ideation">Ideation</SelectItem>
                  <SelectItem value="pre-seed">Pre-seed</SelectItem>
                  <SelectItem value="seed">Seed</SelectItem>
                  <SelectItem value="series-a">Series A</SelectItem>
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
                <span className="inline-block animate-spin mr-2">⚙</span>
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
          {/* Overall Score */}
          <Card className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Overall Reality Score
              </p>
              <p
                className={`text-6xl font-bold ${getScoreColor(
                  results.overallScore
                )}`}
              >
                {results.overallScore}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {results.overallScore >= 75
                  ? "Strong idea with clear market fit"
                  : results.overallScore >= 50
                  ? "Promising but needs refinement"
                  : "Significant challenges to address"}
              </p>
            </div>
          </Card>

          {/* Dimension Breakdown */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Dimension Analysis
            </h2>
            <div className="space-y-4">
              {Object.entries(results.dimensions).map(([key, dimension]) => {
                const status = getScoreStatus(dimension.score);
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
                            {dimension.score}/100
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getDimensionDescription(key)}
                        </p>
                      </div>
                    </div>
                    <Progress value={dimension.score} className="h-2 mb-3" />
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {dimension.analysis}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths (Green Flags) */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircledIcon className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Strengths
                </h3>
              </div>
              <ul className="space-y-2">
                {results.strengths.map((strength: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Weaknesses (Red Flags) */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CrossCircledIcon className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Weaknesses
                </h3>
              </div>
              <ul className="space-y-2">
                {results.weaknesses.map((weakness: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Recommendations */}
          <Card className="p-6 bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10 border-[#ff6a1a]/20">
            <div className="flex items-start gap-3">
              <InfoCircledIcon className="h-5 w-5 text-[#ff6a1a] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Recommended Next Steps
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  {results.recommendations.map(
                    (recommendation: string, index: number) => (
                      <li key={index}>
                        {index + 1}. {recommendation}
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
