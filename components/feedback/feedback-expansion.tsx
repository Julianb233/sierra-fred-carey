"use client"

import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { FEEDBACK_CATEGORIES } from "@/lib/feedback/constants"

// Negative categories for thumbs-down feedback
const NEGATIVE_CATEGORIES = FEEDBACK_CATEGORIES.filter(
  (c) => !["helpful", "other", "coaching_discomfort"].includes(c)
)

const CATEGORY_LABELS: Record<string, string> = {
  irrelevant: "Irrelevant",
  incorrect: "Incorrect",
  too_vague: "Too vague",
  too_long: "Too long",
  wrong_tone: "Wrong tone",
}

interface FeedbackExpansionProps {
  variant: "up" | "down"
  category: string | null
  comment: string
  onCategoryChange: (cat: string) => void
  onCommentChange: (text: string) => void
  onSubmit: () => void
  onDismiss: () => void
}

export function FeedbackExpansion({
  variant,
  category,
  comment,
  onCategoryChange,
  onCommentChange,
  onSubmit,
  onDismiss,
}: FeedbackExpansionProps) {
  const hasInteracted = variant === "up" ? comment.trim().length > 0 : category !== null || comment.trim().length > 0

  return (
    <div className="relative rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-3 mt-2">
      {/* Dismiss button */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss feedback panel"
        className="absolute top-2 right-2 p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Category pills — thumbs-down only */}
      {variant === "down" && (
        <div className="flex flex-wrap gap-1.5 mb-2 pr-5">
          {NEGATIVE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={cn(
                "text-xs px-2 py-1 rounded-full border transition-colors duration-150",
                category === cat
                  ? "bg-[#ff6a1a]/10 border-[#ff6a1a]/40 text-[#ff6a1a]"
                  : "bg-white/5 border-white/20 text-muted-foreground hover:border-white/30"
              )}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {/* Comment textarea */}
      <textarea
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder={variant === "up" ? "What was helpful?" : "Tell us more (optional)"}
        maxLength={500}
        rows={2}
        className={cn(
          "w-full text-xs rounded-md px-2.5 py-1.5 resize-none",
          "bg-white/5 border border-white/10 text-foreground/80",
          "placeholder:text-muted-foreground/40",
          "focus:outline-none focus:border-[#ff6a1a]/40 focus:ring-1 focus:ring-[#ff6a1a]/20",
          "max-h-[80px]",
          variant === "up" ? "pr-5" : ""
        )}
      />

      {/* Submit button — shown after interaction */}
      {hasInteracted && (
        <div className="flex justify-end mt-1.5">
          <button
            type="button"
            onClick={onSubmit}
            className="text-xs px-3 py-1 rounded-md bg-[#ff6a1a] text-white hover:bg-[#ff6a1a]/90 transition-colors"
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}
