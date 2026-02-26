import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { JOURNEY_STAGES, BRAND } from '@/lib/constants'

const STORAGE_KEY = 'sahara-funnel-journey'

function loadProgress(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveProgress(progress: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function JourneyPage() {
  const [expandedStage, setExpandedStage] = useState<string | null>('idea')
  const [progress, setProgress] = useState<Record<string, boolean>>(loadProgress)

  const toggleMilestone = (stageId: string, index: number) => {
    const key = `${stageId}-${index}`
    const newProgress = { ...progress, [key]: !progress[key] }
    setProgress(newProgress)
    saveProgress(newProgress)
  }

  const getStageProgress = (stageId: string, total: number) => {
    let completed = 0
    for (let i = 0; i < total; i++) {
      if (progress[`${stageId}-${i}`]) completed++
    }
    return completed
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-xl font-bold text-gray-900">
          Founder <span className="text-[#ff6a1a]">Journey</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your progress from idea to funded startup
        </p>
      </motion.div>

      {/* Timeline */}
      <div className="relative max-w-lg mx-auto">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gray-200" />

        {JOURNEY_STAGES.map((stage, stageIndex) => {
          const isExpanded = expandedStage === stage.id
          const completed = getStageProgress(stage.id, stage.milestones.length)
          const total = stage.milestones.length
          const isComplete = completed === total
          const hasProgress = completed > 0

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: stageIndex * 0.1 }}
              className="relative mb-4 last:mb-0"
            >
              {/* Stage node */}
              <button
                onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                className="w-full flex items-start gap-3 group"
              >
                {/* Circle indicator */}
                <div
                  className={cn(
                    'relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base transition-all duration-300',
                    isComplete
                      ? 'bg-green-500 text-white shadow-sm'
                      : hasProgress
                        ? 'bg-[#ff6a1a] text-white shadow-sm shadow-[#ff6a1a]/25'
                        : 'bg-white border-2 border-gray-200 group-hover:border-[#ff6a1a]/50'
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{stage.icon}</span>
                  )}
                </div>

                {/* Stage info */}
                <div className="flex-1 text-left pt-0.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#ff6a1a] transition-colors">
                      {stage.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-gray-400">
                        {completed}/{total}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {stage.description}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(completed / total) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full transition-colors',
                        isComplete ? 'bg-green-500' : 'bg-[#ff6a1a]'
                      )}
                    />
                  </div>
                </div>
              </button>

              {/* Milestones (expandable) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden ml-12 mt-2"
                  >
                    <div className="space-y-1.5 pb-2">
                      {stage.milestones.map((milestone, milestoneIndex) => {
                        const key = `${stage.id}-${milestoneIndex}`
                        const isChecked = !!progress[key]

                        return (
                          <button
                            key={milestoneIndex}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMilestone(stage.id, milestoneIndex)
                            }}
                            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group/item"
                          >
                            <div
                              className={cn(
                                'flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                                isChecked
                                  ? 'bg-[#ff6a1a] border-[#ff6a1a]'
                                  : 'border-gray-300 group-hover/item:border-[#ff6a1a]/50'
                              )}
                            >
                              {isChecked && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span
                              className={cn(
                                'text-xs text-left transition-all',
                                isChecked
                                  ? 'text-gray-400 line-through'
                                  : 'text-gray-700'
                              )}
                            >
                              {milestone}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* CTA to full platform */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 mb-20 text-center"
      >
        <div className="bg-gradient-to-br from-[#ff6a1a]/5 to-orange-50 border border-[#ff6a1a]/20 rounded-2xl p-5 max-w-lg mx-auto">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Ready to accelerate your journey?
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Get AI-powered investor readiness scoring, pitch deck reviews, and virtual team agents on the full platform.
          </p>
          <a
            href={BRAND.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#ff6a1a] hover:bg-[#ea580c] text-white text-sm font-semibold rounded-full transition-colors shadow-md shadow-[#ff6a1a]/20"
          >
            Explore Full Platform
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </motion.div>
    </div>
  )
}
