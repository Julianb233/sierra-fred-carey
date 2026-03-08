"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DeckScorecard, DeckDimension } from "@/types/deck-review"

interface DeckScoreCardProps {
  scorecard: DeckScorecard
}

function getScoreColor(score: number): string {
  if (score >= 7) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 5) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function getScoreBgColor(score: number): string {
  if (score >= 7) return "bg-emerald-500"
  if (score >= 5) return "bg-amber-500"
  return "bg-red-500"
}

function getScoreLabel(score: number): string {
  if (score >= 8) return "Strong"
  if (score >= 7) return "Good"
  if (score >= 5) return "Average"
  if (score >= 3) return "Weak"
  return "Critical"
}

export function DeckScoreCard({ scorecard }: DeckScoreCardProps) {
  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className="border-[#ff6a1a]/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Big score circle */}
            <div className="flex-shrink-0">
              <div
                className={cn(
                  "w-24 h-24 rounded-full border-4 flex items-center justify-center",
                  scorecard.overallScore >= 7
                    ? "border-emerald-500"
                    : scorecard.overallScore >= 5
                      ? "border-amber-500"
                      : "border-red-500"
                )}
              >
                <div className="text-center">
                  <span
                    className={cn(
                      "text-3xl font-bold",
                      getScoreColor(scorecard.overallScore)
                    )}
                  >
                    {scorecard.overallScore}
                  </span>
                  <span className="text-sm text-muted-foreground block">/10</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Overall Score
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  "mb-2",
                  getScoreColor(scorecard.overallScore)
                )}
              >
                {getScoreLabel(scorecard.overallScore)}
              </Badge>
              <p className="text-sm text-muted-foreground">{scorecard.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Strength and Biggest Gap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-800/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
                  Top Strength
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {scorecard.topStrength}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
                  Biggest Gap
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {scorecard.biggestGap}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7 Dimension Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scorecard.dimensions.map((dimension) => (
          <DimensionCard key={dimension.name} dimension={dimension} />
        ))}
      </div>
    </div>
  )
}

function DimensionCard({ dimension }: { dimension: DeckDimension }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{dimension.name}</CardTitle>
          <span
            className={cn("text-lg font-bold", getScoreColor(dimension.score))}
          >
            {dimension.score}/10
          </span>
        </div>
        <Progress
          value={dimension.score * 10}
          className="h-2"
          indicatorClassName={getScoreBgColor(dimension.score)}
        />
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-2">
          {dimension.explanation}
        </p>

        {dimension.suggestions.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-[#ff6a1a] hover:text-[#ea580c] font-medium transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Hide suggestions
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                {dimension.suggestions.length} suggestion{dimension.suggestions.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        )}

        {expanded && dimension.suggestions.length > 0 && (
          <ul className="mt-2 space-y-1">
            {dimension.suggestions.map((suggestion, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground pl-3 border-l-2 border-[#ff6a1a]/30"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
