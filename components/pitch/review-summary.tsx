"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreGauge } from "@/components/irs/score-gauge";
import { SLIDE_LABELS } from "@/lib/fred/pitch/types";
import type { PitchReview, SlideType } from "@/lib/fred/pitch/types";
import { CheckCircle2, ArrowUpCircle, AlertCircle } from "lucide-react";

interface ReviewSummaryProps {
  review: PitchReview;
}

function getScoreColor(score: number): string {
  if (score < 30) return "#ef4444";
  if (score < 50) return "#f97316";
  if (score < 70) return "#eab308";
  if (score < 85) return "#22c55e";
  return "#10b981";
}

export function ReviewSummary({ review }: ReviewSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Overall score gauge */}
          <ScoreGauge score={review.overallScore} size="lg" label="Overall Score" />

          {/* Stats */}
          <div className="flex-1 w-full space-y-6">
            {/* Structure Score */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Structure Score
                </span>
                <span className="text-sm font-bold" style={{ color: getScoreColor(review.structureScore) }}>
                  {review.structureScore}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${review.structureScore}%`,
                    backgroundColor: getScoreColor(review.structureScore),
                  }}
                />
              </div>
            </div>

            {/* Content Score */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content Score
                </span>
                <span className="text-sm font-bold" style={{ color: getScoreColor(review.contentScore) }}>
                  {review.contentScore}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${review.contentScore}%`,
                    backgroundColor: getScoreColor(review.contentScore),
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Strengths */}
        {review.strengths.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Strengths
            </h4>
            <ul className="space-y-1.5">
              {review.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {review.improvements.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Areas for Improvement
            </h4>
            <ul className="space-y-1.5">
              {review.improvements.map((improvement, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <ArrowUpCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Sections */}
        {review.missingSections.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Missing Required Sections
            </h4>
            <div className="flex flex-wrap gap-2">
              {review.missingSections.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-red-200 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20"
                >
                  <AlertCircle className="h-3 w-3" />
                  {SLIDE_LABELS[type as SlideType]}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
