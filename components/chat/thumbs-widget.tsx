"use client"

import { useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FeedbackSignal, MessageFeedbackState } from "@/lib/feedback/types"
import { MAX_COMMENT_LENGTH, COMMENT_PLACEHOLDERS } from "@/lib/feedback/constants"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ThumbsWidgetProps {
  /** The message ID this widget controls feedback for */
  messageId: string
  /** Current feedback state for this message */
  state: MessageFeedbackState
  /** Called when user clicks thumbs up or thumbs down */
  onSignal: (messageId: string, signal: FeedbackSignal) => void
  /** Called to toggle the comment form */
  onToggleComment: (messageId: string) => void
  /** Called when comment text changes */
  onCommentChange: (messageId: string, comment: string) => void
  /** Called to submit the comment */
  onSubmitComment: (messageId: string) => void
  /** Additional className */
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThumbsWidget({
  messageId,
  state,
  onSignal,
  onToggleComment,
  onCommentChange,
  onSubmitComment,
  className,
}: ThumbsWidgetProps) {
  const { signal, isCommentOpen, comment, isSubmitting, isSubmitted } = state

  const handleThumbsUp = useCallback(() => {
    onSignal(messageId, "thumbs_up")
  }, [messageId, onSignal])

  const handleThumbsDown = useCallback(() => {
    onSignal(messageId, "thumbs_down")
  }, [messageId, onSignal])

  const handleToggleComment = useCallback(() => {
    onToggleComment(messageId)
  }, [messageId, onToggleComment])

  const handleCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onCommentChange(messageId, e.target.value)
    },
    [messageId, onCommentChange]
  )

  const handleSubmitComment = useCallback(() => {
    onSubmitComment(messageId)
  }, [messageId, onSubmitComment])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmitComment()
      }
    },
    [handleSubmitComment]
  )

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Thumbs row */}
      <div className="flex items-center gap-1">
        {/* Thumbs Up */}
        <motion.button
          type="button"
          onClick={handleThumbsUp}
          disabled={isSubmitting}
          whileTap={{ scale: 0.85 }}
          aria-label="Thumbs up"
          aria-pressed={signal === "thumbs_up"}
          className={cn(
            "p-1 rounded-md transition-colors duration-150",
            "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6a1a]/50",
            signal === "thumbs_up"
              ? "text-[#ff6a1a]"
              : "text-muted-foreground/50 hover:text-muted-foreground",
            isSubmitting && "opacity-50 cursor-not-allowed"
          )}
        >
          <ThumbsUp
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-150",
              signal === "thumbs_up" && "fill-current"
            )}
          />
        </motion.button>

        {/* Thumbs Down */}
        <motion.button
          type="button"
          onClick={handleThumbsDown}
          disabled={isSubmitting}
          whileTap={{ scale: 0.85 }}
          aria-label="Thumbs down"
          aria-pressed={signal === "thumbs_down"}
          className={cn(
            "p-1 rounded-md transition-colors duration-150",
            "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6a1a]/50",
            signal === "thumbs_down"
              ? "text-red-400"
              : "text-muted-foreground/50 hover:text-muted-foreground",
            isSubmitting && "opacity-50 cursor-not-allowed"
          )}
        >
          <ThumbsDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-150",
              signal === "thumbs_down" && "fill-current"
            )}
          />
        </motion.button>

        {/* Comment toggle — only show after a signal has been submitted */}
        {isSubmitted && signal && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleToggleComment}
            aria-label={isCommentOpen ? "Close comment" : "Add comment"}
            className={cn(
              "p-1 rounded-md transition-colors duration-150",
              "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6a1a]/50",
              isCommentOpen
                ? "text-[#ff6a1a]"
                : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </motion.button>
        )}

        {/* Submitting spinner */}
        {isSubmitting && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/50 ml-0.5" />
        )}

        {/* Submitted confirmation */}
        <AnimatePresence>
          {isSubmitted && !isSubmitting && !isCommentOpen && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-muted-foreground/40 ml-0.5 select-none"
            >
              Thanks!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Comment form */}
      <AnimatePresence>
        {isCommentOpen && signal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex gap-1.5 items-end mt-1">
              <textarea
                value={comment}
                onChange={handleCommentChange}
                onKeyDown={handleKeyDown}
                placeholder={COMMENT_PLACEHOLDERS[signal]}
                maxLength={MAX_COMMENT_LENGTH}
                rows={2}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 text-xs rounded-lg px-2.5 py-1.5 resize-none",
                  "bg-white/5 border border-white/10 text-foreground/80",
                  "placeholder:text-muted-foreground/40",
                  "focus:outline-none focus:border-[#ff6a1a]/40 focus:ring-1 focus:ring-[#ff6a1a]/20",
                  "disabled:opacity-50"
                )}
              />
              <motion.button
                type="button"
                onClick={handleSubmitComment}
                disabled={isSubmitting || !comment.trim()}
                whileTap={{ scale: 0.9 }}
                aria-label="Submit comment"
                className={cn(
                  "p-1.5 rounded-lg transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6a1a]/50",
                  comment.trim()
                    ? "bg-[#ff6a1a]/20 text-[#ff6a1a] hover:bg-[#ff6a1a]/30"
                    : "bg-white/5 text-muted-foreground/30 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </motion.button>
            </div>
            <div className="flex justify-end mt-0.5">
              <span className="text-[10px] text-muted-foreground/30">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
