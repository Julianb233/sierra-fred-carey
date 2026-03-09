"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { trackEvent } from "@/lib/analytics"

export function EventFeedbackWidget() {
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Only show for users with event_source in metadata
    async function checkEventUser() {
      try {
        const supabase = getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.event_source) {
          setVisible(true)
        }
      } catch {
        // Silently ignore - not an event user
      }
    }
    checkEventUser()
  }, [])

  if (!visible) return null

  async function handleSubmit() {
    if (rating === 0 || submitting) return
    setSubmitting(true)

    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fire-and-forget write
      supabase.from("event_feedback").insert({
        user_id: user.id,
        rating,
        feedback_text: text || null,
        event_name: user.user_metadata?.event_source || null,
        user_tier: user.user_metadata?.tier || null,
        source: "widget",
      }).then(() => {})

      trackEvent("feedback_submitted", {
        source: "widget",
        rating,
        event_name: user.user_metadata?.event_source,
        user_tier: user.user_metadata?.tier,
      })

      setSubmitted(true)
    } catch {
      // Silently fail - fire and forget
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-72 animate-in fade-in">
        <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
          Thank you for your feedback!
        </p>
        <button
          onClick={() => setVisible(false)}
          className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-[#ff6a1a] text-white rounded-full px-4 py-2.5 shadow-lg hover:bg-[#e55e16] transition-colors text-sm font-medium"
      >
        Share Feedback
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 w-80 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          How&apos;s your experience?
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-2xl transition-colors"
          >
            <span className={
              star <= (hoverRating || rating)
                ? "text-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }>
              &#9733;
            </span>
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Any additional thoughts? (optional)"
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-[#ff6a1a]"
        rows={3}
      />

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
        className="mt-2 w-full bg-[#ff6a1a] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#e55e16] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending..." : "Submit"}
      </button>
    </div>
  )
}
