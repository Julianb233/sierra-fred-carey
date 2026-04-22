"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { trackEvent } from "@/lib/analytics"

export function EventMicroSurvey() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [fredRating, setFredRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [improvementText, setImprovementText] = useState("")
  const [recommend, setRecommend] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function checkSurveyEligibility() {
      try {
        const supabase = getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.user_metadata?.event_source) return

        // Check if survey already completed
        const { data: existing } = await supabase
          .from("event_feedback")
          .select("id")
          .eq("user_id", user.id)
          .eq("source", "survey")
          .limit(1)

        if (existing && existing.length > 0) return

        // Check if user has had a FRED interaction (survey_completed flag or chat history)
        if (user.user_metadata?.survey_completed) return

        setVisible(true)
      } catch {
        // Silently ignore
      }
    }
    checkSurveyEligibility()
  }, [])

  if (!visible) return null

  async function handleSkip() {
    trackEvent("survey_skipped", { source: "micro_survey" })
    setVisible(false)
  }

  async function handleSubmit() {
    if (fredRating === 0 || submitting) return
    setSubmitting(true)

    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from("event_feedback").insert({
        user_id: user.id,
        fred_rating: fredRating,
        improvement_text: improvementText || null,
        recommend,
        event_name: user.user_metadata?.event_source || null,
        user_tier: user.user_metadata?.tier || null,
        source: "survey",
      })

      // Mark survey as completed in user metadata
      await supabase.auth.updateUser({
        data: { survey_completed: true },
      })

      trackEvent("survey_completed", {
        fred_rating: fredRating,
        recommend,
        event_name: user.user_metadata?.event_source,
        user_tier: user.user_metadata?.tier,
      })

      setVisible(false)
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false)
    }
  }

  const steps = [
    // Step 0: FRED rating
    <div key="fred-rating">
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        How helpful was FRED?
      </p>
      <div className="flex gap-1 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => { setFredRating(star); setStep(1) }}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-3xl transition-colors"
          >
            <span className={
              star <= (hoverRating || fredRating)
                ? "text-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }>
              &#9733;
            </span>
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Improvement text
    <div key="improvement">
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        What would make Sahara more useful?
      </p>
      <textarea
        value={improvementText}
        onChange={(e) => setImprovementText(e.target.value)}
        placeholder="Share your thoughts... (optional)"
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-[#ff6a1a]"
        rows={3}
      />
      <button
        onClick={() => setStep(2)}
        className="mt-2 w-full bg-[#ff6a1a] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#e55e16] transition-colors"
      >
        {improvementText ? "Next" : "Skip"}
      </button>
    </div>,

    // Step 2: Recommend
    <div key="recommend">
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        Would you recommend Sahara?
      </p>
      <div className="flex gap-2">
        {([
          { value: "yes", label: "Yes", color: "bg-green-500 hover:bg-green-600" },
          { value: "maybe", label: "Maybe", color: "bg-yellow-500 hover:bg-yellow-600" },
          { value: "no", label: "No", color: "bg-red-500 hover:bg-red-600" },
        ] as const).map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setRecommend(opt.value); handleSubmit() }}
            disabled={submitting}
            className={`flex-1 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              recommend === opt.value ? "ring-2 ring-offset-2 ring-[#ff6a1a]" : ""
            } ${opt.color}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>,
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-96 max-w-[90vw] animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Quick Feedback
          </h3>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 mb-4">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-[#ff6a1a]" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        {steps[step]}

        <p className="text-xs text-gray-400 mt-3 text-center">
          {step + 1} of 3
        </p>
      </div>
    </div>
  )
}
