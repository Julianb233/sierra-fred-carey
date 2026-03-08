"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Compass,
  Search,
  Hammer,
  Rocket,
  TrendingUp,
  Check,
  Lock,
  MessageSquare,
} from "lucide-react"
import { useOasesProgress } from "@/hooks/use-oases-progress"
import { STAGE_CONFIG } from "@/lib/oases/stage-config"
import { Skeleton } from "@/components/ui/skeleton"
import { StageDetailModal } from "@/components/oases/stage-detail-modal"
import type { OasesProgress } from "@/types/oases"

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass,
  Search,
  Hammer,
  Rocket,
  TrendingUp,
}

function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 22
  const strokeWidth = 3
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 50 50">
        <circle
          cx="25"
          cy="25"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="25"
          cy="25"
          r={radius}
          fill="none"
          stroke="#ff6a1a"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold text-gray-900 dark:text-white">
        {percentage}%
      </span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="w-full rounded-xl border border-[#ff6a1a]/20 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            {i < 5 && <Skeleton className="flex-1 h-0.5 mx-2" />}
          </div>
        ))}
      </div>
      <Skeleton className="h-2 w-full rounded-full mt-6" />
    </div>
  )
}

export function OasesVisualizer() {
  const { progress, isLoading } = useOasesProgress()
  const [selectedStageIdx, setSelectedStageIdx] = useState<number | null>(null)

  if (isLoading || !progress) {
    return <LoadingSkeleton />
  }

  const selectedStage = selectedStageIdx !== null ? progress.stages[selectedStageIdx] : null
  const selectedConfig = selectedStageIdx !== null ? STAGE_CONFIG[selectedStageIdx] : null

  return (
    <>
      <div className="w-full rounded-xl border border-[#ff6a1a]/20 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Venture Journey
          </h2>
          <ProgressRing percentage={progress.journeyPercentage} />
        </div>

        {/* Stage timeline */}
        <div className="overflow-x-auto -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:pb-0 md:overflow-visible">
          <div className="flex items-start min-w-[500px] md:min-w-0">
            {STAGE_CONFIG.map((config, idx) => {
              const stageProgress = progress.stages[idx]
              const Icon = STAGE_ICONS[config.icon]
              const isCompleted = stageProgress?.status === "completed"
              const isCurrent = stageProgress?.status === "current"
              const isLocked = stageProgress?.status === "locked"

              return (
                <div key={config.id} className="flex items-start flex-1">
                  {/* Stage node */}
                  <div
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => setSelectedStageIdx(idx)}
                  >
                    <div className="relative">
                      {/* Pulsing ring for current stage */}
                      {isCurrent && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-[#ff6a1a]"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{
                            repeat: Infinity,
                            duration: 2,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                      <div
                        className={`
                          w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center
                          transition-transform group-hover:scale-110
                          ${isCompleted ? "bg-green-500 text-white" : ""}
                          ${isCurrent ? "bg-[#ff6a1a] text-white" : ""}
                          ${isLocked ? "bg-gray-200 dark:bg-gray-700 text-gray-400" : ""}
                        `}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5 md:h-6 md:w-6" />
                        ) : isLocked ? (
                          <Lock className="h-4 w-4 md:h-5 md:w-5" />
                        ) : Icon ? (
                          <Icon className="h-5 w-5 md:h-6 md:w-6" />
                        ) : null}
                      </div>
                    </div>
                    <span className="mt-2 text-sm font-bold text-gray-900 dark:text-white text-center">
                      {config.name}
                    </span>
                    <span className="text-xs text-muted-foreground text-center max-w-[90px]">
                      {config.tagline}
                    </span>
                  </div>

                  {/* Connector line */}
                  {idx < STAGE_CONFIG.length - 1 && (
                    <div className="flex-1 flex items-center pt-5 md:pt-6 px-1">
                      <div
                        className={`
                          flex-1 h-0.5 rounded-full
                          ${
                            stageProgress?.status === "completed" &&
                            progress.stages[idx + 1]?.status === "completed"
                              ? "bg-green-500"
                              : stageProgress?.status === "completed" &&
                                progress.stages[idx + 1]?.status === "current"
                              ? "bg-gradient-to-r from-green-500 to-[#ff6a1a]"
                              : "bg-gray-200 dark:bg-gray-700"
                          }
                        `}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Full-width progress bar */}
        <div className="mt-6">
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#ff6a1a] to-orange-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress.journeyPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Chat with Fred CTA */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#ff6a1a] hover:bg-[#ea580c] text-white rounded-lg font-medium text-sm transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Chat with Fred
        </Link>
      </div>

      {/* Stage Detail Modal */}
      {selectedStage && selectedConfig && (
        <StageDetailModal
          stage={selectedStage}
          config={selectedConfig}
          open={selectedStageIdx !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedStageIdx(null)
          }}
        />
      )}
    </>
  )
}
