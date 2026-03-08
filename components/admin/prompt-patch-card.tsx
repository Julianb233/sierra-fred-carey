"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUpIcon, TrendingDownIcon, MinusIcon, FlaskConicalIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PromptPatch } from "@/lib/rlhf/types"

interface PromptPatchCardProps {
  patch: PromptPatch
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onActivate?: (id: string) => void
  onDeactivate?: (id: string) => void
  onLaunchTest?: (id: string) => void
  onViewDetails?: (id: string) => void
}

function getStatusColor(status: string) {
  switch (status) {
    case "draft": return "bg-gray-500"
    case "approved": return "bg-blue-500"
    case "active": return "bg-green-500"
    case "testing": return "bg-[#ff6a1a]"
    case "rejected": return "bg-red-500"
    case "archived": return "bg-gray-400"
    default: return "bg-gray-500"
  }
}

function getSourceLabel(source: string) {
  switch (source) {
    case "feedback": return "From feedback cluster"
    case "ab_test": return "From A/B test"
    case "manual": return "Manual"
    default: return source
  }
}

function getImprovementIcon(improvement: number | undefined) {
  if (improvement === undefined) return null
  if (improvement > 5) return <TrendingUpIcon className="h-4 w-4 text-green-600" />
  if (improvement < -5) return <TrendingDownIcon className="h-4 w-4 text-red-600" />
  return <MinusIcon className="h-4 w-4 text-gray-500" />
}

export function PromptPatchCard({
  patch,
  onApprove,
  onReject,
  onActivate,
  onDeactivate,
  onLaunchTest,
  onViewDetails,
}: PromptPatchCardProps) {
  const improvement = patch.performanceMetrics?.thumbsImprovement

  return (
    <Card className={cn(
      patch.status === "active" && "border-green-300 dark:border-green-800",
      patch.status === "testing" && "border-[#ff6a1a]/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{patch.title}</CardTitle>
              <Badge variant="outline" className="capitalize">
                <div className={`w-2 h-2 rounded-full mr-1.5 ${getStatusColor(patch.status)}`} />
                {patch.status}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {getSourceLabel(patch.source)}
              {patch.topic && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {patch.topic}
                </Badge>
              )}
            </CardDescription>
          </div>
          {(patch.status === "active" || patch.status === "testing") && improvement !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              {getImprovementIcon(improvement)}
              <span className={cn(
                "font-medium",
                improvement > 5 ? "text-green-600" : improvement < -5 ? "text-red-600" : "text-gray-500"
              )}>
                {improvement > 0 ? "+" : ""}{improvement.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Content preview */}
        <div className="rounded-md bg-gray-50 dark:bg-gray-900 p-3 text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
          {patch.content.length > 200
            ? `${patch.content.slice(0, 200)}...`
            : patch.content}
        </div>

        {/* Signal count */}
        {patch.sourceSignalIds.length > 0 && (
          <p className="text-xs text-gray-500">
            Based on {patch.sourceSignalIds.length} feedback signal{patch.sourceSignalIds.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Created date */}
        <p className="text-xs text-gray-500">
          Created {new Date(patch.createdAt).toLocaleDateString()}
          {patch.approvedAt && ` | Approved ${new Date(patch.approvedAt).toLocaleDateString()}`}
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          {patch.status === "draft" && (
            <>
              {onApprove && (
                <Button variant="outline" size="sm" onClick={() => onApprove(patch.id)}>
                  Approve
                </Button>
              )}
              {onReject && (
                <Button variant="outline" size="sm" onClick={() => onReject(patch.id)}>
                  Reject
                </Button>
              )}
            </>
          )}
          {patch.status === "approved" && (
            <>
              {onActivate && (
                <Button variant="orange" size="sm" onClick={() => onActivate(patch.id)}>
                  Activate
                </Button>
              )}
              {onLaunchTest && (
                <Button variant="outline" size="sm" onClick={() => onLaunchTest(patch.id)}>
                  <FlaskConicalIcon className="mr-1 h-3 w-3" />
                  Launch A/B Test
                </Button>
              )}
              {onReject && (
                <Button variant="outline" size="sm" onClick={() => onReject(patch.id)}>
                  Reject
                </Button>
              )}
            </>
          )}
          {patch.status === "active" && onDeactivate && (
            <Button variant="outline" size="sm" onClick={() => onDeactivate(patch.id)}>
              Deactivate
            </Button>
          )}
          {patch.status === "testing" && patch.experimentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/admin/ab-tests/${patch.experimentId}`}
            >
              View Experiment
            </Button>
          )}
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={() => onViewDetails(patch.id)}>
              Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
