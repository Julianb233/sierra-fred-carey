"use client"

/**
 * VoiceCallContextBanner
 * Phase 82: Chat/Voice Continuity
 *
 * Displays context awareness banners for voice calls:
 * - Pre-call: "FRED remembers: Last discussed -- [topic]"
 * - Post-call: "Voice call summary: [summary]" (dismissable)
 *
 * Compact banner that sits above the chat message area.
 */

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, X, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceCallContextBannerProps {
  lastDiscussedTopic: string | null
  isCallActive: boolean
  lastCallSummary: string | null
  onDismiss?: () => void
}

export function VoiceCallContextBanner({
  lastDiscussedTopic,
  isCallActive,
  lastCallSummary,
  onDismiss,
}: VoiceCallContextBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  // Post-call summary takes priority
  if (lastCallSummary && !dismissed) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "mx-3 sm:mx-4 mt-2 px-3 py-2 rounded-lg",
            "bg-gray-50 dark:bg-gray-800/60",
            "border-l-2 border-[#ff6a1a]",
            "flex items-start gap-2"
          )}
        >
          <MessageSquare className="h-4 w-4 text-[#ff6a1a] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Voice call summary
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              {lastCallSummary}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Dismiss call summary"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Pre-call context: show last discussed topic when not in a call
  if (lastDiscussedTopic && !isCallActive) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "mx-3 sm:mx-4 mt-2 px-3 py-2 rounded-lg",
            "bg-[#ff6a1a]/5 dark:bg-[#ff6a1a]/10",
            "border border-[#ff6a1a]/20",
            "flex items-center gap-2"
          )}
        >
          <Phone className="h-3.5 w-3.5 text-[#ff6a1a] shrink-0" />
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            <span className="font-medium text-[#ff6a1a]">FRED remembers:</span>{" "}
            Last discussed &mdash; {lastDiscussedTopic}
          </p>
        </motion.div>
      </AnimatePresence>
    )
  }

  return null
}
