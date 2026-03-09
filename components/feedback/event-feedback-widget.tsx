"use client"

/**
 * Event Feedback Widget
 *
 * Phase 90: User Testing Loop
 * Floating "Share Feedback" button for event attendees (test_group contains "event").
 * Opens a modal with structured feedback form: ratings, recommendation, free text.
 * Submits to POST /api/feedback/event.
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface EventFeedbackWidgetProps {
  eventName: string
  userId: string
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 text-2xl transition-colors"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            {star <= value ? (
              <span className="text-[#ff6a1a]">&#9733;</span>
            ) : (
              <span className="text-gray-300 dark:text-gray-600">&#9733;</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export function EventFeedbackWidget({
  eventName,
  userId,
}: EventFeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [rating, setRating] = useState(0)
  const [fredRating, setFredRating] = useState(0)
  const [recommend, setRecommend] = useState<"yes" | "maybe" | "no" | "">("")
  const [improvementText, setImprovementText] = useState("")
  const [loveText, setLoveText] = useState("")

  if (dismissed) return null

  async function handleSubmit() {
    if (rating === 0) {
      toast.error("Please rate your overall experience")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/feedback/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          eventName,
          rating,
          fredRating: fredRating || null,
          recommend: recommend || null,
          improvementText: improvementText.trim() || null,
          loveText: loveText.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to submit feedback")
      }

      toast.success("Thank you for your feedback!")
      setOpen(false)
      setDismissed(true)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit feedback"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-[#ff6a1a] px-5 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        Share Feedback
      </button>

      {/* Feedback modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Your Feedback</DialogTitle>
            <DialogDescription>
              Help us improve Sahara. Your feedback shapes the product.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <StarRating
              value={rating}
              onChange={setRating}
              label="Overall Experience"
            />

            <StarRating
              value={fredRating}
              onChange={setFredRating}
              label="FRED (AI Mentor)"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Would you recommend Sahara?
              </label>
              <div className="flex gap-3">
                {(["yes", "maybe", "no"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRecommend(option)}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      recommend === option
                        ? "border-[#ff6a1a] bg-[#ff6a1a]/10 text-[#ff6a1a]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                What could be better?
              </label>
              <Textarea
                value={improvementText}
                onChange={(e) => setImprovementText(e.target.value)}
                placeholder="Any frustrations, missing features, or rough edges..."
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                What did you love?
              </label>
              <Textarea
                value={loveText}
                onChange={(e) => setLoveText(e.target.value)}
                placeholder="What impressed you or felt great..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#ff6a1a] hover:bg-[#e55a10]"
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
