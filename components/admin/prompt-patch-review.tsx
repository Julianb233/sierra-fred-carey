"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FlaskConicalIcon, CheckIcon, XIcon } from "lucide-react"
import type { PromptPatch } from "@/lib/rlhf/types"

interface PromptPatchReviewProps {
  patch: PromptPatch
  sourceInsight?: {
    title: string
    description: string | null
    category: string | null
    severity: string
    signal_count: number
  } | null
  onApprove: (id: string) => void
  onReject: (id: string, reason?: string) => void
  onActivate: (id: string) => void
  onLaunchTest: (id: string, experimentName: string) => void
  onBack: () => void
}

export function PromptPatchReview({
  patch,
  sourceInsight,
  onApprove,
  onReject,
  onActivate,
  onLaunchTest,
  onBack,
}: PromptPatchReviewProps) {
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [experimentName, setExperimentName] = useState(
    `patch-test-${patch.title.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`
  )
  const [showLaunchInput, setShowLaunchInput] = useState(false)

  const confidence = (patch.metadata as Record<string, unknown>)?.confidence as string | undefined
  const rationale = (patch.metadata as Record<string, unknown>)?.rationale as string | undefined
  const expectedImprovement = (patch.metadata as Record<string, unknown>)?.expectedImprovement as string | undefined

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        Back to Patches
      </Button>

      {/* Patch content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{patch.title}</CardTitle>
            <Badge variant="outline" className="capitalize">{patch.status}</Badge>
          </div>
          {patch.topic && (
            <Badge variant="outline" className="w-fit">{patch.topic}</Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-gray-50 dark:bg-gray-900 p-4 font-mono text-sm whitespace-pre-wrap border-l-2 border-[#ff6a1a]">
            {patch.content}
          </div>
        </CardContent>
      </Card>

      {/* Generation metadata */}
      {(rationale || expectedImprovement || confidence) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generation Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {rationale && (
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Rationale:</span>
                <p className="mt-1">{rationale}</p>
              </div>
            )}
            {expectedImprovement && (
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Expected improvement:</span>
                <p className="mt-1">{expectedImprovement}</p>
              </div>
            )}
            {confidence && (
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Confidence:</span>
                <Badge variant="outline" className="ml-2 capitalize">{confidence}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Source traceability */}
      {sourceInsight && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{sourceInsight.title}</span>
              <Badge variant="outline">{sourceInsight.severity}</Badge>
            </div>
            {sourceInsight.description && (
              <p className="text-gray-600 dark:text-gray-400">{sourceInsight.description}</p>
            )}
            <p className="text-xs text-gray-500">
              {sourceInsight.signal_count} signal{sourceInsight.signal_count !== 1 ? "s" : ""}
              {sourceInsight.category && ` | Category: ${sourceInsight.category}`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Signal IDs */}
      {patch.sourceSignalIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Source Signals ({patch.sourceSignalIds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {patch.sourceSignalIds.slice(0, 20).map((id) => (
                <Badge key={id} variant="outline" className="text-xs font-mono">
                  {id.slice(0, 8)}...
                </Badge>
              ))}
              {patch.sourceSignalIds.length > 20 && (
                <Badge variant="outline" className="text-xs">
                  +{patch.sourceSignalIds.length - 20} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {patch.status === "draft" && (
            <div className="flex gap-3">
              <Button variant="orange" onClick={() => onApprove(patch.id)}>
                <CheckIcon className="mr-2 h-4 w-4" />
                Approve Patch
              </Button>
              {!showRejectInput ? (
                <Button variant="outline" onClick={() => setShowRejectInput(true)}>
                  <XIcon className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              ) : (
                <div className="flex gap-2 flex-1">
                  <input
                    type="text"
                    placeholder="Rejection reason (optional)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReject(patch.id, rejectionReason || undefined)}
                  >
                    Confirm Reject
                  </Button>
                </div>
              )}
            </div>
          )}

          {patch.status === "approved" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button variant="orange" onClick={() => onActivate(patch.id)}>
                  Activate Now
                </Button>
                <Button variant="outline" onClick={() => setShowLaunchInput(!showLaunchInput)}>
                  <FlaskConicalIcon className="mr-2 h-4 w-4" />
                  Launch A/B Test
                </Button>
              </div>
              {showLaunchInput && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Experiment name"
                    value={experimentName}
                    onChange={(e) => setExperimentName(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  />
                  <Button
                    variant="orange"
                    size="sm"
                    onClick={() => onLaunchTest(patch.id, experimentName)}
                  >
                    Launch
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
