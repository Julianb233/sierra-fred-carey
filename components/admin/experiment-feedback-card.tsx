"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { TrendingUpIcon, AlertTriangleIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PreRegistration } from "@/lib/feedback/pre-registration-shared"

interface VariantData {
  variantName: string
  trafficPercentage: number
  totalRequests: number
  avgRating?: number
  conversionRate?: number
  avgLatency?: number | null
  errorRate?: number | null
  // Feedback metrics (Phase 75)
  thumbsUpRatio: number | null
  avgSentimentScore: number | null
  sessionCompletionRate: number | null
  totalFeedbackSignals: number
}

interface FeedbackComparisonData {
  thumbsSignificant: boolean
  sentimentSignificant: boolean
  sessionCompletionSignificant: boolean
  feedbackWinner: string | null
}

export interface ExperimentFeedbackCardProps {
  experiment: {
    id: string
    name: string
    description: string
    status: "running" | "completed" | "paused"
    startDate: string
    endDate: string | null
    preRegistration?: PreRegistration | null
    variants: VariantData[]
    feedbackComparison?: FeedbackComparisonData | null
    statisticalSignificance: number
  }
  onEndTest: (id: string) => void
  onViewDetails: (id: string) => void
}

function getStatusColor(status: string) {
  switch (status) {
    case "running":
      return "bg-green-500"
    case "completed":
      return "bg-blue-500"
    case "paused":
      return "bg-yellow-500"
    default:
      return "bg-gray-500"
  }
}

function getSentimentColor(score: number): string {
  if (score > 0.2) return "text-green-600"
  if (score < -0.2) return "text-red-600"
  return "text-gray-600"
}

export function ExperimentFeedbackCard({
  experiment,
  onEndTest,
  onViewDetails,
}: ExperimentFeedbackCardProps) {
  const feedbackWinner = experiment.feedbackComparison?.feedbackWinner
  const minSessions = 500

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle>{experiment.name}</CardTitle>
              <Badge variant="outline" className="capitalize">
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(experiment.status)}`}
                />
                {experiment.status}
              </Badge>
            </div>
            <CardDescription className="mt-2">
              {experiment.description}
            </CardDescription>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Started: {new Date(experiment.startDate).toLocaleDateString()}</span>
              <span>-</span>
              <span>
                Requests: {experiment.variants.reduce((sum, v) => sum + v.totalRequests, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Pre-registration hypothesis */}
        {experiment.preRegistration?.hypothesis && (
          <div className="mt-3 rounded-md bg-gray-50 dark:bg-gray-900 p-3 border-l-2 border-[#ff6a1a]">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Hypothesis
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {experiment.preRegistration.hypothesis}
            </p>
            {experiment.preRegistration.primaryMetric && (
              <Badge variant="outline" className="mt-2">
                {experiment.preRegistration.primaryMetric.name}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Variants comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {experiment.variants.map((variant) => {
            const isWinner = feedbackWinner === variant.variantName

            return (
              <div
                key={variant.variantName}
                className={cn(
                  "border rounded-lg p-4",
                  isWinner
                    ? "border-[#ff6a1a] bg-[#ff6a1a]/5"
                    : "border-gray-200 dark:border-gray-800"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold capitalize">
                      {variant.variantName}
                    </h4>
                    {isWinner && (
                      <TrendingUpIcon className="h-4 w-4 text-[#ff6a1a]" />
                    )}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {variant.trafficPercentage}% traffic
                  </span>
                </div>

                {/* Performance section */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Requests:</span>
                    <span className="font-semibold">
                      {variant.totalRequests.toLocaleString()}
                    </span>
                  </div>
                  {variant.avgLatency != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Avg Latency:</span>
                      <span className="font-semibold">{Math.round(variant.avgLatency)}ms</span>
                    </div>
                  )}
                  {variant.errorRate != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Error Rate:</span>
                      <span className="font-semibold">{(variant.errorRate * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {/* Feedback section */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2 text-sm">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Feedback ({variant.totalFeedbackSignals} signals)
                  </p>

                  {/* Thumbs ratio */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Thumbs Up:</span>
                      <span className="font-semibold">
                        {variant.thumbsUpRatio != null
                          ? `${(variant.thumbsUpRatio * 100).toFixed(0)}%`
                          : "N/A"}
                      </span>
                    </div>
                    {variant.thumbsUpRatio != null && (
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${variant.thumbsUpRatio * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Sentiment */}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sentiment:</span>
                    <span
                      className={cn(
                        "font-semibold",
                        variant.avgSentimentScore != null
                          ? getSentimentColor(variant.avgSentimentScore)
                          : "text-gray-400"
                      )}
                    >
                      {variant.avgSentimentScore != null
                        ? variant.avgSentimentScore.toFixed(2)
                        : "N/A"}
                    </span>
                  </div>

                  {/* Session completion */}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Completion:</span>
                    <span className="font-semibold">
                      {variant.sessionCompletionRate != null
                        ? `${(variant.sessionCompletionRate * 100).toFixed(0)}%`
                        : "N/A"}
                    </span>
                  </div>

                  {/* Minimum sample warning */}
                  {variant.totalRequests < minSessions && variant.totalRequests > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
                      <AlertTriangleIcon className="h-3 w-3" />
                      Need {minSessions - variant.totalRequests} more sessions
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Statistical significance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Statistical Significance:
            </span>
            <span className="font-semibold">
              {experiment.statisticalSignificance.toFixed(0)}%
              {experiment.statisticalSignificance >= 95 && " (passed)"}
            </span>
          </div>
          <Progress value={experiment.statisticalSignificance} className="h-2" />

          {/* Feedback significance badges */}
          {experiment.feedbackComparison && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge
                variant="outline"
                className={cn(
                  experiment.feedbackComparison.thumbsSignificant
                    ? "border-green-500 text-green-700 dark:text-green-400"
                    : "text-gray-500"
                )}
              >
                Thumbs: {experiment.feedbackComparison.thumbsSignificant ? "Significant" : "Not yet"}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  experiment.feedbackComparison.sentimentSignificant
                    ? "border-green-500 text-green-700 dark:text-green-400"
                    : "text-gray-500"
                )}
              >
                Sentiment: {experiment.feedbackComparison.sentimentSignificant ? "Significant" : "Not yet"}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  experiment.feedbackComparison.sessionCompletionSignificant
                    ? "border-green-500 text-green-700 dark:text-green-400"
                    : "text-gray-500"
                )}
              >
                Completion: {experiment.feedbackComparison.sessionCompletionSignificant ? "Significant" : "Not yet"}
              </Badge>
            </div>
          )}

          {/* Ready to promote banner */}
          {experiment.feedbackComparison?.thumbsSignificant &&
            experiment.feedbackComparison?.sentimentSignificant &&
            experiment.feedbackComparison?.sessionCompletionSignificant && (
              <div className="mt-2 p-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-sm font-medium">
                All feedback metrics are significant. Ready to promote winning variant.
              </div>
            )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          {experiment.status === "running" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEndTest(experiment.id)}
            >
              End Test
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(experiment.id)}
          >
            View Details
          </Button>
          <Button variant="outline" size="sm">
            Export Results
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
