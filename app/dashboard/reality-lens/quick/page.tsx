"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  RocketIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons"
import {
  QUICK_QUESTIONS,
  type QuickAnswers,
  type QuickQuestion,
} from "@/lib/fred/reality-lens-quick-shared"

// ============================================================================
// Types & Constants
// ============================================================================

interface QuickAssessmentResult {
  overallScore: number
  stage: string
  gaps: string[]
  strengths: string[]
  nextAction: string
  verdictLabel: string
}

const STAGE_LABELS: Record<string, string> = {
  clarity: "Clarity",
  validation: "Validation",
  build: "Build",
  launch: "Launch",
  grow: "Grow",
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  clarity:
    "Define your vision, identify your customer, and clarify your value proposition.",
  validation:
    "Test your assumptions with real customers and validate product-market fit.",
  build:
    "Build your MVP, set up key metrics, and prepare for your first users.",
  launch:
    "Go to market, acquire your first customers, and start generating revenue.",
  grow: "Scale your operations, optimize unit economics, and raise funding.",
}

/** Stage badge colors matching stage-config.ts color assignments */
const STAGE_BADGE_COLORS: Record<string, string> = {
  clarity:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  validation:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  build:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  launch:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  grow: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
}

const LOADING_MESSAGES = [
  "Evaluating your idea...",
  "Analyzing market fit...",
  "Checking readiness...",
  "Identifying gaps...",
]

// ============================================================================
// Inner Component (uses useSearchParams -- requires Suspense boundary)
// ============================================================================

function QuickRealityLensInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isFirstTime = searchParams.get("first") === "true"

  // step: -1 = intro (first-time only), 0-5 = questions
  const [currentStep, setCurrentStep] = useState(isFirstTime ? -1 : 0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [result, setResult] = useState<QuickAssessmentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check if user already completed reality lens
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/fred/reality-lens/quick")
        const data = await res.json()
        if (data.success && data.data?.complete) {
          toast.info("You've already completed your reality check.")
          router.replace("/dashboard")
          return
        }
      } catch {
        // Non-blocking -- continue with assessment
      }
      setCheckingStatus(false)
    })()
  }, [router])

  // Cycle loading messages
  useEffect(() => {
    if (!submitting) return
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [submitting])

  const totalQuestions = QUICK_QUESTIONS.length
  const currentQuestion: QuickQuestion | undefined =
    currentStep >= 0 ? QUICK_QUESTIONS[currentStep] : undefined
  const isLastQuestion = currentStep === totalQuestions - 1
  const showResults = result !== null

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] || ""
    : ""

  // For text questions, require min 10 chars; for select, just non-empty
  const canProceed =
    currentQuestion?.type === "text"
      ? currentAnswer.trim().length >= 10
      : currentAnswer.trim().length > 0

  const handleNext = useCallback(() => {
    if (currentStep === -1) {
      // Advance from intro to first question
      setDirection(1)
      setCurrentStep(0)
      return
    }
    if (!canProceed || isLastQuestion) return
    setDirection(1)
    setCurrentStep((prev) => prev + 1)
  }, [canProceed, isLastQuestion, currentStep])

  const handleBack = useCallback(() => {
    if (currentStep <= 0) return
    setDirection(-1)
    setCurrentStep((prev) => prev - 1)
  }, [currentStep])

  const handleSubmit = async () => {
    if (!canProceed) return
    setSubmitting(true)
    setError(null)
    setLoadingMessageIndex(0)

    const payload: QuickAnswers = {
      idea: answers.idea || "",
      targetCustomer: answers.targetCustomer || "",
      revenueModel:
        (answers.revenueModel as QuickAnswers["revenueModel"]) || "other",
      customerValidation:
        (answers.customerValidation as QuickAnswers["customerValidation"]) ||
        "none",
      prototypeStage:
        (answers.prototypeStage as QuickAnswers["prototypeStage"]) ||
        "idea-only",
      biggestChallenge: answers.biggestChallenge || "",
    }

    try {
      const res = await fetch("/api/fred/reality-lens/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        const msg =
          typeof data.error === "object"
            ? data.error.message
            : data.error || "Assessment failed"
        throw new Error(msg)
      }

      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment failed")
      // Go back to last question so user can retry
      setSubmitting(false)
    } finally {
      setSubmitting(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-500"
    if (score >= 50) return "text-amber-500"
    return "text-red-500"
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 75) return "bg-green-500/10 border-green-500/30"
    if (score >= 50) return "bg-amber-500/10 border-amber-500/30"
    return "bg-red-500/10 border-red-500/30"
  }

  // Show nothing while checking status
  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-[#ff6a1a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Results Screen
  // -----------------------------------------------------------------------
  if (showResults && result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Your Reality Check Results
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here&apos;s where you stand -- and where to go next.
          </p>
        </div>

        {/* Overall Score */}
        <Card
          className={`p-8 text-center border-2 ${getScoreBgColor(result.overallScore)}`}
        >
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Readiness Score
          </p>
          <p
            className={`text-7xl font-bold mb-3 ${getScoreColor(result.overallScore)}`}
          >
            {result.overallScore}
          </p>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
            {result.verdictLabel}
          </p>
          <Badge
            className={`text-base px-4 py-1 ${STAGE_BADGE_COLORS[result.stage] || "bg-gray-100 text-gray-800"}`}
          >
            Your starting point:{" "}
            {STAGE_LABELS[result.stage] || result.stage}
          </Badge>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            {STAGE_DESCRIPTIONS[result.stage] || ""}
          </p>
        </Card>

        {/* Gaps -- orange-tinted "spook them" card */}
        {result.gaps.length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/10 border-orange-200/50 dark:border-orange-800/30">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
              What you need to figure out before investors will listen
            </h3>
            <ul className="space-y-2">
              {result.gaps.map((gap, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="text-orange-500 mt-0.5 flex-shrink-0">
                    &#x2022;
                  </span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Strengths -- green-tinted card */}
        {result.strengths.length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/10 border-green-200/50 dark:border-green-800/30">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircledIcon className="h-5 w-5 text-green-500" />
              What&apos;s working for you
            </h3>
            <ul className="space-y-2">
              {result.strengths.map((strength, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="text-green-500 mt-0.5 flex-shrink-0">
                    &#x2022;
                  </span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Next Action */}
        <Card className="p-6 bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10 border-[#ff6a1a]/20">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Your #1 Next Step
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {result.nextAction}
          </p>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="flex-1 bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
          >
            Continue to Your Journey
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => router.push("/dashboard/reality-lens")}
            className="flex-1"
          >
            Get Detailed Analysis
          </Button>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Loading / Submitting Screen
  // -----------------------------------------------------------------------
  if (submitting) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-[#ff6a1a]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#ff6a1a] border-t-transparent rounded-full animate-spin" />
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingMessageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-medium text-gray-700 dark:text-gray-300"
            >
              {LOADING_MESSAGES[loadingMessageIndex]}
            </motion.p>
          </AnimatePresence>
          <p className="text-sm text-gray-500">
            This usually takes 10-15 seconds
          </p>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Intro Screen (first-time users only, step === -1)
  // -----------------------------------------------------------------------
  if (currentStep === -1) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ff6a1a] to-orange-400 flex items-center justify-center mx-auto shadow-lg shadow-[#ff6a1a]/25">
            <RocketIcon className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Quick Reality Check
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Before we start your journey, let&apos;s understand where you are.
              This takes about 2 minutes.
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleNext}
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 px-8"
          >
            Let&apos;s Go
          </Button>
        </motion.div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Question Flow (steps 0-5)
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Quick Reality Check
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Answer 6 quick questions and we&apos;ll assess your startup readiness.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Question {currentStep + 1} of {totalQuestions}
          </span>
          <span className="text-gray-500">
            {Math.round(((currentStep + 1) / totalQuestions) * 100)}%
          </span>
        </div>
        <Progress
          value={((currentStep + 1) / totalQuestions) * 100}
          className="h-2"
        />
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -50 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <Card className="p-8">
              <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {currentQuestion.question}
              </label>

              {currentQuestion.type === "text" ? (
                <div className="space-y-2">
                  <Textarea
                    value={currentAnswer}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.id]: e.target.value,
                      }))
                    }
                    placeholder={currentQuestion.placeholder}
                    rows={4}
                    className="resize-none"
                    autoFocus
                  />
                  {currentAnswer.length > 0 &&
                    currentAnswer.trim().length < 10 && (
                      <p className="text-xs text-gray-500">
                        Please write at least 10 characters (
                        {currentAnswer.trim().length}/10)
                      </p>
                    )}
                </div>
              ) : (
                <Select
                  value={currentAnswer}
                  onValueChange={(val) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: val,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentQuestion.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="text-gray-600"
        >
          Back
        </Button>

        {isLastQuestion ? (
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!canProceed}
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
          >
            <RocketIcon className="mr-2 h-4 w-4" />
            Analyze My Idea
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleNext}
            disabled={!canProceed}
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Page Component (wraps inner with Suspense for useSearchParams)
// ============================================================================

export default function QuickRealityLensPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-[#ff6a1a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <QuickRealityLensInner />
    </Suspense>
  )
}
