"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight,
  ArrowLeft,
  X,
  MessageSquare,
  ListChecks,
  BarChart3,
  Map as MapIcon,
  Heart,
} from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Dispatch this event from anywhere to launch the dashboard guided tour.
 * Example: window.dispatchEvent(new CustomEvent("sahara:tour:start"))
 */
export function startDashboardTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sahara:tour:start"))
  }
}

const TOUR_SEEN_KEY = "sahara_dashboard_tour_seen"

type TourStep = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  cta?: { label: string; href: string }
}

const STEPS: TourStep[] = [
  {
    id: "mentor",
    icon: MessageSquare,
    title: "Meet Fred, your AI Mentor",
    description:
      "Fred is on every page — ask questions about strategy, fundraising, hiring, or your next move. He knows your stage and goals, so answers are tailored to you.",
    cta: { label: "Open Mentor Chat", href: "/chat" },
  },
  {
    id: "next-steps",
    icon: ListChecks,
    title: "Follow your Next Steps",
    description:
      "Personalized action items based on your stage and what's blocking your progress. Knock these out one at a time — Sahara updates them as you go.",
    cta: { label: "See Next Steps", href: "/dashboard/next-steps" },
  },
  {
    id: "readiness",
    icon: BarChart3,
    title: "Track your Readiness Score",
    description:
      "Your investor-readiness score across product, traction, team, and pitch. Improve weak areas, watch the score climb, and know when you're truly ready to raise.",
    cta: { label: "Check Readiness", href: "/dashboard/readiness" },
  },
  {
    id: "progress",
    icon: MapIcon,
    title: "See your Progress journey",
    description:
      "A visual map of how far you've come and what's ahead. Every milestone you hit is captured here — turn it into a story you can share with investors.",
    cta: { label: "View Progress", href: "/dashboard/journey" },
  },
  {
    id: "wellbeing-marketplace",
    icon: Heart,
    title: "Wellbeing & Marketplace",
    description:
      "Founders burn out. Wellbeing keeps you grounded. The Marketplace connects you to vetted experts when you need a real human for legal, design, or growth.",
    cta: { label: "Browse Marketplace", href: "/dashboard/marketplace" },
  },
]

export function DashboardGuidedTour() {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()

  // Listen for explicit launch events (from sidebar, How-To-Use modal, etc.)
  useEffect(() => {
    function handleStart() {
      setCurrentStep(0)
      setIsActive(true)
    }
    window.addEventListener("sahara:tour:start", handleStart)
    return () => window.removeEventListener("sahara:tour:start", handleStart)
  }, [])

  const dismiss = useCallback(() => {
    setIsActive(false)
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "true")
    } catch {
      // localStorage may be unavailable (private browsing); ignore
    }
  }, [])

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      dismiss()
    }
  }

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  const followCta = (href: string) => {
    dismiss()
    router.push(href)
  }

  if (!isActive) return null

  const step = STEPS[currentStep]
  const isLast = currentStep === STEPS.length - 1
  const isFirst = currentStep === 0
  const StepIcon = step.icon

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={dismiss}
            aria-hidden="true"
          />

          {/* Tour card */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-tour-title"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-full max-w-md mx-4"
          >
            <div className="bg-white dark:bg-gray-900 border border-[#ff6a1a]/30 rounded-2xl p-6 shadow-2xl">
              {/* Progress dots + close */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5" aria-label={`Step ${currentStep + 1} of ${STEPS.length}`}>
                  {STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentStep
                          ? "w-6 bg-[#ff6a1a]"
                          : idx < currentStep
                          ? "w-1.5 bg-[#ff6a1a]/50"
                          : "w-1.5 bg-gray-300 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={dismiss}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close tour"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff6a1a] to-amber-500 flex items-center justify-center mb-4">
                <StepIcon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <h3
                id="dashboard-tour-title"
                className="text-lg font-bold text-gray-900 dark:text-white mb-2"
              >
                {step.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                {step.description}
              </p>

              {/* Optional jump-to CTA */}
              {step.cta && (
                <button
                  onClick={() => followCta(step.cta!.href)}
                  className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#ff6a1a]/40 text-[#ff6a1a] hover:bg-[#ff6a1a]/10 font-medium transition-colors text-sm"
                >
                  {step.cta.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                {isFirst ? (
                  <button
                    onClick={dismiss}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    Skip tour
                  </button>
                ) : (
                  <Button
                    onClick={prev}
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-gray-600 dark:text-gray-300"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={next}
                  size="sm"
                  className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white gap-1.5"
                >
                  {isLast ? "Get Started" : "Next"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
