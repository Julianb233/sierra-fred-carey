"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ThumbsUp, ThumbsDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { MIN_MESSAGES_FOR_FEEDBACK } from "@/lib/feedback/constants"
import { FeedbackExpansion } from "./feedback-expansion"

interface ThumbsWidgetProps {
  /** The message ID this widget controls feedback for */
  messageId: string
  /** Number of user messages in the session — widget hidden if below threshold */
  messageCount: number
}

export function ThumbsWidget({ messageId, messageCount }: ThumbsWidgetProps) {
  const [rating, setRating] = useState<null | "up" | "down">(null)
  const [expanded, setExpanded] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [showThanks, setShowThanks] = useState(false)

  // Gate: hide widget if not enough messages
  const canShowWidget = messageCount >= MIN_MESSAGES_FOR_FEEDBACK

  // Auto-hide "Thanks!" after 2 seconds
  useEffect(() => {
    if (!showThanks) return
    const timer = setTimeout(() => setShowThanks(false), 2000)
    return () => clearTimeout(timer)
  }, [showThanks])

  // Fire-and-forget signal submission
  const fireSignal = useCallback(
    (signalRating: "up" | "down", extraCategory?: string | null, extraComment?: string) => {
      const body: Record<string, unknown> = {
        message_id: messageId,
        signal_type: signalRating === "up" ? "thumbs_up" : "thumbs_down",
        rating: signalRating === "up" ? 1 : -1,
      }
      if (extraCategory) body.category = extraCategory
      if (extraComment) body.comment = extraComment

      fetch("/api/feedback/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(console.error)
    },
    [messageId]
  )

  const handleThumbsUp = useCallback(() => {
    if (submitted) return
    setRating("up")
    setExpanded(true)
    // Fire immediate signal (rating only)
    fireSignal("up")
  }, [submitted, fireSignal])

  const handleThumbsDown = useCallback(() => {
    if (submitted) return
    setRating("down")
    setExpanded(true)
    // Fire immediate signal (rating only)
    fireSignal("down")
  }, [submitted, fireSignal])

  const handleSubmit = useCallback(() => {
    if (!rating) return
    // Fire detailed signal with category + comment
    fireSignal(rating, category, comment.trim() || undefined)
    setSubmitted(true)
    setExpanded(false)
    setShowThanks(true)
  }, [rating, category, comment, fireSignal])

  const handleDismiss = useCallback(() => {
    setExpanded(false)
    // The basic signal was already sent on thumbs click
    // Mark as submitted so the widget locks
    setSubmitted(true)
    setShowThanks(true)
  }, [])

  if (!canShowWidget) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col"
    >
      {/* Thumbs row */}
      <div className="flex items-center gap-0.5">
        {!submitted ? (
          <>
            <motion.button
              type="button"
              onClick={handleThumbsUp}
              whileTap={{ scale: 0.85 }}
              aria-label="Thumbs up"
              aria-pressed={rating === "up"}
              className={cn(
                "p-1 rounded-md transition-colors duration-150",
                "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6a1a]/50",
                rating === "up"
                  ? "text-green-500"
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
            >
              <ThumbsUp
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150",
                  rating === "up" && "fill-current"
                )}
              />
            </motion.button>

            <motion.button
              type="button"
              onClick={handleThumbsDown}
              whileTap={{ scale: 0.85 }}
              aria-label="Thumbs down"
              aria-pressed={rating === "down"}
              className={cn(
                "p-1 rounded-md transition-colors duration-150",
                "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6a1a]/50",
                rating === "down"
                  ? "text-red-400"
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
            >
              <ThumbsDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150",
                  rating === "down" && "fill-current"
                )}
              />
            </motion.button>
          </>
        ) : (
          <AnimatePresence>
            {showThanks && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-xs text-muted-foreground/50"
              >
                <Check className="h-3 w-3" />
                Thanks!
              </motion.span>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Expansion panel */}
      <AnimatePresence>
        {expanded && rating && !submitted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <FeedbackExpansion
              variant={rating === "up" ? "up" : "down"}
              category={category}
              comment={comment}
              onCategoryChange={setCategory}
              onCommentChange={setComment}
              onSubmit={handleSubmit}
              onDismiss={handleDismiss}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
