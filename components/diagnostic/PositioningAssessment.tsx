"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Target,
  Sparkles,
  Globe,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type PositioningGrade = "A" | "B" | "C" | "D" | "F";

interface CategoryScore {
  category: string;
  grade: PositioningGrade;
  score: number;
  strengths: string[];
  gaps: string[];
}

interface PositioningResult {
  overallGrade: PositioningGrade;
  narrativeTightnessScore: number;
  categories: CategoryScore[];
  topGaps: string[];
  nextActions: string[];
  summary: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  clarity: Target,
  differentiation: Sparkles,
  "market-understanding": Globe,
  "narrative-strength": MessageSquare,
};

const CATEGORY_NAMES: Record<string, string> = {
  clarity: "Clarity",
  differentiation: "Differentiation",
  "market-understanding": "Market Understanding",
  "narrative-strength": "Narrative Strength",
};

const GRADE_COLORS: Record<PositioningGrade, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

const GRADE_BG_COLORS: Record<PositioningGrade, string> = {
  A: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  B: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  C: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  D: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  F: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

interface PositioningAssessmentProps {
  onComplete?: (result: PositioningResult) => void;
}

export function PositioningAssessment({
  onComplete,
}: PositioningAssessmentProps) {
  const [businessDescription, setBusinessDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PositioningResult | null>(null);

  const handleSubmit = async () => {
    if (!businessDescription.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/diagnostic/positioning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessDescription }),
      });

      if (!response.ok) {
        throw new Error("Failed to run assessment");
      }

      const data = await response.json();

      if (data.parseError) {
        setError("Could not parse assessment. Please try again.");
        return;
      }

      setResult(data.assessment);
      onComplete?.(data.assessment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setBusinessDescription("");
    setError(null);
  };

  if (result) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Overall Grade */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Positioning Readiness Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold",
                  GRADE_COLORS[result.overallGrade]
                )}
              >
                {result.overallGrade}
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Overall Grade</p>
                <p className="text-muted-foreground mt-1">{result.summary}</p>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {result.narrativeTightnessScore}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Narrative Tightness
                  </p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="text-center">
                  <p className="text-3xl font-bold">{result.categories.length}</p>
                  <p className="text-sm text-muted-foreground">
                    Categories Evaluated
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Scores */}
        <div className="grid gap-4 md:grid-cols-2">
          {result.categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.category] || Target;
            return (
              <Card key={cat.category}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <CardTitle className="text-base">
                        {CATEGORY_NAMES[cat.category] || cat.category}
                      </CardTitle>
                    </div>
                    <Badge className={GRADE_BG_COLORS[cat.grade]}>
                      {cat.grade}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={cat.score} className="mb-4" />

                  {cat.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                        Strengths
                      </p>
                      <ul className="space-y-1">
                        {cat.strengths.map((s, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <CheckCircle2 className="w-3 h-3 mt-1 text-green-500 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {cat.gaps.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                        Gaps
                      </p>
                      <ul className="space-y-1">
                        {cat.gaps.map((g, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <AlertCircle className="w-3 h-3 mt-1 text-amber-500 flex-shrink-0" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Top Gaps */}
        {result.topGaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Top Gaps to Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.topGaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Next Actions */}
        {result.nextActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Next Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {result.nextActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center">
          <Button variant="outline" onClick={handleReset}>
            Run Another Assessment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Positioning Readiness Assessment</CardTitle>
          <p className="text-muted-foreground">
            Describe your business and we&apos;ll evaluate your positioning clarity
            using Fred Cary&apos;s framework.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Describe your business
            </label>
            <Textarea
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              placeholder="What does your company do? Who is it for? What problem does it solve? How is it different from alternatives?"
              className="min-h-[200px]"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Be as specific as possible. Include your target customer, the
              problem you solve, and why your solution is different.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </motion.div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!businessDescription.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Run Assessment
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
