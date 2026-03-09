"use client"

import { useState, useEffect, type ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Map, ArrowRight, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { JourneyCompletion } from "@/lib/journey/completion"
import { STAGE_ORDER } from "@/lib/oases/stage-config"

// ============================================================================
// Types
// ============================================================================

interface JourneyGateProps {
  /** Minimum completion percentage required (default 100) */
  requiredPercent?: number
  /** Feature name for display */
  featureName: string
  /** Children to render when unlocked */
  children: ReactNode
  /** Additional className */
  className?: string
}

// Stage display names
const STAGE_LABELS: Record<string, string> = {
  clarity: "Clarity",
  validation: "Validation",
  build: "Build",
  launch: "Launch",
  grow: "Grow",
}

// ============================================================================
// Component
// ============================================================================

export function JourneyGate({
  requiredPercent = 100,
  featureName,
  children,
  className,
}: JourneyGateProps) {
  const [completion, setCompletion] = useState<JourneyCompletion | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchCompletion() {
      try {
        const res = await fetch("/api/journey/completion")
        if (!res.ok) return
        const data = await res.json()
        if (data.success) {
          setCompletion(data.data)
        }
      } catch {
        // Silently fail -- children will render without gate
      } finally {
        setIsLoading(false)
      }
    }
    fetchCompletion()
  }, [])

  // While loading, show nothing (avoid flash)
  if (isLoading) {
    return null
  }

  // If we can't determine completion, render children (fail open)
  if (!completion) {
    return <>{children}</>
  }

  // If user meets the required percentage, render children
  if (completion.percent >= requiredPercent) {
    return <>{children}</>
  }

  // Locked state
  return (
    <div className={cn("relative min-h-[400px]", className)}>
      {/* Blurred children behind the overlay */}
      <div className="filter blur-sm opacity-30 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Lock overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-gray-950/60 backdrop-blur-sm rounded-lg"
      >
        <div className="text-center p-8 max-w-md">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.15 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-400/20 flex items-center justify-center"
          >
            <Map className="h-10 w-10 text-[#ff6a1a]" />
          </motion.div>

          {/* Heading */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Complete your venture journey first
          </h3>
          <p className="text-lg font-semibold text-[#ff6a1a] mb-2">
            You&apos;re at {completion.percent}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {featureName} unlocks when you complete your full venture journey.
            Founders who complete the journey are prepared for what comes next.
          </p>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-500 dark:text-gray-400">Journey Progress</span>
              <span className="font-semibold text-[#ff6a1a]">{completion.percent}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completion.percent}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#ff6a1a] to-amber-500 rounded-full"
              />
            </div>
          </div>

          {/* Stage badges */}
          <div className="flex justify-center gap-1.5 mb-6">
            {STAGE_ORDER.map((stage) => {
              const isCompleted = completion.stagesCompleted.includes(stage)
              const isCurrent = stage === completion.stage
              return (
                <div
                  key={stage}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    isCompleted
                      ? "bg-[#ff6a1a] text-white"
                      : isCurrent
                        ? "bg-[#ff6a1a]/20 text-[#ff6a1a] ring-1 ring-[#ff6a1a]/40"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                  )}
                >
                  {STAGE_LABELS[stage] || stage}
                </div>
              )
            })}
          </div>

          {/* Current stage hint */}
          {completion.nextStage && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              You&apos;re in <span className="font-medium text-gray-700 dark:text-gray-300">{STAGE_LABELS[completion.stage]}</span>.
              Next up: <span className="font-medium text-[#ff6a1a]">{STAGE_LABELS[completion.nextStage]}</span>
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#ff6a1a] hover:bg-[#ea580c] text-white rounded-lg font-medium text-sm transition-colors"
            >
              Continue Journey
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[#ff6a1a] text-[#ff6a1a] hover:bg-[#ff6a1a]/10 rounded-lg font-medium text-sm transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Chat with Fred to continue
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
