"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { INTAKE_QUESTIONS } from "@/lib/welcome/intake-questions"
import type { IntakeAnswers } from "@/lib/welcome/types"
import { cn } from "@/lib/utils"

function normalizeStage(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('series') || lower.includes('growth')) return 'series-a'
  if (lower.includes('seed') && !lower.includes('pre')) return 'seed'
  if (lower.includes('pre-seed') || lower.includes('preseed')) return 'pre-seed'
  if (lower.includes('mvp') || lower.includes('prototype') || lower.includes('beta') || lower.includes('building')) return 'mvp'
  return 'idea'
}

interface IntakeFormProps {
  onComplete: () => void
}

export function IntakeForm({ onComplete }: IntakeFormProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [fredResponse, setFredResponse] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const question = INTAKE_QUESTIONS[currentQuestion]

  const handleNext = useCallback(() => {
    if (!currentAnswer.trim() || !question) return

    // Store the answer
    const newAnswers = { ...answers, [question.id]: currentAnswer.trim() }
    setAnswers(newAnswers)

    // Show FRED's rephrase
    const truncated = currentAnswer.trim().length > 100
      ? currentAnswer.trim().slice(0, 100) + "..."
      : currentAnswer.trim()
    const rephrase = question.fredRephrase.replace("{answer}", truncated)
    setFredResponse(rephrase)

    // After 1.5s, advance to next question or finish
    setTimeout(() => {
      setFredResponse(null)
      setCurrentAnswer("")

      if (currentQuestion < INTAKE_QUESTIONS.length - 1) {
        setCurrentQuestion((prev) => prev + 1)
      } else {
        // All questions answered -- process and save
        processAnswers(newAnswers)
      }
    }, 1500)
  }, [currentAnswer, question, answers, currentQuestion])

  const processAnswers = async (finalAnswers: Record<string, string>) => {
    setIsProcessing(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.error("[IntakeForm] No authenticated user")
        onComplete()
        return
      }

      // Store all answers as FRED memory facts in parallel
      const memoryPromises = INTAKE_QUESTIONS.map((q) => {
        const answer = finalAnswers[q.id]
        if (!answer) return Promise.resolve()

        return fetch("/api/fred/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "fact",
            category: q.memoryCategory,
            key: q.memoryKey,
            value: { [q.id]: answer },
            confidence: 1.0,
            source: "welcome_intake",
          }),
        }).catch((err) => {
          console.error(`[IntakeForm] Failed to store memory for ${q.id}:`, err)
        })
      })

      // Update profile with journey_welcomed flag and intake answers
      const profilePromise = supabase
        .from("profiles")
        .update({
          journey_welcomed: true,
          co_founder: finalAnswers.co_founder || null,
          venture_timeline: finalAnswers.timeline_goal || null,
          challenges: [finalAnswers.biggest_challenge],
          stage: normalizeStage(finalAnswers.current_stage || ""),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      // Wait for all saves with a 3s timeout
      await Promise.race([
        Promise.allSettled([...memoryPromises, profilePromise]),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
    } catch (err) {
      console.error("[IntakeForm] Error processing answers:", err)
    }

    onComplete()
  }

  // Processing state
  if (isProcessing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-lg mx-auto text-center py-12"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
            className="w-2.5 h-2.5 rounded-full bg-[#ff6a1a]"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
            className="w-2.5 h-2.5 rounded-full bg-[#ff6a1a]"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
            className="w-2.5 h-2.5 rounded-full bg-[#ff6a1a]"
          />
        </div>
        <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
          Fred is getting to know you...
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Preparing your personalized venture journey
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg mx-auto"
    >
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-1.5 mb-8">
        {INTAKE_QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === currentQuestion
                ? "w-8 bg-[#ff6a1a]"
                : i < currentQuestion
                  ? "w-4 bg-[#ff6a1a]/50"
                  : "w-4 bg-gray-200 dark:bg-gray-700"
            )}
          />
        ))}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
        Question {currentQuestion + 1} of {INTAKE_QUESTIONS.length}
      </p>

      {/* Question card with transitions */}
      <AnimatePresence mode="wait">
        {fredResponse ? (
          <motion.div
            key="fred-response"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-[#ff6a1a]/20 p-6"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-[#ff6a1a]">F</span>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-gray-700 dark:text-gray-300 leading-relaxed italic"
              >
                {fredResponse}
              </motion.p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`question-${currentQuestion}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              {question?.question}
            </h2>

            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={question?.placeholder}
              rows={4}
              className="mb-4 resize-none text-base bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 focus:border-[#ff6a1a]/50 focus:ring-[#ff6a1a]/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && currentAnswer.trim()) {
                  e.preventDefault()
                  handleNext()
                }
              }}
            />

            <div className="flex justify-center">
              <Button
                variant="orange"
                size="lg"
                onClick={handleNext}
                disabled={!currentAnswer.trim() || isSubmitting}
                className="px-8"
              >
                {currentQuestion < INTAKE_QUESTIONS.length - 1 ? "Next" : "Finish"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
