"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { STAGE_CONFIG } from "@/lib/oases/stage-config"
import type { OasesProgress, StageConfig } from "@/types/oases"

interface StageDetailModalProps {
  stage: OasesProgress["stages"][number]
  config: StageConfig
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StageDetailModal({
  stage,
  config,
  open,
  onOpenChange,
}: StageDetailModalProps) {
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [tierGatedMessage, setTierGatedMessage] = useState<string | null>(null)

  const allComplete = stage.stepsCompleted === stage.stepsTotal
  const isCurrent = stage.status === "current"
  const isLocked = stage.status === "locked"

  // Find the previous stage name for locked messaging
  const stageIdx = STAGE_CONFIG.findIndex((s) => s.id === config.id)
  const prevStageName = stageIdx > 0 ? STAGE_CONFIG[stageIdx - 1].name : null

  const handleAdvance = async () => {
    setIsAdvancing(true)
    setTierGatedMessage(null)
    try {
      const res = await fetch("/api/oases/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: config.id }),
      })
      if (res.ok) {
        onOpenChange(false)
        window.location.reload()
      } else {
        const data = await res.json()
        if (data.tierGated) {
          setTierGatedMessage(data.error || "Upgrade your plan to continue your journey.")
        }
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setIsAdvancing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.name}
            <span className="text-sm font-normal text-[#ff6a1a]">
              {stage.stepsTotal > 0
                ? Math.round((stage.stepsCompleted / stage.stepsTotal) * 100)
                : 0}%
            </span>
          </DialogTitle>
          <DialogDescription>{config.tagline}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {config.description}
        </p>

        {/* Steps checklist */}
        <div className="space-y-3 mt-2">
          {config.steps.map((step) => {
            const isComplete = stage.completedStepIds.includes(step.id)
            return (
              <div key={step.id} className="flex items-start gap-3">
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isComplete
                        ? "text-gray-500 line-through"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          {/* Progress summary */}
          <div className="w-full">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>
                {stage.stepsCompleted} of {stage.stepsTotal} steps completed
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#ff6a1a] transition-all duration-300"
                style={{
                  width: `${
                    stage.stepsTotal > 0
                      ? (stage.stepsCompleted / stage.stepsTotal) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Advance button (current stage, all steps complete) */}
          {isCurrent && allComplete && (
            <Button
              onClick={handleAdvance}
              disabled={isAdvancing}
              className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
            >
              {isAdvancing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Advancing...
                </>
              ) : (
                `Advance to ${
                  stageIdx < STAGE_CONFIG.length - 1
                    ? STAGE_CONFIG[stageIdx + 1].name
                    : "Completion"
                }`
              )}
            </Button>
          )}

          {/* AI-3581: Tier-gated upsell */}
          {tierGatedMessage && (
            <div className="w-full rounded-lg border border-[#ff6a1a]/30 bg-[#ff6a1a]/5 p-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {tierGatedMessage}
              </p>
              <Button
                className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                asChild
              >
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
          )}

          {/* Locked message */}
          {isLocked && prevStageName && (
            <p className="text-sm text-center text-muted-foreground">
              Complete {prevStageName} first to unlock
            </p>
          )}

          {/* Open Roadmap button */}
          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard/journey">
              Open Roadmap
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
