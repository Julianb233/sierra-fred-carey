"use client"

/**
 * LastDiscussed Component
 * Phase 82: Chat/Voice Continuity
 *
 * Displays the last topic discussed in text chat before a voice call.
 * Shown in the call modal so the user knows FRED remembers the conversation.
 */

import { useState, useEffect } from "react"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface LastDiscussedProps {
  className?: string
}

export function LastDiscussed({ className }: LastDiscussedProps) {
  const [lastTopic, setLastTopic] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchContext() {
      try {
        const response = await fetch("/api/voice/context")
        if (!response.ok) {
          setIsLoading(false)
          return
        }
        const data = await response.json()
        if (!cancelled && data.lastTopic) {
          setLastTopic(data.lastTopic)
          // Trigger appear animation after a short delay
          requestAnimationFrame(() => {
            if (!cancelled) setIsVisible(true)
          })
        }
      } catch {
        // Silently fail -- this is a non-critical UI enhancement
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchContext()

    return () => {
      cancelled = true
    }
  }, [])

  // Don't render if no topic or still loading
  if (isLoading || !lastTopic) return null

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-3 py-2 transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
        className
      )}
    >
      <MessageSquare className="h-4 w-4 text-[#ff6a1a] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Last discussed
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
          {lastTopic}
        </p>
      </div>
    </div>
  )
}
