"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GUIDED_TOUR_STEPS } from "@/lib/sales/demo-data"

const TOUR_SEEN_KEY = "sahara_sales_tour_seen"

export function SalesGuidedTour() {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_SEEN_KEY)
    if (!seen) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setIsActive(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = useCallback(() => {
    setIsActive(false)
    localStorage.setItem(TOUR_SEEN_KEY, "true")
  }, [])

  const next = () => {
    if (currentStep < GUIDED_TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      dismiss()
    }
  }

  if (!isActive) return null

  const step = GUIDED_TOUR_STEPS[currentStep]
  const isLast = currentStep === GUIDED_TOUR_STEPS.length - 1

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={dismiss}
          />

          {/* Tooltip card */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
          >
            <div className="bg-gray-900 border border-[#ff6a1a]/30 rounded-2xl p-6 shadow-2xl">
              {/* Progress dots */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  {GUIDED_TOUR_STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentStep
                          ? "w-6 bg-[#ff6a1a]"
                          : idx < currentStep
                          ? "w-1.5 bg-[#ff6a1a]/50"
                          : "w-1.5 bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={dismiss}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff6a1a] to-amber-500 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                {step.description}
              </p>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={dismiss}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Skip tour
                </button>
                <Button
                  onClick={next}
                  size="sm"
                  className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white gap-1.5"
                >
                  {isLast ? "Start Selling" : "Next"}
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
