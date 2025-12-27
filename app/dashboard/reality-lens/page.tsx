"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RocketIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";

export default function RealityLensPage() {
  const [idea, setIdea] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock results
    setResults({
      overallScore: 72,
      dimensions: [
        {
          name: "Feasibility",
          score: 85,
          description: "Can this be built with current technology?",
          feedback: "Strong technical foundation. AI capabilities are proven and accessible.",
          status: "good",
        },
        {
          name: "Economics",
          score: 65,
          description: "Is there a viable path to profitability?",
          feedback: "Unit economics need refinement. Consider higher ACV or reducing CAC.",
          status: "warning",
        },
        {
          name: "Demand",
          score: 78,
          description: "Do customers actively want this?",
          feedback: "Strong early signals. Validate with 10+ customer interviews.",
          status: "good",
        },
        {
          name: "Distribution",
          score: 55,
          description: "Can you reach customers cost-effectively?",
          feedback: "Distribution channels unclear. Need a go-to-market strategy.",
          status: "warning",
        },
        {
          name: "Timing",
          score: 80,
          description: "Is now the right time for this?",
          feedback: "Market conditions favorable. AI adoption accelerating.",
          status: "good",
        },
      ],
      redFlags: [
        "No clear competitive moat identified",
        "High customer acquisition cost in current plan",
      ],
      greenFlags: [
        "Strong founder-market fit",
        "Growing market with tailwinds",
        "Technical feasibility confirmed",
      ],
    });
    setAnalyzing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getProgressColor = (score: number) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
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
          Evaluate your startup idea across 5 critical dimensions: Feasibility, Economics, Demand, Distribution, and Timing.
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
              Include what problem you're solving, who your customers are, and your basic business model.
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
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={!idea || analyzing}
            className="w-full sm:w-auto bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
          >
            {analyzing ? (
              <>Analyzing...</>
            ) : (
              <>
                <RocketIcon className="mr-2 h-4 w-4" />
                Analyze Idea
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Overall Reality Score
              </p>
              <p className={`text-6xl font-bold ${getScoreColor(results.overallScore)}`}>
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
              {results.dimensions.map((dimension: any, index: number) => (
                <Card key={index} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {dimension.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={
                            dimension.status === "good"
                              ? "border-green-500 text-green-500"
                              : "border-amber-500 text-amber-500"
                          }
                        >
                          {dimension.score}/100
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {dimension.description}
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={dimension.score}
                    className="h-2 mb-3"
                  />
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {dimension.feedback}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Red Flags & Green Flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Red Flags */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CrossCircledIcon className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Red Flags
                </h3>
              </div>
              <ul className="space-y-2">
                {results.redFlags.map((flag: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Green Flags */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircledIcon className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Green Flags
                </h3>
              </div>
              <ul className="space-y-2">
                {results.greenFlags.map((flag: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{flag}</span>
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
                  Next Steps
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>1. Address the red flags identified above</li>
                  <li>2. Conduct 10+ customer interviews to validate demand</li>
                  <li>3. Develop a clear go-to-market strategy</li>
                  <li>4. Calculate unit economics with realistic assumptions</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
