"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SLIDE_LABELS } from "@/lib/fred/pitch/types";
import type { SlideAnalysis, SlideType } from "@/lib/fred/pitch/types";
import { CheckCircle2, Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideAnalysisPanelProps {
  slide: SlideAnalysis;
  onClose?: () => void;
}

function getScoreColor(score: number): string {
  if (score < 30) return "#ef4444";
  if (score < 50) return "#f97316";
  if (score < 70) return "#eab308";
  if (score < 85) return "#22c55e";
  return "#10b981";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "High";
  if (confidence >= 0.7) return "Medium";
  return "Low";
}

export function SlideAnalysisPanel({ slide, onClose }: SlideAnalysisPanelProps) {
  const label = SLIDE_LABELS[slide.type as SlideType] || slide.type;
  const confidencePercent = Math.round(slide.typeConfidence * 100);

  return (
    <Card>
      <CardHeader className="relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
        <CardTitle className="text-lg pr-8">
          {label}
          <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
            {confidencePercent}% confident
          </span>
        </CardTitle>
        <p className="text-xs text-gray-400">
          Page {slide.pageNumber} - Classification: {getConfidenceLabel(slide.typeConfidence)}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score display */}
        <div className="text-center py-3">
          <span
            className="text-5xl font-bold"
            style={{ color: getScoreColor(slide.score) }}
          >
            {slide.score}
          </span>
          <span className="text-lg text-gray-400 ml-1">/100</span>
        </div>

        {/* Feedback */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Feedback
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {slide.feedback}
          </p>
        </div>

        {/* Strengths */}
        {slide.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Strengths
            </h4>
            <ul className="space-y-1.5">
              {slide.strengths.map((strength, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {slide.suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Suggestions
            </h4>
            <ul className="space-y-1.5">
              {slide.suggestions.map((suggestion, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <Lightbulb className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
